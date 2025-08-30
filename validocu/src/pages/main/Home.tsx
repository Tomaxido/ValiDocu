import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, IconButton, Button, Paper, InputBase, Stack,
  Card, CardActionArea, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Menu, Divider,
  FormControl, InputLabel, Select, OutlinedInput, MenuItem,
  Checkbox, ListItemText, CircularProgress
  
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
  const [gapOptions, setGapOptions] = useState<Filters[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<(number | string)[]>([]);
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
  if (!query.trim()) {
    setResultados([]);
    setBusquedaRealizada(false);
    return;
  }
  setBuscando(true);
  setBusquedaRealizada(true);
  try {
    const filas = await buscarSemanticaConFiltros({
      texto: query,
      status: selectedStatus.length ? selectedStatus : undefined,
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
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell>#</TableCell>
                  <TableCell>📂 Grupo</TableCell>
                  <TableCell>📄 Documento</TableCell>
                  <TableCell>🎯 Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultados.map((res, idx) => (
                  <TableRow
                    key={idx}
                    hover
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderLeft: 3,
                        borderColor: "secondary.main",
                      },
                    }}
                    onClick={() => navigate(`/grupos/${res.document_group_id}`)}
                  >
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{res.group_name}</TableCell>
                    <TableCell>{res.document_name}</TableCell>
                    <TableCell>{(res.score * 100).toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      <Box
        sx={{
          mt: 2,
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
        }}
      >
        {documentGroups
          .filter(g => !query || g.name.toLowerCase().includes(query.toLowerCase()))
          .map(g => (
            <Card key={g.id} variant="outlined" sx={{ borderColor: "divider" }}>
              <CardActionArea onClick={() => navigate(`/grupos/${g.id}`)}>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Folder size={22} />
                  <Typography>{g.name}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))
        }
      </Box>
    </Box>
  );
}
