// Ajusta la BASE_URL si usas proxy o .env
const BASE_URL = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api/v1";

export async function downloadDocumentSummaryExcel(groupID: number): Promise<void> {
  const url = `${BASE_URL}/documents/${groupID}/summary-excel`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `resumen_group_${groupID}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface GroupOverviewTotals {
  total: number;
  conforme: number;
  inconforme: number;
  sin_procesar: number;
}

export interface AnalyzeRow {
  name: string;                 // Nombre Documento (sin extensión)
  status: 1 | 2 | null;         // 1=Conforme, 2=Inconforme, null=Sin procesar
  status_label: string;         // "Conforme" | "Inconforme" | "Sin procesar"
  observations?: string | null; // Observaciones (opcional)
  compliance_pct?: number | null; // % Cumplimiento (0..100) (opcional)
}

export interface SimpleRow {
  name: string;                 // Nombre Documento
  state_label?: string;         // "Pendiente", "OK", etc. (opcional)
}

export interface GroupOverviewResponse {
  group_id: number;
  group_name: string;

  // Meta de “Resumen de Grupo”
  generated_at: string;         // ISO string
  responsible_user: string;     // p.ej. "Administrador"

  totals: GroupOverviewTotals;

  // Secciones del Excel:
  pending_mandatory: SimpleRow[];      // "Documentos obligatorios no encontrados (Pendientes)"
  not_to_analyze: SimpleRow[];         // "Documentos que NO se deben analizar"
  unmatched_in_obligatorios: SimpleRow[]; // "Documentos sin correspondencia en documentos_obligatorios"
  analyze: AnalyzeRow[];               // "Documentos que se deben analizar"
}

/** Obtiene el resumen del grupo (mismo contenido que el Excel, en JSON) */
export async function fetchGroupOverview(groupId: number): Promise<GroupOverviewResponse> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}/overview`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: No se pudo obtener el resumen`);
  return res.json();
}