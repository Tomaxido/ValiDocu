import {
  Box, Typography, Card, CardContent, Divider,
  FormControlLabel, Checkbox, Chip, Alert,
  List, ListItem, ListItemText, ListItemIcon
} from "@mui/material";
import { FileText, Tag } from "lucide-react";

interface ConfigurationState {
  [documentTypeId: number]: {
    isRequired: boolean;
    requiredFields: number[];
  };
}

// Interfaz flexible para field specs que puede venir del backend sin todos los campos
interface FlexibleFieldSpec {
  id: number;
  field_key: string;
  label: string;
  datatype?: string;
  is_required: boolean;
  regex?: string;
  options?: string[];
}

// Interfaz flexible para DocumentType 
interface FlexibleDocumentType {
  id: number;
  nombre_doc: string;
  analizar?: number;
  field_specs?: FlexibleFieldSpec[];
  fieldSpecs?: FlexibleFieldSpec[];
}

interface Props {
  availableDocumentTypes: FlexibleDocumentType[];
  globalFields: FlexibleFieldSpec[];
  selectedConfiguration: ConfigurationState;
  onDocumentTypeToggle: (documentTypeId: number) => void;
  onFieldToggle: (documentTypeId: number, fieldSpecId: number) => void;
  onSelectAllFields: (documentTypeId: number, allFieldIds: number[]) => void;
}

export default function DocumentConfigurationPanel({
  availableDocumentTypes,
  globalFields,
  selectedConfiguration,
  onDocumentTypeToggle,
  onFieldToggle,
  onSelectAllFields
}: Props) {

  const getSelectedFieldsCount = (documentTypeId: number): number => {
    return selectedConfiguration[documentTypeId]?.requiredFields?.length || 0;
  };

  const getTotalFieldsCount = (docType: FlexibleDocumentType): number => {
    return docType.analizar === 1 ? globalFields.length : 0;
  };

  if (availableDocumentTypes.length === 0) {
    return (
      <Alert severity="info">
        No hay tipos de documentos disponibles para configurar.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Selecciona qué campos son obligatorios para cada tipo de documento en este grupo:
      </Typography>

      {availableDocumentTypes.map((docType) => {
        // Para documentos con análisis, usar campos globales
        const requiredFields = docType.analizar === 1 ? globalFields : [];
        const selectedCount = getSelectedFieldsCount(docType.id);
        const totalCount = getTotalFieldsCount(docType);
        const isDocumentRequired = selectedConfiguration[docType.id]?.isRequired || false;
        const allFieldIds = requiredFields.map(field => field.id);
        const hasAllFieldsSelected = allFieldIds.length > 0 && allFieldIds.every(id => 
          selectedConfiguration[docType.id]?.requiredFields?.includes(id) || false
        );
        const hasAnalysisFields = docType.analizar === 1 && requiredFields.length > 0;

        return (
          <Card key={docType.id} sx={{ mb: 2, border: isDocumentRequired ? '2px solid #1976d2' : '1px solid #e0e0e0' }}>
            <CardContent>
              {/* Header con toggle principal */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FileText size={20} color={isDocumentRequired ? '#1976d2' : '#757575'} />
                  <Box>
                    <Typography variant="h6" sx={{ color: isDocumentRequired ? '#1976d2' : 'inherit' }}>
                      {docType.nombre_doc}
                    </Typography>
                    {docType.analizar === 0 && (
                      <Chip 
                        label="Sin análisis automático" 
                        size="small" 
                        color="info" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: '18px' }}
                      />
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {isDocumentRequired && hasAnalysisFields && (
                    <Chip 
                      label={`${selectedCount}/${totalCount} campos`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isDocumentRequired}
                        onChange={() => onDocumentTypeToggle(docType.id)}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body2" fontWeight="medium">
                        Documento obligatorio
                      </Typography>
                    }
                  />
                </Box>
              </Box>

              {/* Contenido de campos - solo visible si está activo */}
              {isDocumentRequired && (
                <Box>
                  {hasAnalysisFields ? (
                    <Box>
                      <Divider sx={{ mb: 2 }} />
                      
                      {/* Header de campos con "Marcar todos" */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Selecciona los campos obligatorios:
                          </Typography>
                          <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic' }}>
                            Los campos seleccionados se aplicarán a todos los documentos con análisis automático
                          </Typography>
                        </Box>
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={hasAllFieldsSelected}
                              indeterminate={selectedCount > 0 && !hasAllFieldsSelected}
                              onChange={() => onSelectAllFields(docType.id, allFieldIds)}
                              color="primary"
                            />
                          }
                          label={
                            <Typography variant="body2" fontSize="0.875rem">
                              Marcar todos
                            </Typography>
                          }
                        />
                      </Box>

                      {/* Lista de campos */}
                      <List dense>
                        {requiredFields.map((field) => (
                          <ListItem key={field.id} sx={{ pl: 0, py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <Checkbox
                                size="small"
                                checked={selectedConfiguration[docType.id]?.requiredFields?.includes(field.id) || false}
                                onChange={() => onFieldToggle(docType.id, field.id)}
                                color="primary"
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
                                    sx={{ fontSize: '0.7rem', height: '18px' }}
                                  />
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {field.datatype && `Tipo: ${field.datatype}`}
                                  {field.regex && field.datatype && ` • `}
                                  {field.regex && `Patrón: ${field.regex.slice(0, 30)}...`}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  ) : (
                    <Box sx={{ py: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {docType.analizar === 0 
                          ? "Este tipo de documento está marcado como obligatorio pero no requiere análisis automático de campos."
                          : "No hay campos obligatorios definidos para este tipo de documento."
                        }
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Mensaje cuando no está activo */}
              {!isDocumentRequired && (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {docType.analizar === 0 
                      ? "Activa este tipo de documento para marcarlo como obligatorio en el grupo."
                      : "Activa este tipo de documento para configurar sus campos obligatorios."
                    }
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}