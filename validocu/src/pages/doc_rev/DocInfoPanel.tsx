import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Stack,
  Box,
  Chip,
  Button,
  Tooltip,
} from "@mui/material";
import type { Document, SemanticGroup } from "../../utils/interfaces";

import {
  getLastDocumentAnalysis,
  listSuggestionStatuses,
  type Issue,
  type SuggestionStatus,
  summaryDoc,
  getMissingFields,
  type MissingFieldsResponse
} from "../../api/analysis";
import SuggestionsModal from "./SuggestionsModal";
import CommentsPanel from "./CommentsPanel";
import {
  getDocumentComments,
  createComment,
  updateComment,
  deleteComment,
  type Comment,
} from "../../api/comments";



interface Props {
  selectedDoc: Document;
  semanticGroupData: SemanticGroup[];
  onViewInDocument?: (fieldKey: string) => void;
}

function getBaseFilename(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? filename : filename.substring(0, lastDot);
}


function StatusVenc({ status }: { status: number }) {
  if (status === 2)
    return (
      <Tooltip title="El documento está próximo a vencer. Se recomienda revisar su vigencia y tomar acciones preventivas.">
        <Chip 
          size="small" 
          label="Por Vencer" 
          color="warning" 
          variant="outlined"
          sx={{ borderWidth: 2, fontWeight: 600 }}
        />
      </Tooltip>
    );
  if (status === 1)
    return (
      <Tooltip title="El documento ha vencido. No es válido para uso normativo.">
        <Chip 
          size="small" 
          label="Vencido" 
          color="error" 
          variant="outlined"
          sx={{ borderWidth: 2, fontWeight: 600 }}
        />
      </Tooltip>
    );
  return (
    <Tooltip title="El documento está vigente y es válido para uso normativo.">
      <Chip 
        size="small" 
        label="Vigente" 
        color="success" 
        variant="outlined"
        sx={{ borderWidth: 2, fontWeight: 600 }}
      />
    </Tooltip>
  );
}

function StatusNorm({ status }: { status: number }) {
  if (status === 1)
    return (
      <Tooltip title="El documento presenta observaciones o posibles brechas normativas que requieren atención.">
        <Chip 
          size="small" 
          label="En observación" 
          color="warning" 
          variant="outlined"
          sx={{ borderWidth: 2, fontWeight: 600 }}
        />
      </Tooltip>
    );
  return (
    <Tooltip title="El documento cumple con los requisitos normativos y no presenta brechas.">
      <Chip 
        size="small" 
        label="Sin brechas normativas" 
        color="success" 
        variant="outlined"
        sx={{ borderWidth: 2, fontWeight: 600 }}
      />
    </Tooltip>
  );
}

export default function DocInfoPanel({
  selectedDoc,
  onViewInDocument,
}: Readonly<Props>) {
  const [loading, setLoading] = useState(false);
  const [openSugModal, setOpenSugModal] = useState(false);

  const [statuses, setStatuses] = useState<SuggestionStatus[]>([]);
  const [issuesList, setIssuesList] = useState<Issue[] | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [docSummary, setDocSummary] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<MissingFieldsResponse | null>(null);
  
  // Estado para los comentarios (se cargarán desde la API)
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const st = await listSuggestionStatuses();
        setStatuses(st);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    reAnalyze();
    loadMissingFields();
    loadComments(); // Cargar comentarios cuando cambia el documento
  }, [selectedDoc]);

  const loadComments = async () => {
    if (!selectedDoc.id) return;
    
    setLoadingComments(true);
    try {
      // Asumiendo que selectedDoc.id es el document_version_id
      // Si tienes una forma diferente de obtener el version_id, ajústalo aquí
      const fetchedComments = await getDocumentComments(selectedDoc.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadMissingFields = async () => {
    try {
      const fields = await getMissingFields(selectedDoc.id);
      setMissingFields(fields);
    } catch (error) {
      console.error('Error loading missing fields:', error);
      setMissingFields(null);
    }
  };

  useEffect(() => {
    setDocSummary(null); // Limpiar el resumen antes de cargar uno nuevo
    (async () => {
      try {
        const summary = await summaryDoc(selectedDoc.id);
        setDocSummary(summary.resumen ?? summary ?? null);
      } catch {
        setDocSummary(null);
      }
    })();
  }, [selectedDoc]);

  const computePending = (issues: Issue[]) => {
    const todoId = 1;
    return issues.filter(i => i.status_id === todoId).length;
  };

  const handleIssueUpdated = (issue: Issue) => {
    setIssuesList((prev) => {
      if (!prev) return prev;
      const next = prev.map((i) => (i.issue_id === issue.issue_id ? issue : i));
      setPendingCount(computePending(next));
      return next;
    });
  };

  const reAnalyze = async () => {
    setLoading(true);
    try {
      const issues = await getLastDocumentAnalysis(selectedDoc.id);
      if (!issues || !issues.issues) {
        setIssuesList(null);
        setPendingCount(0);
      } else {
        setIssuesList(issues.issues);
        setPendingCount(computePending(issues.issues));
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para añadir un nuevo comentario
  const handleAddComment = async (text: string) => {
    try {
      const newComment = await createComment(selectedDoc.id, text);
      setComments((prev) => [...prev, newComment]); // Añadir al final
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error; // Re-lanzar para que CommentsPanel pueda manejarlo
    }
  };

  // Función para editar un comentario
  const handleEditComment = async (commentId: string, text: string) => {
    try {
      const updatedComment = await updateComment(commentId, text);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updatedComment : c))
      );
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  };

  // Función para eliminar un comentario
  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  };

  // Función para manejar comentarios recibidos por WebSocket
  const handleCommentReceived = (newComment: Comment) => {
    console.log('📥 Nuevo comentario recibido en DocInfoPanel:', newComment);
    // Verificar si el comentario ya existe (evitar duplicados)
    setComments((prev) => {
      const exists = prev.some(c => c.id === newComment.id);
      if (exists) {
        return prev;
      }
      return [...prev, newComment];
    });
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: "divider",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        overflow: "auto",
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h6" fontWeight={700}>
        {getBaseFilename(selectedDoc.filename)}
      </Typography>
      
      <Box component="div" sx={{ color: 'text.secondary', fontSize: '0.9rem', mb: 1 }}>
        <strong>Versión:</strong> {selectedDoc.version_number ?? 1}
      </Box>
      
      {/* Estado de la sugerencia 
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Estado:
        </Typography>
        <StatusChip status={selectedDoc.status ?? 0} />
      </Stack>*/}
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Estado vencimiento:
        </Typography>
        <StatusVenc status={selectedDoc.due_date ?? 0} />
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Estado normativo:
        </Typography>
        <StatusNorm status={selectedDoc.normative_gap ?? 0} />
      </Stack>

      <Box component="div" sx={{ color: 'text.secondary', fontSize: '1rem', mb: 1 }}>
        <strong>Subido:</strong>{" "}
        {selectedDoc?.created_at
          ? new Date(selectedDoc.created_at).toLocaleString()
          : "—"}
      </Box>

      {issuesList && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" onClick={() => setOpenSugModal(true)} disabled={loading}>
            {loading ? "Cargando" : "Ver sugerencias"}
          </Button>
          <Box component="div" sx={{ color: 'text.secondary', fontSize: '1rem' }}>
            { !loading && pendingCount > 0 ? 
              <Chip 
                label={`${pendingCount} sugerencias pendientes`} 
                color="warning" 
                size="small" 
                variant="outlined"
                sx={{ borderWidth: 2, fontWeight: 600 }}
              />
              :
              <Chip 
                label={`${pendingCount} sugerencias pendientes`} 
                color="success" 
                size="small" 
                variant="outlined"
                sx={{ borderWidth: 2, fontWeight: 600 }}
              />
            }
          </Box>
        </Stack>
      )}
      <Box component="div" sx={{ color: 'text.secondary', fontSize: '1rem', mb: 1 }}>
        <strong>Resumen:</strong>{" "}
        {docSummary ? (
          <Box sx={{ mt: 1, mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {(() => {
              // Asegurar que docSummary sea string
              const resumen = typeof docSummary === 'string' ? docSummary : '';
              const lines: string[] = [];
              const regexes = [
                { label: 'Tipo', rgx: /tipo ([^,]+)/i },
                { label: 'Firmantes', rgx: /firmado entre ([^\.]+)/i },
                { label: 'Empresa Deudor', rgx: /Empresa Deudor: ([^,]+)/i },
                { label: 'Empresa Corredor', rgx: /Empresa Corredor: ([^\.]+)/i },
                { label: 'Fechas', rgx: /Fechas: ([^\.]+)/i },
                { label: 'Condiciones', rgx: /Condiciones: (.+)$/i },
              ];
              regexes.forEach(({ label, rgx }) => {
                const match = resumen.match(rgx);
                if (match) lines.push(`<strong>${label}:</strong> ${match[1].trim()}`);
              });
              // Si no se detecta nada, mostrar el texto original
              if (lines.length === 0) return <span>{resumen}</span>;
              return (
                <Box>
                  {lines.map((l, i) => (
                    <div key={i} dangerouslySetInnerHTML={{ __html: l }} />
                  ))}
                </Box>
              );
            })()}
          </Box>
        ) : <span style={{ color: '#aaa' }}>No disponible</span>}
      </Box>

      {/* ====== Panel de Comentarios ====== */}
      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <CommentsPanel 
          comments={comments} 
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onCommentReceived={handleCommentReceived}
        />
      </Box>

      {/* ====== Modal con toda la lógica de sugerencias ====== */}
      <SuggestionsModal
        open={openSugModal}
        onClose={() => setOpenSugModal(false)}
        loading={loading}
        issues={issuesList ?? []}
        onReanalyze={async () => await reAnalyze()}
        onIssueUpdated={handleIssueUpdated}
        suggestionStatuses={statuses}
        onViewInDocument={onViewInDocument}
      />
    </Paper>
  );
}
