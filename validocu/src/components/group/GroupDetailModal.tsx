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
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Avatar,
  Tabs,
  Tab,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { 
  Settings,
  History as HistoryIcon,
  Info,
  Group,
  Lock,
  Public,
  RequestPage,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { 
  getGroupConfiguration, 
  getAvailableDocumentTypes, 
  getGroupDetails, 
  getGroupMembers,
  getGroupRequestHistory,
  updateGroupConfiguration,
  initializeGroupConfiguration
} from '../../utils/api';
import { 
  getPermissionTypeLabel, 
  getPermissionTypeColor, 
  getStatusText, 
  getStatusColor,
  canUserEdit,
  isGroupOwner,
  formatRequestingUser
} from '../../utils/permissions';
import type { 
  DocumentGroup, 
  GroupConfiguration, 
  DocumentTypeWithFields
} from '../../utils/interfaces';
import GroupConfigurationModal from './GroupConfigurationModal';
import GroupConfigurationHistoryModal from './GroupConfigurationHistoryModal';
import DocumentConfigurationPanel from '../shared/DocumentConfigurationPanel';

interface Props {
  open: boolean;
  group: DocumentGroup;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`group-tabpanel-${index}`}
      aria-labelledby={`group-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

interface GroupDetails {
  id: number;
  name: string;
  created_by: string;
  creator_name: string;
  created_at: string;
  is_private: boolean;
  document_count: number;
  member_count: number;
}

interface GroupMember {
  id: string;
  name: string;
  email: string;
  permission_type: number;
  active: boolean;
  joined_at: string;
}

interface AccessRequest {
  id: number;
  user_name: string;
  user_email: string;
  permission_type: number;
  status: string;
  request_reason?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_comment?: string;
}

interface ConfigurationState {
  [documentTypeId: number]: {
    isRequired: boolean;
    requiredFields: number[];
  };
}

const GroupDetailModal: React.FC<Props> = ({ open, group, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Estados para cada tab
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  
  // Estados para configuración
  const [availableDocumentTypes, setAvailableDocumentTypes] = useState<DocumentTypeWithFields[]>([]);
  const [globalFields, setGlobalFields] = useState<any[]>([]);
  const [hasConfiguration, setHasConfiguration] = useState(false);
  const [selectedConfiguration, setSelectedConfiguration] = useState<ConfigurationState>({});
  const [configInfo, setConfigInfo] = useState<any>(null);
  
  // Estados para modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  useEffect(() => {
    if (open && group.id) {
      loadAllData();
    }
  }, [open, group.id]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Cargar datos en paralelo
      const [detailsRes, membersRes, requestsRes, configRes, typesRes] = await Promise.all([
        getGroupDetails(group.id).catch(() => null),
        getGroupMembers(group.id).catch(() => []),
        getGroupRequestHistory(group.id).catch(() => []),
        getGroupConfiguration(group.id).catch(() => null),
        getAvailableDocumentTypes(group.id).catch(() => ({ document_types: [], global_fields: [] }))
      ]);

      // Procesar detalles del grupo
      if (detailsRes) {
        setGroupDetails(detailsRes);
      }

      // Procesar miembros
      setGroupMembers(membersRes || []);

      // Procesar solicitudes de acceso
      setAccessRequests(requestsRes || []);

      // Procesar configuración con la misma lógica del GroupConfigurationModal
      setAvailableDocumentTypes(typesRes?.document_types || []);
      setGlobalFields(typesRes?.global_fields || []);
      setHasConfiguration(configRes?.has_configuration || false);

      // Inicializar estado de selección basado en configuración actual
      const initialSelection: ConfigurationState = {};
      
      // Primero, configurar todos los tipos de documento como no obligatorios
      typesRes?.document_types?.forEach((docType: DocumentTypeWithFields) => {
        initialSelection[docType.id] = {
          isRequired: false,
          requiredFields: []
        };
      });
      
      // Luego, marcar como obligatorios aquellos que tienen configuración
      configRes?.configuration?.forEach((config: GroupConfiguration) => {
        if (config.analizar === 1) {
          // Para documentos con análisis, usar sus campos específicos
          const specificFields = config.required_fields?.map((field: any) => field.field_spec_id) || [];
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

      // Procesar información para vista de solo lectura (como en GroupConfigurationInfoModal)
      if (!configRes?.has_configuration) {
        setConfigInfo({
          requiredDocuments: [],
          hasConfiguration: false
        });
      } else {
        const requiredDocuments: any[] = [];
        const configuration = configRes.configuration || [];
        
        if (Array.isArray(configuration) && configuration.length > 0) {
          const docTypeMap = new Map<number, any>();
          
          configuration.forEach((config: any) => {
            const docTypeId = config.document_type_id;
            const docType = typesRes?.document_types?.find((dt: any) => dt.id === docTypeId);
            
            if (docType) {
              let docEntry = docTypeMap.get(docTypeId);
              
              if (!docEntry) {
                docEntry = {
                  id: docType.id,
                  name: docType.nombre_doc || docType.name,
                  analizar: docType.analizar,
                  fields: []
                };
                docTypeMap.set(docTypeId, docEntry);
              }
              
              if (docType.analizar === 1 && config.required_fields && config.required_fields.length > 0) {
                config.required_fields.forEach((field: any) => {
                  const fieldId = field.field_spec_id || field.id;
                  if (!docEntry!.fields.find((f: any) => f.id === fieldId)) {
                    docEntry!.fields.push({
                      id: fieldId,
                      label: field.label
                    });
                  }
                });
              }
            }
          });
          
          requiredDocuments.push(...Array.from(docTypeMap.values()));
        }

        setConfigInfo({
          requiredDocuments,
          hasConfiguration: true
        });
      }

    } catch (err: any) {
      setError(err.message || 'Error al cargar información del grupo');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInitializeConfiguration = async () => {
    setSaving(true);
    try {
      await initializeGroupConfiguration(group.id);
      await loadAllData();
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
      await loadAllData();
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

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'pending':
        return <Chip label="Pendiente" size="small" color="warning" />;
      case 'approved':
        return <Chip label="Aprobada" size="small" color="success" />;
      case 'rejected':
        return <Chip label="Rechazada" size="small" color="error" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info />
            Información Detallada - {group.name}
            {group.is_private ? (
                <Chip icon={<Lock />} label="Privado" size="small" color="warning" />
            ) : (
                <Chip icon={<Public />} label="Público" size="small" color="success" />
            )}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          ) : (
            <>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
              >
                <Tab 
                  icon={<Info />} 
                  label="Información General" 
                  id="group-tab-0"
                  aria-controls="group-tabpanel-0"
                />
                <Tab 
                  icon={<Group />} 
                  label={`Miembros (${groupMembers.length})`}
                  id="group-tab-1"
                  aria-controls="group-tabpanel-1"
                />
                <Tab 
                  icon={<RequestPage />} 
                  label={`Solicitudes (${accessRequests.length})`}
                  id="group-tab-2"
                  aria-controls="group-tabpanel-2"
                />
                <Tab 
                  icon={<Settings />} 
                  label="Configuración"
                  id="group-tab-3"
                  aria-controls="group-tabpanel-3"
                />
              </Tabs>

              <Box sx={{ px: 2 }}>
                {/* Tab 0: Información General */}
                <TabPanel value={tabValue} index={0}>
                  {groupDetails && (
                    <Stack spacing={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Info />
                            Detalles del Grupo
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Nombre del grupo
                              </Typography>
                              <Typography variant="body1" fontWeight={600}>
                                {groupDetails.name}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Creado por
                              </Typography>
                              <Typography variant="body1" fontWeight={600}>
                                {groupDetails.creator_name}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Fecha de creación
                              </Typography>
                              <Typography variant="body1">
                                {new Date(groupDetails.created_at).toLocaleString()}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Tipo de grupo
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                {groupDetails.is_private ? (
                                  <Chip icon={<Lock />} label="Privado" size="small" color="warning" />
                                ) : (
                                  <Chip icon={<Public />} label="Público" size="small" color="success" />
                                )}
                              </Box>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Documentos
                              </Typography>
                              <Typography variant="body1" fontWeight={600}>
                                {groupDetails.document_count} documentos
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Miembros
                              </Typography>
                              <Typography variant="body1" fontWeight={600}>
                                {groupDetails.member_count} miembros
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Stack>
                  )}
                </TabPanel>

                {/* Tab 1: Miembros */}
                <TabPanel value={tabValue} index={1}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Group />
                        Miembros del Grupo
                      </Typography>
                      {groupMembers.length === 0 ? (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                          No hay miembros en este grupo
                        </Typography>
                      ) : (
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Usuario</TableCell>
                              <TableCell>Permisos</TableCell>
                              <TableCell>Estado</TableCell>
                              <TableCell>Fecha de acceso</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {groupMembers.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar sx={{ width: 32, height: 32 }}>
                                      {member.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="body2" fontWeight={600}>
                                        {member.name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {member.email}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={getPermissionTypeLabel(member.permission_type)}
                                    size="small"
                                    color={getPermissionTypeColor(member.permission_type)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={member.active ? 'Activo' : 'Inactivo'}
                                    size="small"
                                    color={member.active ? 'success' : 'default'}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {new Date(member.joined_at).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(member.joined_at).toLocaleTimeString()}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabPanel>

                {/* Tab 2: Solicitudes de Acceso */}
                <TabPanel value={tabValue} index={2}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RequestPage />
                        Historial de Solicitudes de Acceso
                      </Typography>
                      {accessRequests.length === 0 ? (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                          No hay solicitudes de acceso para este grupo
                        </Typography>
                      ) : (
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Usuario</TableCell>
                              <TableCell>Permisos solicitados</TableCell>
                              <TableCell>Estado</TableCell>
                              <TableCell>Fecha solicitud</TableCell>
                              <TableCell>Razón</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {accessRequests.map((request) => (
                              <TableRow key={request.id}>
                                <TableCell>
                                  <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                      {request.user_name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {request.user_email}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={getPermissionTypeLabel(request.permission_type)}
                                    size="small"
                                    color={getPermissionTypeColor(request.permission_type)}
                                  />
                                </TableCell>
                                <TableCell>
                                  {getStatusChip(request.status)}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {new Date(request.created_at).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(request.created_at).toLocaleTimeString()}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      maxWidth: 200, 
                                      overflow: 'hidden', 
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {request.request_reason || 'Sin razón especificada'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabPanel>

                {/* Tab 3: Configuración */}
                <TabPanel value={tabValue} index={3}>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  {configInfo && (
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
                              onClick={() => setEditModalOpen(true)}
                              startIcon={<Settings />}
                            >
                              Configurar Grupo
                            </Button>
                          </CardContent>
                        </Card>
                      ) : (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CheckCircleIcon color="success" />
                              Configuración Activa
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Ver historial de cambios">
                                <IconButton onClick={() => setHistoryModalOpen(true)}>
                                  <HistoryIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Editar configuración">
                                <IconButton onClick={() => setEditModalOpen(true)} color="primary">
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Los siguientes tipos de documentos están configurados como obligatorios para este grupo:
                          </Typography>

                          {configInfo.requiredDocuments.length === 0 ? (
                            <Alert severity="info">
                              No hay tipos de documentos configurados como obligatorios.
                            </Alert>
                          ) : (
                            <Stack spacing={2}>
                              {configInfo.requiredDocuments.map((docType: any) => (
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
                                            {docType.fields.map((field: any) => (
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
                                  onClick={() => setEditModalOpen(true)}
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
                                  onClick={() => setHistoryModalOpen(true)}
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
                </TabPanel>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        message={success}
      />

      {/* Modales secundarios */}
      <GroupConfigurationModal
        open={editModalOpen}
        group={group}
        onClose={() => {
          setEditModalOpen(false);
          // Recargar información al cerrar el modal de edición
          loadAllData();
        }}
      />

      <GroupConfigurationHistoryModal
        open={historyModalOpen}
        groupId={group.id}
        groupName={group.name}
        onClose={() => setHistoryModalOpen(false)}
      />
    </>
  );
};

export default GroupDetailModal;