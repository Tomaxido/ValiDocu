import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  getDocumentGroupById,
  getDocumentGroups,
  uploadDocumentsToGroup,
  deleteDocuments,
  getSemanticGroupData,
  marcarDocumentosVencidos,
  obtenerDocumentosVencidosDeGrupo as obtenerDocumentosVencidosDeGrupo,
  buscaDocJsonLayoutPorIdDocumento
} from "../../utils/api";
import { type DocumentGroup, type Document, type GroupedDocument, type SemanticGroup, type ExpiredDocumentResponse, type ProcessedDocumentEvent } from "../../utils/interfaces";
import { canUserEdit } from "../../utils/permissions";
import { useAuth } from "../../contexts/AuthContext";
import UploadModal from "./UploadModal";
import DeleteModal from "./DeleteModal";
import GroupedImageViewer from "./GroupedImageViewer";
import DocInfoPanel from "./DocInfoPanel";
import GroupOverviewModal from "../../components/group/GroupOverviewModal";
import GroupConfigurationInfoModal from "../../components/group/GroupConfigurationInfoModal";
import { downloadDocumentSummaryExcel } from "../../api/summary_excel";
import { fetchMandatoryDocs, type MandatoryDocsResponse } from "../../api/summary_excel";

import {
  Box, Paper, Button, Typography, List, ListItemButton,
  ListItemText, Chip, Stack, IconButton, Divider, Popper, ListItem, CircularProgress
} from "@mui/material";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import SnackbarDocsVencidos from "../../components/SnackbarDocsVencidos";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";

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

export default function Grupo({ currentEvent }: { currentEvent: ProcessedDocumentEvent | null }) {
  const { grupoId } = useParams<{ grupoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState<DocumentGroup | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupedDocs, setGroupedDocs] = useState<GroupedDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [semanticGroupData, setSemanticGroupData] = useState<SemanticGroup[]>([]);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [infoAnchor, setInfoAnchor] = useState<HTMLElement | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [mandatoryDocs, setMandatoryDocs] = useState<string[] | null>(null);
  const [mandatoryLoading, setMandatoryLoading] = useState(false);
  const [mandatoryError, setMandatoryError] = useState<string | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const [respuestaDocsVencidos, setRespuestaDocsVencidos] = useState<ExpiredDocumentResponse | null>(null);
  const [docLayout, setDocLayout] = useState<any>(null);

  // Verificar permisos de edición del usuario actual
  const userCanEdit = canUserEdit(group, user?.id?.toString());

  const splitRef = useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = useState(0.66);
  const MIN_LEFT_PX = 360;
  const MIN_RIGHT_PX = 280;
  const HANDLE_PX = 8;

  const openInfo = async (e: React.MouseEvent<HTMLElement>) => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    setInfoAnchor(e.currentTarget);
    if (!infoOpen) setInfoOpen(true);

    if (!mandatoryDocs && !mandatoryLoading) {
      setMandatoryLoading(true);
      setMandatoryError(null);
      try {
        const items = await fetchMandatoryDocs();
        setMandatoryDocs(items);
      } catch (err: any) {
        setMandatoryError(err?.message ?? "Error cargando obligatorios");
      } finally {
        setMandatoryLoading(false);
      }
    }
  };

  const scheduleCloseInfo = () => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => setInfoOpen(false), 180);
  };
  const cancelCloseInfo = () => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
  };

  // Función para manejar "Ver en documento"
  const handleViewInDocument = async (fieldKey: string) => {
    if (!selectedDoc) {
      console.warn('⚠️ No hay documento seleccionado');
      return;
    }

    try {
      // Obtener el layout del documento si no está cargado
      if (!docLayout) {
        const layoutData = await buscaDocJsonLayoutPorIdDocumento(selectedDoc.id);
        setDocLayout(layoutData);
        
        // Buscar la anotación correspondiente al fieldKey en el layout
        const annotation = layoutData.find((item: any) => {
          // En json_layout, los elementos tienen formato: {"page": 1, "text": "...", "boxes": [...], "label": "TIPO_DOCUMENTO"}
          // Buscar por label principalmente, ya que es el identificador del campo
          return item.label === fieldKey || 
                 item.label === fieldKey.toUpperCase() ||
                 item.label?.toLowerCase() === fieldKey.toLowerCase();
        });

        if (annotation && annotation.boxes && annotation.boxes.length > 0) {
          // Emitir el evento focus-evidence que el GroupedImageViewer está escuchando
          const evidenceEvent = new CustomEvent('focus-evidence', {
            detail: {
              items: [{
                boxes: annotation.boxes,
                page: (annotation as any).page || 1 // Usar la página del json_layout
              }],
              noScroll: false // Permitir scroll automático
            }
          });
          
          window.dispatchEvent(evidenceEvent);
        }
      } else {
        // Buscar en el layout ya cargado
        const annotation = docLayout.find((item: any) => {
          // En json_layout, los elementos tienen formato: {"page": 1, "text": "...", "boxes": [...], "label": "TIPO_DOCUMENTO"}
          return item.label === fieldKey || 
                 item.label === fieldKey.toUpperCase() ||
                 item.label?.toLowerCase() === fieldKey.toLowerCase();
        });

        if (annotation && annotation.boxes && annotation.boxes.length > 0) {
          const evidenceEvent = new CustomEvent('focus-evidence', {
            detail: {
              items: [{
                boxes: annotation.boxes,
                page: (annotation as any).page || 1 // Usar la página del json_layout
              }],
              noScroll: false
            }
          });
          
          window.dispatchEvent(evidenceEvent);
        } else {
          console.warn(`❌ No se encontró el campo: ${fieldKey} (cached)`);
        }
      }
    } catch (error) {
      console.error('💥 Error al buscar el campo en el documento:', error);
    }
  };

  const getGroupRoutine = async (grupoId: string) => {
    // TODO: tal vez, en vez de que el estado sea selectedDoc, debería ser selectedDocId.
    // Luego, se calcula selectedDoc = groupedDocs.find(gd => gd.id === selectedDocId)?.pdf.
    // Esto evitaría problemas si se suben/eliminan documentos.
    const g = await getDocumentGroupById(grupoId);
    setGroup(g);
    const grouped = groupDocuments(g.documents);
    setGroupedDocs(grouped);

    if (grouped.length > 0 && grouped[0].pdf) {
      if (selectedDoc === null) {
        setSelectedDoc(grouped[0].pdf);
        setDocLayout(null);
      }
      getSemanticGroupData(grouped[0].images).then(setSemanticGroupData);
    }
  }

  useEffect(() => {
    if (currentEvent !== null && grupoId !== undefined && currentEvent.group.id.toString() === grupoId)
      getGroupRoutine(grupoId);
  }, [currentEvent]);

  useEffect(() => {
    const checkAccessAndLoadGroup = async () => {
      if (!grupoId || !user) return;
      
      setLoading(true);
      
      try {
        // Primero obtener la lista de grupos del usuario para verificar acceso
        const userGroups = await getDocumentGroups();
        const targetGroup = userGroups.find((g: DocumentGroup) => g.id.toString() === grupoId);
        
        if (!targetGroup) {
          setAccessDenied(true);
          
          // Redirigir al home después de 3 segundos
          setTimeout(() => {
            navigate('/', { 
              state: { 
                message: 'El grupo solicitado no existe o no tienes permisos para acceder a él.',
                severity: 'error' 
              } 
            });
          }, 3000);
          return;
        }
        
        // Si el grupo está en la lista de userGroups, el usuario ya tiene acceso autorizado
        // No necesitamos verificación adicional porque el backend ya filtró correctamente
        
        // Si tiene acceso, cargar los detalles completos del grupo
        marcarDocumentosVencidos();
        obtenerDocumentosVencidosDeGrupo(grupoId).then(setRespuestaDocsVencidos);
        
        await getGroupRoutine(grupoId);
      } catch (error: any) {
        console.error('Error loading group:', error);
        
        // Manejar diferentes tipos de error
        let message = 'Error al acceder al grupo.';
        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
          message = 'No tienes permisos para acceder a este grupo.';
        } else if (error.message?.includes('404') || error.message?.includes('Not Found')) {
          message = 'El grupo solicitado no existe.';
        } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          message = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
        }
        
        navigate('/', { 
          state: { 
            message,
            severity: 'error' 
          } 
        });
      } finally {
        setLoading(false);
      }
    };

    checkAccessAndLoadGroup();
  }, [grupoId, user, navigate]);

  const beginDrag = (clientX: number) => {
    const el = splitRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

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

  // Estados de carga y acceso
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Verificando acceso y cargando grupo...</Typography>
      </Box>
    );
  }

  if (accessDenied) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', p: 3 }}>
        <Typography variant="h5" color="error" gutterBottom>
          Acceso Denegado
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
          No tienes permisos para acceder a este grupo privado.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Serás redirigido al inicio en unos segundos...
        </Typography>
      </Box>
    );
  }

  if (!group) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography>Error al cargar el grupo</Typography>
      </Box>
    );
  }

  const handleFileUpload = async (files: FileList) => {
    if (!grupoId) return;
    try {
      await uploadDocumentsToGroup(grupoId, files);
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
            zIndex: (t) => t.zIndex.drawer + 2,
            width: 40,
            height: 40,
          }}
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </IconButton>

        <Box
          aria-hidden={!sidebarOpen}
          sx={(theme) => ({
            position: "relative",
            zIndex: 1,
            opacity: sidebarOpen ? 1 : 0,
            transform: `translateX(${sidebarOpen ? 0 : -8}px)`,
            pointerEvents: sidebarOpen ? "auto" : "none",
            transition: theme.transitions.create(["opacity", "transform"], {
              duration: 250,
              easing: theme.transitions.easing.easeInOut,
            }),
          })}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" fontWeight={700}>Grupo: {group.name}</Typography>
            <Chip 
              label={userCanEdit ? 'Edición' : 'Solo lectura'} 
              size="small" 
              color={userCanEdit ? 'warning' : 'info'}
              sx={{ ml: 1 }}
            />
          </Box>

          {!userCanEdit && (
            <Box sx={{ mb: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="caption" color="info.dark">
                Solo tienes permisos de lectura en este grupo. No puedes añadir ni eliminar documentos.
              </Typography>
            </Box>
          )}

        {/* === Acciones del grupo (2 columnas iguales) === */}
        <Box
          sx={{
            mt: 1,
            mb: 2,
            display: "grid",
            gridTemplateColumns: "auto auto", // 2 columnas del mismo ancho
            gap: 1,                          // mismo espacio que spacing={1}
          }}
        >
          {/* Fila 1: Añadir / Eliminar (mismo tamaño) */}
          <Button 
            onClick={() => setIsModalOpen(true)} 
            fullWidth 
            startIcon={<Plus size={18} />}
            disabled={!userCanEdit}
            title={!userCanEdit ? "No tienes permisos de edición en este grupo" : "Añadir documento"}
          >
            Añadir documento
          </Button>

          <IconButton 
            onClick={() => setDeleteModalOpen(true)} 
            sx={{ bgcolor: "white" }}
            disabled={!userCanEdit}
            title={!userCanEdit ? "No tienes permisos de edición en este grupo" : "Eliminar documentos"}
          >
            <Trash2 size={18} />
          </IconButton>

          {/* Fila 2: Ver Resumen / Configuración */}
          <Button fullWidth onClick={() => setOverviewOpen(true)} startIcon={<EqualizerIcon />}>
            Ver Resumen
          </Button>

            <IconButton onClick={() => setConfigurationOpen(true)} sx={{ bgcolor: "white" }}>
              <InfoOutlineIcon fontSize="small" />
            </IconButton>
        </Box>

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
                      setDocLayout(null); // Limpiar layout al cambiar documento
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

      <Box sx={{ flex: 1, p: 3, minWidth: 0 }}>
        {selectedDoc ? (
            <Box
              ref={splitRef}
              sx={(theme) => {
                const GAP_PX = parseInt(theme.spacing(2));
                const handle = HANDLE_PX;
                const SAFE   = 2;

                const left  = `calc(${leftPct}% - ${(handle + GAP_PX) / 2}px)`;
                const right = `calc(${rightPct}% - ${(handle + GAP_PX) / 2 + SAFE}px)`;

                return {
                  display: "grid",
                  gridTemplateColumns: `${left} ${handle}px ${right}`,
                  columnGap: 2,
                  alignItems: "stretch",
                  minHeight: "calc(100dvh - 96px)",
                  width: "100%",
                  pr: `${SAFE}px`,
                  boxSizing: "border-box",
                };
              }}
            >

            <Box sx={{ minWidth: 0 }}>
              <GroupedImageViewer
                filename={selectedDoc.filename}
                files={groupedDocs.find(g => g.pdf?.id === selectedDoc.id)?.images || [selectedDoc]}
              />
            </Box>

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

            <Box sx={{ minWidth: MIN_RIGHT_PX, minHeight: 0, display: "flex" }}>
              <DocInfoPanel
                selectedDoc={selectedDoc}
                semanticGroupData={semanticGroupData}
                onViewInDocument={handleViewInDocument}
                // imageIds={currentImageIds}
              />
            </Box>
          </Box>
        ) : (
          <Typography>Selecciona un documento para ver su contenido.</Typography>
        )}
      </Box>

      <Popper
        open={infoOpen}
        anchorEl={infoAnchor}
        placement="bottom-start"
        disablePortal={false}
        modifiers={[{ name: "offset", options: { offset: [0, 8] } }]}
        style={{ zIndex: 2000 }}
      >
        <Paper
          elevation={6}
          onMouseEnter={cancelCloseInfo}
          onMouseLeave={scheduleCloseInfo}
          sx={{
            p: 1.5,
            maxHeight: 360,
            width: 340,
            overflowY: "auto",
            position: "relative",                 // z-index solo aplica si es posicionado
            zIndex: (t) => t.zIndex.tooltip + 1,  // extra por si tu tema tiene zIndex altos
            pointerEvents: "auto",
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Documentos obligatorios
          </Typography>

          {mandatoryLoading && (
            <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={22} />
            </Box>
          )}

          {!mandatoryLoading && mandatoryError && (
            <Box sx={{ p: 1 }}>
              <Typography color="error" variant="body2">{mandatoryError}</Typography>
            </Box>
          )}

          {!mandatoryLoading && !mandatoryError && (
            <List dense disablePadding>
              {(mandatoryDocs ?? []).map((name) => (
                <ListItem key={name} disableGutters>
                  <ListItemText primaryTypographyProps={{ variant: "body2" }} primary={name} />
                </ListItem>
              ))}
              {mandatoryDocs && mandatoryDocs.length === 0 && (
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay documentos configurados.
                  </Typography>
                </Box>
              )}
            </List>
          )}
        </Paper>
      </Popper>


      {group && (
        <GroupOverviewModal
          open={overviewOpen}
          groupId={group.id}
          onClose={() => setOverviewOpen(false)}
          onExportExcel={() => downloadDocumentSummaryExcel(group.id)}
        />
      )}

      {group && (
        <GroupConfigurationInfoModal
          open={configurationOpen}
          group={group}
          onClose={() => setConfigurationOpen(false)}
        />
      )}

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
