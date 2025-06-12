import json
import os
import sys
from uuid import uuid4

from fpdf import FPDF

from estructuras_de_contratos import EstructurasContrato
from pdf_to_images import pdf_to_images

pdf_folder = "contratos"

def guardar_pdf(texto: str, nombre_archivo: str, carpeta: str = "contratos") -> None:
    os.makedirs(carpeta, exist_ok=True)
    pdf = FPDF()
    pdf.add_page()
    # ¡Agrega una fuente TTF que soporte español!
    pdf.add_font("DejaVu", "", "DejaVuSans.ttf")
    pdf.set_font("DejaVu", size=12)
    pdf.set_auto_page_break(auto=True, margin=15)
    for linea in texto.split('\n'):
        if linea.strip() == "":
            pdf.ln(8)  # Espacio entre párrafos
        else:
            # Limita largo de líneas, por si acaso
            pdf.multi_cell(0, 10, linea, new_x="LEFT", new_y="NEXT")
    pdf.output(os.path.join(carpeta, nombre_archivo))

def guardar_json(
    palabras: list[str],
    etiquetas: list[str],
    nombre_archivo: str,
    carpeta: str = "etiquetas",
) -> None:
    os.makedirs(carpeta, exist_ok=True)
    content = json.JSONEncoder(indent=4, ensure_ascii=False).encode(
        dict(id=nombre_archivo + ".png", words=palabras, labels=etiquetas)
    ).encode(encoding="utf-8")
    with open(os.path.join(carpeta, nombre_archivo + ".json"), "wb") as file:
        file.write(content)


def main() -> None:
    # Por defecto solo 1 contrato
    cantidad = 1

    # Si se pasa un argumento (ej: python generador_de_contratos.py 10), úsalo como cantidad
    if len(sys.argv) > 1:
        try:
            cantidad = int(sys.argv[1])
        except ValueError:
            print("El argumento debe ser un número entero, se usará 1 contrato por defecto.")



    for i in range(cantidad):
        plantilla_contrato, D = EstructurasContrato.random_structure()
        contrato = plantilla_contrato.format(**D)
        palabras, etiquetas = EstructurasContrato.obtener_palabras_y_etiquetas(plantilla_contrato, D)
        nombre_archivo = f"{uuid4()}_{i+1}"
        guardar_pdf(contrato, nombre_archivo + ".pdf")
        pdf_path = os.path.join(pdf_folder, nombre_archivo + ".pdf")
        pdf_to_images(pdf_path, output_folder="pdf_images")
        guardar_json(palabras, etiquetas, nombre_archivo+"-p1")
        print(f"Contrato generado: {nombre_archivo}")

if __name__ == "__main__":
    main()

