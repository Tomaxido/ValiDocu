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
from datetime import datetime, date
from collections import defaultdict
from typing import List, Dict, Any, Tuple, Optional, Set
import unicodedata

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None  # permite correr sin el paquete en entornos mínimos


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
    print(f"🗄️ Conectando a Postgres host={DB_CONFIG.get('host')} port={DB_CONFIG.get('port')} db={DB_CONFIG.get('dbname')} user={DB_CONFIG.get('user')}")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print("✅ Conexión OK")
        return conn, cur
    except Exception as e:
        print("❌ No se pudo conectar a Postgres:", e)
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
    except Exception as e:
        print(f"⚠️ No se pudieron leer columnas de {table_name}: {e}")
    print(f"📋 Columnas en {table_name}: {sorted(cols)}")
    return cols


def delete_then_insert_dynamic(cur, table: str, key_col: str, key_val, payload: Dict[str, Any], present_cols: Set[str]) -> bool:
    """
    Borra por clave y re-inserta sólo columnas presentes en la tabla.
    Devuelve True si pudo escribir, False si falló.
    """
    try:
        cur.execute(f'DELETE FROM "{table}" WHERE "{key_col}" = %s', (key_val,))
    except Exception as e:
        print(f"❌ DELETE en {table} falló: {e}")
        return False

    # Filtra payload por columnas presentes
    cols = [c for c in payload.keys() if c in present_cols]
    if not cols:
        print(f"⚠️ Nada para insertar en {table}: ninguna de las columnas existe.")
        return False

    placeholders = ", ".join(["%s"] * len(cols))
    colnames = ", ".join(f'"{c}"' for c in cols)
    sql = f'INSERT INTO "{table}" ({colnames}) VALUES ({placeholders})'
    vals = [payload[c] for c in cols]

    try:
        cur.execute(sql, vals)
        print(f"✅ INSERT en {table} ({len(cols)} cols)")
        return True
    except Exception as e:
        print(f"❌ INSERT en {table} falló: {e}")
        return False


# =========================
# Main
# =========================
def main():
    # Modelo (si existe sentence_transformers, si no, usa embedding vacío)
    model = None
    if SentenceTransformer is not None:
        try:
            model = SentenceTransformer(MODEL_NAME)
        except Exception as e:
            print(f"⚠️ No se pudo cargar modelo {MODEL_NAME}: {e}")

    # Archivos objetivo
    if len(sys.argv) > 1:
        targets = [os.path.basename(sys.argv[1])]
    else:
        targets = [f for f in os.listdir(JSON_FOLDER) if f.startswith("documento_") and f.endswith(".json")]

    conn, cur = connect_db()
    DB_OK = cur is not None
    DB_WRITE_OK = True

    # Pre-carga columnas de tablas (si hay conexión)
    if cur:
        page_cols = get_table_columns(cur, TABLE_NAME)
        doc_cols  = get_table_columns(cur, DOC_TABLE_NAME)
    else:
        page_cols, doc_cols = set(), set()

    for filename in targets:
        # Solo aceptamos prefijo documento_
        if not filename.endswith(".json") or not filename.startswith("documento_"):
            continue

        print(f"\n🔎 Procesando {filename}")
        name_wo_ext = filename[:-5]  # sin .json

        # Formato nuevo con doc_id o antiguo sin doc_id
        m3 = re.match(r"^documento_([a-f0-9\-]+)_([a-f0-9\-]+)_([a-f0-9\-]+)_p(\d+)$", name_wo_ext)
        m2 = re.match(r"^documento_([a-f0-9\-]+)_([a-f0-9\-]+)_p(\d+)$", name_wo_ext)

        if m3:
            master_id = m3.group(1)
            doc_id    = m3.group(2)   # documents.id de la PNG (page-level)
            group_id  = m3.group(3)
            page_idx  = int(m3.group(4))
            print(f" ↳ master={master_id} doc={doc_id} group={group_id} page={page_idx}")
        elif m2:
            master_id = m2.group(1)
            doc_id    = None          # formato antiguo
            group_id  = m2.group(2)
            page_idx  = int(m2.group(3))
            print(f" ↳ master={master_id} group={group_id} page={page_idx} (sin doc_id)")
        else:
            print(f"⚠️ Nombre inválido: {filename}")
            continue

        current_page_json = os.path.join(JSON_FOLDER, filename)

        # ----------------- A) Cargar SOLO la página actual (page-level) -----------------
        try:
            with open(current_page_json, "r", encoding="utf-8") as f:
                page_items = json.load(f)
        except Exception as e:
            print(f"⚠️ No se pudo leer {current_page_json}: {e}")
            continue

        # Asegura 'page'
        for it in page_items:
            if "page" not in it:
                it["page"] = page_idx

        # Resumen/embedding por página (muy corto, opcional)
        page_resumen = f"Página {page_idx} del documento {master_id} (grupo {group_id})."
        page_embedding = (model.encode(page_resumen).tolist() if model else [])

        page_json_layout_sql = json.dumps(page_items, ensure_ascii=False)
        page_archivo = os.path.basename(current_page_json)

        # `doc_id` puede venir como string; castear a int si aplica
        int_doc_id = None
        if doc_id is not None:
            try:
                int_doc_id = int(doc_id)
            except Exception:
                int_doc_id = doc_id  # si no es numérico, úsalo tal cual

        # Escribir page-level si hay conexión y doc_id
        if cur and doc_id is not None:
            payload_page = {
                "document_id": int_doc_id,
                "document_group_id": group_id,
                "resumen": page_resumen,
                "json_layout": page_json_layout_sql,
                "embedding": json.dumps(page_embedding),  # por compatibilidad si embedding no es jsonb
                "archivo": page_archivo,
            }
            ok = delete_then_insert_dynamic(cur, TABLE_NAME, "document_id", int_doc_id, payload_page, page_cols)
            DB_WRITE_OK = DB_WRITE_OK and ok

        # ------------- B) Recolectar TODAS las páginas del mismo master_id/group_id -------------
        all_items: List[Dict[str, Any]] = []
        try:
            candidates = []
            for f in os.listdir(JSON_FOLDER):
                if not (f.startswith("documento_") and f.endswith(".json")):
                    continue
                nx = f[:-5]
                # documento_{master}_[{doc}_]{group}_pNNNN
                m_any = re.match(r"^documento_([a-f0-9\-]+)_(?:[a-f0-9\-]+_)?([a-f0-9\-]+)_p(\d+)$", nx)
                if not m_any:
                    continue
                if m_any.group(1) != master_id or m_any.group(2) != group_id:
                    continue
                candidates.append((f, int(m_any.group(3))))

            candidates.sort(key=lambda x: x[1])
            print(f" 🧩 Páginas detectadas para master={master_id}, group={group_id}: {len(candidates)}")

            for f, pg in candidates:
                ppath = os.path.join(JSON_FOLDER, f)
                try:
                    with open(ppath, "r", encoding="utf-8") as fh:
                        itms = json.load(fh)
                    for it in itms:
                        it = dict(it)
                        it.setdefault("page", pg)
                        all_items.append(it)
                except Exception as e:
                    print(f"⚠️ No se pudo leer {ppath}: {e}")
        except Exception as e:
            print(f"⚠️ Error listando páginas: {e}")
            # en caso extremo, al menos usa la página actual
            all_items = page_items[:]

        if not all_items:
            print("⚠️ No hay items para consolidar en doc-level, salto.")
            continue

        # ------------- C) Construir json_global y resumen global (doc-level) -------------
        json_global = build_json_global(all_items)
        resumen = build_resumen(json_global)
        embedding_resumen = (model.encode(resumen).tolist() if model else [])
        json_layout_global_sql = json.dumps(all_items, ensure_ascii=False)
        json_global_sql = json.dumps(json_global, ensure_ascii=False)

        # (opcional) archivo global auxiliar
        if WRITE_GLOBAL_FILE:
            out_global = os.path.join(JSON_FOLDER, f"documento_{master_id}_{group_id}_global.json")
            try:
                with open(out_global, "w", encoding="utf-8") as g:
                    json.dump(json_global, g, ensure_ascii=False, indent=2)
                print(f" 💾 Global escrito: {out_global}")
            except Exception as e:
                print(f"⚠️ No se pudo escribir {out_global}: {e}")

        # ------------- D) Escribir doc-level en semantic_doc_index -------------
        if cur:
            payload_doc = {
                "document_id": master_id,
                "document_group_id": group_id,
                "resumen": resumen,
                "json_layout": json_layout_global_sql,
                "json_global": json_global_sql,
                "embedding": json.dumps(embedding_resumen),
                "archivo": page_archivo,
                "updated_at": datetime.utcnow().isoformat(),  # si no existe, se ignora
                "created_at": datetime.utcnow().isoformat(),  # si no existe, se ignora
            }
            ok = delete_then_insert_dynamic(cur, DOC_TABLE_NAME, "document_id", master_id, payload_doc, doc_cols)
            DB_WRITE_OK = DB_WRITE_OK and ok
            if ok:
                print(f"✅ Doc-level actualizado (master={master_id}, group={group_id})")

    # Commit/cierre
    if cur:
        try:
            conn.commit()
            print("🧾 COMMIT OK")
        except Exception as e:
            print(f"❌ Error al hacer commit: {e}")
            DB_WRITE_OK = False
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

    print("🚀 Fin.")
    # Si no hubo BD o falló alguna escritura, devolvemos código != 0 (FastAPI lo mostrará)
    if not DB_OK or not DB_WRITE_OK:
        sys.exit(2)


if __name__ == "__main__":
    main()
