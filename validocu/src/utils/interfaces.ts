export interface Document {
    id: number;
    document_group_id: number;
    filename: string;
    filepath: string;
    mime_type: string;
    status: number;
    created_at: string;
    updated_at: string;
    normative_gap: number;
    due_date: number;
};

export interface DocumentGroup {
    id: number;
    name: string;
    status: number;
    created_at: string;
    updated_at: string;
    documents: Document[];
};

export interface GroupedDocument {
  name: string;
  images: Document[];
  pdf?: Document;
}

export interface BoxAnnotation {
  label: string;
  text: string;
  boxes: number[][];
}

export interface SemanticGroup {
  filename: string;
  json_layout: BoxAnnotation[]
}

export interface GroupedImageViewerProps {
  filename: string;
  files: Document[];
}

export interface SemanticDocIndex {
  id: number;
  document_id: number;
  document_group_id: number;
  resumen: string;
  json_layout: string;
  json_global: string;
  embedding: string;
  archivo: string;
  created_at: string;
  updated_at: string;
}

export interface ExpiredDocumentResponse {
  documentosVencidos: SemanticDocIndex[];
  documentosPorVencer: SemanticDocIndex[];
}