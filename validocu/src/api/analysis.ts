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
  id: number;
  document_analysis_id: number;
  field_key: string;
  issue_type: string;
  message: string;
  suggestion?: string | null;
  confidence?: number | null;
  evidence?: Evidence | any;
  status_id?: number | null;
  status_text?: string | null;
  created_at?: string;
  updated_at?: string;
  status?: string | null;
};

export type AnalyzeResponse = {
  doc_type?: string | null;
  summary?: string | null;
  issues: Issue[];
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
