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

# ARCHIVO A PROCESAR
if len(sys.argv) > 1:
    filenames = [os.path.basename(sys.argv[1])]
else:
    filenames = os.listdir(JSON_FOLDER)

model = SentenceTransformer(MODEL_NAME)

# Intentar conexión a BD (salir sin error duro si falla)
try:
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
except Exception as e:
    print(f"⚠️ No se pudo conectar a Postgres: {e}")
    sys.exit(0)  # no romper el flujo del backend

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

    ruts = campos.get("RUT", [])
    nombres = campos.get("NOMBRE_COMPLETO", [])
    empresa = campos.get("EMPRESA", [])

    if len(ruts) == 2 and len(nombres) == 2:
        resumen = f"""
        Documento tipo {campos.get("TIPO_DOCUMENTO", ["desconocido"])[0]},
        entre {nombres[0]} (RUT {ruts[0]}) y {nombres[1]} (RUT {ruts[1]}),
        con dirección {campos.get("DIRECCION", ["N/A"])[0]},
        fechado el {campos.get("FECHA", ["N/A"])[0]},
        por un monto de {campos.get("MONTO", ["N/A"])[0]}.
        """
    elif len(ruts) >= 2 and len(empresa) > 0:
        resumen = f"""
        Documento tipo {campos.get("TIPO_DOCUMENTO", ["desconocido"])[0]} firmado por {nombres[0] if nombres else "N/A"}
        (RUT {ruts[0] if ruts else "N/A"}), representando a la empresa {empresa[0]} (RUT {ruts[1] if len(ruts)>1 else 'N/A'}),
        con dirección {campos.get("DIRECCION", ["N/A"])[0]},
        fechado el {campos.get("FECHA", ["N/A"])[0]},
        por un monto de {campos.get("MONTO", ["N/A"])[0]}.
        """
    else:
        resumen = f"""
        Documento tipo {campos.get("TIPO_DOCUMENTO", ["desconocido"])[0]} firmado por {nombres[0] if nombres else "N/A"}
        con RUT {ruts[0] if ruts else "N/A"}, con dirección {campos.get("DIRECCION", ["N/A"])[0]},
        fechado el {campos.get("FECHA", ["N/A"])[0]}, por un monto de {campos.get("MONTO", ["N/A"])[0]}.
        """

    resumen = resumen.replace("\\n", " ").strip()
    embedding = model.encode(resumen).tolist()
    resumen_sql = resumen
    json_sql = json.dumps(data, ensure_ascii=False)

    cur.execute("""
        INSERT INTO semantic_index (
            document_id, document_group_id, resumen, json_layout, embedding, archivo
        ) VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        document_id,
        group_id,
        resumen_sql,
        json_sql,
        embedding,
        filename
    ))

    print(f"✅ Insertado: {filename}")

conn.commit()
cur.close()
conn.close()
print("🚀 Fin.")