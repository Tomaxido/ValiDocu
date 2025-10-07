import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, Alert, CircularProgress, IconButton, Tooltip
} from '@mui/material';
import { Check, X, Eye, Clock, User, Shield } from 'lucide-react';
import { reviewAccessRequest } from '../../utils/api';
import { 
  getPermissionTypeLabel, 
  getPermissionTypeColor, 
  formatRequestingUser 
} from '../../utils/permissions';
import { usePendingAccessRequests, type PendingRequest } from '../../hooks/usePendingAccessRequests';

interface ReviewDialogProps {
  open: boolean;
  request: PendingRequest | null;
  onClose: () => void;
  onReview: (requestId: number, action: 'approve' | 'reject', comment?: string) => void;
  isSubmitting: boolean;
}

function ReviewDialog({ open, request, onClose, onReview, isSubmitting }: ReviewDialogProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (request && action) {
      onReview(request.id, action, comment);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAction(null);
      setComment('');
      onClose();
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield size={20} />
          Revisar Solicitud de Acceso
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Información de la solicitud */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Detalles de la solicitud</Typography>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Usuario destino:</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {request.user_name ? `${request.user_name} (${request.user_email})` : request.user_email}
                </Typography>
              </Box>
              {(request.user_rname || request.user_remail) && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Solicitado por:</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatRequestingUser(request.user_rname, request.user_remail)}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Grupo:</Typography>
                <Typography variant="body2" fontWeight={600}>{request.group_name}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Tipo de permiso:</Typography>
                <Chip 
                  label={getPermissionTypeLabel(request.permission_type)} 
                  size="small"
                  color={getPermissionTypeColor(request.permission_type)}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Fecha de solicitud:</Typography>
                <Typography variant="body2">{new Date(request.created_at).toLocaleString()}</Typography>
              </Box>
              {request.request_reason && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Razón:</Typography>
                  <Typography variant="body2" sx={{ 
                    p: 1, 
                    bgcolor: 'grey.50', 
                    borderRadius: 1,
                    fontStyle: 'italic'
                  }}>
                    "{request.request_reason}"
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Acción a tomar */}
          {!action && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>¿Qué acción deseas tomar?</Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Check size={16} />}
                  onClick={() => setAction('approve')}
                >
                  Aprobar
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<X size={16} />}
                  onClick={() => setAction('reject')}
                >
                  Rechazar
                </Button>
              </Stack>
            </Box>
          )}

          {/* Comentario del administrador */}
          {action && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Comentario {action === 'approve' ? 'de aprobación' : 'de rechazo'} (opcional)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  action === 'approve' 
                    ? 'Puedes agregar un mensaje de bienvenida o instrucciones...'
                    : 'Explica el motivo del rechazo...'
                }
                disabled={isSubmitting}
              />
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        {action && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color={action === 'approve' ? 'success' : 'error'}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : (action === 'approve' ? <Check size={16} /> : <X size={16} />)}
          >
            {isSubmitting ? 'Procesando...' : (action === 'approve' ? 'Aprobar solicitud' : 'Rechazar solicitud')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default function AccessRequestsPage() {
  const { requests, loading, error, refresh } = usePendingAccessRequests(true, 0); // No auto-refresh aquí
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReviewRequest = async (requestId: number, action: 'approve' | 'reject', comment?: string) => {
    try {
      setIsSubmitting(true);
      await reviewAccessRequest(requestId, action, comment);
      
      // Recargar la lista
      await refresh();
      
      // Cerrar modal
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      
    } catch (err: any) {
      console.error('Error processing request:', err);
      alert(err.message || 'Error al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReview = (request: PendingRequest) => {
    setSelectedRequest(request);
    setReviewDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield size={28} />
          Administración de Solicitudes de Acceso
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestiona las solicitudes de acceso a grupos privados
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock size={20} />
            Solicitudes Pendientes ({requests.length})
          </Typography>
        </Box>

        {requests.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No hay solicitudes pendientes
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuario a Añadir</TableCell>
                <TableCell>Grupo</TableCell>
                <TableCell>Permisos</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Razón</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(requests) && requests.map((request) => (
                <TableRow key={request.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <User size={16} />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {request.user_name || 'Sin nombre'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {request.user_email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {request.group_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getPermissionTypeLabel(request.permission_type)} 
                      size="small"
                      color={getPermissionTypeColor(request.permission_type)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(request.created_at).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(request.created_at).toLocaleTimeString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {request.request_reason || 'Sin razón especificada'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Revisar solicitud">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenReview(request)}
                          sx={{ color: 'primary.main' }}
                        >
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <ReviewDialog
        open={reviewDialogOpen}
        request={selectedRequest}
        onClose={() => setReviewDialogOpen(false)}
        onReview={handleReviewRequest}
        isSubmitting={isSubmitting}
      />
    </Box>
  );
}