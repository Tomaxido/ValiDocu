import json
import os
from PIL import Image, ImageDraw

IMAGE_INPUT_DIR = "pdf_images/"
IMAGE_OUTPUT_DIR = "pdf_images_draw/"

os.makedirs(IMAGE_OUTPUT_DIR, exist_ok=True)

with open("output/output.json") as output_file:
    output = json.load(output_file)

labels = [
    "NOMBRE",
    "EMPRESA", 
    "RUT",
    "DIRECCION",
    "FECHA",
    "MONTO",
    "PLAZO",
    "TAZA",
    "TIPO_DOCUMENTO",
    "FIRMA"
]
label_to_color = {
    label: f"hsl({i / len(labels) * 360}, 100%, 40%)"
    for i, label in enumerate(labels)
}

for obj in output:
    image = Image.open(os.path.join(IMAGE_INPUT_DIR, obj["id"] + ".png"))
    image.load()

    draw = ImageDraw.Draw(image)
    for box, label in zip(obj["boxes"], obj["labels"]):
        if label == "O":
            continue
        color = "hsl(0, 0%, 50%)"  # gris
        for key, value in label_to_color.items():
            if key in label:
                color = value
                break
        x0, y0, x1, y1 = box
        draw.rectangle([2.47*x0 - 10, 3.52*y0 - 10, 2.47*x1 + 10, 3.52*y1 + 10], outline=color, width=4)
        draw.text((2.47*x0, 3.52*y0 - 50), label[:7], fill=color, font_size=30)

    image.save(os.path.join(IMAGE_OUTPUT_DIR, obj["id"] + ".png"))
    image.close()