import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Card, CardContent,
  CircularProgress, Snackbar, IconButton, Tooltip, Alert
} from "@mui/material";
import { Settings, History } from "lucide-react";
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
import GroupConfigurationHistoryModal from "./GroupConfigurationHistoryModal";
import DocumentConfigurationPanel from "../shared/DocumentConfigurationPanel";

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
  const [globalFields, setGlobalFields] = useState<any[]>([]);
  const [hasConfiguration, setHasConfiguration] = useState(false);
  
  // State para manejar la configuración seleccionada
  const [selectedConfiguration, setSelectedConfiguration] = useState<ConfigurationState>({});
  
  // Estado para el modal de historial
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

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
      setGlobalFields(typesResponse.global_fields || []);
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
        if (config.analizar === 1) {
          // Para documentos con análisis, usar sus campos específicos
          const specificFields = config.required_fields.map((field: any) => field.field_spec_id);
          initialSelection[config.document_type_id] = {
            isRequired: true,
            requiredFields: specificFields
          };
        } else {
          // Para documentos sin análisis
          initialSelection[config.document_type_id] = {
            isRequired: true,
            requiredFields: []
          };
        }
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
      const newConfig = { ...prev };
      
      // Verificar si es un documento con análisis
      const docType = availableDocumentTypes.find(dt => dt.id === documentTypeId);
      
      if (docType && docType.analizar === 1) {
        // Para documentos con análisis, configurar solo el tipo específico seleccionado
        const currentFields = prev[documentTypeId]?.requiredFields || [];
        const isSelected = currentFields.includes(fieldSpecId);
        
        const newFields = isSelected 
          ? currentFields.filter(id => id !== fieldSpecId)
          : [...currentFields, fieldSpecId];
        
        // Aplicar el cambio solo al tipo de documento específico
        newConfig[documentTypeId] = {
          ...newConfig[documentTypeId],
          requiredFields: newFields
        };
      } else {
        // Para documentos sin análisis, no hacer nada (no tienen campos)
      }
      
      return newConfig;
    });
  };

  const handleDocumentTypeToggle = (documentTypeId: number) => {
    setSelectedConfiguration(prev => {
      const current = prev[documentTypeId] || { isRequired: false, requiredFields: [] };
      
      return {
        ...prev,
        [documentTypeId]: {
          isRequired: !current.isRequired,
          // Si se desmarca como obligatorio, limpiar campos obligatorios
          // Si se marca como obligatorio, mantener los campos actuales
          requiredFields: !current.isRequired ? current.requiredFields : []
        }
      };
    });
  };

  const handleSelectAllFields = (documentTypeId: number, allFieldIds: number[]) => {
    setSelectedConfiguration(prev => {
      const newConfig = { ...prev };
      
      // Verificar si es un documento con análisis
      const docType = availableDocumentTypes.find(dt => dt.id === documentTypeId);
      
      if (docType && docType.analizar === 1) {
        // Para documentos con análisis, configurar solo el tipo específico seleccionado
        const current = prev[documentTypeId] || { isRequired: false, requiredFields: [] };
        const hasAllSelected = allFieldIds.every(id => current.requiredFields.includes(id));
        
        const newFields = hasAllSelected ? [] : allFieldIds;
        
        // Aplicar el cambio solo al tipo de documento específico
        newConfig[documentTypeId] = {
          ...newConfig[documentTypeId],
          requiredFields: newFields
        };
      }
      
      return newConfig;
    });
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
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings size={20} />
            Configuración del Grupo: {group.name}
          </Box>
          <Tooltip title="Ver historial de cambios">
            <IconButton onClick={() => setHistoryModalOpen(true)}>
              <History size={20} />
            </IconButton>
          </Tooltip>
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
            <DocumentConfigurationPanel
              availableDocumentTypes={availableDocumentTypes}
              globalFields={globalFields}
              selectedConfiguration={selectedConfiguration}
              onDocumentTypeToggle={handleDocumentTypeToggle}
              onFieldToggle={handleFieldToggle}
              onSelectAllFields={handleSelectAllFields}
            />
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

      <GroupConfigurationHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        groupId={group.id}
        groupName={group.name}
      />
    </>
  );
}