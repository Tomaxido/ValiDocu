import os
import sys
import json
from pdf2image import convert_from_path

# Ruta absoluta del PDF como argumento
pdf_path = sys.argv[1]

if not os.path.exists(pdf_path):
    print(json.dumps({"error": "Archivo no encontrado"}))
    sys.exit(1)

# Directorio donde se guardarán las imágenes (mismo que el PDF)
output_dir = os.path.dirname(pdf_path)
base_name = os.path.splitext(os.path.basename(pdf_path))[0]

# Convertir a imágenes
pages = convert_from_path(pdf_path, dpi=300)
output_images = []

for i, page in enumerate(pages):
    output_name = f"{base_name}_p{i+1}.png"
    output_path = os.path.join(output_dir, output_name)

    if not os.path.exists(output_path):
        page.save(output_path, "PNG")

    output_images.append(output_path)

# Retornar rutas generadas en formato JSON
print(json.dumps({"images": output_images}))