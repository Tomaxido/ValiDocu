import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import type { DocumentVersion } from './types';

interface VersionHistoryProps {
  versions: DocumentVersion[];
  onUploadNewVersion: () => void;
  onDownloadVersion: (version: DocumentVersion) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'hace un momento';
  if (diffInMinutes < 60) return `hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `hace ${diffInMonths} mes${diffInMonths > 1 ? 'es' : ''}`;
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `hace ${diffInYears} año${diffInYears > 1 ? 's' : ''}`;
};

export default function VersionHistory({ 
  versions, 
  onUploadNewVersion, 
  onDownloadVersion 
}: VersionHistoryProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const toggleVersionExpansion = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  return (
    <Box flex={1} display="flex" flexDirection="column">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ color: '#495057', fontWeight: 600 }}>
          Historial de Versiones
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<CloudUploadIcon />}
          size="small"
          onClick={onUploadNewVersion}
        >
          Subir Nueva Versión
        </Button>
      </Box>
      
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        <Stack spacing={2}>
          {versions.map((version) => (
            <Accordion
              key={version.id}
              expanded={expandedVersions.has(version.id)}
              onChange={() => toggleVersionExpansion(version.id)}
              sx={{ 
                bgcolor: '#f8f9fa', 
                border: '1px solid #e9ecef',
                '&:before': { display: 'none' },
                boxShadow: 'none',
                mb: 1
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={2} flex={1}>
                  <Chip
                    label={`v${version.version}`}
                    color={version.isCurrent ? 'primary' : 'default'}
                    size="small"
                  />
                  {version.isCurrent && (
                    <Chip label="Actual" color="success" size="small" />
                  )}
                  <Typography variant="body1" flex={1} sx={{ color: '#495057', fontWeight: 500 }}>
                    {version.fileName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
                    {formatRelativeTime(version.uploadDate)}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Box display="flex" gap={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
                        Subido por:
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: '#6c757d' }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#495057', fontWeight: 500 }}>
                            {version.uploadedBy.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ color: '#6c757d' }}>
                            {version.uploadedBy.email}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
                        Fecha de subida:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#495057', fontWeight: 500 }}>
                        {version.uploadDate.toLocaleDateString('es-ES', {
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
                        Tamaño:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#495057', fontWeight: 500 }}>
                        {formatFileSize(version.fileSize)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {version.comments && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ color: '#6c757d' }}>
                          Comentarios:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#495057', fontWeight: 400 }}>
                          {version.comments}
                        </Typography>
                      </Box>
                    </>
                  )}
                  
                  <Divider />
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => onDownloadVersion(version)}
                    >
                      Descargar
                    </Button>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}