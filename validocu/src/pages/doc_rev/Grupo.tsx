import { useParams } from "react-router-dom";
import { useEffect, useRef, useState, type JSX } from "react";
import { getDocumentGroupById, uploadDocumentsToGroup, deleteDocuments, getSemanticGroupData, obtenerDocumentosVencidos as obtenerDocumentosVencidosDeGrupo } from "../../utils/api";
import { type DocumentGroup, type Document, type GroupedDocument, type SemanticGroup, type ExpiredDocumentResponse } from "../../utils/interfaces";
import UploadModal from "./UploadModal";
import DeleteModal from "./DeleteModal";
import GroupedImageViewer from "./GroupedImageViewer";
import DocInfoPanel from "./DocInfoPanel";

import {
  Box, Paper, Button, Typography, List, ListItemButton,
  ListItemText, Chip, Stack, IconButton, Divider, Snackbar,
  Alert,
} from "@mui/material";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

function groupDocuments(documents: Document[]): GroupedDocument[] {
  const pdfs = documents.filter((doc) => doc.filename.toLowerCase().endsWith(".pdf"));
  const images = documents.filter((doc) => !doc.filename.toLowerCase().endsWith(".pdf"));

  const groups: { [key: string]: Document[] } = {};
  for (const doc of images) {
    const match = /^(.+?)_p\d+\.(png|jpg|jpeg)$/i.exec(doc.filename);
    const key = match ? match[1] : doc.filename;
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  }

  return Object.entries(groups).map(([key, imgs]) => {
    const matchingPdf = pdfs.find((pdf) => pdf.filename.toLowerCase().startsWith(key.toLowerCase()));
    const nameWithoutExt = matchingPdf ? matchingPdf.filename.replace(/\.pdf$/i, "") : key;
    return { name: nameWithoutExt, images: imgs, pdf: matchingPdf };
  });
}

function StatusChip({ status } : { status?: number }) {
  if (status === 1) return <Chip label="Conforme" color="success" size="small" />;
  if (status === 2) return <Chip label="Inconforme" color="error" size="small" />;
  return <Chip label="Sin procesar" variant="outlined" size="small" />;
}

function SnackbarDocsVencidos({ respuestaDocsVencidos }: { respuestaDocsVencidos: ExpiredDocumentResponse | null }): JSX.Element {
  const docsVencidos = respuestaDocsVencidos?.documentosVencidos ?? [];
  const docsPorVencer = respuestaDocsVencidos?.documentosPorVencer ?? [];

  const [open, setOpen] = useState(docsVencidos.length > 0 || docsPorVencer.length > 0);

  let message = "Hay ";
  if (docsVencidos.length > 0) {
    if (docsVencidos.length === 1) {
      message += "1 documento vencido";
    } else if (docsVencidos.length > 1) {
      message += `${docsVencidos.length} documentos vencidos`;
    }
    if (docsPorVencer.length > 0) {
      message += " y ";
    }
  }

  if (docsPorVencer.length > 0) {
    if (docsPorVencer.length === 1) {
      message += "1 documento por vencer";
    } else if (docsPorVencer.length > 1) {
      message += `${docsPorVencer.length} documentos por vencer`;
    }
  }

  message += ".";

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      autoHideDuration={10000}
      onClose={() => setOpen(false)}
    >
      <Alert
        severity={docsVencidos.length > 0 ? "error" : "warning"}
        variant="filled"
      >
        {message}
      </Alert>
    </Snackbar>
    
  )
}

export default function Grupo() {
  const { grupoId } = useParams<{ grupoId: string }>();
  const [group, setGroup] = useState<DocumentGroup | null>(null);
  const [groupedDocs, setGroupedDocs] = useState<GroupedDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [semanticGroupData, setSemanticGroupData] = useState<SemanticGroup[]>([]);
  const [respuestaDocsVencidos, setRespuestaDocsVencidos] = useState<ExpiredDocumentResponse | null>(null);

  // ====== Splitter state ======
  const splitRef = useRef<HTMLDivElement | null>(null);
  // ratio = porcentaje del ancho destinado al viewer (0..1)
  const [ratio, setRatio] = useState(0.66);
  const MIN_LEFT_PX = 360;  // ancho mínimo del viewer
  const MIN_RIGHT_PX = 280; // ancho mínimo del panel info
  const HANDLE_PX = 8;      // ancho del resizer

  useEffect(() => {
    if (grupoId) {
      // TEST
      obtenerDocumentosVencidosDeGrupo(grupoId).then(setRespuestaDocsVencidos);
      getDocumentGroupById(grupoId).then((g) => {
        setGroup(g);
        const grouped = groupDocuments(g.documents);
        setGroupedDocs(grouped);
        if (grouped.length > 0 && grouped[0].pdf) {
          setSelectedDoc(grouped[0].pdf);
          getSemanticGroupData(grouped[0].images).then(
            data => setSemanticGroupData(data)
          );
        }
      });
    }
  }, [grupoId]);

  // ====== Drag logic ======
  const beginDrag = (clientX: number) => {
    const el = splitRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    // limites duros por anchos mínimos
    const minLeft = MIN_LEFT_PX;
    const minRight = MIN_RIGHT_PX;
    const minX = rect.left + minLeft;
    const maxX = rect.right - minRight;

    const clampedX = Math.min(Math.max(clientX, minX), maxX);
    const nextRatio = (clampedX - rect.left) / rect.width;
    setRatio(nextRatio);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const move = (ev: MouseEvent) => beginDrag(ev.clientX);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onTouchStart = () => {
    const move = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (t) beginDrag(t.clientX);
    };
    const end = () => {
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
  };

  if (!group) return <Typography sx={{ p: 2 }}>Cargando grupo...</Typography>;

  const handleFileUpload = async (files: FileList) => {
    if (!grupoId) return;
    try {
      await uploadDocumentsToGroup(grupoId, files);
      const updatedGroup = await getDocumentGroupById(grupoId);
      setGroup(updatedGroup);
      const grouped = groupDocuments(updatedGroup.documents);
      setGroupedDocs(grouped);
      const lastPdf = grouped.at(-1)?.pdf;
      setSelectedDoc(lastPdf || null);
    } catch (err: any) {
      alert("Error al subir: " + err.message);
    }
  };

  const handleDeleteDocuments = async (ids: number[]) => {
    if (!grupoId) return;
    try {
      await deleteDocuments(ids);
      const updatedGroup = await getDocumentGroupById(grupoId);
      setGroup(updatedGroup);
      const grouped = groupDocuments(updatedGroup.documents);
      setGroupedDocs(grouped);
      const firstPdf = grouped[0]?.pdf;
      setSelectedDoc(firstPdf || null);
    } catch (err: any) {
      alert("Error al eliminar documentos: " + err.message);
    }
  };

  // Cálculo de columnas del grid (viewer | handle | info)
  const leftPct = Math.round(ratio * 100);
  const rightPct = 100 - leftPct;

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        bgcolor: "background.default",
        width: "100%",
      }}
    >
      {/* Alerta de documentos vencidos */}
      <SnackbarDocsVencidos respuestaDocsVencidos={respuestaDocsVencidos}/>
      
      {/* Sidebar */}
      <Paper
        elevation={0}
        sx={(theme) => ({
          position: "relative",
          bgcolor: "grey.100",
          borderRight: 1,
          borderColor: "divider",
          width: sidebarOpen ? 300 : 56,
          minWidth: 56,
          flexShrink: 0,
          overflow: "hidden",
          p: 2,
          transition: theme.transitions.create("width", {
            duration: 300,
            easing: theme.transitions.easing.easeInOut,
          }),
        })}
      >
        <IconButton
          aria-label={sidebarOpen ? "Cerrar panel" : "Abrir panel"}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: (t) => t.zIndex.drawer + 2, // ⬅️ por sobre el contenido
            width: 40,  // área clickeable completa
            height: 40, // (aunque el ícono sea pequeño)
          }}
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </IconButton>

        {/* 👉 En vez de {sidebarOpen && (...)}, SIEMPRE renderiza y anima visibilidad */}
        <Box
          aria-hidden={!sidebarOpen}
          sx={(theme) => ({
            position: "relative",
            zIndex: 1, // ⬅️ debajo del IconButton (que está en zIndex drawer+2)
            opacity: sidebarOpen ? 1 : 0,
            transform: `translateX(${sidebarOpen ? 0 : -8}px)`,
            pointerEvents: sidebarOpen ? "auto" : "none",
            transition: theme.transitions.create(["opacity", "transform"], {
              duration: 250,
              easing: theme.transitions.easing.easeInOut,
            }),
          })}
        >
          <Typography variant="h6" fontWeight={700}>Grupo: {group.name}</Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
            <Button
              variant="contained"
              color="warning"
              startIcon={<Plus size={18} />}
              onClick={() => setIsModalOpen(true)}
            >
              Añadir documento
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={18} />}
              onClick={() => setDeleteModalOpen(true)}
            >
              Eliminar
            </Button>
          </Stack>

          <Divider sx={{ mb: 1 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Listado de documentos</Typography>

          <List dense disablePadding>
            {groupedDocs.map((grouped) => {
              const active = selectedDoc?.id === grouped.pdf?.id;
              return (
                <ListItemButton
                  key={grouped.name}
                  selected={active}
                  onClick={() => {
                    if (grouped.pdf) {
                      setSelectedDoc(grouped.pdf);
                      getSemanticGroupData(grouped.images).then(
                        data => setSemanticGroupData(data)
                      );
                    }
                  }}
                  sx={{
                    mb: 0.5,
                    border: 1,
                    borderColor: active ? "secondary.main" : "divider",
                    borderRadius: 1,
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={700}>{grouped.name}</Typography>
                        <StatusChip status={grouped.pdf?.status} />
                      </Stack>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Paper>


      {/* Content con splitter */}
      <Box sx={{ flex: 1, p: 3, minWidth: 0 }}>
        {selectedDoc ? (
            <Box
              ref={splitRef}
              sx={(theme) => {
                const GAP_PX = parseInt(theme.spacing(2));
                const handle = HANDLE_PX;
                const SAFE   = 2;                          // buffer para que se vea el borde

                const left  = `calc(${leftPct}% - ${(handle + GAP_PX) / 2}px)`;
                const right = `calc(${rightPct}% - ${(handle + GAP_PX) / 2 + SAFE}px)`;

                return {
                  display: "grid",
                  gridTemplateColumns: `${left} ${handle}px ${right}`,
                  columnGap: 2,
                  alignItems: "stretch",
                  minHeight: "calc(100dvh - 96px)",
                  width: "100%",
                  // overflow: "hidden",
                  pr: `${SAFE}px`,
                  boxSizing: "border-box",
                };
              }}
            >

            {/* Viewer */}
            <Box sx={{ minWidth: 0 }}>
              <GroupedImageViewer
                files={groupedDocs.find(g => g.pdf?.id === selectedDoc.id)?.images || [selectedDoc]}
              />
            </Box>

            {/* Handle arrastrable */}
            <Box
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionar paneles"
              tabIndex={0}
              sx={{
                cursor: "col-resize",
                bgcolor: "divider",
                borderRadius: 1,
                transition: "background-color .15s",
                "&:hover, &:focus-visible": { bgcolor: "text.disabled" },
              }}
            />

            {/* Panel de información */}
            <Box sx={{ minWidth: MIN_RIGHT_PX, minHeight: 0, display: "flex" }}>
              <DocInfoPanel selectedDoc={selectedDoc} semanticGroupData={semanticGroupData} />
            </Box>
          </Box>
        ) : (
          <Typography>Selecciona un documento para ver su contenido.</Typography>
        )}
      </Box>

      {/* Modales */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleFileUpload}
      />
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        documents={group.documents}
        onDelete={handleDeleteDocuments}
      />
    </Box>
  );
}
