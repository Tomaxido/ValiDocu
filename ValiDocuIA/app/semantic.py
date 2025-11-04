# semantic.py
# -----------------------------------------------------------------------------
# Indexación por página (semantic_index) + consolidado por documento (semantic_doc_index)
# - Page-level: document_id = doc_id (documents.id de la PNG)
# - Doc-level : document_id = master_id (documents.id del PDF original)
# Acepta archivos: documento_{master}_{doc}_{group}_pNNNN.json
#                  documento_{master}_{group}_pNNNN.json  (formato antiguo sin doc)
# Inserta aunque falten columnas: detecta columnas presentes en cada tabla.
# Retorna exit code 2 si no pudo conectar o escribir en BD (para que FastAPI lo reporte).
# -----------------------------------------------------------------------------

import os
import json
import psycopg2
import re
import sys
import logging
from datetime import datetime, date
from collections import defaultdict
from typing import List, Dict, Any, Tuple, Optional, Set
import unicodedata

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None  # permite correr sin el paquete en entornos mínimos


# =========================
# Configuración de Logging
# =========================
LOG_DIR = os.getenv("LOG_DIR", "outputs/logs")
os.makedirs(LOG_DIR, exist_ok=True)

# Configurar logging con archivo y consola
log_filename = os.path.join(LOG_DIR, f"semantic_{datetime.now().strftime('%Y%m%d')}.log")

# Crear logger
logger = logging.getLogger('semantic')
logger.setLevel(logging.DEBUG)

# Formato detallado
formatter = logging.Formatter(
    '%(asctime)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Handler para archivo (DEBUG level)
file_handler = logging.FileHandler(log_filename, encoding='utf-8')
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(formatter)

# Handler para consola (INFO level)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(formatter)

# Agregar handlers
logger.addHandler(file_handler)
logger.addHandler(console_handler)

logger.info("="*80)
logger.info("🚀 Iniciando semantic.py")
logger.info(f"📁 Log file: {log_filename}")
logger.info("="*80)


# =========================
# Configuración
# =========================
MODEL_NAME = os.getenv("SEM_MODEL_NAME", "all-MiniLM-L6-v2")
JSON_FOLDER = os.getenv("JSON_FOLDER", "outputs/")
TABLE_NAME = os.getenv("SEM_TABLE", "semantic_index")                 # page-level (existente)
DOC_TABLE_NAME = os.getenv("SEM_TABLE_DOC", "semantic_doc_index")     # doc-level (nuevo)
WRITE_GLOBAL_FILE = os.getenv("SEM_WRITE_GLOBAL_FILE", "1") == "1"

DB_CONFIG = {
    "dbname": os.getenv("PG_DB", "validocu"),
    "user": os.getenv("PG_USER", "postgres"),
    "password": os.getenv("PG_PASS", "1234"),
    "host": os.getenv("PG_HOST", "host.docker.internal"),
    "port": os.getenv("PG_PORT", "5433"),
}

logger.info(f"🔧 Configuración:")
logger.info(f"  - MODEL_NAME: {MODEL_NAME}")
logger.info(f"  - JSON_FOLDER: {JSON_FOLDER}")
logger.info(f"  - TABLE_NAME: {TABLE_NAME}")
logger.info(f"  - DOC_TABLE_NAME: {DOC_TABLE_NAME}")
logger.info(f"  - DB_HOST: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
logger.info(f"  - DB_NAME: {DB_CONFIG['dbname']}")
logger.info(f"  - DB_USER: {DB_CONFIG['user']}")


# =========================
# Utilidades comunes
# =========================
def unify_label(lbl: str) -> str:
    return re.sub(r"^(B-|I-)", "", (lbl or "")).strip()


def normalize_spaces(x: str) -> str:
    return re.sub(r"\s+", " ", (x or "").strip())


def only_digits(x: str) -> str:
    return re.sub(r"\D", "", x or "")


def fold_ascii(s: str) -> str:
    """ lowercase + quitar tildes/acentos y puntuación externa básica """
    if s is None:
        return ""
    s = unicodedata.normalize("NFKD", s)
    s = s.encode("ascii", "ignore").decode("ascii")
    s = s.strip().lower()
    return s


def strip_trailing_punct(s: str) -> str:
    return (s or "").strip().strip(" ,.;:()[]{}")


PLACEHOLDERS = {
    "GENERO": {"genero"},
    "NACIONALIDAD": {"nacionalidad"},
    "MONTO": {"monto"},
    "MONEDA": {"moneda"},
    "CIUDAD": {"ciudad"},
    "DIRECCION": {"direccion", "dirección"},
    "RUT": {"rut"},
    "RUT_DEUDOR": {"rut"},
    "RUT_CORREDOR": {"rut"},
    "EMPRESA": {"empresa"},
    "EMPRESA_DEUDOR": {"empresa"},
    "EMPRESA_CORREDOR": {"empresa"},
    "NOMBRE_COMPLETO": {"nombre", "nombre completo"},
    "NOMBRE_COMPLETO_DEUDOR": {"nombre completo"},
    "NOMBRE_COMPLETO_CORREDOR": {"nombre completo"},
    "TIPO_DOCUMENTO": {"tipo documento", "tipo de documento"},
    "ID_REGISTRO": {"id", "id registro"},
}


def is_placeholder(label: str, text: str) -> bool:
    lab = unify_label(label).upper()
    t = fold_ascii(strip_trailing_punct(text))
    return t in PLACEHOLDERS.get(lab, set())


def clean_rut_value(text: str) -> str:
    if not text:
        return text
    t = strip_trailing_punct(text).upper().replace(".", "").replace(" ", "")
    # sólo deja dígitos + K
    t = re.sub(r"[^0-9K]", "", t)
    if len(t) < 2:
        return text.strip()
    rut, dv = t[:-1], t[-1]
    return f"{rut}-{dv}"


def clean_value_for_label(label: str, text: str) -> str:
    if not text:
        return text
    lbl = unify_label(label).upper()
    v = strip_trailing_punct(text)
    if lbl in {"RUT", "RUT_DEUDOR", "RUT_CORREDOR", "EMPRESA_DEUDOR_RUT", "EMPRESA_CORREDOR_RUT"}:
        return clean_rut_value(v)
    return v


# =========================
# Validadores / Scorers
# =========================
def rut_is_valid(rut: str) -> bool:
    if not rut:
        return False
    r = rut.replace(".", "").replace(" ", "").upper()
    m = re.match(r"^(\d+)-([\dK])$", r)
    if not m:
        return False
    cuerpo, dv = m.group(1), m.group(2)
    s = 0
    mult = 2
    for d in reversed(cuerpo):
        s += int(d) * mult
        mult += 1
        if mult > 7:
            mult = 2
    res = 11 - (s % 11)
    dv_ok = "0" if res == 11 else "K" if res == 10 else str(res)
    return dv_ok == dv


def score_rut(text: str) -> float:
    t = normalize_spaces(text)
    score = 0.0
    if re.search(r"\d{1,3}(\.\d{3})*-\d|K$", t):
        score += 0.5
    if rut_is_valid(t):
        score += 1.0
    if re.search(r"[A-Z]{2,}", t.replace("K", "")):
        score -= 0.2
    return score


def parse_date_any(s: str) -> Optional[date]:
    s = normalize_spaces(s)
    fmts = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d.%m.%Y"]
    for f in fmts:
        try:
            return datetime.strptime(s, f).date()
        except Exception:
            pass
    m = re.search(r"(\d{1,2})[^\d](\d{1,2})[^\d](\d{4})", s)
    if m:
        dd, mm, yyyy = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            return date(yyyy, mm, dd)
        except Exception:
            return None
    return None


def score_fecha(text: str, kind: str = "") -> float:
    d = parse_date_any(text)
    if not d:
        return 0.0
    score = 0.5
    today = date.today()
    if kind == "FECHA_NACIMIENTO":
        if date(1900, 1, 1) <= d <= today:
            score += 0.4
        age = today.year - d.year - ((today.month, today.day) < (d.month, d.day))
        if 18 <= age <= 100:
            score += 0.3
    elif kind in ("FECHA_ESCRITURA", "FECHA_EMISION"):
        if date(1900, 1, 1) <= d <= today:
            score += 0.4
    elif kind == "FECHA_VENCIMIENTO":
        if date(1900, 1, 1) <= d <= date(2100, 12, 31):
            score += 0.4
        if d >= today:
            score += 0.1
    else:
        if date(1900, 1, 1) <= d <= date(2100, 12, 31):
            score += 0.2
    return score


def parse_number(text: str) -> float:
    t = (text or "").replace(" ", "")
    if "." in t and "," in t:
        t = t.replace(".", "").replace(",", ".")
    else:
        t = t.replace(",", "")
    m = re.search(r"(-?\d+(\.\d+)?)+", t)
    if not m:
        return 0.0
    try:
        return float(m.group(0))
    except Exception:
        return 0.0


def score_moneda(text: str) -> float:
    t = (text or "").upper()
    score = 0.0
    if any(sym in t for sym in ["$", "CLP", "UF", "USD", "US$", "EUR"]):
        score += 0.6
    return score


def score_monto(text: str) -> float:
    n = parse_number(text)
    score = 0.0
    if n > 0:
        score += 0.5
        if n >= 1000:
            score += 0.2
        if n >= 1_000_000:
            score += 0.1
    score += score_moneda(text) * 0.6
    return score


def score_tasa(text: str) -> float:
    t = (text or "").replace(" ", "")
    score = 0.0
    if "%" in t:
        score += 0.5
    m = re.search(r"(\d+([.,]\d+)?)%?", t)
    if m:
        try:
            val = float(m.group(1).replace(",", "."))
            if 0 <= val <= 100:
                score += 0.5
            if re.search(r"(anual|anuales|mensual|mensuales|EA|NAM|TNA|TEM)", text or "", re.I):
                score += 0.1
        except Exception:
            pass
    return score


def score_plazo(text: str) -> float:
    t = normalize_spaces(text).lower()
    score = 0.0
    if re.search(r"\b(d[ií]as|mes(es)?|a[nñ]o(s)?)\b", t):
        score += 0.5
    if re.search(r"\d+", t):
        score += 0.3
    return score


def score_nombre(text: str) -> float:
    t = normalize_spaces(text)
    tokens = t.split()
    score = 0.0
    if not re.search(r"\d", t):
        score += 0.2
    if 2 <= len(tokens) <= 4:
        score += 0.4
    good_tokens = sum(1 for tok in tokens if re.match(r"^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$", tok))
    if good_tokens >= max(1, len(tokens) - 1):
        score += 0.3
    return score


def score_empresa(text: str) -> float:
    t = normalize_spaces(text).upper()
    score = 0.0
    if any(suf in t for suf in [" S.A.", " SPA", " LTDA", " EIRL", " SA "]):
        score += 0.5
    if re.search(r"[A-Z]{3,}", t):
        score += 0.2
    if not re.search(r"\d{4,}", t):
        score += 0.1
    return score


def score_direccion(text: str) -> float:
    t = normalize_spaces(text).lower()
    score = 0.0
    if re.search(r"\b(av\.?|avenida|calle|pasaje|psje\.?)\b", t):
        score += 0.4
    if re.search(r"(#|n°|num\.?)\s*\d+", t, re.I) or re.search(r"\b\d{1,5}\b", t):
        score += 0.3
    return score


def score_ciudad(text: str) -> float:
    t = normalize_spaces(text)
    score = 0.0
    if not re.search(r"\d", t):
        score += 0.3
    if 1 <= len(t.split()) <= 3:
        score += 0.3
    return score


def score_moneda_label(text: str) -> float:
    t = normalize_spaces(text).upper()
    score = 0.0
    if t in ("CLP", "UF", "USD", "EUR"):
        score += 0.8
    if any(sym in t for sym in ["$", "US$", "€"]):
        score += 0.4
    return max(score, score_moneda(text))


def score_tipo_documento(text: str) -> float:
    t = normalize_spaces(text).upper()
    score = 0.0
    dic = ["PAGARE", "MUTUO", "ESCRITURA", "CONTRATO", "FACTURA", "CESION"]
    if any(w in t for w in dic):
        score += 0.6
    if len(t) <= 40:
        score += 0.2
    return score


def score_nacionalidad(text: str) -> float:
    t = normalize_spaces(text).lower()
    score = 0.0
    if re.search(r"(chilena|chileno|argentina|argentino|peruana|peruano|boliviana|boliviano|espa[ñn]ola|espa[ñn]ol)", t):
        score += 0.6
    if not re.search(r"\d", t):
        score += 0.2
    return score


def score_genero(text: str) -> float:
    t = fold_ascii(strip_trailing_punct(text))
    # Penaliza placeholder
    if t in {"genero"}:
        return -0.5
    score = 0.0
    # Acepta variantes
    if t in {"m", "masculino", "hombre"}:
        score += 0.7
    if t in {"f", "femenino", "mujer"}:
        score += 0.7
    if t in {"no binario", "no-binario", "nb", "x"}:
        score += 0.6
    return score


def score_generic(text: str) -> float:
    return 0.1 if (text and text.strip()) else 0.0


SCORERS = {
    # RUTs
    "RUT": score_rut,
    "RUT_DEUDOR": score_rut,
    "RUT_CORREDOR": score_rut,
    "EMPRESA_DEUDOR_RUT": score_rut,
    "EMPRESA_CORREDOR_RUT": score_rut,
    # Fechas
    "FECHA_NACIMIENTO": lambda t: score_fecha(t, "FECHA_NACIMIENTO"),
    "FECHA_ESCRITURA":  lambda t: score_fecha(t, "FECHA_ESCRITURA"),
    "FECHA_EMISION":    lambda t: score_fecha(t, "FECHA_EMISION"),
    "FECHA_VENCIMIENTO":lambda t: score_fecha(t, "FECHA_VENCIMIENTO"),
    # Numéricos
    "MONTO": score_monto,
    "TASA":  score_tasa,
    "PLAZO": score_plazo,
    # Personas/empresas
    "NOMBRE_COMPLETO":           score_nombre,
    "NOMBRE_COMPLETO_DEUDOR":    score_nombre,
    "NOMBRE_COMPLETO_CORREDOR":  score_nombre,
    "EMPRESA":           score_empresa,
    "EMPRESA_DEUDOR":    score_empresa,
    "EMPRESA_CORREDOR":  score_empresa,
    # Otros
    "DIRECCION": score_direccion,
    "CIUDAD":    score_ciudad,
    "MONEDA":    score_moneda_label,
    "TIPO_DOCUMENTO": score_tipo_documento,
    "NACIONALIDAD":   score_nacionalidad,
    "GENERO":         score_genero,
}


def score_for_label(label: str, text: str) -> float:
    # Placeholder -> fuertemente penalizado
    if is_placeholder(label, text):
        return -0.5
    fn = SCORERS.get(label)
    s = fn(text) if fn else score_generic(text)
    return s


def choose_best_for_label(label: str, candidates: List[Tuple[str, Dict[str, Any]]]) -> Tuple[Optional[str], Optional[Dict[str, Any]], float]:
    best, best_meta, best_score = None, None, float("-inf")
    for text, meta in candidates:
        s = score_for_label(label, text)
        if meta and isinstance(meta.get("page"), int):
            s += max(0.0, 0.1 - 0.01 * meta["page"])  # leve sesgo a páginas iniciales
        if s > best_score:
            best, best_meta, best_score = text, meta, s
    return best, best_meta, best_score


def build_json_global(all_items: List[Dict[str, Any]]) -> Dict[str, str]:
    cands: Dict[str, List[Tuple[str, Dict[str, Any]]]] = defaultdict(list)
    for et in all_items:
        lbl = unify_label(et.get("label", ""))
        txt = normalize_spaces(et.get("text", ""))
        if lbl and txt:
            meta = {k: et.get(k) for k in ("page", "boxes", "score", "conf", "line", "word_idx") if k in et}
            cands[lbl].append((txt, meta))
    out: Dict[str, str] = {}
    for lbl, cand in cands.items():
        best, _, _ = choose_best_for_label(lbl, cand)
        if best and not is_placeholder(lbl, best):
            out[lbl] = clean_value_for_label(lbl, best)
    return out


def build_resumen(global_map: Dict[str, str]) -> str:
    tipo = global_map.get("TIPO_DOCUMENTO", "desconocido")
    deudor_nombre = global_map.get("NOMBRE_COMPLETO_DEUDOR") or global_map.get("NOMBRE_COMPLETO")
    deudor_rut    = global_map.get("RUT_DEUDOR") or global_map.get("RUT")
    corred_nombre = global_map.get("NOMBRE_COMPLETO_CORREDOR")
    corred_rut    = global_map.get("RUT_CORREDOR")
    empresa_deudor   = global_map.get("EMPRESA_DEUDOR") or global_map.get("EMPRESA")
    empresa_corredor = global_map.get("EMPRESA_CORREDOR")
    fecha_escritura  = global_map.get("FECHA_ESCRITURA")
    fecha_emision    = global_map.get("FECHA_EMISION")
    fecha_venc       = global_map.get("FECHA_VENCIMIENTO")
    monto = global_map.get("MONTO")
    tasa  = global_map.get("TASA")
    plazo = global_map.get("PLAZO")

    resumen = (
        f"Documento tipo {tipo}, "
        f"firmado entre {deudor_nombre or 'N/A'} (RUT {deudor_rut or 'N/A'}) "
        f"y {corred_nombre or 'N/A'} (RUT {corred_rut or 'N/A'}). "
        f"Empresa Deudor: {empresa_deudor or 'N/A'}, Empresa Corredor: {empresa_corredor or 'N/A'}. "
        f"Fechas: escritura={fecha_escritura or 'N/A'}, emisión={fecha_emision or 'N/A'}, vencimiento={fecha_venc or 'N/A'}. "
        f"Condiciones: monto={monto or 'N/A'}, tasa={tasa or 'N/A'}, plazo={plazo or 'N/A'}."
    )
    return resumen


# =========================
# DB helpers
# =========================
def connect_db():
    logger.info(f"🗄️ Conectando a Postgres host={DB_CONFIG.get('host')} port={DB_CONFIG.get('port')} db={DB_CONFIG.get('dbname')} user={DB_CONFIG.get('user')}")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        logger.info("✅ Conexión a BD exitosa")
        return conn, cur
    except Exception as e:
        logger.error(f"❌ No se pudo conectar a Postgres: {e}")
        return None, None


def get_table_columns(cur, table_name: str) -> Set[str]:
    cols: Set[str] = set()
    try:
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s
        """, (table_name,))
        for (col,) in cur.fetchall():
            cols.add(col)
        logger.debug(f"📋 Columnas en {table_name}: {sorted(cols)}")
    except Exception as e:
        logger.error(f"⚠️ No se pudieron leer columnas de {table_name}: {e}")
    return cols


def delete_then_insert_dynamic(cur, table: str, key_col: str, key_val, payload: Dict[str, Any], present_cols: Set[str]) -> bool:
    """
    Borra por clave y re-inserta sólo columnas presentes en la tabla.
    Devuelve True si pudo escribir, False si falló.
    """
    logger.debug(f"🗑️ DELETE FROM {table} WHERE {key_col} = {key_val}")
    try:
        cur.execute(f'DELETE FROM "{table}" WHERE "{key_col}" = %s', (key_val,))
        logger.debug(f"  Filas eliminadas: {cur.rowcount}")
    except Exception as e:
        logger.error(f"❌ DELETE en {table} falló: {e}")
        return False

    # Filtra payload por columnas presentes
    cols = [c for c in payload.keys() if c in present_cols]
    if not cols:
        logger.warning(f"⚠️ Nada para insertar en {table}: ninguna de las columnas existe.")
        logger.debug(f"  Payload keys: {list(payload.keys())}")
        logger.debug(f"  Present cols: {list(present_cols)}")
        return False

    placeholders = ", ".join(["%s"] * len(cols))
    colnames = ", ".join(f'"{c}"' for c in cols)
    sql = f'INSERT INTO "{table}" ({colnames}) VALUES ({placeholders})'
    vals = [payload[c] for c in cols]

    logger.debug(f"💾 INSERT en {table} con {len(cols)} columnas: {cols}")
    try:
        cur.execute(sql, vals)
        logger.info(f"✅ INSERT en {table} exitoso")
        return True
    except Exception as e:
        logger.error(f"❌ INSERT en {table} falló: {e}")
        logger.debug(f"  SQL: {sql}")
        logger.debug(f"  Valores (primeros 3): {vals[:3]}")
        return False


# =========================
# Main
# =========================
def main():
    logger.info("="*80)
    logger.info("📋 Iniciando procesamiento de documentos")
    
    # Modelo (si existe sentence_transformers, si no, usa embedding vacío)
    model = None
    if SentenceTransformer is not None:
        try:
            logger.info(f"🤖 Cargando modelo: {MODEL_NAME}")
            model = SentenceTransformer(MODEL_NAME)
            logger.info("✅ Modelo cargado exitosamente")
        except Exception as e:
            logger.warning(f"⚠️ No se pudo cargar modelo {MODEL_NAME}: {e}")
    else:
        logger.warning("⚠️ sentence_transformers no disponible, embeddings estarán vacíos")

    # Archivos objetivo
    if len(sys.argv) > 1:
        targets = [os.path.basename(sys.argv[1])]
        logger.info(f"🎯 Procesando archivo específico: {targets[0]}")
    else:
        try:
            targets = [f for f in os.listdir(JSON_FOLDER) if f.startswith("documento_") and f.endswith(".json")]
            logger.info(f"🎯 Buscando archivos en {JSON_FOLDER}")
            logger.info(f"📄 Encontrados {len(targets)} archivos para procesar")
        except Exception as e:
            logger.error(f"❌ Error listando archivos en {JSON_FOLDER}: {e}")
            sys.exit(2)

    if not targets:
        logger.warning("⚠️ No se encontraron archivos para procesar")
        sys.exit(0)

    conn, cur = connect_db()
    DB_OK = cur is not None
    DB_WRITE_OK = True

    if not DB_OK:
        logger.error("❌ No hay conexión a BD - ABORTANDO")
        sys.exit(2)

    # Pre-carga columnas de tablas (si hay conexión)
    if cur:
        logger.info("📊 Obteniendo estructura de tablas...")
        page_cols = get_table_columns(cur, TABLE_NAME)
        doc_cols  = get_table_columns(cur, DOC_TABLE_NAME)
        logger.info(f"  ✓ {TABLE_NAME}: {len(page_cols)} columnas")
        logger.info(f"  ✓ {DOC_TABLE_NAME}: {len(doc_cols)} columnas")
    else:
        page_cols, doc_cols = set(), set()

    processed_count = 0
    error_count = 0

    for idx, filename in enumerate(targets, 1):
        logger.info("="*80)
        logger.info(f"📄 [{idx}/{len(targets)}] Procesando: {filename}")
        
        # Solo aceptamos prefijo documento_
        if not filename.endswith(".json") or not filename.startswith("documento_"):
            logger.warning(f"⚠️ Archivo ignorado (formato incorrecto): {filename}")
            continue

        name_wo_ext = filename[:-5]  # sin .json

        # Formato: documento_{master_id}_{version_id}_{page_id}_{group_id}_pNNNN
        # group_id puede ser un número o "loose" para documentos sueltos
        m = re.match(r"^documento_(\d+)_(\d+)_(\d+)_(\w+)_p(\d+)$", name_wo_ext)

        if m:
            master_id = int(m.group(1))
            version_id = int(m.group(2))
            page_id = int(m.group(3))
            group_id_str = m.group(4)
            # Convertir group_id a int si es numérico, None si es "loose"
            group_id = int(group_id_str) if group_id_str.isdigit() else None
            page_idx = int(m.group(5))
            logger.info(f"  📌 master_id={master_id}")
            logger.info(f"  📌 version_id={version_id}")
            logger.info(f"  📌 page_id={page_id}")
            logger.info(f"  📌 group_id={group_id} (original: {group_id_str})")
            logger.info(f"  📌 page_number={page_idx}")
        else:
            logger.error(f"❌ Nombre de archivo inválido: {filename}")
            logger.error(f"  Formato esperado: documento_{{master}}_{{version}}_{{page_id}}_{{group|loose}}_pNNNN.json")
            error_count += 1
            continue

        current_page_json = os.path.join(JSON_FOLDER, filename)

        # ----------------- A) Cargar SOLO la página actual (page-level) -----------------
        logger.info("📖 Cargando JSON de la página...")
        try:
            with open(current_page_json, "r", encoding="utf-8") as f:
                page_items = json.load(f)
            logger.info(f"  ✓ JSON cargado: {len(page_items)} items detectados")
            logger.debug(f"  Primeros 3 items: {page_items[:3]}")
        except Exception as e:
            logger.error(f"❌ No se pudo leer {current_page_json}: {e}")
            error_count += 1
            continue

        # Asegura 'page'
        for it in page_items:
            if "page" not in it:
                it["page"] = page_idx

        # Resumen/embedding por página (muy corto, opcional)
        page_resumen = f"Página {page_idx} del documento {master_id} (grupo {group_id})."
        logger.debug(f"  Resumen generado: {page_resumen}")
        
        page_embedding = (model.encode(page_resumen).tolist() if model else [])
        if model:
            logger.debug(f"  Embedding generado: {len(page_embedding)} dimensiones")

        page_json_layout_sql = json.dumps(page_items, ensure_ascii=False)
        page_archivo = os.path.basename(current_page_json)

        # Escribir page-level con document_version_id y document_page_id
        logger.info(f"💾 Escribiendo en {TABLE_NAME}...")
        if cur and page_id is not None:
            payload_page = {
                "document_version_id": version_id,
                "document_page_id": page_id,
                "document_group_id": group_id,
                "resumen": page_resumen,
                "json_layout": page_json_layout_sql,
                "embedding": json.dumps(page_embedding),  # por compatibilidad si embedding no es jsonb
                "archivo": page_archivo,
            }
            logger.debug(f"  Payload keys: {list(payload_page.keys())}")
            ok = delete_then_insert_dynamic(cur, TABLE_NAME, "document_page_id", page_id, payload_page, page_cols)
            DB_WRITE_OK = DB_WRITE_OK and ok
            if ok:
                processed_count += 1
            else:
                error_count += 1
        else:
            logger.warning("  ⚠️ No se puede escribir: cur o page_id es None")

        # ------------- B) Recolectar TODAS las páginas del mismo master_id/version_id/group_id -------------
        logger.info("🔍 Buscando todas las páginas del mismo documento...")
        all_items: List[Dict[str, Any]] = []
        try:
            candidates = []
            for f in os.listdir(JSON_FOLDER):
                if not (f.startswith("documento_") and f.endswith(".json")):
                    continue
                nx = f[:-5]
                # documento_{master_id}_{version_id}_{page_id}_{group_id}_pNNNN
                # group_id puede ser número o "loose"
                m_any = re.match(r"^documento_(\d+)_(\d+)_(\d+)_(\w+)_p(\d+)$", nx)
                if not m_any:
                    continue
                
                # Extraer y comparar master_id, version_id
                file_master = int(m_any.group(1))
                file_version = int(m_any.group(2))
                file_group_str = m_any.group(4)
                
                # Convertir file_group_id igual que group_id
                file_group_id = int(file_group_str) if file_group_str.isdigit() else None
                
                # Comparar todos los IDs
                if file_master != master_id or file_version != version_id or file_group_id != group_id:
                    continue
                    
                candidates.append((f, int(m_any.group(5))))

            candidates.sort(key=lambda x: x[1])
            logger.info(f"  ✓ Encontradas {len(candidates)} páginas para master={master_id}, version={version_id}, group={group_id}")
            logger.debug(f"  Páginas: {[pg for _, pg in candidates]}")

            for f, pg in candidates:
                ppath = os.path.join(JSON_FOLDER, f)
                try:
                    with open(ppath, "r", encoding="utf-8") as fh:
                        itms = json.load(fh)
                    logger.debug(f"    ✓ Página {pg}: {len(itms)} items")
                    for it in itms:
                        it = dict(it)
                        it.setdefault("page", pg)
                        all_items.append(it)
                except Exception as e:
                    logger.error(f"❌ No se pudo leer {ppath}: {e}")
        except Exception as e:
            logger.error(f"❌ Error listando páginas: {e}")
            # en caso extremo, al menos usa la página actual
            all_items = page_items[:]

        if not all_items:
            logger.warning("⚠️ No hay items para consolidar en doc-level, saltando...")
            continue

        logger.info(f"  ✓ Total items consolidados: {len(all_items)}")

        # ------------- C) Construir json_global y resumen global (doc-level) -------------
        logger.info("🏗️ Construyendo json_global y resumen consolidado...")
        json_global = build_json_global(all_items)
        logger.info(f"  ✓ json_global construido: {len(json_global)} labels únicos")
        logger.debug(f"  Labels: {list(json_global.keys())}")
        
        resumen = build_resumen(json_global)
        logger.info(f"  ✓ Resumen generado: {len(resumen)} caracteres")
        logger.debug(f"  Resumen preview: {resumen[:200]}...")
        
        embedding_resumen = (model.encode(resumen).tolist() if model else [])
        if model:
            logger.debug(f"  ✓ Embedding del resumen: {len(embedding_resumen)} dimensiones")
        json_layout_global_sql = json.dumps(all_items, ensure_ascii=False)
        json_global_sql = json.dumps(json_global, ensure_ascii=False)

        # (opcional) archivo global auxiliar
        if WRITE_GLOBAL_FILE:
            out_global = os.path.join(JSON_FOLDER, f"documento_{master_id}_{version_id}_{group_id}_global.json")
            try:
                with open(out_global, "w", encoding="utf-8") as g:
                    json.dump(json_global, g, ensure_ascii=False, indent=2)
                logger.info(f"  ✓ Archivo global escrito: {out_global}")
            except Exception as e:
                logger.error(f"❌ No se pudo escribir {out_global}: {e}")

        # ------------- D) Escribir doc-level en semantic_doc_index -------------
        logger.info(f"💾 Escribiendo en {DOC_TABLE_NAME}...")
        if cur:
            payload_doc = {
                "document_version_id": version_id,
                "document_group_id": group_id,
                "resumen": resumen,
                "json_layout": json_layout_global_sql,
                "json_global": json_global_sql,
                "embedding": json.dumps(embedding_resumen),
                "archivo": page_archivo,
                "updated_at": datetime.utcnow().isoformat(),  # si no existe, se ignora
                "created_at": datetime.utcnow().isoformat(),  # si no existe, se ignora
            }
            logger.debug(f"  Payload doc-level: {list(payload_doc.keys())}")
            ok = delete_then_insert_dynamic(cur, DOC_TABLE_NAME, "document_version_id", version_id, payload_doc, doc_cols)
            DB_WRITE_OK = DB_WRITE_OK and ok
            if ok:
                logger.info(f"✅ Doc-level actualizado (master={master_id}, version={version_id}, group={group_id})")
            else:
                error_count += 1

    # Commit/cierre
    logger.info("="*80)
    logger.info(f"📊 Resumen final:")
    logger.info(f"  ✓ Archivos procesados exitosamente: {processed_count}")
    logger.info(f"  ✗ Archivos con errores: {error_count}")
    logger.info(f"  📝 Total archivos: {len(targets)}")
    
    if cur:
        try:
            conn.commit()
            logger.info("✅ COMMIT exitoso - Cambios guardados en BD")
        except Exception as e:
            logger.error(f"❌ Error al hacer commit: {e}")
            DB_WRITE_OK = False
        try:
            cur.close()
            conn.close()
            logger.info("🔌 Conexión a BD cerrada")
        except Exception:
            pass

    logger.info("="*80)
    logger.info("🏁 Procesamiento finalizado")
    logger.info(f"� Logs guardados en: {log_filename}")
    logger.info("="*80)
    
    # Si no hubo BD o falló alguna escritura, devolvemos código != 0 (FastAPI lo mostrará)
    if not DB_OK:
        logger.error("❌ Exit code 2: No hubo conexión a BD")
        sys.exit(2)
    if not DB_WRITE_OK:
        logger.error("❌ Exit code 2: Falló alguna escritura en BD")
        sys.exit(2)
    
    logger.info("✅ Exit code 0: Todo OK")
    sys.exit(0)


if __name__ == "__main__":
    main()

