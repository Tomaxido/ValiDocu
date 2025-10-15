export interface DocumentVersion {
  id: string;
  version: number;
  uploadDate: Date;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  comment: string;
  fileSize: number;
  fileName: string;
  isCurrent: boolean;
}

export interface ActivityLog {
  id: string;
  type: 'uploaded' | 'downloaded' | 'deleted' | 'reuploaded';
  timestamp: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null; // Puede ser null para acciones del sistema
  description: string;
  comment?: string;
  metadata?: any;
  ip_address?: string;
  document_version?: {
    id: string;
    version_number: number;
    filename: string;
    file_size: number;
  };
}

export interface TraceabilityModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}

// Interfaces para la respuesta de la API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface DocumentTimelineResponse {
  document: {
    id: number;
    document_group: string | null;
    document_type: string | null;
    status: number;
  };
  timeline: ActivityLog[];
  total_events: number;
}

export interface DocumentVersionHistoryResponse {
  document: {
    id: number;
    document_group: string | null;
    document_type: string | null;
    status: number;
  };
  version_history: {
    version: {
      id: string;
      version_number: number;
      filename: string;
      file_size: number;
      comment: string;
      is_current: boolean;
      uploaded_at: string;
      uploaded_by: {
        name: string;
        email: string;
      }
    };
  }[];
}