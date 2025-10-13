import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  IconButton,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';

interface UploadNewVersionModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  currentVersion: number;
  onUploadSuccess?: (newVersion: number) => void;
}

export default function UploadNewVersionModal({
  open,
  onClose,
  documentId,
  documentName,
  currentVersion,
  onUploadSuccess,
}: UploadNewVersionModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comments, setComments] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea un PDF
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        return;
      }

      // Validar tamaño (máximo 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setError('El archivo no puede ser mayor a 50MB');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!selectedFile || !comments.trim()) return;

    setUploading(true);
    setError(null);

    try {
      // Simular llamada a API
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simular error ocasional
          if (Math.random() < 0.1) {
            reject(new Error('Error al subir el archivo'));
          } else {
            resolve(null);
          }
        }, 2000);
      });

      // Éxito
      const newVersion = currentVersion + 1;
      onUploadSuccess?.(newVersion);
      handleClose();
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      setComments('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Subir Nueva Versión
          </Typography>
          <IconButton onClick={handleClose} disabled={uploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Información del documento */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Documento: {documentName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Versión actual: v{currentVersion} → Nueva versión: v{currentVersion + 1}
            </Typography>
          </Box>

          {/* Selector de archivo */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Seleccionar archivo *
            </Typography>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="file-upload-input"
              disabled={uploading}
            />
            <label htmlFor="file-upload-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<AttachFileIcon />}
                disabled={uploading}
                fullWidth
                sx={{ 
                  height: 120,
                  borderStyle: 'dashed',
                  borderWidth: 2,
                  '&:hover': {
                    borderStyle: 'dashed',
                    borderWidth: 2,
                  }
                }}
              >
                <Box textAlign="center">
                  <Typography variant="body1" gutterBottom>
                    {selectedFile ? selectedFile.name : 'Seleccionar archivo PDF'}
                  </Typography>
                  {selectedFile && (
                    <Typography variant="body2" color="text.secondary">
                      {formatFileSize(selectedFile.size)}
                    </Typography>
                  )}
                  {!selectedFile && (
                    <Typography variant="body2" color="text.secondary">
                      Arrastra un archivo aquí o haz clic para seleccionar
                    </Typography>
                  )}
                </Box>
              </Button>
            </label>
          </Box>

          {/* Comentarios */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Comentarios sobre los cambios *
            </Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              placeholder="Describe los cambios realizados en esta nueva versión..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={uploading}
              helperText="Estos comentarios ayudarán a otros usuarios a entender qué cambió en esta versión"
            />
          </Box>

          {/* Error */}
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {/* Progress */}
          {uploading && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Subiendo archivo...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancelar
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!selectedFile || !comments.trim() || uploading}
          startIcon={<CloudUploadIcon />}
        >
          {uploading ? 'Subiendo...' : 'Subir Nueva Versión'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}