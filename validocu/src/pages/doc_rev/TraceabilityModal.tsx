import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import UploadNewVersionModal from './traceability/UploadNewVersionModal';
import Notification from '../../components/common/Notification';
import DocumentInfoPanel from './traceability/DocumentInfoPanel';
import VersionHistory from './traceability/VersionHistory';
import ActivityLogPanel from './traceability/ActivityLogPanel';
import { useTraceability } from './traceability/useTraceability';
import type { DocumentVersion, TraceabilityModalProps } from './traceability/types';

export default function TraceabilityModal({ 
  open, 
  onClose, 
  documentId, 
  documentName 
}: TraceabilityModalProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Usar el hook personalizado para manejar la trazabilidad
  const [
    { loading, error, versions, activityLog, documentInfo },
    { loadTraceabilityData, clearError }
  ] = useTraceability();

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (open && documentId) {
      console.log("Id del documento:", documentId);
      loadTraceabilityData(documentId);
    }
  }, [open, documentId, loadTraceabilityData]);

  const handleDownloadVersion = async (version: DocumentVersion) => {
    try {
      // Simulación de descarga (aquí implementarías la lógica real)
      console.log('Descargando versión:', version);
      
      // Mostrar notificación
      setNotification({
        open: true,
        message: `Descargando ${version.fileName}...`,
        severity: 'info'
      });

      // Recargar datos para actualizar el log
      setTimeout(() => {
        loadTraceabilityData(documentId);
      }, 1000);

    } catch (err) {
      console.error('Error downloading version:', err);
      setNotification({
        open: true,
        message: 'Error al descargar el archivo',
        severity: 'error'
      });
    }
  };

  const handleUploadSuccess = async (newVersionNumber: number) => {
    setNotification({
      open: true,
      message: `Nueva versión v${newVersionNumber} subida exitosamente`,
      severity: 'success'
    });
    
    // Recargar datos para mostrar la nueva versión y log
    await loadTraceabilityData(documentId);
  };

  const handleRetry = () => {
    clearError();
    loadTraceabilityData(documentId);
  };

  const currentVersion = versions.find(v => v.isCurrent);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <HistoryIcon color="primary" />
            <Box>
              <Typography variant="h6">Trazabilidad del Documento</Typography>
              <Typography variant="body2" color="text.secondary">
                {documentName}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Cargando datos de trazabilidad...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button size="small" onClick={handleRetry} sx={{ ml: 2 }}>
              Reintentar
            </Button>
          </Alert>
        ) : (
          <>
            {/* Información del documento */}
            <DocumentInfoPanel 
              documentName={documentName} 
              versions={versions}
              documentInfo={documentInfo}
            />

            {/* Layout de dos columnas */}
            <Box display="flex" gap={3} sx={{ height: '60vh' }}>
              {/* Columna izquierda - Historial de Versiones */}
              <VersionHistory
                versions={versions}
                onUploadNewVersion={() => setUploadModalOpen(true)}
                onDownloadVersion={handleDownloadVersion}
              />

              {/* Columna derecha - Registro de Actividades */}
              <ActivityLogPanel activities={activityLog} />
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>

      {/* Modal para subir nueva versión */}
      <UploadNewVersionModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        documentId={documentId}
        documentName={documentName}
        currentVersion={currentVersion?.version || 1}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Notificaciones */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      />
    </Dialog>
  );
}