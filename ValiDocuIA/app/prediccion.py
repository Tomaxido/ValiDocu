# prediccion.py — LayoutLMv3 inference robusto (word-level + chunking + logs)
import os, json, random
from typing import List, Tuple, Dict, Optional
import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont, UnidentifiedImageError
import pytesseract

from transformers import (
    LayoutLMv3Processor, LayoutLMv3ForTokenClassification,
    AutoTokenizer, LayoutLMv3ImageProcessor
)

# ======== Config (override por ENV) ========
DEFAULT_MODEL_DIR   = os.getenv("MODEL_DIR", "/app/outputs/modelo_multiclase")
BASE_PROCESSOR_ID   = os.getenv("PROCESSOR_BASE", "microsoft/layoutlmv3-base")
DEFAULT_LANG        = os.getenv("OCR_LANG", "spa")
DEFAULT_TESS_CONF   = os.getenv("TESS_CONFIG", "--oem 1 --psm 6")
DEFAULT_MAX_LENGTH  = int(os.getenv("MAX_LENGTH", "384"))
DEFAULT_CHUNK_WORDS = int(os.getenv("CHUNK_WORDS", "180"))
DEFAULT_CONF_THRESH = float(os.getenv("CONF_THRESH", "0.50"))

# ======== Utils ========
def _clamp_box(b: List[int]) -> Optional[List[int]]:
    """Ajusta y valida caja normalizada [x0,y0,x1,y1] en rango 0..1000 y orden correcto."""
    if b is None or len(b) != 4:
        return None
    x0, y0, x1, y1 = b
    # clamp
    x0 = max(0, min(1000, int(x0)))
    y0 = max(0, min(1000, int(y0)))
    x1 = max(0, min(1000, int(x1)))
    y1 = max(0, min(1000, int(y1)))
    # orden
    if x1 < x0: x0, x1 = x1, x0
    if y1 < y0: y0, y1 = y1, y0
    # área > 0
    if (x1 - x0) <= 0 or (y1 - y0) <= 0:
        return None
    return [x0, y0, x1, y1]

def _ocr_words_boxes(img: Image.Image, lang=DEFAULT_LANG, config=DEFAULT_TESS_CONF) -> Tuple[List[str], List[List[int]]]:
    W, H = img.size
    data = pytesseract.image_to_data(img, lang=lang, config=config, output_type=pytesseract.Output.DICT)
    words: List[str] = []
    boxes: List[List[int]] = []
    for i in range(len(data.get("text", []))):
        w = (data["text"][i] or "").strip()
        if not w:
            continue
        # descartamos cajas sin tamaño válido
        ww = int(data["width"][i] or 0)
        hh = int(data["height"][i] or 0)
        if ww <= 0 or hh <= 0:
            continue
        x = int(data["left"][i] or 0)
        y = int(data["top"][i] or 0)
        x0, y0, x1, y1 = x, y, x + ww, y + hh
        norm = _clamp_box([int(1000*x0/W), int(1000*y0/H), int(1000*x1/W), int(1000*y1/H)])
        if norm is None:
            continue
        words.append(w)
        boxes.append(norm)
    return words, boxes

def _log(*a):
    # logs simples que verás en docker compose logs -f ia-api
    print("[prediccion]", *a, flush=True)

# ======== Carga robusta del modelo y processor ========
def _load_model_and_processor(model_root: str):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _log(f"cargando modelo desde {model_root}")
    model = LayoutLMv3ForTokenClassification.from_pretrained(model_root).to(device).eval()

    processor = None
    try:
        processor = LayoutLMv3Processor.from_pretrained(model_root)
        processor.image_processor.apply_ocr = False
        _log(f"processor OK desde {model_root}")
    except Exception as e:
        _log(f"WARNING: processor del checkpoint falló: {e} -> intentaremos tokenizer lento")
        try:
            tok  = AutoTokenizer.from_pretrained(model_root, use_fast=False)
            imgp = LayoutLMv3ImageProcessor.from_pretrained(model_root)
            imgp.apply_ocr = False
            processor = LayoutLMv3Processor(image_processor=imgp, tokenizer=tok)
            _log("processor reconstruido (use_fast=False) desde checkpoint")
        except Exception as e2:
            _log(f"WARNING: tampoco se pudo desde checkpoint: {e2} -> usando base {BASE_PROCESSOR_ID}")
            tok  = AutoTokenizer.from_pretrained(BASE_PROCESSOR_ID, use_fast=False)
            imgp = LayoutLMv3ImageProcessor.from_pretrained(BASE_PROCESSOR_ID)
            imgp.apply_ocr = False
            processor = LayoutLMv3Processor(image_processor=imgp, tokenizer=tok)
            _log(f"processor OK desde base {BASE_PROCESSOR_ID}")

    id2label = model.config.id2label
    return model, processor, device, id2label

# ======== Predicción por chunk con alineación palabra ← subtokens ========
@torch.no_grad()
def _predict_chunk(model, processor, device, image, words, boxes, max_length) -> Dict[str, np.ndarray]:
    enc = processor(
        image, words, boxes=boxes,
        truncation=True, padding="max_length", max_length=max_length,
        return_tensors="pt"
    )
    keys = ("input_ids", "bbox", "attention_mask", "pixel_values")
    enc_in = {k: v.to(device) for k, v in enc.items() if k in keys}

    logits = model(**enc_in).logits[0]  # (seq, C)
    probs_tok = torch.softmax(logits, dim=-1).cpu().numpy()

    word_ids = enc.word_ids(batch_index=0)  # lista token->word (None para CLS/SEP/PAD)
    n_words = len(words)
    C = probs_tok.shape[1]
    sums   = np.zeros((n_words, C), dtype=np.float32)
    counts = np.zeros((n_words,),    dtype=np.int32)

    for tidx, wid in enumerate(word_ids):
        if wid is None or wid >= n_words:
            continue
        sums[wid]   += probs_tok[tidx]
        counts[wid] += 1

    # palabras que no recibieron subtokens (counts==0)
    zero_mask = (counts == 0)
    if zero_mask.any():
        _log(f"AVISO: {int(zero_mask.sum())} palabra(s) sin tokens; forzando clase O")
        # fuerza prob válida con clase 0 (O)
        sums[zero_mask, :] = 0.0
        sums[zero_mask, 0] = 1.0
        counts[zero_mask]  = 1

    probs_word = sums / counts[:, None]  # (n_words, C)
    pred_ids   = probs_word.argmax(axis=-1)
    return {"pred_ids": pred_ids, "probs_word": probs_word}

# ======== Agrupación BIO a spans y unión de cajas por línea ========
def _group_entities(words, boxes, pred_ids, probs_word, id2label, img_w, img_h, conf_thresh=DEFAULT_CONF_THRESH):
    def same_line(b1, b2, tol=6):
        return abs(b1[1]-b2[1]) <= tol and abs(b1[3]-b2[3]) <= tol

    ents = []
    cur_lab = None
    cur_words, cur_boxes = [], []

    for w, b, pid, pvec in zip(words, boxes, pred_ids, probs_word):
        lab_idx = int(pid)
        lab = id2label.get(lab_idx, "O")
        conf = float(pvec.max())

        if lab == "O" or conf < conf_thresh:
            if cur_lab:
                ents.append({
                    "label": cur_lab,
                    "text": " ".join(cur_words),
                    "boxes": [[int(bx[0]*img_w/1000), int(bx[1]*img_h/1000),
                               int(bx[2]*img_w/1000), int(bx[3]*img_h/1000)] for bx in cur_boxes]
                })
                cur_lab, cur_words, cur_boxes = None, [], []
            continue

        if lab.startswith("B-"):
            if cur_lab:
                ents.append({
                    "label": cur_lab,
                    "text": " ".join(cur_words),
                    "boxes": [[int(bx[0]*img_w/1000), int(bx[1]*img_h/1000),
                               int(bx[2]*img_w/1000), int(bx[3]*img_h/1000)] for bx in cur_boxes]
                })
            cur_lab   = lab[2:]
            cur_words = [w]
            cur_boxes = [b]

        elif lab.startswith("I-") and cur_lab == lab[2:]:
            if cur_boxes and same_line(cur_boxes[-1], b):
                cur_boxes[-1][2] = b[2]  # extiende x1 a la derecha
                cur_words.append(w)
            else:
                cur_boxes.append(b)
                cur_words.append(w)
        else:
            if cur_lab:
                ents.append({
                    "label": cur_lab,
                    "text": " ".join(cur_words),
                    "boxes": [[int(bx[0]*img_w/1000), int(bx[1]*img_h/1000),
                               int(bx[2]*img_w/1000), int(bx[3]*img_h/1000)] for bx in cur_boxes]
                })
            cur_lab, cur_words, cur_boxes = None, [], []

    if cur_lab:
        ents.append({
            "label": cur_lab,
            "text": " ".join(cur_words),
            "boxes": [[int(bx[0]*img_w/1000), int(bx[1]*img_h/1000),
                       int(bx[2]*img_w/1000), int(bx[3]*img_h/1000)] for bx in cur_boxes]
        })
    return ents

def _draw_entities(image, ents):
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 14)
    except Exception:
        font = ImageFont.load_default()
    colors = {}
    def color(lbl):
        if lbl not in colors:
            colors[lbl] = tuple(random.randint(0,255) for _ in range(3))
        return colors[lbl]
    for e in ents:
        c = color(e["label"])
        for bx in e["boxes"]:
            draw.rectangle(bx, outline=c, width=2)
        draw.text((e["boxes"][0][0], max(0, e["boxes"][0][1]-14)), e["label"], fill=c, font=font)

# ======== API principal ========
def run_prediction(
    image_path: str,
    model_path: Optional[str] = None,
    output_img_path: Optional[str] = None,
    output_json_path: Optional[str] = None,
    *,
    max_length: int = DEFAULT_MAX_LENGTH,
    chunk_words: int = DEFAULT_CHUNK_WORDS,
    conf_thresh: float = DEFAULT_CONF_THRESH,
    tess_lang: str = DEFAULT_LANG,
    tess_config: str = DEFAULT_TESS_CONF
):
    model_root = model_path or DEFAULT_MODEL_DIR
    if not os.path.isdir(model_root):
        raise FileNotFoundError(f"Carpeta de modelo inválida: {model_root}")

    if output_img_path is None:
        output_img_path = os.path.splitext(image_path)[0] + "_pred.png"
    if output_json_path is None:
        output_json_path = os.path.splitext(image_path)[0] + "_pred.json"

    os.makedirs(os.path.dirname(output_img_path), exist_ok=True)
    os.makedirs(os.path.dirname(output_json_path), exist_ok=True)

    _log(f"image_path={image_path}")
    _log(f"model_root={model_root}")

    # abrir imagen
    try:
        image = Image.open(image_path).convert("RGB")
        W, H = image.size
        _log(f"image_ok size={W}x{H}")
    except UnidentifiedImageError as e:
        raise RuntimeError(f"Imagen inválida o corrupta: {e}")
    except Exception as e:
        raise RuntimeError(f"Error abriendo la imagen: {e}")

    # cargar modelo/processor
    model, processor, device, id2label = _load_model_and_processor(model_root)

    # OCR
    try:
        _log(f"OCR_LANG={tess_lang} TESS_CONFIG={tess_config}")
        words, boxes = _ocr_words_boxes(image, lang=tess_lang, config=tess_config)
        _log(f"OCR detectó {len(words)} palabras")
        if len(words) > 0:
            _log(f"primeras palabras: {words[:10]}")
    except pytesseract.TesseractNotFoundError as e:
        raise RuntimeError(f"Tesseract no encontrado: {e}")
    except Exception as e:
        # fallback simple a eng si falla el idioma
        _log(f"OCR con '{tess_lang}' falló ({e}); probaremos 'eng'")
        words, boxes = _ocr_words_boxes(image, lang="eng", config=tess_config)
        _log(f"OCR(eng) detectó {len(words)} palabras")

    # coherencia words/boxes
    if len(words) != len(boxes):
        _log(f"AVISO: words({len(words)}) != boxes({len(boxes)}). Truncando al mínimo.")
        n = min(len(words), len(boxes))
        words, boxes = words[:n], boxes[:n]

    ents_all = []
    if len(words) == 0:
        _log("sin palabras -> se genera salida vacía")
    elif len(words) > chunk_words:
        _log(f"chunking por palabras: {len(words)} en bloques de {chunk_words}")
        start = 0
        while start < len(words):
            end = min(start + chunk_words, len(words))
            w_chunk = words[start:end]
            b_chunk = boxes[start:end]
            try:
                pred = _predict_chunk(model, processor, device, image, w_chunk, b_chunk, max_length)
                ents = _group_entities(w_chunk, b_chunk, pred["pred_ids"], pred["probs_word"], id2label, W, H, conf_thresh)
                ents_all.extend(ents)
            except Exception as e:
                _log(f"ERROR en chunk {start}:{end} -> {e}")
                # continúa con el siguiente chunk
            start = end
    else:
        try:
            pred = _predict_chunk(model, processor, device, image, words, boxes, max_length)
            ents_all = _group_entities(words, boxes, pred["pred_ids"], pred["probs_word"], id2label, W, H, conf_thresh)
        except Exception as e:
            _log(f"ERROR en pred/group: {e}")
            raise

    # dibujar y guardar
    img_draw = image.copy()
    _draw_entities(img_draw, ents_all)
    img_draw.save(output_img_path)
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(ents_all, f, indent=2, ensure_ascii=False)

    _log(f"Entidades detectadas: {len(ents_all)}")
    _log(f"output_img_path={output_img_path}")
    _log(f"output_json_path={output_json_path}")
    print(f"\n✅ JSON: {output_json_path}\n🖼️ IMG: {output_img_path}")
