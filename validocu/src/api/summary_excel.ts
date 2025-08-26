// Ajusta la BASE_URL si usas proxy o .env
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function downloadDocumentSummaryExcel(documentId: number): Promise<void> {
  const url = `${BASE_URL}/api/v1/documents/${documentId}/summary-excel`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `resumen_doc_id_${documentId}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
