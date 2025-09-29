import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Card, CardContent, Divider,
  FormControlLabel, Checkbox, Chip, Alert,
  Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon,
  CircularProgress, Snackbar
} from "@mui/material";
import { Settings, ChevronDown, FileText, Tag } from "lucide-react";
import { 
  getGroupConfiguration, 
  getAvailableDocumentTypes, 
  updateGroupConfiguration,
  initializeGroupConfiguration
} from "../../utils/api";
import type { 
  DocumentGroup, 
  GroupConfiguration, 
  DocumentTypeWithFields
} from "../../utils/interfaces";

interface Props {
  open: boolean;
  group: DocumentGroup;
  onClose: () => void;
}

interface ConfigurationState {
  [documentTypeId: number]: {
    isRequired: boolean;
    requiredFields: number[];
  };
}

export default function GroupConfigurationModal({ open, group, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [availableDocumentTypes, setAvailableDocumentTypes] = useState<DocumentTypeWithFields[]>([]);
  const [hasConfiguration, setHasConfiguration] = useState(false);
  
  // State para manejar la configuración seleccionada
  const [selectedConfiguration, setSelectedConfiguration] = useState<ConfigurationState>({});

  useEffect(() => {
    if (open && group.id) {
      loadGroupConfiguration();
    }
  }, [open, group.id]);

  const loadGroupConfiguration = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [configResponse, typesResponse] = await Promise.all([
        getGroupConfiguration(group.id),
        getAvailableDocumentTypes(group.id)
      ]);

      setAvailableDocumentTypes(typesResponse.document_types || []);
      setHasConfiguration(configResponse.has_configuration || false);

      // Inicializar estado de selección basado en configuración actual
      const initialSelection: ConfigurationState = {};
      
      // Primero, configurar todos los tipos de documento como no obligatorios
      typesResponse.document_types?.forEach((docType: DocumentTypeWithFields) => {
        initialSelection[docType.id] = {
          isRequired: false,
          requiredFields: []
        };
      });
      
      // Luego, marcar como obligatorios aquellos que tienen configuración
      configResponse.configuration?.forEach((config: GroupConfiguration) => {
        initialSelection[config.document_type_id] = {
          isRequired: true,
          requiredFields: config.required_fields.map((field: any) => field.id)
        };
      });
      
      setSelectedConfiguration(initialSelection);

    } catch (err: any) {
      setError(err.message || "Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeConfiguration = async () => {
    setSaving(true);
    try {
      await initializeGroupConfiguration(group.id);
      await loadGroupConfiguration();
      setSuccess("Configuración inicializada exitosamente");
    } catch (err: any) {
      setError(err.message || "Error al inicializar configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Enviar la configuración en el nuevo formato
      await updateGroupConfiguration(group.id, selectedConfiguration);
      await loadGroupConfiguration();
      setSuccess("Configuración guardada exitosamente");
    } catch (err: any) {
      setError(err.message || "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldToggle = (documentTypeId: number, fieldSpecId: number) => {
    setSelectedConfiguration(prev => {
      const current = prev[documentTypeId] || { isRequired: false, requiredFields: [] };
      const isSelected = current.requiredFields.includes(fieldSpecId);
      
      return {
        ...prev,
        [documentTypeId]: {
          ...current,
          requiredFields: isSelected 
            ? current.requiredFields.filter(id => id !== fieldSpecId)
            : [...current.requiredFields, fieldSpecId]
        }
      };
    });
  };

  const handleDocumentTypeToggle = (documentTypeId: number) => {
    setSelectedConfiguration(prev => {
      const current = prev[documentTypeId] || { isRequired: false, requiredFields: [] };
      
      return {
        ...prev,
        [documentTypeId]: {
          ...current,
          isRequired: !current.isRequired,
          // Si se desmarca como obligatorio, limpiar campos obligatorios
          requiredFields: !current.isRequired ? current.requiredFields : []
        }
      };
    });
  };

  const getSelectedFieldsCount = (documentTypeId: number): number => {
    return selectedConfiguration[documentTypeId]?.requiredFields?.length || 0;
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings size={20} />
          Configuración del Grupo: {group.name}
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

          {!loading && !hasConfiguration && (
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Este grupo no tiene configuración específica
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Puedes inicializar la configuración con valores por defecto basados en las especificaciones globales del sistema.
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleInitializeConfiguration}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} /> : <Settings size={16} />}
                >
                  {saving ? 'Inicializando...' : 'Inicializar Configuración'}
                </Button>
              </CardContent>
            </Card>
          )}

          {!loading && hasConfiguration && availableDocumentTypes.length > 0 && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Selecciona qué campos son obligatorios para cada tipo de documento en este grupo:
              </Typography>

              {availableDocumentTypes.map((docType) => {
                const requiredFields = docType.field_specs?.filter(spec => spec.is_required) || [];
                const selectedCount = getSelectedFieldsCount(docType.id);
                const totalCount = requiredFields.length;

                return (
                  <Accordion key={docType.id} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <FileText size={16} />
                        <Typography variant="subtitle1" sx={{ flex: 1 }}>
                          {docType.nombre_doc}
                        </Typography>
                        <Chip 
                          label={`${selectedCount}/${totalCount} campos`}
                          size="small"
                          color={selectedCount > 0 ? "primary" : "default"}
                        />
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails>
                      {requiredFields.length > 0 ? (
                        <Box>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedConfiguration[docType.id]?.isRequired || false}
                                onChange={() => handleDocumentTypeToggle(docType.id)}
                              />
                            }
                            label={
                              <Typography variant="body2" fontWeight="medium">
                                Este tipo de documento es obligatorio
                              </Typography>
                            }
                          />
                          <Divider sx={{ my: 1 }} />
                          
                          {selectedConfiguration[docType.id]?.isRequired && (
                            <List dense>
                              {requiredFields.map((field) => (
                                <ListItem key={field.id} sx={{ pl: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 32 }}>
                                    <Checkbox
                                      size="small"
                                      checked={selectedConfiguration[docType.id]?.requiredFields?.includes(field.id) || false}
                                      onChange={() => handleFieldToggle(docType.id, field.id)}
                                    />
                                  </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Tag size={12} />
                                      <Typography variant="body2">
                                        {field.label}
                                      </Typography>
                                      <Chip 
                                        label={field.field_key} 
                                        size="small" 
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem', height: '20px' }}
                                      />
                                    </Box>
                                  }
                                  secondary={
                                    <Typography variant="caption" color="text.secondary">
                                      Tipo: {field.datatype}
                                      {field.regex && ` • Patrón: ${field.regex.slice(0, 30)}...`}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No hay campos obligatorios definidos para este tipo de documento.
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}

          {!loading && hasConfiguration && availableDocumentTypes.length === 0 && (
            <Alert severity="info">
              No hay tipos de documentos disponibles para configurar.
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Cancelar
          </Button>
          {hasConfiguration && (
            <Button
              onClick={handleSaveConfiguration}
              variant="contained"
              disabled={saving || Object.keys(selectedConfiguration).length === 0}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        message={success}
      />
    </>
  );
}