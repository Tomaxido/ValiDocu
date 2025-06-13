import json
import os

import pytesseract
from PIL import Image

RESET = "\033[0m"
RED = "\033[0;31m"
GREEN = "\033[0;32m"
YELLOW = "\033[0;33m"

# Etiquetas disponibles
TAGS = [
    "O",
    "B-NOMBRE_COMPLETO", "I-NOMBRE_COMPLETO",
    "B-EMPRESA", "I-EMPRESA",
    "B-RUT", "I-RUT",
    "B-DIRECCION", "I-DIRECCION",
    "B-FECHA", "I-FECHA",
    "B-MONTO", "I-MONTO",
    "B-PLAZO", "I-PLAZO",
    "B-TAZA", "I-TAZA",
    "B-TIPO_DOCUMENTO", "I-TIPO_DOCUMENTO",
    "B-FIRMA", "I-FIRMA"
]


# === CONFIGURACIÓN ===
PNG_DIR = "pdf_images/"
LABEL_DIR = "etiquetas/"
OUTPUT_DIR = "output/"

JSON_EXTENSION = ".json"
PNG_EXTENSION = ".png"

png_filenames = os.listdir(PNG_DIR)
dataset = []

for label_json_filename in os.listdir(LABEL_DIR):
    if not label_json_filename.endswith(JSON_EXTENSION):
        continue

    # ID del documento
    doc_id = label_json_filename[:-len(JSON_EXTENSION)]

    # Busca imágenes (páginas) que correspondan a este documento
    doc_page_png_filenames = []
    for png_filename in png_filenames:
        if doc_id in png_filename:
            doc_page_png_filenames.append(png_filename)
    if len(doc_page_png_filenames) == 0:
        print("No hay imágenes que correspondan al documento", doc_id)
        continue
    doc_page_png_filenames.sort()

    # Lee el contenido del JSON con las palabras y etiquetas
    label_json_path = os.path.join(LABEL_DIR, label_json_filename)
    with open(label_json_path, encoding="utf-8") as json_file:
        content = json.load(json_file)
        json_words = content["words"]
        json_labels = content["labels"]
    
    print(f"🆕 Nuevo documento detectado: {doc_id}")
    
    current_json_index = 0

    # Lee cada imagen por separado
    for png_filename in doc_page_png_filenames:
        if not png_filename.endswith(PNG_EXTENSION):
            continue

        # ID de la página del documento
        doc_page_id = png_filename[:-len(PNG_EXTENSION)]
        image_path = os.path.join(PNG_DIR, png_filename)

        print(f"🆕 Nueva página de documento detectada: {doc_page_id}")

        # OCR
        image = Image.open(image_path).convert("RGB")
        width, height = image.size
        ocr_data = pytesseract.image_to_data(image, lang="spa", output_type=pytesseract.Output.DICT)

        png_words, png_boxes = [], []
        for i in range(len(ocr_data["text"])):
            png_word = ocr_data["text"][i].strip()
            if png_word == "":
                continue
            x, y, w, h = ocr_data["left"][i], ocr_data["top"][i], ocr_data["width"][i], ocr_data["height"][i]
            png_box = [int(1000 * x / width), int(1000 * y / height), int(1000 * (x + w) / width), int(1000 * (y + h) / height)]
            png_words.append(png_word)
            png_boxes.append(png_box)

        words, boxes, labels = [], [], []

        require_manual_intervention = False

        # Interfaz de etiquetado
        for i in range(len(png_words)):
            k = current_json_index + i
            png_word = png_words[i]
            json_word = json_words[k]
            png_box = png_boxes[i]
            json_label = json_labels[k]

            if png_word != json_word:
                is_big_difference = False
                if len(png_word) != len(json_word):
                    diff_error = "largos diferentes"
                    is_big_difference = True
                else:
                    num_differences = 0
                    for c1, c2 in zip(png_word, json_word):
                        if c1 != c2:
                            num_differences += 1
                    if num_differences == 1:
                        diff_error = "1 diferencia"
                    else:
                        diff_error = f"{num_differences} diferencias"
                        is_big_difference = True
                
                color = RED if is_big_difference else YELLOW
                print(f"{color}ADVERTENCIA: {png_word} != {json_words[k]} ({diff_error}){RESET}")
                if is_big_difference:
                    num_pairs = 0
                    num_matches = 0
                    for w1, w2 in zip(png_words[i+1:i+4], json_words[k+1:k+4]):
                        num_pairs += 1
                        if w1 == w2:
                            num_matches += 1
                    if num_matches < num_pairs:
                        require_manual_intervention = True
                        break

            words.append(png_word)
            boxes.append(png_box)
            labels.append(json_label)

        if require_manual_intervention:
            for j in range(i, len(png_words)):
                png_word = png_words[j]
                png_box = png_boxes[j]

                print(f"\nPalabra {j+1}/{len(png_words)}: '{png_word}'")
                for idx, tag in enumerate(TAGS):
                    print(f"[{idx}] {tag}")
                try:
                    choice = int(input("Etiqueta (número): "))
                    user_label = TAGS[choice] if 0 <= choice < len(TAGS) else "O"
                except KeyboardInterrupt:
                    exit()
                except:
                    user_label = "O"

                words.append(png_word)
                boxes.append(png_box)
                labels.append(user_label)

        current_json_index += len(png_words)

        # Actualizar o agregar entrada
        doc_entry = {
            "id": doc_page_id,
            "words": words,
            "boxes": boxes,
            "labels": labels
        }

        dataset.append(doc_entry)

    # Fin de documento
    print()

# Guardar el dataset actualizado
os.makedirs(OUTPUT_DIR, exist_ok=True)
output_path = os.path.join(OUTPUT_DIR, "output.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=4, ensure_ascii=False)

print(f"✅ Guardado actualizado en: {output_path}")
