from fastapi import FastAPI, UploadFile, File, Form, HTTPException
import subprocess
import json
from app import prediccion
from PIL import Image
import io
import os

app = FastAPI()

MODEL_DIR = os.getenv("MODEL_DIR", "/app/modelo_multiclase")

def _assert_model_dir(path: str):
    if not os.path.isdir(path):
        raise FileNotFoundError(f"Modelo no encontrado en: {path}")

@app.post("/procesar/")
async def procesar_documento(
    file: UploadFile = File(...),
    doc_id: str = Form(...),
    group_id: str = Form(...)
):
    try:
        # 1) Guardar imagen temporal
        nombre_img = f"{doc_id}_{group_id}.png"
        ruta_img = os.path.join("outputs", nombre_img)
        contents = await file.read()
        os.makedirs(os.path.dirname(ruta_img), exist_ok=True)
        with open(ruta_img, "wb") as f:
            f.write(contents)

        # 2) Verificar modelo y ejecutar predicción
        _assert_model_dir(MODEL_DIR)

        prediccion.OUTPUT_IMG = os.path.join("outputs", f"resultado_{nombre_img}")
        json_output = os.path.join("outputs", f"documento_{doc_id}_{group_id}.json")

        prediccion.run_prediction(
            image_path=ruta_img,
            model_path=MODEL_DIR,  # <- usa env o volumen montado
            output_img_path=prediccion.OUTPUT_IMG,
            output_json_path=json_output
        )

        # 3) Ejecutar semantic.py con el JSON generado (no romper si falla)
        semantic_rc = 0
        semantic_err = None
        try:
            completed = subprocess.run(
                ["python3", "app/semantic.py", json_output],
                check=False,
                capture_output=True,
                text=True
            )
            semantic_rc = completed.returncode
            if semantic_rc != 0:
                semantic_err = (completed.stderr or completed.stdout or "").strip()
        except Exception as se:
            semantic_rc = -1
            semantic_err = str(se)

        body = {
            "mensaje": "✅ Documento procesado",
            "json": json_output,
            "imagen_procesada": prediccion.OUTPUT_IMG,
            "semantic_status": "ok" if semantic_rc == 0 else "error",
        }
        if semantic_err:
            body["semantic_error"] = semantic_err[:1000]

        return body

    except Exception as e:
        # Devuelve 500 con el error claro, para que puedas verlo en el cliente
        raise HTTPException(status_code=500, detail=f"Error en /procesar: {e}")

from pydantic import BaseModel

class TextoRequest(BaseModel):
    texto: str

@app.post("/vector/")
async def generar_vector(data: TextoRequest):
    from subprocess import check_output, CalledProcessError
    import json

    try:
        result = check_output(["python3", "app/generar_vector.py", data.texto])
        return {"embedding": json.loads(result)}
    except CalledProcessError as cpe:
        return {"error": f"vectorizado falló: {cpe}"}

import base64

@app.post("/pdf_to_images/")
async def convertir_pdf(file: UploadFile = File(...)):
    nombre_archivo = file.filename
    pdf_path = os.path.join("outputs", nombre_archivo)

    os.makedirs("outputs", exist_ok=True)
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