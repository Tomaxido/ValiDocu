import os
import json
import psycopg2
import re
import sys
from collections import defaultdict
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"
VECTOR_DIM = 384
JSON_FOLDER = "outputs/"

DB_CONFIG = {
    "dbname": "validocu",
    "user": "postgres",
    "password": "1234",
    "host": "host.docker.internal",
    "port": "5433"
}

# === ARCHIVO A PROCESAR
if len(sys.argv) > 1:
    filenames = [os.path.basename(sys.argv[1])]
else:
    filenames = os.listdir(JSON_FOLDER)

model = SentenceTransformer(MODEL_NAME)
conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

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
        Documento tipo {campos.get("TIPO_DOCUMENTO", ["desconocido"])[0]} firmado por {nombres[0]}
        (RUT {ruts[0]}), representando a la empresa {empresa[0]} (RUT {ruts[1]}),
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

    resumen = resumen.replace("\n", " ").strip()
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
