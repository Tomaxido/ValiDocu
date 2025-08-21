// Ajusta la BASE_URL si usas proxy o .env
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

export type Issue = {
  id: number;
  document_analysis_id: number;
  field_key: string;
  issue_type: 'MISSING' | 'INCONSISTENT' | 'FORMAT' | 'OUTDATED';
  message: string;
  suggestion?: string | null;
  confidence?: number | string | null;
  status: 'TODO' | 'NO_APLICA' | 'RESUELTO';
  evidence?: Evidence | null;
  created_at?: string;
  updated_at?: string;
};

export type AnalyzeResponse = {
  analysis_id: number;
  doc_type: string;
  summary: string | null;
  issues: Issue[];
};

export async function analyzeDocument(documentId: number): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/documents/${documentId}/analyze`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
  return res.json();
}

export async function updateIssueStatus(issueId: number, status: Issue['status']): Promise<Issue> {
  const res = await fetch(`${BASE_URL}/api/v1/issues/${issueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  const data = await res.json();
  return data.issue as Issue;
}
