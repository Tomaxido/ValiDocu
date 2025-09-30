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
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack
} from '@mui/material';
import { 
  Settings,
  History as HistoryIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { getGroupConfiguration, getAvailableDocumentTypes } from '../../utils/api';
import type { DocumentGroup, DocumentTypeWithFields, GroupConfiguration } from '../../utils/interfaces';
import GroupConfigurationModal from './GroupConfigurationModal';
import GroupConfigurationHistoryModal from './GroupConfigurationHistoryModal';

interface Props {
  open: boolean;
  group: DocumentGroup;
  onClose: () => void;
}

interface ConfigurationInfo {
  requiredDocuments: Array<{
    id: number;
    name: string;
    analizar: number;
    fields: Array<{
      id: number;
      label: string;
    }>;
  }>;
  hasConfiguration: boolean;
}

const GroupConfigurationInfoModal: React.FC<Props> = ({ open, group, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configInfo, setConfigInfo] = useState<ConfigurationInfo | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  useEffect(() => {
    if (open && group.id) {
      loadConfigurationInfo();
    }
  }, [open, group.id]);

  const loadConfigurationInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [configResponse, typesResponse] = await Promise.all([
        getGroupConfiguration(group.id),
        getAvailableDocumentTypes(group.id)
      ]);

      const hasConfig = configResponse.has_configuration || false;
      const availableTypes = typesResponse.document_types || [];

      if (!hasConfig) {
        setConfigInfo({
          requiredDocuments: [],
          hasConfiguration: false
        });
        return;
      }

      // Procesar configuración actual para mostrar información clara
      const requiredDocuments: ConfigurationInfo['requiredDocuments'] = [];
      
      // La configuración viene como un array de GroupConfiguration
      const configuration = configResponse.configuration || [];
      
      if (Array.isArray(configuration) && configuration.length > 0) {
        // Agrupar por document_type_id para consolidar campos
        const docTypeMap = new Map<number, ConfigurationInfo['requiredDocuments'][0]>();
        
        configuration.forEach((config: any) => {
          const docTypeId = config.document_type_id;
          const docType = availableTypes.find((dt: DocumentTypeWithFields) => dt.id === docTypeId);
          
          if (docType) {
            // Obtener o crear entrada para este tipo de documento
            let docEntry = docTypeMap.get(docTypeId);
            
            if (!docEntry) {
              docEntry = {
                id: docType.id,
                name: docType.nombre_doc,
                analizar: docType.analizar,
                fields: []
              };
              docTypeMap.set(docTypeId, docEntry);
            }
            
            // Agregar campos si es documento con análisis
            if (docType.analizar === 1 && config.required_fields && config.required_fields.length > 0) {
              config.required_fields.forEach((field: any) => {
                // Usar field_spec_id en lugar de id, ya que esa es la estructura real
                const fieldId = field.field_spec_id || field.id;
                if (!docEntry!.fields.find(f => f.id === fieldId)) {
                  docEntry!.fields.push({
                    id: fieldId,
                    label: field.label
                  });
                }
              });
            }
          }
        });
        
        // Convertir Map a array
        requiredDocuments.push(...Array.from(docTypeMap.values()));
      }

      setConfigInfo({
        requiredDocuments,
        hasConfiguration: true
      });
      
    } catch (err: any) {
      setError(err.message || 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setEditModalOpen(true);
  };

  const handleHistoryClick = () => {
    setHistoryModalOpen(true);
  };

  const handleEditModalClose = () => {
    setEditModalOpen(false);
    // Recargar información al cerrar el modal de edición
    loadConfigurationInfo();
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon color="primary" />
              <Typography variant="h6">
                Información de Configuración - {group.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Ver historial de cambios">
                <IconButton onClick={handleHistoryClick}>
                  <HistoryIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Editar configuración">
                <IconButton onClick={handleEditClick} color="primary">
                  <EditIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && configInfo && (
            <Box>
              {!configInfo.hasConfiguration ? (
                <Card sx={{ mb: 2 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Settings sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Sin configuración
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Este grupo no tiene una configuración establecida. 
                      Define qué tipos de documentos son obligatorios para poder validar completitud.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleEditClick}
                      startIcon={<Settings />}
                    >
                      Configurar Grupo
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color="success" />
                    Configuración Activa
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Los siguientes tipos de documentos están configurados como obligatorios para este grupo:
                  </Typography>

                  {configInfo.requiredDocuments.length === 0 ? (
                    <Alert severity="info">
                      No hay tipos de documentos configurados como obligatorios.
                    </Alert>
                  ) : (
                    <Stack spacing={2}>
                      {configInfo.requiredDocuments.map((docType) => (
                        <Card key={`doc-${docType.id}`} variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="h6" component="div">
                                {docType.name}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip 
                                  label="Obligatorio" 
                                  color="primary" 
                                  size="small" 
                                  icon={<CheckCircleIcon />}
                                />
                                <Chip 
                                  label={docType.analizar === 1 ? "Con análisis" : "Sin análisis"} 
                                  variant="outlined" 
                                  size="small" 
                                />
                              </Box>
                            </Box>

                            {docType.analizar === 1 && (
                              <>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle2" gutterBottom>
                                  Campos obligatorios:
                                </Typography>
                                {docType.fields.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">
                                    Sin campos específicos configurados
                                  </Typography>
                                ) : (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {docType.fields.map((field) => (
                                      <Chip 
                                        key={`field-${field.id}`} 
                                        label={field.label} 
                                        size="small" 
                                        variant="outlined"
                                        color="secondary"
                                      />
                                    ))}
                                  </Box>
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}

                  <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Acciones disponibles:
                    </Typography>
                    <List dense>
                      <ListItem disableGutters>
                        <ListItemText
                          primary="Editar configuración"
                          secondary="Modificar tipos de documentos obligatorios y campos requeridos"
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleEditClick}
                          startIcon={<EditIcon />}
                        >
                          Editar
                        </Button>
                      </ListItem>
                      <ListItem disableGutters>
                        <ListItemText
                          primary="Ver historial"
                          secondary="Consultar el historial de cambios de configuración"
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleHistoryClick}
                          startIcon={<HistoryIcon />}
                        >
                          Historial
                        </Button>
                      </ListItem>
                    </List>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de edición de configuración */}
      <GroupConfigurationModal
        open={editModalOpen}
        group={group}
        onClose={handleEditModalClose}
      />

      {/* Modal de historial */}
      <GroupConfigurationHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        groupId={group.id}
        groupName={group.name}
      />
    </>
  );
};

export default GroupConfigurationInfoModal;