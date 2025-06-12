# pdf_to_images.py
import os
from pdf2image import convert_from_path

def pdf_to_images(pdf_path: str, output_folder: str = "pdf_images") -> list[str]:
    """
    Convierte un PDF en imágenes PNG y las guarda en output_folder.
    Devuelve una lista de nombres de archivos generados.
    """
    os.makedirs(output_folder, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    pages = convert_from_path(pdf_path, dpi=300)
    output_files = []

    for i, page in enumerate(pages):
        output_name = f"{base_name}_p{i+1}.png"
        output_path = os.path.join(output_folder, output_name)
        page.save(output_path, "PNG")
        output_files.append(output_path)

    return output_files
