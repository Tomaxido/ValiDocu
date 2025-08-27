const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export type EvidenceItem = {
  label?: string;
  text?: string;
  boxes?: number[][];
  page?: number | null;
};

export type Evidence = {
  items?: EvidenceItem[];
};

export type SuggestionStatus = {
  id: number;
  status: string;
};

export type Issue = {
  issue_id: number;
  status_id: number;
  label: string;
  suggestion_template: string;
  is_required: boolean;
};

export type AnalyzeResponse = {
  // doc_type?: string | null;
  // summary?: string | null;
  issues: Issue[];
};

export type AnalyzePerDoc = {
  doc_id: number;
  analysis: AnalyzeResponse;
};

export async function getLastDocumentAnalysis(documentId: number): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/documents/${documentId}/analysis`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Analyze fetch failed: ${res.status}`);
  return res.json();
}

export async function analyzeDocument(documentId: number): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/documents/${documentId}/analyze`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
  return res.json();
}

export async function analyzeImages(imageIds: number[]): Promise<void> {
  // dispara el análisis por cada imagen (sin esperar a los resultados consolidados)
  await Promise.all(imageIds.map((id) => analyzeDocument(id)));
}

export async function listSuggestionStatuses(): Promise<SuggestionStatus[]> {
  const res = await fetch(`${BASE_URL}/api/v1/suggestion-status`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Statuses load failed: ${res.status}`);
  return res.json();
}

export async function updateIssueStatusById(issueId: number, status_id: number): Promise<Issue> {
  const res = await fetch(`${BASE_URL}/api/v1/issues/${issueId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ status_id }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Update failed: ${res.status} ${body}`);
  }
  return await res.json();
}

export async function updateIssueStatus(issueId: number, statusText: string): Promise<Issue> {
  const catalog = await listSuggestionStatuses();
  const found = catalog.find(s => s.status === statusText);
  if (!found) throw new Error(`Estado desconocido: ${statusText}`);
  return updateIssueStatusById(issueId, found.id);
}

// === Nuevas utilidades para trabajar con IDs de imágenes ===

export async function getAnalysesForImageIds(imageIds: number[]): Promise<AnalyzePerDoc[]> {
  const results = await Promise.all(
    imageIds.map(async (docId) => {
      const analysis = await getLastDocumentAnalysis(docId);
      return { doc_id: docId, analysis };
    })
  );
  return results;
}

export async function fetchIssuesByImageIds(imageIds: number[]): Promise<Issue[]> {
  const analyses = await getAnalysesForImageIds(imageIds);
  const merged: Issue[] = [];
  for (const { doc_id, analysis } of analyses) {
    const issues = (analysis.issues || []).map((iss) => ({ ...iss, source_document_id: doc_id }));
    merged.push(...issues);
  }
  return merged;
}
