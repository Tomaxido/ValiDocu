import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Card,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { getGroupConfigurationHistory } from '../../utils/api';
import type { ConfigurationHistoryEntry } from '../../utils/interfaces';

interface GroupConfigurationHistoryModalProps {
  open: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
}

const GroupConfigurationHistoryModal: React.FC<GroupConfigurationHistoryModalProps> = ({
  open,
  onClose,
  groupId,
  groupName
}) => {
  const [history, setHistory] = useState<ConfigurationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && groupId) {
      loadHistory();
    }
  }, [open, groupId]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getGroupConfigurationHistory(groupId);
      setHistory(response.history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <AddIcon color="success" />;
      case 'updated':
        return <EditIcon color="primary" />;
      case 'deleted':
        return <RemoveIcon color="error" />;
      case 'initialized':
        return <HistoryIcon color="info" />;
      default:
        return <EditIcon />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created':
        return 'Configuración creada';
      case 'updated':
        return 'Configuración actualizada';
      case 'deleted':
        return 'Configuración eliminada';
      case 'initialized':
        return 'Configuración inicializada';
      default:
        return 'Acción desconocida';
    }
  };

  const getActionColor = (action: string): "success" | "primary" | "error" | "info" => {
    switch (action) {
      case 'created':
        return 'success';
      case 'updated':
        return 'primary';
      case 'deleted':
        return 'error';
      case 'initialized':
        return 'info';
      default:
        return 'primary';
    }
  };

  const renderChangeSummary = (entry: ConfigurationHistoryEntry) => {
    const { summary } = entry;
    const hasChanges = 
      summary.document_types_added.length > 0 ||
      summary.document_types_removed.length > 0 ||
      summary.document_types_modified.length > 0 ||
      summary.fields_changed.length > 0;

    if (!hasChanges) {
      return <Typography variant="body2" color="text.secondary">Sin cambios específicos registrados</Typography>;
    }

    return (
      <Box sx={{ mt: 1 }}>
        {summary.document_types_added.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              Tipos de documento añadidos:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {summary.document_types_added.map((docType) => (
                <Chip key={docType.id} size="small" label={docType.name} color="success" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        {summary.document_types_removed.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
              Tipos de documento removidos:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {summary.document_types_removed.map((docType) => (
                <Chip key={docType.id} size="small" label={docType.name} color="error" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        {summary.document_types_modified.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Tipos de documento modificados:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {summary.document_types_modified.map((docType) => (
                <Chip key={docType.id} size="small" label={docType.name} color="primary" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        {summary.fields_changed.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Cambios en campos:
            </Typography>
            {summary.fields_changed.map((fieldChange, index) => (
              <Card key={index} variant="outlined" sx={{ mt: 1, p: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {fieldChange.document_type_name}:
                </Typography>
                {fieldChange.required_status_changed && (
                  <Typography variant="body2" color="warning.main">
                    • Estado de obligatorio cambió
                  </Typography>
                )}
                {fieldChange.fields_added.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="success.main" sx={{ fontSize: '0.875rem' }}>
                      • Campos añadidos:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {fieldChange.fields_added.map((field) => (
                        <Chip 
                          key={field.id} 
                          size="small" 
                          label={field.name} 
                          color="success" 
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', height: '20px' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                {fieldChange.fields_removed.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="error.main" sx={{ fontSize: '0.875rem' }}>
                      • Campos removidos:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {fieldChange.fields_removed.map((field) => (
                        <Chip 
                          key={field.id} 
                          size="small" 
                          label={field.name} 
                          color="error" 
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', height: '20px' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Card>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon />
          <Typography variant="h6">
            Historial de Configuración - {groupName}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && history.length === 0 && (
          <Alert severity="info">
            No hay historial de cambios para este grupo.
          </Alert>
        )}

        {!loading && !error && history.length > 0 && (
          <Box>
            {history.map((entry, index) => (
              <Accordion key={entry.id} defaultExpanded={index === 0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    {getActionIcon(entry.action)}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {getActionLabel(entry.action)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {entry.user.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {entry.created_at_human}
                          </Typography>
                        </Box>
                        <Chip 
                          size="small" 
                          label={entry.action} 
                          color={getActionColor(entry.action)}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails>
                  <Box>
                    {entry.description && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Descripción:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {entry.description}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Fecha completa:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(entry.created_at).toLocaleString('es-ES')}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Resumen de cambios:
                    </Typography>
                    {renderChangeSummary(entry)}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GroupConfigurationHistoryModal;