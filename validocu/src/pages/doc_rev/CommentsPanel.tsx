import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Avatar,
  TextField,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Send as SendIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { Comment } from '../../api/comments';
import type { CommentCreatedEvent } from '../../utils/interfaces';
import { authService } from '../../api/auth';
import { useEchoPublic } from '@laravel/echo-react';

interface CommentsPanelProps {
  comments: Comment[];
  onAddComment: (text: string) => Promise<void>;
  onEditComment: (commentId: string, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onCommentReceived?: (comment: Comment) => void;
  isLoading?: boolean;
}

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export default function CommentsPanel({ 
  comments, 
  onAddComment,
  onEditComment,
  onDeleteComment,
  onCommentReceived 
}: Readonly<CommentsPanelProps>) {
  const [newComment, setNewComment] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Log de montaje del componente
  useEffect(() => {
    console.log('🔧 CommentsPanel montado - Escuchando canal "comments" para evento "CommentCreated"');
    return () => {
      console.log('🔧 CommentsPanel desmontado');
    };
  }, []);
  
  // Estados para edición
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Estados para menú de opciones
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  
  // Estado para diálogo de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  
  // Estados para notificaciones en tiempo real
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  const currentUser = authService.getUser();

  // Escuchar eventos de nuevos comentarios vía WebSocket en canal público
  useEchoPublic<CommentCreatedEvent>('comments', 'CommentCreated', (event) => {
    console.log('� Nuevo comentario recibido:', event);
    
    // No mostrar notificación si el comentario es del usuario actual
    if (String(event.comment.user.id) !== String(currentUser?.id)) {
      console.log('✅ Mostrando notificación - Autor:', event.comment.user.name);
      setNotificationMessage(`${event.comment.user.name} comentó: "${event.comment.text.substring(0, 50)}${event.comment.text.length > 50 ? '...' : ''}"`);
      setNotificationOpen(true);

      // Notificar al padre para actualizar la lista
      if (onCommentReceived) {
        const newCommentData: Comment = {
          id: event.comment.id,
          user: event.comment.user,
          text: event.comment.text,
          timestamp: event.comment.created_at,
          is_edited: event.comment.is_edited,
          created_at: event.comment.created_at,
          updated_at: event.comment.updated_at,
          time_ago: event.comment.time_ago,
        };
        onCommentReceived(newCommentData);
      }
    }
  });

  const handleSubmit = async () => {
    if (newComment.trim() && !submitting) {
      setSubmitting(true);
      try {
        await onAddComment(newComment.trim());
        setNewComment('');
        setShowInput(false);
      } catch (error) {
        console.error('Error al crear comentario:', error);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, commentId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedCommentId(commentId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCommentId(null);
  };

  const handleEditClick = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.text);
    handleMenuClose();
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  const handleSaveEdit = async (commentId: string) => {
    if (editText.trim() && !submitting) {
      setSubmitting(true);
      try {
        await onEditComment(commentId, editText.trim());
        setEditingCommentId(null);
        setEditText('');
      } catch (error) {
        console.error('Error al editar comentario:', error);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDeleteClick = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleConfirmDelete = async () => {
    if (commentToDelete && !submitting) {
      setSubmitting(true);
      try {
        await onDeleteComment(commentToDelete);
        setDeleteDialogOpen(false);
        setCommentToDelete(null);
      } catch (error) {
        console.error('Error al eliminar comentario:', error);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setCommentToDelete(null);
  };

  const isOwnComment = (comment: Comment): boolean => {
    if (!currentUser) return false;
    // Convertir a string para comparar, ya que el backend retorna UUID como string
    return String(currentUser.id) === String(comment.user.id);
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
          Comentarios
        </Typography>
        {!showInput && (
          <Button
            variant="contained"
            size="small"
            onClick={() => setShowInput(true)}
            startIcon={<SendIcon />}
            sx={{
              bgcolor: '#2e7d32',
              color: 'white',
              textTransform: 'none',
              borderRadius: 2,
              px: 2,
              '&:hover': {
                bgcolor: '#1b5e20',
              },
            }}
          >
            Añadir comentario
          </Button>
        )}
      </Box>

      {showInput && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Box display="flex" gap={1} alignItems="flex-start">
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: '#2e7d32',
              }}
            >
              <PersonIcon />
            </Avatar>
            <Box flex={1}>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Escribe tu comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyPress}
                autoFocus
                variant="outlined"
                size="small"
                sx={{
                  bgcolor: 'white',
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'divider',
                    },
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2e7d32',
                    },
                  },
                }}
              />
              <Box display="flex" gap={1} mt={1.5} justifyContent="flex-end">
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    setShowInput(false);
                    setNewComment('');
                  }}
                  sx={{ 
                    bgcolor: '#37474f',
                    color: 'white',
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: '#263238',
                    },
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || submitting}
                  startIcon={<SendIcon />}
                  sx={{
                    bgcolor: '#2e7d32',
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: '#1b5e20',
                    },
                    '&:disabled': {
                      bgcolor: 'action.disabledBackground',
                    },
                  }}
                >
                  Comentar
                </Button>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => {
                setShowInput(false);
                setNewComment('');
              }}
              sx={{ 
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      )}

      <Box sx={{ maxHeight: '400px', overflowY: 'auto', pr: 0.5 }}>
        <Stack spacing={1.5}>
          {comments.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                bgcolor: 'background.default',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No hay comentarios aún. ¡Sé el primero en comentar!
              </Typography>
            </Paper>
          ) : (
            comments.map((comment) => (
              <Paper
                key={comment.id}
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: '#2e7d32',
                    boxShadow: '0 2px 8px rgba(46, 125, 50, 0.08)',
                  },
                }}
              >
                {editingCommentId === comment.id ? (
                  // Modo edición
                  <Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                      variant="outlined"
                      size="small"
                      sx={{
                        bgcolor: 'white',
                        mb: 1.5,
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: '#2e7d32',
                          },
                        },
                      }}
                    />
                    <Box display="flex" gap={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        onClick={handleCancelEdit}
                        sx={{ 
                          color: 'text.secondary',
                          textTransform: 'none',
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editText.trim() || submitting}
                        sx={{
                          bgcolor: '#2e7d32',
                          textTransform: 'none',
                          '&:hover': {
                            bgcolor: '#1b5e20',
                          },
                        }}
                      >
                        Guardar
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  // Modo visualización
                  <Box display="flex" alignItems="start" gap={1.5}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: isOwnComment(comment) ? '#2e7d32' : 'primary.main',
                        fontSize: '0.875rem',
                      }}
                    >
                      {comment.user.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box flex={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={0.5}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                          }}
                        >
                          {comment.user.name}
                          {isOwnComment(comment) && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                ml: 1,
                                color: 'text.secondary',
                                fontWeight: 400,
                              }}
                            >
                              (Tú)
                            </Typography>
                          )}
                          {comment.is_edited && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ ml: 1, color: 'text.secondary', fontStyle: 'italic' }}
                            >
                              (editado)
                            </Typography>
                          )}
                        </Typography>
                        {isOwnComment(comment) && (
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, comment.id)}
                            sx={{ 
                              color: 'text.secondary',
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      <Typography
                        variant="body1"
                        sx={{ color: 'text.primary', mb: 1, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                      >
                        {comment.text}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {formatDateTime(comment.is_edited ? comment.updated_at : comment.created_at)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Paper>
            ))
          )}
        </Stack>
      </Box>

      {/* Menú de opciones */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            const comment = comments.find(c => c.id === selectedCommentId);
            if (comment) handleEditClick(comment);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedCommentId) handleDeleteClick(selectedCommentId);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Eliminar
        </MenuItem>
      </Menu>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={handleCancelDelete}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Eliminar comentario
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            ¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleCancelDelete} 
            sx={{ 
              color: 'text.secondary',
              textTransform: 'none',
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={submitting}
            sx={{
              bgcolor: 'error.main',
              textTransform: 'none',
              '&:hover': {
                bgcolor: 'error.dark',
              },
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificación de nuevo comentario en tiempo real */}
      <Snackbar
        open={notificationOpen}
        autoHideDuration={5000}
        onClose={() => setNotificationOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotificationOpen(false)} 
          severity="info" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notificationMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
