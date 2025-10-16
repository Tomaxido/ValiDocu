import { Box, Typography, Paper, Avatar, Chip } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import type { DocumentVersion } from './types';

interface DocumentInfoPanelProps {
  documentName: string;
  versions: DocumentVersion[];
  documentInfo?: {
    id: number;
    document_group: string | null;
    document_type: string | null;
    status: number;
  };
}

export default function DocumentInfoPanel({ 
  documentName, 
  versions, 
  documentInfo 
}: DocumentInfoPanelProps) {
  const currentVersion = versions.find(v => v.isCurrent);
  const originalUploader = versions[versions.length - 1]?.uploadedBy;

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ color: '#495057', fontWeight: 600 }}>
        Información del Documento: {documentName}
      </Typography>
      
      {/* Información adicional del documento desde la API */}
      {documentInfo && (
        <Box display="flex" gap={4} mb={2}>
          {/* <Box>
            <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
              ID del documento:
            </Typography>
            <Typography variant="body2" sx={{ color: '#495057', fontWeight: 500 }}>
              {documentInfo.id}
            </Typography>
          </Box> */}
          {documentInfo.document_group && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
                Grupo:
              </Typography>
              <Typography variant="body2" sx={{ color: '#495057', fontWeight: 500 }}>
                {documentInfo.document_group}
              </Typography>
            </Box>
          )}
          {documentInfo.document_type && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
                Tipo:
              </Typography>
              <Typography variant="body2" sx={{ color: '#495057', fontWeight: 500 }}>
                {documentInfo.document_type}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <Box display="flex" gap={4}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
            Subido originalmente por:
          </Typography>
          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
            <Avatar sx={{ width: 24, height: 24, bgcolor: '#6c757d' }}>
              <PersonIcon fontSize="small" />
            </Avatar>
            <Typography variant="body2" sx={{ color: '#495057', fontWeight: 500 }}>
              {originalUploader?.name}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
            Fecha de subida inicial:
          </Typography>
          <Typography variant="body2" sx={{ color: '#495057', fontWeight: 500 }}>
            {versions[versions.length - 1]?.uploadDate.toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
            Versión actual:
          </Typography>
          <Chip 
            label={`v${currentVersion?.version || 1}`} 
            color="primary" 
            size="small" 
          />
        </Box>
      </Box>
    </Paper>
  );
}