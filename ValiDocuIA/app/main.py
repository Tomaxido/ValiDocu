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
    master_id: str = Form(...),   # <-- ID del documento completo (estable)
    group_id: str = Form(...),
    page: int = Form(...),        # <-- índice de página (0,1,2,...)
    doc_id: str | None = Form(None)  # <-- opcional, si igual lo quieres guardar en tu BD
):
    try:
        suffix = f"_p{page:04d}"  # 0000, 0001, ...
        base   = f"{master_id}_{doc_id}_{group_id}{suffix}"

        # 1) Guardar imagen temporal
        nombre_img = f"{base}.png"
        ruta_img   = os.path.join("outputs", nombre_img)
        contents   = await file.read()
        os.makedirs(os.path.dirname(ruta_img), exist_ok=True)
        with open(ruta_img, "wb") as f:
            f.write(contents)

        # 2) Ejecutar predicción
        _assert_model_dir(MODEL_DIR)
        prediccion.OUTPUT_IMG = os.path.join("outputs", f"resultado_{base}.png")
        json_output = os.path.join("outputs", f"documento_{base}.json")

        prediccion.run_prediction(
            image_path=ruta_img,
            model_path=MODEL_DIR,
            output_img_path=prediccion.OUTPUT_IMG,
            output_json_path=json_output
        )

        # 3) Agregación semántica
        # semantic.py ya busca TODAS las páginas por prefijo:
        #   "documento_{master_id}_{group_id}_p*.json"
        completed = subprocess.run(
            ["python3", "app/semantic.py", json_output],
            check=False, capture_output=True, text=True
        )

        body = {
            "mensaje": "✅ Página procesada",
            "master_id": master_id,
            "group_id": group_id,
            "page": page,
            "page_doc_id": doc_id,           # por si lo guardas en tu BD
            "json": json_output,
            "imagen_procesada": prediccion.OUTPUT_IMG,
            "semantic_status": "ok" if completed.returncode == 0 else "error",
            "semantic_logs": (completed.stderr or completed.stdout or "").strip()[:1000]
        }
        return body

    except Exception as e:
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