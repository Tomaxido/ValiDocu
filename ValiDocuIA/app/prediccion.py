# prediccion.py
import torch
from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
from PIL import Image, ImageDraw, ImageFont
import pytesseract
import os
import json
import random

FONT = ImageFont.load_default()

def run_prediction(image_path, model_path, output_img_path, output_json_path):
    model_path = "outputs/modelo_multiclase"
    model = LayoutLMv3ForTokenClassification.from_pretrained(model_path)
    processor = LayoutLMv3Processor.from_pretrained(model_path)
    model.eval()

    image = Image.open(image_path).convert("RGB")
    ocr = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

    words, boxes = [], []
    img_w, img_h = image.size

    for i in range(len(ocr["text"])):
        word = ocr["text"][i].strip()
        if not word:
            continue
        x, y, w, h = ocr["left"][i], ocr["top"][i], ocr["width"][i], ocr["height"][i]
        box = [x, y, x + w, y + h]
        norm_box = [int(box[0] * 1000 / img_w), int(box[1] * 1000 / img_h),
                    int(box[2] * 1000 / img_w), int(box[3] * 1000 / img_h)]
        words.append(word)
        boxes.append(norm_box)

    encoding = processor(image, words, boxes=boxes, return_tensors="pt",
                         truncation=True, padding="max_length", max_length=512)

    with torch.no_grad():
        outputs = model(**encoding)
        logits = outputs.logits
        predictions = torch.argmax(logits, dim=-1).squeeze().tolist()

    word_ids = encoding.word_ids()
    filtered_preds, filtered_words, filtered_boxes = [], [], []
    seen = set()

    for i, (word_idx, pred) in enumerate(zip(word_ids, predictions)):
        if word_idx is not None and word_idx not in seen:
            seen.add(word_idx)
            filtered_preds.append(pred)
            filtered_words.append(words[word_idx])
            filtered_boxes.append(boxes[word_idx])

    entidades_json = []
    current_label, current_words, current_boxes = None, [], []

    def same_line(b1, b2):
        return abs(b1[1] - b2[1]) <= 5 and abs(b1[3] - b2[3]) <= 5

    id2label = model.config.id2label
    draw = ImageDraw.Draw(image)
    COLORS = {}

    def get_color(label):
        if label not in COLORS:
            COLORS[label] = tuple(random.randint(0, 255) for _ in range(3))
        return COLORS[label]

    for word, box, pred in zip(filtered_words, filtered_boxes, filtered_preds):
        label = id2label[pred]
        if label == "O":
            if current_label:
                entidades_json.append({
                    "label": current_label,
                    "text": " ".join(current_words),
                    "boxes": [[b[0]*img_w//1000, b[1]*img_h//1000,
                               b[2]*img_w//1000, b[3]*img_h//1000] for b in current_boxes]
                })
            current_label, current_words, current_boxes = None, [], []
            continue

        if label.startswith("B-"):
            if current_label:
                entidades_json.append({
                    "label": current_label,
                    "text": " ".join(current_words),
                    "boxes": [[b[0]*img_w//1000, b[1]*img_h//1000,
                               b[2]*img_w//1000, b[3]*img_h//1000] for b in current_boxes]
                })
            current_label = label[2:]
            current_words = [word]
            current_boxes = [box]

        elif label.startswith("I-") and current_label == label[2:]:
            if current_boxes and same_line(current_boxes[-1], box):
                current_words.append(word)
                current_boxes[-1][2] = box[2]
            else:
                current_words.append(word)
                current_boxes.append(box)

        else:
            if current_label:
                entidades_json.append({
                    "label": current_label,
                    "text": " ".join(current_words),
                    "boxes": [[b[0]*img_w//1000, b[1]*img_h//1000,
                               b[2]*img_w//1000, b[3]*img_h//1000] for b in current_boxes]
                })
            current_label, current_words, current_boxes = None, [], []

    if current_label:
        entidades_json.append({
            "label": current_label,
            "text": " ".join(current_words),
            "boxes": [[b[0]*img_w//1000, b[1]*img_h//1000,
                       b[2]*img_w//1000, b[3]*img_h//1000] for b in current_boxes]
        })

    for entidad in entidades_json:
        color = get_color(entidad["label"])
        for box in entidad["boxes"]:
            draw.rectangle(box, outline=color, width=2)
        draw.text((entidad["boxes"][0][0], entidad["boxes"][0][1] - 10),
                  entidad["label"], fill=color, font=FONT)

    image.save(output_img_path)
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(entidades_json, f, indent=2, ensure_ascii=False)

    print(f"\n✅ JSON: {output_json_path}\n🖼️ IMG: {output_img_path}")
