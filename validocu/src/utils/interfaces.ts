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

// Interfaces para configuración de grupos
export interface DocumentType {
  id: number;
  nombre_doc: string;
  analizar?: number;
}

export interface DocumentFieldSpec {
  id: number;
  field_key: string;
  label: string;
  datatype: string;
  is_required: boolean;
  regex?: string;
  options?: string[];
}

export interface GroupConfiguration {
  document_type_id: number;
  document_type_name: string;
  required_fields: DocumentFieldSpec[];
}

export interface GroupConfigurationResponse {
  group: DocumentGroup;
  configuration: GroupConfiguration[];
  has_configuration: boolean;
}

export interface DocumentTypeWithFields {
  id: number;
  nombre_doc: string;
  analizar?: number;
  field_specs: DocumentFieldSpec[];
}

export interface ConfigurationHistoryEntry {
  id: number;
  action: 'created' | 'updated' | 'deleted' | 'initialized';
  user: {
    id: string;  // UUID como string
    name: string;
    email: string;
  };
  summary: {
    document_types_added: Array<{
      id: number;
      name: string;
    }>;
    document_types_removed: Array<{
      id: number;
      name: string;
    }>;
    document_types_modified: Array<{
      id: number;
      name: string;
    }>;
    fields_changed: Array<{
      document_type_id: number;
      document_type_name: string;
      required_status_changed: boolean;
      fields_added: Array<{
        id: number;
        name: string;
      }>;
      fields_removed: Array<{
        id: number;
        name: string;
      }>;
    }>;
  };
  description?: string;
  created_at: string;
  created_at_human: string;
}

export interface ConfigurationHistoryResponse {
  history: ConfigurationHistoryEntry[];
}