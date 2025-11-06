import type { 
  ApiResponse, 
  DocumentTimelineResponse, 
  DocumentVersionHistoryResponse,
  ActivityLog 
} from './types';

// Configuración de la URL base de la API
const API_BASE_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:8000';

// Función helper para hacer peticiones autenticadas
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Mapear tipos de acción de la BD a etiquetas amigables
const actionLabels = {
  uploaded: 'Documento subido',
  downloaded: 'Documento descargado', 
  deleted: 'Documento eliminado',
  reuploaded: 'Nueva versión subida'
};

// Transformar log de la API al formato del frontend
function transformActivityLog(apiLog: any): ActivityLog {
  return {
    id: apiLog.id.toString(),
    type: apiLog.action as 'uploaded' | 'downloaded' | 'deleted' | 'reuploaded',
    timestamp: new Date(apiLog.created_at),
    user: apiLog.user ? {
      id: apiLog.user.id,
      name: apiLog.user.name,
      email: apiLog.user.email,
    } : null,
    description: apiLog.comment || actionLabels[apiLog.action as keyof typeof actionLabels] || apiLog.action,
    comment: apiLog.comment,
    metadata: apiLog.metadata,
    ip_address: apiLog.ip_address,
    document_version: apiLog.document_version,
  };
}

export class TraceabilityService {
  
  /**
   * Obtener el timeline completo de un documento
   */
  static async getDocumentTimeline(documentId: string): Promise<{
    document: DocumentTimelineResponse['document'];
    timeline: ActivityLog[];
    total_events: number;
  }> {
    try {
      const response: ApiResponse<DocumentTimelineResponse> = await authenticatedFetch(
        `/api/v1/documents/${documentId}/timeline`
      );

      if (!response.success) {
        throw new Error(response.message || 'Error al obtener timeline');
      }

      return {
        document: response.data.document,
        timeline: response.data.timeline.map(transformActivityLog),
        total_events: response.data.total_events,
      };
    } catch (error) {
      console.error('Error fetching document timeline:', error);
      throw error;
    }
  }

  /**
   * Obtener el historial de versiones con sus logs
   */
  static async getDocumentVersionHistory(documentId: string): Promise<DocumentVersionHistoryResponse> {
    try {
      const response: ApiResponse<DocumentVersionHistoryResponse> = await authenticatedFetch(
        `/api/v1/documents/${documentId}/version-history`
      );

      if (!response.success) {
        throw new Error(response.message || 'Error al obtener historial de versiones');
      }

      return {
        document: response.data.document,
        version_history: response.data.version_history.map(versionData => ({
          version: {
            ...versionData.version,
            // Keep uploaded_at as string to match the expected type
            uploaded_at: versionData.version.uploaded_at,
          },
        })),
      };
    } catch (error) {
      console.error('Error fetching version history:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de actividad
   */
  static async getDocumentActivityStats(documentId: string): Promise<{
    total_events: number;
    action_stats: Record<string, number>;
    user_activity: Array<{
      user: { id: string; name: string; email: string };
      activity_count: number;
    }>;
    activity_by_date: Array<{ date: string; count: number }>;
  }> {
    try {
      const response: ApiResponse<any> = await authenticatedFetch(
        `/api/v1/documents/${documentId}/activity-stats`
      );

      if (!response.success) {
        throw new Error(response.message || 'Error al obtener estadísticas');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      throw error;
    }
  }

  /**
   * Obtener logs con filtros
   */
  static async getAuditLogs(filters: {
    document_id?: string;
    user_id?: string;
    action?: 'uploaded' | 'downloaded' | 'deleted' | 'reuploaded';
    date_from?: string;
    date_to?: string;
    per_page?: number;
  } = {}): Promise<{
    data: ActivityLog[];
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });

      const response: ApiResponse<any> = await authenticatedFetch(
        `/api/v1/audit-logs?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.message || 'Error al obtener logs');
      }

      return {
        ...response.data,
        data: response.data.data.map(transformActivityLog),
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Obtener acciones disponibles
   */
  static async getAvailableActions(): Promise<{
    actions: string[];
    action_labels: Record<string, string>;
  }> {
    try {
      const response: ApiResponse<any> = await authenticatedFetch('/api/v1/audit/actions');

      if (!response.success) {
        throw new Error(response.message || 'Error al obtener acciones');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching available actions:', error);
      throw error;
    }
  }

  /**
   * Descargar una versión específica de un documento
   */
  static async downloadDocumentVersion(documentId: string, versionId: string): Promise<{
    download_url: string;
    filename: string;
    version_number: number;
  }> {
    try {
      const response: ApiResponse<any> = await authenticatedFetch(
        `/api/v1/documents/${documentId}/versions/${versionId}/download`
      );

      if (!response.success) {
        throw new Error(response.message || 'Error al descargar la versión');
      }

      return response.data;
    } catch (error) {
      console.error('Error downloading document version:', error);
      throw error;
    }
  }
}