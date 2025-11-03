import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box, Typography, IconButton, Button, Paper, InputBase, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Menu, Divider,
  FormControl, InputLabel, Select, OutlinedInput, MenuItem,
  Checkbox, ListItemText, CircularProgress,
  Chip,
  Tooltip,
  Alert,
} from "@mui/material";
import { Folder, Plus, Search as SearchIcon, Settings2, Lock, Users, Info } from "lucide-react";
import { createGroup, getDocumentGroups, obtenerDocumentosVencidos, marcarDocumentosVencidos, buscarSemanticaConFiltros, type SemanticRow } from "../../utils/api";
import type { Document, DocumentGroup, ExpiredDocumentResponse, ProcessedDocumentEvent } from "../../utils/interfaces";
import NewGroupModal from "./NewGroupModal";
import GroupConfigurationModal from "../../components/group/GroupConfigurationModal";
import RequestAccessModal from "../../components/group/RequestAccessModal";
import GroupDetailModal from "../../components/group/GroupDetailModal";
import SnackbarDocsVencidos from "../../components/SnackbarDocsVencidos";
import { getDocumentFilters, type Filters } from "../../utils/api";


interface HomeParams {
  currentEvent: ProcessedDocumentEvent | null;
  setIsDocMenuOpen: (open: boolean) => void;
}

export default function Home({ currentEvent, setIsDocMenuOpen }: HomeParams) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<SemanticRow[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [respuestaDocsVencidos, setRespuestaDocsVencidos] = useState<ExpiredDocumentResponse | null>(null);
  
  // Estado para mensajes de alerta
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('info');
  
  // Estado para el modal de configuración
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DocumentGroup | null>(null);

  // Estado para el modal de solicitud de acceso
  const [requestAccessModalOpen, setRequestAccessModalOpen] = useState(false);
  const [selectedGroupForAccess, setSelectedGroupForAccess] = useState<DocumentGroup | null>(null);

  // TODO: no se está usando y se podría eliminar
  // // Estado para el modal de administración
  // const [pendingRequestsModalOpen, setPendingRequestsModalOpen] = useState(false);

  // Estado para el modal de información del grupo
  const [groupInfoModalOpen, setGroupInfoModalOpen] = useState(false);
  const [selectedGroupForInfo, setSelectedGroupForInfo] = useState<DocumentGroup | null>(null);

  // Ancla del menú
  const [filtersAnchor, setFiltersAnchor] = useState<null | HTMLElement>(null);
  const filtersOpen = Boolean(filtersAnchor);

  // Opciones y selección
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [statusOptions, setStatusOptions] = useState<Filters[]>([]);
  const [docTypeOptions, setDocTypeOptions] = useState<Filters[]>([]);
  const [gapOptions, setGapOptions] = useState<Filters[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<(number | string)[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<number[]>([]);
  const [selectedGap, setSelectedGap] = useState<number[]>([]);
  

  // Abrir/cerrar menú
  const openFilters = (e: React.MouseEvent<HTMLElement>) => setFiltersAnchor(e.currentTarget);
  const closeFilters = () => setFiltersAnchor(null);

  // al abrir el menú
  useEffect(() => {
    if (!filtersOpen) return;
    (async () => {
      setFiltersLoading(true);
      try {
        const data = await getDocumentFilters();
        setStatusOptions(data.status_values ?? []);
        setDocTypeOptions(data.doc_type_values ?? []);
        setGapOptions(data.normative_gap_values ?? []);
      } finally {
        setFiltersLoading(false);
      }
    })();
  }, [filtersOpen]);

  // Al recibir nuevo evento
  useEffect(() => {
    if (currentEvent === null)
      return;
    // Recargar grupos para reflejar cambios
    getDocumentGroups().then(setDocumentGroups);
  }, [currentEvent]);

  // Aplicar filtros
  const applyFilters = () => {
    closeFilters();
    buscar();
  };

  // Limpiar filtros
  const clearFilters = () => {
    setSelectedStatus([]);
    setSelectedDocType([]);
    setSelectedGap([]);
    applyFilters();
  };

  useEffect(() => {
    getDocumentGroups().then(setDocumentGroups);
    obtenerDocumentosVencidos().then(setRespuestaDocsVencidos);
    marcarDocumentosVencidos();
  }, []);

  // Effect para manejar mensajes de estado de navegación
  useEffect(() => {
    if (location.state?.message) {
      setAlertMessage(location.state.message);
      setAlertSeverity(location.state.severity || 'info');
      
      // Limpiar el estado de navegación
      navigate(location.pathname, { replace: true, state: {} });
      
      // Auto-hide después de 5 segundos
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  // const buscar = async () => {
  //   if (!query.trim()) {
  //     setResultados([]);
  //     setBusquedaRealizada(false);
  //     return;
  //   }
  //   setBuscando(true);
  //   setBusquedaRealizada(true);
  //   try {
  //     const data = await buscarDocumentosPorTexto(query);
  //     setResultados(data);
  //   } catch (err: any) {
  //     alert("Error al buscar: " + err.message);
  //   } finally {
  //     setBuscando(false);
  //   }
  // };

  const buscar = async () => {
    // Si todos los campos están vacíos...
    const trimmedQuery = query.trim();
    if (trimmedQuery === "" && [selectedStatus, selectedDocType, selectedGap].every(arr => arr.length === 0)) {
      setResultados([]);
      setBusquedaRealizada(false);
      return;
    }
    setBuscando(true);
    setBusquedaRealizada(true);
    try {
      const filas = await buscarSemanticaConFiltros({
        texto: trimmedQuery,
        status: selectedStatus.length ? selectedStatus : undefined,
        doc_type: selectedDocType.length ? selectedDocType : undefined,
        normative_gap: selectedGap.length ? selectedGap : undefined,
        // opcional:
        // min_score: 0.45,
        // limit: 20,
      });
      setResultados(filas);
    } catch (err: any) {
      alert("Error al buscar: " + err.message);
    } finally {
      setBuscando(false);
    }
  };

  const handleFileUpload = async (groupName: string, files: FileList, isPrivate: boolean = false): Promise<{ group_id?: number }> => {
    try {
      const response = await createGroup(groupName, files, isPrivate);
      setIsDocMenuOpen(true);
      return response;
    } catch (err: any) {
      alert("Error al subir: " + err.message);
      return {};
    }
  };

  const handleOpenGroupConfiguration = (group: DocumentGroup) => {
    setSelectedGroup(group);
    setConfigModalOpen(true);
  };

  const handleCloseGroupConfiguration = () => {
    setConfigModalOpen(false);
    setSelectedGroup(null);
  };

  const handleGroupCreated = (groupId: number) => {
    try {
      // Recargar la lista de grupos para obtener el grupo recién creado
      getDocumentGroups().then(setDocumentGroups);
      
      // El grupo se ha creado exitosamente, solo actualizar la lista
      console.log(`Grupo ${groupId} creado exitosamente`);
      
    } catch (error) {
      console.error('Error loading groups after creation:', error);
      // Fallback: recargar página  
      window.location.reload();
    }
  };

  const handleOpenRequestAccess = (group: DocumentGroup) => {
    setSelectedGroupForAccess(group);
    setRequestAccessModalOpen(true);
  };

  const handleCloseRequestAccess = () => {
    setRequestAccessModalOpen(false);
    setSelectedGroupForAccess(null);
  };

  const handleOpenGroupDetail = (group: DocumentGroup) => {
    setSelectedGroupForInfo(group);
    setGroupInfoModalOpen(true);
  };

  const handleCloseGroupDetail = () => {
    setGroupInfoModalOpen(false);
    setSelectedGroupForInfo(null);
  };

  if (documentGroups === null)
    return <Typography sx={{ p: 3 }}>Cargando...</Typography>;

  return (
    <Box sx={{p: 3, bgcolor: "background.default", minHeight: "100dvh", paddingX: "6em" }}>
      {/* Alerta de acceso denegado o mensajes del sistema */}
      {alertMessage && (
        <Alert 
          severity={alertSeverity} 
          sx={{ mb: 2 }} 
          onClose={() => setAlertMessage(null)}
        >
          {alertMessage}
        </Alert>
      )}
      
      {/* Alerta de documentos vencidos 
      // TODO: aunque se crea el mensaje de alerta, no se ve la alerta como tal */}
      <SnackbarDocsVencidos respuestaDocsVencidos={respuestaDocsVencidos}/>

      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Unidad de Sprint 1</Typography>
      </Stack>

      <Menu
        anchorEl={filtersAnchor}
        open={filtersOpen}
        onClose={closeFilters}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { p: 2, width: 320 } }}
      >
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Filtros
        </Typography>

        {filtersLoading ? (
          <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <Stack spacing={2}>
            {/* Estado */}
            <FormControl fullWidth size="small">
              <InputLabel id="status-label">Estado del documento</InputLabel>
              <Select
                labelId="status-label"
                multiple
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as (number | string)[])}
                input={<OutlinedInput label="Estado del documento" />}
                renderValue={(selected) =>
                  (selected as (number | string)[])
                    .map(v => statusOptions.find(o => o.value === v)?.label ?? String(v))
                    .join(", ")
                }
                MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
              >
                {statusOptions.map((opt) => (
                  <MenuItem key={String(opt.value)} value={opt.value}>
                    <Checkbox checked={selectedStatus.indexOf(opt.value) > -1} />
                    <ListItemText primary={opt.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tipo de documento */}
            <FormControl fullWidth size="small">
              <InputLabel id="status-label">Tipo de documento</InputLabel>
              <Select
                labelId="gap-label"
                multiple
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value as number[])}
                input={<OutlinedInput label="Brecha normativa" />}
                renderValue={(selected) =>
                  (selected as number[])
                    .map(v => docTypeOptions.find(o => Number(o.value) === v)?.label ?? String(v))
                    .join(", ")
                }
                MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
              >
                {docTypeOptions.map((opt) => (
                  <MenuItem key={String(opt.value)} value={Number(opt.value)}>
                    <Checkbox checked={selectedDocType.indexOf(Number(opt.value)) > -1} />
                    <ListItemText primary={opt.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Brecha normativa */}
            <FormControl fullWidth size="small">
              <InputLabel id="gap-label">Brecha normativa</InputLabel>
              <Select
                labelId="gap-label"
                multiple
                value={selectedGap}
                onChange={(e) => setSelectedGap(e.target.value as number[])}
                input={<OutlinedInput label="Brecha normativa" />}
                renderValue={(selected) =>
                  (selected as number[])
                    .map(v => gapOptions.find(o => Number(o.value) === v)?.label ?? String(v))
                    .join(", ")
                }
                MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
              >
                {gapOptions.map((opt) => (
                  <MenuItem key={String(opt.value)} value={Number(opt.value)}>
                    <Checkbox checked={selectedGap.indexOf(Number(opt.value)) > -1} />
                    <ListItemText primary={opt.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            <Stack direction="row" gap={1} justifyContent="flex-end">
              <Button variant="text" onClick={clearFilters}>
                Limpiar
              </Button>
              <Button onClick={applyFilters} color="secondary">
                Aplicar
              </Button>
            </Stack>
          </Stack>
        )}
      </Menu>


      {/* Filtros / búsqueda */}
      <Stack direction="row" gap={2} alignItems="center" sx={{ mb: 3 }}>
        <Paper
          component="form"
          onSubmit={(e) => { e.preventDefault(); buscar(); }}
          sx={{
            flex: 1, display: "flex", alignItems: "center", gap: 1,
            px: 1.5, py: 1, bgcolor: "background.paper",
            border: 1, borderColor: "divider",
          }}
        >
          <SearchIcon size={18} />
          <InputBase
            placeholder="Buscar en ValiDocu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            sx={{ flex: 1, color: "text.primary" }}
          />
          <IconButton onClick={buscar} sx={{ boxShadow: "0px 0px 4px gray" }}>
            <SearchIcon size={20} />
          </IconButton>
          <IconButton
          color="inherit"
          onClick={openFilters}
          sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", "&:hover": { bgcolor: "action.hover" } }}
          aria-label="Abrir filtros"
        >
          <Settings2 size={20} />
        </IconButton>
        </Paper>

        <Button onClick={() => setIsModalOpen(true)} startIcon={<Plus size={20} />}>
          Agregar grupo
        </Button>
      </Stack>

      <NewGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleFileUpload}
        onGroupCreated={handleGroupCreated}
      />

      {/* Indicador de búsqueda */}
      {buscando && <Typography sx={{ ml: 1 }}>🔎 Buscando...</Typography>}

      {/* Sin resultados SOLO si se hizo búsqueda */}
      {!buscando && busquedaRealizada && resultados.length === 0 && (
        <Typography sx={{ ml: 1 }}>❌ No existen resultados</Typography>
      )}

      {/* Resultados en tabla */}
      {resultados.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>🔍 Resultados encontrados:</Typography>
          <TableContainer component={Paper} sx={{ border: 1, borderColor: "divider" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Grupo</TableCell>
                  <TableCell>Documento</TableCell>
                  <TableCell>Advertencias</TableCell>
                  <TableCell>Acciones</TableCell>
                  <TableCell>Acceso</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultados.map((res, idx) => {
                  const isPdf = (d: SemanticRow) => d.document_name && d.document_name.toLowerCase().endsWith('.pdf');

                  let accion = null;
                  let alerta = null;  // TODO: ¿eliminar?
                  if (res) {
                    if (res.due_date === 1) {
                      accion = (
                        <Button
                          color="error"
                          size="small"
                          onClick={() => navigate(`/grupos/${res.document_group_id}`)}
                        >
                          Actualizar urgente
                        </Button>
                      );
                      alerta = <Alert severity="error" sx={{ mb: 1, width: '100%' }}>Documento vencido</Alert>;
                    } else if (res.due_date === 2) {
                      accion = (
                        <Button
                          color="warning"
                          size="small"
                          onClick={() => navigate(`/grupos/${res.document_group_id}`)}
                        >
                          Renovar
                        </Button>
                      );
                      alerta = <Alert severity="warning" sx={{ mb: 1, width: '100%' }}>Documento por vencer</Alert>;
                    } else {
                      accion = (
                        <Button
                          color="secondary"
                          size="small"
                          onClick={() => navigate(`/grupos/${res.document_group_id}`)}
                        >
                          Renovar
                        </Button>
                      );
                    }
                    
                    if (res.normative_gap === 1) {
                      accion = (
                        <Tooltip title="El documento presenta observaciones normativas.">
                          <span>
                            <Button
                              color="warning"
                              // variant="outlined"
                              size="small"
                              onClick={() => navigate(`/grupos/${res.document_group_id}`)}
                              sx={{ color: 'white' }}
                            >
                              Revisar observaciones
                            </Button>
                          </span>
                        </Tooltip>
                      );
                    }
                  }
                  return (
                    <TableRow key={idx} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Folder size={22} />
                          <Typography variant="subtitle1" fontWeight={600}>{res.group_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{res.document_name}</Typography>
                      </TableCell>
                      <TableCell>
                        {isPdf(res) && 
                          <Stack direction="row" spacing={1} alignItems="center">
                            {/* Estado vencimiento */}
                            {res.due_date === 1
                            ? <Tooltip title={"Vencido: " + res.document_name}>
                                <Chip label={`Vencido`} color="error" size="small" variant="outlined" sx={{ borderWidth: 2, fontWeight: 600 }}/>
                              </Tooltip>
                            : res.due_date === 2
                            ? <Tooltip title={"Por vencer: " + res.document_name}>
                                <Chip label={`Por Vencer`} color="warning" size="small" variant="outlined" sx={{ borderWidth: 2, fontWeight: 600 }} />
                              </Tooltip>
                            : null
                            }

                            {/* Estado normativo */}
                            {res.normative_gap === 1 && 
                              <Tooltip title={"En observación: " + res.document_name}>
                                <Chip label={`En observación`} color="warning" size="small" variant="outlined" sx={{ borderWidth: 2, fontWeight: 600 }} />
                              </Tooltip>
                            }
                          </Stack>
                        }
                      </TableCell>
                      <TableCell>
                        {accion}
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => navigate(`/grupos/${res.document_group_id}`)}>
                          Ver grupo
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Mostrar la tabla original solo si no hay resultados de búsqueda semántica */}
      {resultados.length === 0 && (
        <Box sx={{ mt: 2 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Grupo</TableCell>
                  <TableCell>Advertencias</TableCell>
                  <TableCell>Acciones</TableCell>
                  <TableCell>Acceso</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documentGroups
                  .filter(g => !query || g.name.toLowerCase().includes(query.toLowerCase()))
                  .map(g => {
                    const isPdf = (d: Document) => d.filename && d.filename.toLowerCase().endsWith('.pdf');

                    // Filtrar solo PDFs
                    const docsPdf = g.documents.filter(isPdf);
                    // Peor estado de vencimiento
                    const docsVencidos = docsPdf.filter(d => d.due_date === 1);
                    const docsPorVencer = docsPdf.filter(d => d.due_date === 2);
                    // Peor estado normativo
                    const docsObs = docsPdf.filter(d => d.normative_gap === 1);

                    let acciones: React.ReactNode[] = [];
                    let alerta = null;  // TODO: ¿eliminar?

                    if (docsVencidos.length > 0) {
                      acciones.push(
                        <Button
                          key="vencido"
                          color="error"
                          size="small"
                          onClick={() => navigate(`/grupos/${g.id}`)}
                        >
                          Actualizar urgente
                        </Button>
                      );
                      alerta = <Alert severity="error" sx={{ mb: 1, width: '100%' }}>Documento vencido</Alert>;
                    } else if (docsPorVencer.length > 0) {
                      acciones.push(
                        <Button
                          key="por-vencer"
                          color="warning"
                          size="small"
                          onClick={() => navigate(`/grupos/${g.id}`)}
                        >
                          Renovar
                        </Button>
                      );
                      alerta = <Alert severity="warning" sx={{ mb: 1, width: '100%' }}>Documento por vencer</Alert>;
                    } else {
                      acciones.push(
                        <Button
                          key="renovar"
                          color="secondary"
                          size="small"
                          onClick={() => navigate(`/grupos/${g.id}`)}
                        >
                          Renovar
                        </Button>
                      );
                    }

                    if (docsObs.length > 0) {
                      acciones.push(
                        <Tooltip key="observacion" title="El documento presenta observaciones normativas.">
                          <span>
                            <Button
                              color="warning"
                              // variant="outlined"
                              size="small"
                              onClick={() => navigate(`/grupos/${g.id}`)}
                              sx={{ color: 'white' }}
                            >
                              Revisar observaciones
                            </Button>
                          </span>
                        </Tooltip>
                      );
                    }

                    return (
                      <TableRow key={g.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Folder size={22} />
                              <Typography variant="subtitle1" fontWeight={600}>{g.name}</Typography>
                              {g.is_private === 1 && (
                                <Tooltip title="Grupo privado - Solo visible para ti y usuarios autorizados">
                                  <Lock size={16} color="#ff9800" />
                                </Tooltip>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Tooltip title="Ver información del grupo">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenGroupDetail(g)}
                                  sx={{ color: 'info.main' }}
                                >
                                  <Info size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Configurar grupo">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenGroupConfiguration(g)}
                                  sx={{ ml: 1 }}
                                >
                                  <Settings2 size={16} />
                                </IconButton>
                              </Tooltip>
                              {g.is_private === 1 && g.created_by && (
                                <Tooltip title="Solicitar acceso para otro usuario">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenRequestAccess(g)}
                                  >
                                    <Users size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {/* Peor estado de vencimiento: solo negativos */}
                            {docsVencidos.length > 0
                            ? <Tooltip title={"Vencido: " + docsVencidos.map(d => d.filename).join(", ")}>
                                <Chip label={`Vencido (${docsVencidos.length})`} color="error" size="small" variant="outlined" sx={{ borderWidth: 2, fontWeight: 600 }} />
                              </Tooltip>
                            : docsPorVencer.length > 0
                            ? <Tooltip title={"Por vencer: " + docsPorVencer.map(d => d.filename).join(", ")}>
                                <Chip label={`Por Vencer (${docsPorVencer.length})`} color="warning" size="small" variant="outlined" sx={{ borderWidth: 2, fontWeight: 600 }} />
                              </Tooltip>
                            : null}

                            {/* Peor estado normativo: solo negativos */}
                            {docsObs.length > 0 &&
                              <Tooltip title={"En observación: " + docsObs.map(d => d.filename).join(", ")}>
                                <Chip label={`En observación (${docsObs.length})`} color="warning" size="small" variant="outlined" sx={{ borderWidth: 2, fontWeight: 600 }} />
                              </Tooltip>
                            }
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {acciones}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Button onClick={() => navigate(`/grupos/${g.id}`)}>Ver grupo</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                }
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Modal de configuración de grupo */}
      {selectedGroup && (
        <GroupConfigurationModal
          open={configModalOpen}
          group={selectedGroup}
          onClose={handleCloseGroupConfiguration}
        />
      )}

      {/* Modal de solicitud de acceso */}
      {selectedGroupForAccess && (
        <RequestAccessModal
          isOpen={requestAccessModalOpen}
          onClose={handleCloseRequestAccess}
          groupId={selectedGroupForAccess.id}
          groupName={selectedGroupForAccess.name}
          onRequestSent={() => {
            // Opcional: actualizar algún estado o mostrar confirmación
          }}
        />
      )}

      {/* Modal de administración de solicitudes pendientes
      // TODO: no se está usando y se podría eliminar. También hay que mencionar el cambio en HDU09_IMPLEMENTATION.md
      <PendingRequestsModal
        isOpen={pendingRequestsModalOpen}
        onClose={() => setPendingRequestsModalOpen(false)}
      /> */}

      {/* Modal de información detallada del grupo */}
      {selectedGroupForInfo && (
        <GroupDetailModal
          open={groupInfoModalOpen}
          group={selectedGroupForInfo}
          onClose={handleCloseGroupDetail}
        />
      )}
    </Box>
  );
}
