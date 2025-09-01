// Ajusta la BASE_URL si usas proxy o .env
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function downloadDocumentSummaryExcel(groupID: number): Promise<void> {
  const url = `${BASE_URL}/api/v1/documents/${groupID}/summary-excel`;
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

export async function downloadDocumentSummaryExcel_old(groupID: number): Promise<void> {
  const url = `${BASE_URL}/api/v1/documents/${groupID}/summary-excel`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);


  // Usa el nombre enviado por el backend (con timestamp)
  const cd = res.headers.get('content-disposition') || '';
  // Typical: attachment; filename="resumen_grupo_12_2025-08-28_0506.xlsx"
  const match = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const serverFilename = match ? decodeURIComponent(match[1]) : `resumen_grupo_${groupID}.xlsx`;

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = serverFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    window.URL.revokeObjectURL(blobUrl);
  }
}

