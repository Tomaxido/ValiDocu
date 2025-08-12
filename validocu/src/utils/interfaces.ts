export interface Document {
    id: number;
    document_group_id: number;
    filename: string;
    filepath: string;
    mime_type: string;
    status: number;
    created_at: string;
    updated_at: string;
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

export interface GroupedImageViewerProps {
  files: Document[];
}