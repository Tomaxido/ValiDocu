import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  CircularProgress,
  FormControlLabel,
  Switch,
  Typography,
  Alert,
} from "@mui/material";
import {
  getDocumentGroups,
  addDocumentsToGroup,
  createGroupWithDocuments,
  getAllAvailableDocumentTypes,
  updateGroupConfiguration,
} from "../utils/api";
import type { DocumentGroup } from "../utils/interfaces";
import DocumentConfigurationPanel from "./shared/DocumentConfigurationPanel";

interface DocumentTypeWithFields {
  id: number;
  nombre_doc: string;
  analizar: number;
  field_specs: Array<{
    id: number;
    field_key: string;
    label: string;
    is_required: boolean;
  }>;
}

interface ConfigurationState {
  [documentTypeId: number]: {
    isRequired: boolean;
    requiredFields: number[];
  };
}

export default function AddToGroupModal({
  open,
  onClose,
  documentIds,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  documentIds: number[];
  onDone: () => void;
}) {
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  // Copiado de NewGroupModal para permitir configurar grupo al crearlo
  const [step, setStep] = useState(0);
  const [availableDocumentTypes, setAvailableDocumentTypes] = useState<
    DocumentTypeWithFields[]
  >([]);
  const [globalFields, setGlobalFields] = useState<any[]>([]);
  const [selectedConfiguration, setSelectedConfiguration] = useState<ConfigurationState>({});
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);

  // Helper para field_specs
  const getFieldSpecs = (docType: DocumentTypeWithFields) => {
    return docType.field_specs || (docType as any).fieldSpecs || [];
  };

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const g = await getDocumentGroups();
        setGroups(g);
      } catch (err) {
        console.error("Error loading groups", err);
        setGroups([]);
      }
    })();
    // si estaba abierto y se configura, precargar tipos
    if (step === 1) {
      loadAvailableDocumentTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (step === 1 && open && availableDocumentTypes.length === 0) {
      loadAvailableDocumentTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, open]);

  const loadAvailableDocumentTypes = async () => {
    setLoadingDocTypes(true);
    try {
      const response = await getAllAvailableDocumentTypes();
      if (!response || !response.document_types) {
        setAvailableDocumentTypes([]);
        setGlobalFields([]);
        setSelectedConfiguration({});
        return;
      }
      setAvailableDocumentTypes(response.document_types || []);
      setGlobalFields(response.global_fields || []);

      const defaultConfig: ConfigurationState = {};
      (response.document_types || []).forEach((docType: DocumentTypeWithFields) => {
        const fieldSpecs = getFieldSpecs(docType);
        defaultConfig[docType.id] = {
          isRequired: false,
          requiredFields: fieldSpecs.filter((s: any) => s.is_required).map((s: any) => s.id),
        };
      });
      setSelectedConfiguration(defaultConfig);
    } catch (err) {
      console.error("Error loading document types", err);
      setAvailableDocumentTypes([]);
      setGlobalFields([]);
      setSelectedConfiguration({});
    } finally {
      setLoadingDocTypes(false);
    }
  };

  // Handlers para configuración (copiado)
  const handleDocumentTypeToggle = (documentTypeId: number) => {
    setSelectedConfiguration(prev => {
      const current = prev[documentTypeId] || { isRequired: false, requiredFields: [] };
      return {
        ...prev,
        [documentTypeId]: {
          isRequired: !current.isRequired,
          requiredFields: !current.isRequired ? current.requiredFields : [],
        },
      };
    });
  };

  const handleFieldToggle = (documentTypeId: number, fieldSpecId: number) => {
    setSelectedConfiguration(prev => {
      const newConfig = { ...prev };
      const currentFields = prev[documentTypeId]?.requiredFields || [];
      const isSelected = currentFields.includes(fieldSpecId);
      const newFields = isSelected ? currentFields.filter(id => id !== fieldSpecId) : [...currentFields, fieldSpecId];
      newConfig[documentTypeId] = {
        ...(newConfig[documentTypeId] || { isRequired: false, requiredFields: [] }),
        requiredFields: newFields,
      };
      return newConfig;
    });
  };

  const handleSelectAllFields = (documentTypeId: number, allFieldIds: number[]) => {
    setSelectedConfiguration(prev => {
      const newConfig = { ...prev };
      const current = prev[documentTypeId] || { isRequired: false, requiredFields: [] };
      const hasAll = allFieldIds.every(id => current.requiredFields.includes(id));
      newConfig[documentTypeId] = {
        ...(newConfig[documentTypeId] || { isRequired: false, requiredFields: [] }),
        requiredFields: hasAll ? [] : allFieldIds,
      };
      return newConfig;
    });
  };

  const handleNext = () => {
    // Si no se crea grupo, ir directo a paso 1 sin validar nombre
    if (step === 0 && newGroupName) {
      setStep(1);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      setStep(0);
    }
  };

  const handleAddToExisting = async () => {
    if (!selectedGroupId) return;
    setLoading(true);
    try {
      await addDocumentsToGroup(selectedGroupId, documentIds);
      onDone();
    } catch (err) {
      console.error("Error adding to existing group", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      const group = await createGroupWithDocuments(newGroupName.trim(), false, documentIds);
      console.log(group.id, step, selectedConfiguration);
      if (group.id && step === 1 && Object.keys(selectedConfiguration || {}).length > 0) {
        try {
          await updateGroupConfiguration(Number(group.id), selectedConfiguration);
        } catch (cfgErr) {
          console.error("Error saving group configuration:", cfgErr);
          // no bloqueamos el flujo principal
        }
      }
      onDone();
    } catch (err) {
      console.error("Error creating group and adding documents", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={step === 1 ? "md" : "sm"}>
      <DialogTitle>Añadir documentos seleccionados a grupo</DialogTitle>
      <DialogContent>
        {
        step === 0
        ?
        <Box sx={{ mt: 1, display: "flex", gap: 2, flexDirection: "column" }}>
          <FormControl fullWidth size="small">
            <InputLabel id="existing-group-label">Grupo existente</InputLabel>
            <Select
              labelId="existing-group-label"
              value={selectedGroupId ?? ""}
              label="Grupo existente"
              onChange={(e) => setSelectedGroupId(Number(e.target.value))}
            >
              <MenuItem value="">
                <em>Seleccionar...</em>
              </MenuItem>
              {groups.map(g => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ textAlign: "center", color: "text.secondary" }}>— o —</Box>

          <TextField
            size="small"
            label="Crear nuevo grupo y mover documentos"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            fullWidth
          />
        </Box>
        :
        <DocumentConfigurationPanel
          availableDocumentTypes={availableDocumentTypes}
          globalFields={globalFields}
          selectedConfiguration={selectedConfiguration}
          onDocumentTypeToggle={handleDocumentTypeToggle}
          onFieldToggle={handleFieldToggle}
          onSelectAllFields={handleSelectAllFields}
        />
        }
        
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading || creating}>Cancelar</Button>

        {
        step === 0
        ? (
          <>
            <Button onClick={handleAddToExisting} disabled={!selectedGroupId || loading} variant="contained">
              {loading ? <CircularProgress size={18} /> : "Agregar a grupo existente"}
            </Button>
            <Button onClick={handleNext} disabled={!newGroupName.trim() || creating} variant="outlined">
              {creating ? <CircularProgress size={18} /> : "Crear grupo y mover"}
            </Button>
          </>
        )
        : (
          <>
            <Button onClick={handleBack}>
              Volver
            </Button>
            <Button onClick={handleCreateAndAdd}>
              Crear grupo y mover
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}