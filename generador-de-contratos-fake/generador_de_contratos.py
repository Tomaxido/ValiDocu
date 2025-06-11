from fpdf import FPDF
import os
from estructuras_de_contratos import EstructurasContrato
from uuid import uuid4

def guardar_pdf(texto: str, nombre_archivo: str, carpeta: str = 'contratos') -> None:
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

def main() -> None:
    cantidad = 20  # O la cantidad que quieras
    for i in range(cantidad):
        contrato, nombre = EstructurasContrato.random_structure()
        nombre_pdf = f"{uuid4()}_{i+1}.pdf"
        guardar_pdf(contrato, nombre_pdf)
        print(f"Contrato generado: {nombre_pdf}")

if __name__ == "__main__":
    main()
