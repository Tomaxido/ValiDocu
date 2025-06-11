import json
import os
from uuid import uuid4

from fpdf import FPDF

from estructuras_de_contratos import EstructurasContrato


def guardar_pdf(texto: str, nombre_archivo: str, carpeta: str = "contratos") -> None:
    os.makedirs(carpeta, exist_ok=True)
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font("Arial", size=12)
    for linea in texto.split('\n'):
        pdf.multi_cell(0, 10, linea)
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
    cantidad = 20  # O la cantidad que quieras
    for i in range(cantidad):
        plantilla_contrato, D = EstructurasContrato.random_structure()
        contrato = plantilla_contrato.format(**D)
        palabras, etiquetas = EstructurasContrato.obtener_palabras_y_etiquetas(plantilla_contrato, D)
        nombre_archivo = f"{uuid4()}_{i+1}"
        guardar_pdf(contrato, nombre_archivo + ".pdf")
        guardar_json(palabras, etiquetas, nombre_archivo+"-p1")
        print(f"Contrato generado: {nombre_archivo}")

if __name__ == "__main__":
    main()

