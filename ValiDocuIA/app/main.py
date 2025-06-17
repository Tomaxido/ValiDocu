from fastapi import FastAPI, UploadFile, File, Form
import subprocess
import json
from app import prediccion
from PIL import Image
import io
import os

app = FastAPI()

@app.post("/procesar/")
async def procesar_documento(
    file: UploadFile = File(...),
    doc_id: str = Form(...),
    group_id: str = Form(...)
):
    # === 1. Guardar imagen temporal
    nombre_img = f"{doc_id}_{group_id}.png"
    ruta_img = f"outputs/{nombre_img}"
    contents = await file.read()
    with open(ruta_img, "wb") as f:
        f.write(contents)

    # === 2. Ejecutar predicción
    prediccion.IMAGE_PATH = ruta_img
    prediccion.MODEL_PATH = "outputs/modelo_multiclase"
    prediccion.OUTPUT_IMG = f"outputs/resultado_{nombre_img}"
    json_output = f"outputs/documento_{doc_id}_{group_id}.json"
    prediccion.OUTPUT_JSON = json_output
    prediccion.run_prediction(
        image_path=ruta_img,
        model_path="modelo_multiclase",
        output_img_path=prediccion.OUTPUT_IMG,
        output_json_path=json_output
    )
    # === 3. Ejecutar semantic.py con nombre del archivo
    subprocess.run(["python3", "app/semantic.py", json_output])

    return {
        "mensaje": "✅ Documento procesado",
        "json": json_output,
        "imagen_procesada": prediccion.OUTPUT_IMG
    }

from pydantic import BaseModel

class TextoRequest(BaseModel):
    texto: str

@app.post("/vector/")
async def generar_vector(data: TextoRequest):
    from subprocess import check_output
    import json

    result = check_output(["python3", "app/generar_vector.py", data.texto])
    return {"embedding": json.loads(result)}

import base64

@app.post("/pdf_to_images/")
async def convertir_pdf(file: UploadFile = File(...)):
    nombre_archivo = file.filename
    pdf_path = os.path.join("outputs", nombre_archivo)

    with open(pdf_path, "wb") as f:
        f.write(await file.read())

    try:
        from pdf2image import convert_from_path

        pages = convert_from_path(pdf_path, dpi=300)
        result = []

        for i, page in enumerate(pages):
            filename = f"{os.path.splitext(nombre_archivo)[0]}_p{i+1}.png"
            output_path = os.path.join("outputs", filename)
            page.save(output_path, "PNG")

            # Codificamos en base64 para mandarlo a Laravel
            with open(output_path, "rb") as img_f:
                b64img = base64.b64encode(img_f.read()).decode()

            result.append({
                "filename": filename,
                "content_base64": b64img
            })

        return {"images": result}

    except Exception as e:
        return {"error": str(e)}
