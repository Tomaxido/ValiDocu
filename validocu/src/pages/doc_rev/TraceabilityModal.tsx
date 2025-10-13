import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
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
import type { DocumentVersion, ActivityLog, TraceabilityModalProps } from './traceability/types';

// Datos ficticios para testing
const mockVersions: DocumentVersion[] = [
  {
    id: '1',
    version: 3,
    uploadDate: new Date('2024-03-15T10:30:00'),
    uploadedBy: {
      id: 'user1',
      name: 'María García',
      email: 'maria.garcia@empresa.com',
      avatar: undefined,
    },
    comments: 'Corrección de datos financieros y actualización de tablas',
    fileSize: 2048576,
    fileName: 'contrato_v3.pdf',
    isCurrent: true,
  },
  {
    id: '2',
    version: 2,
    uploadDate: new Date('2024-03-10T14:20:00'),
    uploadedBy: {
      id: 'user2',
      name: 'Carlos López',
      email: 'carlos.lopez@empresa.com',
      avatar: undefined,
    },
    comments: 'Revisión legal y ajustes en cláusulas',
    fileSize: 1987654,
    fileName: 'contrato_v2.pdf',
    isCurrent: false,
  },
  {
    id: '3',
    version: 1,
    uploadDate: new Date('2024-03-05T09:15:00'),
    uploadedBy: {
      id: 'user1',
      name: 'María García',
      email: 'maria.garcia@empresa.com',
      avatar: undefined,
    },
    comments: 'Versión inicial del contrato',
    fileSize: 1654321,
    fileName: 'contrato_v1.pdf',
    isCurrent: false,
  },
];

const mockActivityLog: ActivityLog[] = [
  {
    id: '1',
    type: 'upload',
    timestamp: new Date('2024-03-15T10:30:00'),
    user: {
      id: 'user1',
      name: 'María García',
      email: 'maria.garcia@empresa.com',
    },
    description: 'Subió la versión 3 del documento',
  },
  {
    id: '2',
    type: 'download',
    timestamp: new Date('2024-03-14T16:45:00'),
    user: {
      id: 'user3',
      name: 'Ana Martín',
      email: 'ana.martin@empresa.com',
    },
    description: 'Descargó la versión 2 con comentarios',
  },
  {
    id: '3',
    type: 'new_version',
    timestamp: new Date('2024-03-10T14:20:00'),
    user: {
      id: 'user2',
      name: 'Carlos López',
      email: 'carlos.lopez@empresa.com',
    },
    description: 'Subió una nueva versión (v2) del documento',
  },
  {
    id: '4',
    type: 'download',
    timestamp: new Date('2024-03-08T11:30:00'),
    user: {
      id: 'user4',
      name: 'Luis Torres',
      email: 'luis.torres@empresa.com',
    },
    description: 'Descargó la versión 1',
  },
  {
    id: '5',
    type: 'upload',
    timestamp: new Date('2024-03-05T09:15:00'),
    user: {
      id: 'user1',
      name: 'María García',
      email: 'maria.garcia@empresa.com',
    },
    description: 'Subió el documento inicial',
  },
];

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

  const handleDownloadVersion = (version: DocumentVersion) => {
    // Aquí implementarías la lógica de descarga
    console.log('Descargando versión:', version);
    // Simular descarga
    const link = document.createElement('a');
    link.href = '#'; // Aquí iría la URL real del archivo
    link.download = version.fileName;
    link.click();
  };

  const currentVersion = mockVersions.find(v => v.isCurrent);

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
        {/* Información del documento */}
        <DocumentInfoPanel 
          documentName={documentName} 
          versions={mockVersions} 
        />

        {/* Layout de dos columnas */}
        <Box display="flex" gap={3} sx={{ height: '60vh' }}>
          {/* Columna izquierda - Historial de Versiones */}
          <VersionHistory
            versions={mockVersions}
            onUploadNewVersion={() => setUploadModalOpen(true)}
            onDownloadVersion={handleDownloadVersion}
          />

          {/* Columna derecha - Registro de Actividades */}
          <ActivityLogPanel activities={mockActivityLog} />
        </Box>
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
        onUploadSuccess={(newVersion) => {
          console.log('Nueva versión subida:', newVersion);
          setNotification({
            open: true,
            message: `Nueva versión v${newVersion} subida exitosamente`,
            severity: 'success'
          });
          // Aquí podrías refrescar los datos
        }}
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