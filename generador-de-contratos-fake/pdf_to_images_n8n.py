# pdf_to_images.py
import base64
import os
import sys

from pdf2image import convert_from_bytes


def pdf_to_images(pdf_bytes: bytes, pdf_filename: str, output_folder: str = "pdf_images") -> list[str]:
    """
    Convierte un PDF en imágenes PNG y las guarda en output_folder.
    Devuelve una lista de nombres de archivos generados.
    """
    os.makedirs(output_folder, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(pdf_filename))[0]
    pages = convert_from_bytes(pdf_bytes, dpi=300)
    output_files = []

    for i, page in enumerate(pages):
        output_name = f"{base_name}_p{i+1}.png"
        output_path = os.path.join(output_folder, output_name)
        page.save(output_path, "PNG")
        output_files.append(output_path)

    return output_files


if __name__ == "__main__":
    pdf_filename = sys.argv[1]
    pdf_base64 = sys.stdin.buffer.read()
    pdf_bytes = base64.b64decode(pdf_base64)
    output_files = pdf_to_images(pdf_bytes, pdf_filename)
    for png_name in output_files:
        print(png_name)