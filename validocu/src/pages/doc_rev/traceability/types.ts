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
  comments: string;
  fileSize: number;
  fileName: string;
  isCurrent: boolean;
}

export interface ActivityLog {
  id: string;
  type: 'upload' | 'download' | 'new_version' | 'comment';
  timestamp: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  description: string;
  metadata?: any;
}

export interface TraceabilityModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}