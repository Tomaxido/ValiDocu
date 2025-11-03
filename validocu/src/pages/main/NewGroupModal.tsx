import React, { useRef, useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, List, ListItem, ListItemText, IconButton,
  Box, Typography, Alert, FormControlLabel, Switch
} from "@mui/material";
import { X, FileText } from "lucide-react";
import { getAllAvailableDocumentTypes, updateGroupConfiguration } from "../../utils/api";
import DocumentConfigurationPanel from "../../components/shared/DocumentConfigurationPanel";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (groupName: string, files: FileList, isPrivate?: boolean) => Promise<{ group_id?: number }>;
  onGroupCreated?: (groupId: number) => void; // Nuevo callback para cuando se crea el grupo
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

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
    isRequired: boolean;  // Si este tipo de documento es obligatorio
    requiredFields: number[];  // IDs de los campos obligatorios
  };
}

export default function NewGroupModal({ isOpen, onClose, onUpload, onGroupCreated }: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [groupName, setGroupName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [createGroup, setCreateGroup] = useState(true); // Nuevo: controla si se crea grupo o no
  const [fileList, setFileList] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  
  // Estados para configuración
  const [step, setStep] = useState(0); // 0: archivos, 1: configuración
  const [availableDocumentTypes, setAvailableDocumentTypes] = useState<DocumentTypeWithFields[]>([]);
  const [globalFields, setGlobalFields] = useState<any[]>([]);
  const [selectedConfiguration, setSelectedConfiguration] = useState<ConfigurationState>({});
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);

  // Helper para obtener field_specs de forma segura
  const getFieldSpecs = (docType: DocumentTypeWithFields) => {
    return docType.field_specs || (docType as any).fieldSpecs || [];
  };

  // Handlers para configuración de documentos (consistente con GroupConfigurationModal)
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
      }
      
      return newConfig;
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

  // Cargar tipos de documentos disponibles cuando se abre la modal
  useEffect(() => {
    if (isOpen && availableDocumentTypes.length === 0) {
      loadAvailableDocumentTypes();
    }
  }, [isOpen]);

  const loadAvailableDocumentTypes = async () => {
    setLoadingDocTypes(true);
    try {
      const response = await getAllAvailableDocumentTypes();
      
      if (!response || !response.document_types) {
        console.warn('No se recibieron tipos de documentos válidos:', response);
        setAvailableDocumentTypes([]);
        setGlobalFields([]);
        return;
      }
      
      setAvailableDocumentTypes(response.document_types || []);
      setGlobalFields(response.global_fields || []);
      
      // Inicializar configuración por defecto (todos los campos requeridos seleccionados)
      const defaultConfig: ConfigurationState = {};
      response.document_types?.forEach((docType: DocumentTypeWithFields) => {
        const fieldSpecs = getFieldSpecs(docType);
        defaultConfig[docType.id] = {
          isRequired: false,  // Por defecto no obligatorio
          requiredFields: fieldSpecs
            .filter((spec: any) => spec.is_required)
            .map((spec: any) => spec.id)
        };
      });
      setSelectedConfiguration(defaultConfig);
    } catch (error) {
      console.error('Error loading document types:', error);
      setAvailableDocumentTypes([]);
      setGlobalFields([]);
      setSelectedConfiguration({});
    } finally {
      setLoadingDocTypes(false);
    }
  };

  const dedupeMerge = (incoming: File[]) => {
    setFileList(prev => {
      const map = new Map<string, File>();
      for (const f of prev) map.set(`${f.name}-${f.size}-${f.lastModified}`, f);
      for (const f of incoming) map.set(`${f.name}-${f.size}-${f.lastModified}`, f);
      return Array.from(map.values());
    });
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) dedupeMerge(files);
    if (inputRef.current) inputRef.current.value = ""; // permitir elegir los mismos archivos después
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) dedupeMerge(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragging) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Evitar "falsos" leave cuando se entra a un hijo
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
    setDragging(false);
  };

  const removeFile = (index: number) => {
    setFileList(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    // Si no se crea grupo, ir directo a paso 1 sin validar nombre
    if (!createGroup && fileList.length > 0) {
      setStep(1);
    } else if (step === 0 && groupName && fileList.length > 0) {
      setStep(1);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      setStep(0);
    }
  };

  const handleSubmit = async () => {
    // Si no se crea grupo, solo validar archivos
    if (!createGroup && fileList.length === 0) return;
    // Si se crea grupo, validar nombre y archivos
    if (createGroup && (!groupName || fileList.length === 0)) return;
    
    const dt = new DataTransfer();
    fileList.forEach(f => dt.items.add(f));
    
    try {
      // 1. Crear el grupo con los archivos (o subir sin grupo si createGroup es false)
      const response = await onUpload(createGroup ? groupName : "", dt.files, isPrivate);
      
      // 2. Si hay configuración seleccionada, enviarla al backend
      if (response?.group_id && Object.keys(selectedConfiguration).length > 0) {
        try {
          await updateGroupConfiguration(response.group_id, selectedConfiguration);
        } catch (configError) {
          console.error('Error saving group configuration:', configError);
          // No bloqueamos el flujo si falla la configuración
        }
      }
      
      setFileList([]);
      setGroupName("");
      setIsPrivate(false);
      setCreateGroup(true); // Reset al valor por defecto
      setStep(0);
      setSelectedConfiguration({});
      onClose();
      
      // Llamar el callback con el group_id
      if (onGroupCreated && response?.group_id) {
        onGroupCreated(response.group_id);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth={step === 1 ? "md" : "sm"}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FileText size={24} />
        {step === 0 ? (createGroup ? "Nuevo grupo" : "Subir documentos sueltos") : "Configurar documentos obligatorios"}
      </DialogTitle>

      <DialogContent dividers>
        {step === 0 ? (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={createGroup}
                  onChange={(e) => {
                    setCreateGroup(e.target.checked);
                    // Si se desactiva, limpiar el nombre del grupo
                    if (!e.target.checked) {
                      setGroupName("");
                      setIsPrivate(false);
                    }
                  }}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    Crear grupo de documentos
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {createGroup 
                      ? "Los documentos se agruparán bajo un nombre común"
                      : "Los documentos se subirán de forma individual sin agrupar"
                    }
                  </Typography>
                </Box>
              }
              sx={{ mb: 2, alignItems: 'flex-start' }}
            />

            {createGroup && (
              <>
                <TextField
                  label="Nombre del grupo"
                  fullWidth
                  size="small"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  sx={{ mt: 1, mb: 2 }}
                  required
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Grupo privado
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Solo tú podrás ver y administrar este grupo. Puedes solicitar que otros usuarios accedan mediante autorización de un administrador.
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 2, alignItems: 'flex-start' }}
                />
              </>
            )}
            
            {!createGroup && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Los documentos se analizarán individualmente y aparecerán en la sección de "Documentos Sueltos" en el inicio
              </Alert>
            )}
          </>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Configura qué etiquetas son obligatorias para cada tipo de documento en este grupo.
              Solo se muestran tipos de documento que se analizan automáticamente.
            </Alert>
            
            {loadingDocTypes ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <Typography>Cargando tipos de documentos...</Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                <DocumentConfigurationPanel
                  availableDocumentTypes={availableDocumentTypes}
                  globalFields={globalFields}
                  selectedConfiguration={selectedConfiguration}
                  onDocumentTypeToggle={handleDocumentTypeToggle}
                  onFieldToggle={handleFieldToggle}
                  onSelectAllFields={handleSelectAllFields}
                />
              </Box>
            )}
          </Box>
        )}

        {step === 0 && (
          <>
            {/* Dropzone clickeable */}
            <Box
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              tabIndex={0}
              aria-label="Zona para arrastrar o seleccionar archivos"
              sx={(t) => ({
                cursor: "pointer",
                border: "2px dashed",
                borderColor: dragging ? "warning.main" : "divider",
                bgcolor: dragging ? t.palette.action.hover : "background.paper",
                borderRadius: 2,
                p: 4,
                textAlign: "center",
                transition: t.transitions.create(["border-color", "background-color"], {
                  duration: 150,
                  easing: t.transitions.easing.easeInOut,
                }),
                outline: "none",
                "&:focus-visible": {
                  boxShadow: `0 0 0 3px ${t.palette.warning.main}33`,
                },
              })}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                Arrastra tus archivos aquí
              </Typography>
              <Typography variant="body2" color="text.secondary">
                o haz clic para seleccionar desde tu equipo
              </Typography>

              {/* input oculto para file picker */}
              <input
                ref={inputRef}
                type="file"
                multiple
                onChange={handleInput}
                style={{ display: "none" }}
              />
            </Box>

            {/* Lista de seleccionados */}
            <List dense sx={{ mt: 2 }}>
              {fileList.map((file, i) => (
                <ListItem
                  key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => removeFile(i)} aria-label="quitar">
                      <X size={16} />
                    </IconButton>
                  }
                >
                  <ListItemText primary={file.name} secondary={formatBytes(file.size)} />
                </ListItem>
              ))}
            </List>

            {fileList.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Aún no has seleccionado archivos.
              </Typography>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        
        {step === 0 ? (
          <Button 
            onClick={handleNext} 
            disabled={fileList.length === 0 || (createGroup && !groupName)}
            variant="contained"
          >
            Continuar con configuración
          </Button>
        ) : (
          <>
            <Button onClick={handleBack}>
              Volver
            </Button>
            <Button onClick={handleSubmit}>
              {createGroup ? "Crear grupo con configuración" : "Subir documentos"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
