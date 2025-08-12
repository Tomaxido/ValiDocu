import sys
import json
from sentence_transformers import SentenceTransformer

# Modelo
model = SentenceTransformer("all-MiniLM-L6-v2")

# Leer texto desde argumentos
texto = " ".join(sys.argv[1:]).strip()

# Generar embedding
embedding = model.encode(texto).tolist()

# Devolver como JSON plano
print(json.dumps(embedding))
