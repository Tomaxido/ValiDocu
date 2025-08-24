import os
import json
import psycopg2
import re
import sys
from collections import defaultdict
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv("SEM_MODEL_NAME", "all-MiniLM-L6-v2")
VECTOR_DIM = 384
JSON_FOLDER = "outputs/"

DB_CONFIG = {
    "dbname": os.getenv("PG_DB", "validocu"),
    "user": os.getenv("PG_USER", "postgres"),
    "password": os.getenv("PG_PASS", "1234"),
    "host": os.getenv("PG_HOST", "host.docker.internal"),
    "port": os.getenv("PG_PORT", "5433")
}

# Archivos
if len(sys.argv) > 1:
    filenames = [os.path.basename(sys.argv[1])]
else:
    filenames = os.listdir(JSON_FOLDER)

model = SentenceTransformer(MODEL_NAME)

# Intentar conexión
try:
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
except Exception as e:
    print(f"⚠️ No se pudo conectar a Postgres: {e}")
    sys.exit(0)

for filename in filenames:
    if not filename.endswith(".json"):
        continue

    match = re.match(r"documento_([a-f0-9\-]+)_([a-f0-9\-]+)\.json", filename)
    if not match:
        print(f"⚠️ Nombre inválido: {filename}")
        continue

    document_id = match.group(1)
    group_id = match.group(2)
    filepath = os.path.join(JSON_FOLDER, filename)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    campos = defaultdict(list)
    for et in data:
        campos[et["label"]].append(et["text"])

    # Extraer datos principales
    tipo = campos.get("TIPO_DOCUMENTO", ["desconocido"])[0]
    deudor = f"{campos.get('NOMBRE_COMPLETO_DEUDOR',['N/A'])[0]} (RUT {campos.get('RUT_DEUDOR',['N/A'])[0]})"
    corredor = f"{campos.get('NOMBRE_COMPLETO_CORREDOR',['N/A'])[0]} (RUT {campos.get('RUT_CORREDOR',['N/A'])[0]})"
    empresa_deudor = campos.get("EMPRESA_DEUDOR", ["N/A"])[0]
    empresa_corredor = campos.get("EMPRESA_CORREDOR", ["N/A"])[0]
    fecha = campos.get("FECHA_ESCRITURA", campos.get("FECHA_EMISION", ["N/A"]))[0]
    monto = campos.get("MONTO", ["N/A"])[0]
    tasa = campos.get("TASA", ["N/A"])[0]
    plazo = campos.get("PLAZO", ["N/A"])[0]

    # Generar resumen legible
    resumen = f"""
    Documento tipo {tipo}, firmado entre {deudor} y {corredor}.
    Empresa Deudor: {empresa_deudor}, Empresa Corredor: {empresa_corredor}.
    Fecha: {fecha}, Monto: {monto}, Tasa: {tasa}, Plazo: {plazo}.
    """.replace("\n", " ").strip()

    # Embeddings
    embedding_resumen = model.encode(resumen).tolist()

    # json_layout igual que antes (compatible con tu frontend)
    json_sql = json.dumps(data, ensure_ascii=False)

    # embeddings extra por campo (opcional, en otra columna si quieres)
    embeddings_por_campo = {}
    for label, textos in campos.items():
        joined = " ".join(textos)
        if joined.strip():
            embeddings_por_campo[label] = model.encode(joined).tolist()

    # Insertar
    cur.execute("""
        INSERT INTO semantic_index (
            document_id, document_group_id, resumen, json_layout, embedding, archivo
        ) VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        document_id,
        group_id,
        resumen,
        json_sql,                # <- el JSON limpio, igual que antes
        embedding_resumen,       # <- vector del resumen
        filename
    ))

    # Si quieres guardar embeddings_por_campo, se mete en otra tabla/columna


    print(f"✅ Insertado: {filename}")

conn.commit()
cur.close()
conn.close()
print("🚀 Fin.")
