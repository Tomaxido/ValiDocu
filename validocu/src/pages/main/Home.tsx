import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, IconButton, Button, Paper, InputBase, Stack,
  Card, CardActionArea, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from "@mui/material";
import { Folder, Plus, Search as SearchIcon, Settings2 } from "lucide-react";
import { createGroup, getDocumentGroups, buscarDocumentosPorTexto, obtenerDocumentosVencidos, marcarDocumentosVencidos } from "../../utils/api";
import type { DocumentGroup, ExpiredDocumentResponse } from "../../utils/interfaces";
import NewGroupModal from "./NewGroupModal";
import { SnackbarDocsVencidos } from "../../components/SnackbarDocsVencidos";

export default function Home() {
  const navigate = useNavigate();
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [respuestaDocsVencidos, setRespuestaDocsVencidos] = useState<ExpiredDocumentResponse | null>(null);

  useEffect(() => {
    getDocumentGroups().then(groups => setDocumentGroups(groups));
    obtenerDocumentosVencidos().then(docs => setRespuestaDocsVencidos(docs));
    marcarDocumentosVencidos();
  }, []);

  const buscar = async () => {
    if (!query.trim()) {
      setResultados([]);
      setBusquedaRealizada(false);
      return;
    }
    setBuscando(true);
    setBusquedaRealizada(true);
    try {
      const data = await buscarDocumentosPorTexto(query);
      setResultados(data);
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
          sx={{
            bgcolor: "background.paper",
            border: 1, borderColor: "divider",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Settings2 size={20} />
        </IconButton>
      </Stack>

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
