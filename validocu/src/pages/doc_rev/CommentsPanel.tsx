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
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" sx={{ color: '#495057', fontWeight: 600 }}>
          Comentarios
        </Typography>
        {!showInput && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowInput(true)}
            sx={{
              borderColor: '#007bff',
              color: '#007bff',
              '&:hover': {
                borderColor: '#0056b3',
                bgcolor: 'rgba(0, 123, 255, 0.04)',
              },
            }}
          >
            Añadir comentario
          </Button>
        )}
      </Box>

      {showInput && (
        <Paper
          elevation={2}
          sx={{
            p: 2,
            bgcolor: '#f8f9fa',
            border: '2px solid #007bff',
          }}
        >
          <Box display="flex" gap={1} alignItems="flex-start">
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: '#007bff',
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
                      borderColor: '#ced4da',
                    },
                    '&:hover fieldset': {
                      borderColor: '#007bff',
                    },
                  },
                }}
              />
              <Box display="flex" gap={1} mt={1} justifyContent="flex-end">
                <Button
                  size="small"
                  onClick={() => {
                    setShowInput(false);
                    setNewComment('');
                  }}
                  sx={{ color: '#6c757d' }}
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
                    bgcolor: '#007bff',
                    '&:hover': {
                      bgcolor: '#0056b3',
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
              sx={{ color: '#6c757d' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      )}

      <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
        <Stack spacing={2}>
          {comments.length === 0 ? (
            <Paper
              elevation={1}
              sx={{
                p: 3,
                bgcolor: '#f8f9fa',
                border: '1px solid #e9ecef',
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
                No hay comentarios aún. ¡Sé el primero en comentar!
              </Typography>
            </Paper>
          ) : (
            comments.map((comment) => (
              <Paper
                key={comment.id}
                elevation={1}
                sx={{
                  p: 2,
                  bgcolor: '#f8f9fa',
                  border: '1px solid #e9ecef',
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
                        mb: 1,
                      }}
                    />
                    <Box display="flex" gap={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        onClick={handleCancelEdit}
                        sx={{ color: '#6c757d' }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editText.trim() || submitting}
                        sx={{
                          bgcolor: '#007bff',
                          '&:hover': {
                            bgcolor: '#0056b3',
                          },
                        }}
                      >
                        Guardar
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  // Modo visualización
                  <Box display="flex" alignItems="start" gap={2}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: '#6c757d',
                      }}
                    >
                      <PersonIcon />
                    </Avatar>
                    <Box flex={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Typography
                          variant="body2"
                          sx={{ color: '#495057', fontWeight: 600, mb: 0.5 }}
                        >
                          {comment.user.name}
                          {comment.is_edited && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ ml: 1, color: '#6c757d', fontStyle: 'italic' }}
                            >
                              (editado)
                            </Typography>
                          )}
                        </Typography>
                        {isOwnComment(comment) && (
                          <Box>
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, comment.id)}
                              sx={{ color: '#6c757d' }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                      <Typography
                        variant="body1"
                        sx={{ color: '#495057', mb: 1, whiteSpace: 'pre-wrap' }}
                      >
                        {comment.text}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ color: '#6c757d' }}>
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
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Eliminar comentario</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} sx={{ color: '#6c757d' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={submitting}
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
