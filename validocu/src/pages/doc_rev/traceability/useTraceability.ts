import { useState, useCallback } from 'react';
import { TraceabilityService } from './traceabilityService';
import type { DocumentVersion, ActivityLog } from './types';

interface UseTraceabilityState {
  loading: boolean;
  error: string | null;
  versions: DocumentVersion[];
  activityLog: ActivityLog[];
  documentInfo: any;
}

interface UseTraceabilityActions {
  loadTraceabilityData: (documentId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export function useTraceability(): [UseTraceabilityState, UseTraceabilityActions] {
  const [state, setState] = useState<UseTraceabilityState>({
    loading: false,
    error: null,
    versions: [],
    activityLog: [],
    documentInfo: null,
  });

  const loadTraceabilityData = useCallback(async (documentId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Cargar timeline completo y historial de versiones en paralelo
      const [timelineResponse, versionHistoryResponse] = await Promise.all([
        TraceabilityService.getDocumentTimeline(documentId),
        TraceabilityService.getDocumentVersionHistory(documentId)
      ]);

      // Procesar versiones del documento
      const processedVersions: DocumentVersion[] = versionHistoryResponse.version_history.map(versionData => {
        // Buscar el log de subida para obtener información del usuario
        const uploadLog = versionData.logs.find(log => 
          log.type === 'uploaded' || log.type === 'reuploaded'
        );

        return {
          id: versionData.version.id,
          version: versionData.version.version_number,
          uploadDate: versionData.version.uploaded_at,
          uploadedBy: uploadLog?.user ? {
            id: uploadLog.user.id,
            name: uploadLog.user.name,
            email: uploadLog.user.email,
            avatar: undefined,
          } : {
            id: 'system',
            name: 'Sistema',
            email: 'sistema@validocu.com',
            avatar: undefined,
          },
          comments: uploadLog?.comment || 'Sin comentarios',
          fileSize: versionData.version.file_size,
          fileName: versionData.version.filename,
          isCurrent: versionData.version.is_current,
        };
      });

      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        documentInfo: timelineResponse.document,
        activityLog: timelineResponse.timeline,
        versions: processedVersions,
      }));

    } catch (err) {
      console.error('Error loading traceability data:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Error al cargar los datos de trazabilidad',
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      versions: [],
      activityLog: [],
      documentInfo: null,
    });
  }, []);

  return [
    state,
    {
      loadTraceabilityData,
      clearError,
      reset,
    }
  ];
}