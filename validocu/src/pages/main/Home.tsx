import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, IconButton, Button, Paper, InputBase, Stack,
  Card, CardActionArea, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Menu, Divider,
  FormControl, InputLabel, Select, OutlinedInput, MenuItem,
  Checkbox, ListItemText, CircularProgress,
  Chip,
  Tooltip,
  Alert,
} from "@mui/material";
import { Folder, Plus, Search as SearchIcon, Settings2 } from "lucide-react";
import { createGroup, getDocumentGroups, buscarDocumentosPorTexto, obtenerDocumentosVencidos, marcarDocumentosVencidos, buscarSemanticaConFiltros } from "../../utils/api";
import type { DocumentGroup, ExpiredDocumentResponse } from "../../utils/interfaces";
import NewGroupModal from "./NewGroupModal";
import { SnackbarDocsVencidos } from "../../components/SnackbarDocsVencidos";
import { getDocumentFilters, type Filters } from "../../utils/api";


export default function Home() {
  const navigate = useNavigate();
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [respuestaDocsVencidos, setRespuestaDocsVencidos] = useState<ExpiredDocumentResponse | null>(null);

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
  const handleOpenFilters = (e: React.MouseEvent<HTMLElement>) => {
    setFiltersAnchor(e.currentTarget);
  };
  const handleCloseFilters = () => setFiltersAnchor(null);

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

  // Aplicar filtros (aquí puedes enganchar tu búsqueda semántica/textual)
  const applyFilters = async () => {
    // Ejemplo: si tu `buscarDocumentosPorTexto` acepta filtros, pásalos aquí.
    // await buscar({ query, status: selectedStatus, normative_gap: selectedGap });
    handleCloseFilters();
  };

  // Limpiar filtros
  const clearFilters = () => {
    setSelectedStatus([]);
    setSelectedDocType([]);
    setSelectedGap([]);
  };

  useEffect(() => {
    getDocumentGroups().then(groups => setDocumentGroups(groups));
    obtenerDocumentosVencidos().then(docs => setRespuestaDocsVencidos(docs));
    marcarDocumentosVencidos();
  }, []);

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

  const handleFileUpload = async (groupName: string, files: FileList) => {
    try {
      await createGroup(groupName, files);
      setDocumentGroups(await getDocumentGroups());
    } catch (err: any) {
      alert("Error al subir: " + err.message);
    }
  };

  if (documentGroups === null) return <Typography sx={{ p: 3 }}>Cargando...</Typography>;

  return (
    <Box sx={{ p: 3, bgcolor: "background.default", minHeight: "100dvh" }}>
      {/* Alerta de documentos vencidos 
      // TODO: aunque se crea el mensaje de alerta, no se ve la alerta como tal */}
      <SnackbarDocsVencidos respuestaDocsVencidos={respuestaDocsVencidos}/>

      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Unidad de PMV</Typography>
        <IconButton
          color="inherit"
          onClick={(e) => setFiltersAnchor(e.currentTarget)}
          sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", "&:hover": { bgcolor: "action.hover" } }}
          aria-label="Abrir filtros"
        >
          <Settings2 size={20} />
        </IconButton>
      </Stack>

      <Menu
        anchorEl={filtersAnchor}
        open={filtersOpen}
        onClose={() => setFiltersAnchor(null)}
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
              <Button
                variant="text"
                onClick={() => { setSelectedStatus([]); setSelectedGap([]); setFiltersAnchor(null); buscar(); }}
              >
                Limpiar
              </Button>
              <Button
                variant="contained"
                onClick={() => { setFiltersAnchor(null); buscar(); }}
              >
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
          <Button onClick={buscar} variant="contained" color="primary">Buscar</Button>
        </Paper>

        <Button
          onClick={() => setIsModalOpen(true)}
          variant="contained"
          color="warning"
          startIcon={<Plus size={20} />}
        >
          Agregar grupo
        </Button>
      </Stack>

      <NewGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleFileUpload}
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
                  <TableCell>Estados</TableCell>
                  <TableCell>Acción</TableCell>
                  <TableCell>Acceso</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultados.map((res, idx) => {
                  let acciones = null;
                  let alerta = null;
                  if (res) {
                    if (res.due_date === 1) {
                      acciones = <Button color="error" variant="contained" size="small">Actualizar urgente</Button>;
                      alerta = <Alert severity="error" sx={{ mb: 1, width: '100%' }}>Documento vencido</Alert>;
                    } else if (res.due_date === 2) {
                      acciones = <Button color="warning" variant="contained" size="small">Renovar</Button>;
                      alerta = <Alert severity="warning" sx={{ mb: 1, width: '100%' }}>Documento por vencer</Alert>;
                    } else {
                      acciones = <Button color="primary" variant="contained" size="small">Renovar</Button>;
                    }
                    if (res.normative_gap === 1) {
                      acciones = <Tooltip title="El documento presenta observaciones normativas."><span><Button color="warning" variant="outlined" size="small">Revisar observaciones</Button></span></Tooltip>;
                    }
                  }
                  return (
                    <TableRow key={idx} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Folder size={22} />
                          <Typography variant="subtitle1" fontWeight={600}>{res.group_name}</Typography>
                        </Box>
                        {alerta}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{res.document_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {/* Estado vencimiento */}
                          {(() => {
                            const isPdf = d => d.document_name && d.document_name.toLowerCase().endsWith('.pdf');
                            // Para la búsqueda semántica, solo hay un documento por fila
                            if (isPdf(res)) {
                              if (res.due_date === 1) {
                                return (
                                  <Tooltip title={"Vencido: " + res.document_name}>
                                    <Chip label={`Vencido`} color="error" size="small" />
                                  </Tooltip>
                                );
                              } else if (res.due_date === 2) {
                                return (
                                  <Tooltip title={"Por vencer: " + res.document_name}>
                                    <Chip label={`Por Vencer`} color="warning" size="small" />
                                  </Tooltip>
                                );
                              }
                            }
                            return null;
                          })()}
                          {/* Estado normativo */}
                          {(() => {
                            const isPdf = d => d.document_name && d.document_name.toLowerCase().endsWith('.pdf');
                            if (isPdf(res) && res.normative_gap === 1) {
                              return (
                                <Tooltip title={"En observación: " + res.document_name}>
                                  <Chip label={`En observación`} color="warning" size="small" />
                                </Tooltip>
                              );
                            }
                            return null;
                          })()}
                        </Stack>
                      </TableCell>
                      <TableCell>{acciones}</TableCell>
                      <TableCell>
                        <Button variant="outlined" onClick={() => navigate(`/grupos/${res.document_group_id}`)}>Ver grupo</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      <Box sx={{ mt: 2 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Grupo</TableCell>
                <TableCell>Estados</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Acceso</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentGroups
                .filter(g => !query || g.name.toLowerCase().includes(query.toLowerCase()))
                .map(g => {
                  const doc = g.documents && g.documents.length > 0 ? g.documents[0] : null;
                  let estadoVenc = doc?.due_date ?? 0;
                  let estadoNorm = doc?.normative_gap ?? 0;
                  let acciones = null;
                  let alerta = null;

                  if (doc) {
                    if (estadoVenc === 1) {
                      acciones = <Button color="error" variant="contained" size="small">Actualizar urgente</Button>;
                      alerta = <Alert severity="error" sx={{ mb: 1, width: '100%' }}>Documento vencido</Alert>;
                    } else if (estadoVenc === 2) {
                      acciones = <Button color="warning" variant="contained" size="small">Renovar</Button>;
                      alerta = <Alert severity="warning" sx={{ mb: 1, width: '100%' }}>Documento por vencer</Alert>;
                    } else {
                      acciones = <Button color="primary" variant="contained" size="small">Renovar</Button>;
                    }
                    if (estadoNorm === 1) {
                      acciones = <Tooltip title="El documento presenta observaciones normativas."><span><Button color="warning" variant="outlined" size="small">Revisar observaciones</Button></span></Tooltip>;
                    }
                  }

                  return (
                    <TableRow key={g.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Folder size={22} />
                          <Typography variant="subtitle1" fontWeight={600}>{g.name}</Typography>
                        </Box>
                        {doc && alerta}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {/* Peor estado de vencimiento: solo negativos */}
                          {(() => {
                            const isPdf = d => d.filename && d.filename.toLowerCase().endsWith('.pdf');
                            const docsPdf = g.documents.filter(isPdf);
                            const docsVencidos = docsPdf.filter(d => d.due_date === 1);
                            const docsPorVencer = docsPdf.filter(d => d.due_date === 2);
                            if (docsVencidos.length > 0) {
                              return (
                                <Tooltip title={"Vencido: " + docsVencidos.map(d => d.filename).join(", ")}>
                                  <Chip label={`Vencido (${docsVencidos.length})`} color="error" size="small" />
                                </Tooltip>
                              );
                            } else if (docsPorVencer.length > 0) {
                              return (
                                <Tooltip title={"Por vencer: " + docsPorVencer.map(d => d.filename).join(", ")}>
                                  <Chip label={`Por Vencer (${docsPorVencer.length})`} color="warning" size="small" />
                                </Tooltip>
                              );
                            } else {
                              return null;
                            }
                          })()}
                          {/* Peor estado normativo: solo negativos */}
                          {(() => {
                            const isPdf = (d: { filename: string; }) => d.filename && d.filename.toLowerCase().endsWith('.pdf');
                            const docsPdf = g.documents.filter(isPdf);
                            const docsObs = docsPdf.filter(d => d.normative_gap === 1);
                            if (docsObs.length > 0) {
                              return (
                                <Tooltip title={"En observación: " + docsObs.map(d => d.filename).join(", ")}>
                                  <Chip label={`En observación (${docsObs.length})`} color="warning" size="small" />
                                </Tooltip>
                              );
                            } else {
                              return null;
                            }
                          })()}
                        </Stack>
                      </TableCell>
                      <TableCell>{acciones}</TableCell>
                      <TableCell>
                        <Button variant="outlined" onClick={() => navigate(`/grupos/${g.id}`)}>Ver grupo</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
