import React, { useRef, useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, List, ListItem, ListItemText, IconButton,
  Box, Typography, Stepper, Step, StepLabel, Card, CardContent,
  FormControlLabel, Checkbox, Accordion, AccordionSummary, AccordionDetails,
  Chip, Alert
} from "@mui/material";
import { X, ChevronDown, FileText, Settings } from "lucide-react";
import { getAllAvailableDocumentTypes, updateGroupConfiguration } from "../../utils/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (groupName: string, files: FileList) => Promise<{ group_id?: number }>;
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
  const [fileList, setFileList] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  
  // Estados para configuración
  const [step, setStep] = useState(0); // 0: archivos, 1: configuración
  const [availableDocumentTypes, setAvailableDocumentTypes] = useState<DocumentTypeWithFields[]>([]);
  const [selectedConfiguration, setSelectedConfiguration] = useState<ConfigurationState>({});
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);

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
      setAvailableDocumentTypes(response.document_types || []);
      
      // Inicializar configuración por defecto (todos los campos requeridos seleccionados)
      const defaultConfig: ConfigurationState = {};
      response.document_types?.forEach((docType: DocumentTypeWithFields) => {
        defaultConfig[docType.id] = {
          isRequired: false,  // Por defecto no obligatorio
          requiredFields: docType.field_specs
            .filter(spec => spec.is_required)
            .map(spec => spec.id)
        };
      });
      setSelectedConfiguration(defaultConfig);
    } catch (error) {
      console.error('Error loading document types:', error);
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
    if (step === 0 && groupName && fileList.length > 0) {
      setStep(1);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      setStep(0);
    }
  };

  const handleFieldToggle = (documentTypeId: number, fieldSpecId: number) => {
    setSelectedConfiguration(prev => {
      const currentConfig = prev[documentTypeId] || { isRequired: false, requiredFields: [] };
      const newFields = currentConfig.requiredFields.includes(fieldSpecId)
        ? currentConfig.requiredFields.filter(id => id !== fieldSpecId)
        : [...currentConfig.requiredFields, fieldSpecId];
      
      return {
        ...prev,
        [documentTypeId]: {
          ...currentConfig,
          requiredFields: newFields
        }
      };
    });
  };

  const handleDocumentTypeToggle = (documentTypeId: number) => {
    setSelectedConfiguration(prev => {
      const currentConfig = prev[documentTypeId] || { isRequired: false, requiredFields: [] };
      
      return {
        ...prev,
        [documentTypeId]: {
          ...currentConfig,
          isRequired: !currentConfig.isRequired,
          // Si se desmarca como obligatorio, limpiar campos obligatorios
          requiredFields: !currentConfig.isRequired ? currentConfig.requiredFields : []
        }
      };
    });
  };

  const handleSubmit = async () => {
    if (!groupName || fileList.length === 0) return;
    const dt = new DataTransfer();
    fileList.forEach(f => dt.items.add(f));
    setIsUploading(true);
    
    try {
      // 1. Crear el grupo con los archivos
      const response = await onUpload(groupName, dt.files);
      
      // 2. Si hay configuración seleccionada, enviarla al backend
      if (response?.group_id && Object.keys(selectedConfiguration).length > 0) {
        try {
          await updateGroupConfiguration(response.group_id, selectedConfiguration);
        } catch (configError) {
          console.error('Error saving group configuration:', configError);
          // No bloqueamos el flujo si falla la configuración
        }
      }
      
      setIsUploading(false);
      setFileList([]);
      setGroupName("");
      setStep(0);
      setSelectedConfiguration({});
      onClose();
      
      // Llamar el callback con el group_id
      if (onGroupCreated && response?.group_id) {
        onGroupCreated(response.group_id);
      }
    } catch (error) {
      setIsUploading(false);
      console.error('Error creating group:', error);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth={step === 1 ? "md" : "sm"}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FileText size={24} />
        {step === 0 ? "Nuevo grupo" : "Configurar documentos obligatorios"}
      </DialogTitle>

      <DialogContent dividers>
        {step === 0 ? (
          <>
            <TextField
              label="Nombre del grupo"
              fullWidth
              size="small"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              sx={{ mt: 1, mb: 2 }}
            />
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
                {availableDocumentTypes.map((docType) => (
                  <Accordion key={docType.id} defaultExpanded>
                    <AccordionSummary expandIcon={<ChevronDown size={20} />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedConfiguration[docType.id]?.isRequired || false}
                              onChange={() => handleDocumentTypeToggle(docType.id)}
                              color="primary"
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <FileText size={18} />
                              <Typography variant="h6">{docType.nombre_doc}</Typography>
                            </Box>
                          }
                          sx={{ flexGrow: 1 }}
                        />
                        <Chip 
                          label={selectedConfiguration[docType.id]?.isRequired ? 
                            `Obligatorio - ${selectedConfiguration[docType.id]?.requiredFields?.length || 0} etiquetas` : 
                            'Opcional'
                          }
                          size="small"
                          color={selectedConfiguration[docType.id]?.isRequired ? 'primary' : 'default'}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {selectedConfiguration[docType.id]?.isRequired ? (
                        <>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Selecciona las etiquetas que serán obligatorias para documentos de tipo "{docType.nombre_doc}":
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {docType.field_specs.map((fieldSpec) => (
                              <FormControlLabel
                                key={fieldSpec.id}
                                control={
                                  <Checkbox
                                    checked={selectedConfiguration[docType.id]?.requiredFields?.includes(fieldSpec.id) || false}
                                    onChange={() => handleFieldToggle(docType.id, fieldSpec.id)}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body1">{fieldSpec.label}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Clave: {fieldSpec.field_key}
                                    </Typography>
                                  </Box>
                                }
                              />
                            ))}
                          </Box>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Este tipo de documento no está marcado como obligatorio para este grupo.
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
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
            disabled={fileList.length === 0 || !groupName}
            variant="contained"
          >
            Continuar con configuración
          </Button>
        ) : (
          <>
            <Button onClick={handleBack}>
              Volver
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isUploading}
              variant="contained"
              color="primary"
            >
              {isUploading ? "Creando grupo..." : "Crear grupo con configuración"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
