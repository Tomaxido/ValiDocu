export interface Document {
    id: number;
    document_version_id: number;
    document_group_id: number;
    filename: string;
    filepath: string;
    mime_type: string;
    status: number;
    created_at: string;
    updated_at: string;
    normative_gap: number;
    due_date: number;
    version_id?: number; // ID de la versión actual
    version_number?: number; // Número de versión actual
    pages?: DocumentPage[]; // Páginas de la versión actual
    json_layout?: BoxAnnotation[]; // Layout cuando viene de una página
};

export interface DocumentPage {
    id: number;
    document_version_id: number;
    page_number: number;
    image_path: string;
    json_layout: any;
    created_at: string;
    updated_at: string;
};

export interface DocumentGroup {
    id: number;
    name: string;
    status: number;
    is_private?: number;
    created_by?: string;
    created_at: string;
    updated_at: string;
    documents: Document[];
    // Propiedades adicionales que pueden venir del backend
    user_can_edit?: boolean;
    is_owner?: boolean;
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
  pdfDoc?: Document; // PDF original para mostrar cuando no hay imágenes procesadas
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
  analizar?: number;
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
  field_specs?: DocumentFieldSpec[];
  fieldSpecs?: DocumentFieldSpec[];  // Para compatibilidad con Laravel camelCase
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

export interface ProcessedDocumentEvent {
  group: DocumentGroup;
  document: Document;
}

export interface DocumentVersionProcessedEvent {
  document_id: number;
  version_id: number;
  version_number: number;
  group_id: number;
  filename: string;
  success: boolean;
  message: string;
}

export interface DocAnalysisNotification {
  id: number;
  user_id: string; // UUID como string
  message: {
    group: DocumentGroup;
    document: Document;
    status: 'started' | 'completed' | 'failed'; 
  };
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessRequest {
  id: number;
  group_id: number;
  requested_user_id: string;
  requesting_user_id: string;
  permission_type: number;
  request_reason?: string;
  status: number;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_comment: string | null;
  group: {
    id: number;
    name: string;
  };
  requested_user: {
    id: string;
    name: string;
    email: string;
  };
  requesting_user: {
    id: string;
    name: string;
    email: string;
  };
}