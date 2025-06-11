from fpdf import FPDF
import os
from estructuras_de_contratos import EstructurasContrato

def guardar_pdf(texto: str, nombre_archivo: str, carpeta: str = 'contratos') -> None:
    os.makedirs(carpeta, exist_ok=True)
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font("Arial", size=12)
    for linea in texto.split('\n'):
        pdf.multi_cell(0, 10, linea)
    pdf.output(os.path.join(carpeta, nombre_archivo))

def main() -> None:
    cantidad = 20  # O la cantidad que quieras
    for i in range(cantidad):
        contrato, nombre = EstructurasContrato.random_structure()
        nombre_pdf = f"contrato_{i+1}.pdf"
        guardar_pdf(contrato, nombre_pdf)
        print(f"Contrato generado: {nombre_pdf}")

if __name__ == "__main__":
    main()
