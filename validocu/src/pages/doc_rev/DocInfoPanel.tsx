import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Stack,
  Box,
  Chip,
  Alert,
  Button,
  Badge,
  Tooltip,
} from "@mui/material";
import labelColors from "../../utils/labelColors";
import type { BoxAnnotation, Document, SemanticGroup } from "../../utils/interfaces";

import {
  getLastDocumentAnalysis,
  listSuggestionStatuses,
  type Issue,
  type SuggestionStatus,
} from "../../api/analysis";
import SuggestionsModal from "./SuggestionsModal";
import { downloadDocumentSummaryExcel } from "../../api/summary_excel";
import DownloadIcon from "@mui/icons-material/Download";


interface Props {
  selectedDoc: Document;
  semanticGroupData: SemanticGroup[];
}

function getBaseFilename(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? filename : filename.substring(0, lastDot);
}

function StatusChip({ status }: { status: number }) {
  if (status === 1) return <Chip size="small" label="Conforme" color="success" />;
  if (status === 2) return <Chip size="small" label="Inconforme" color="error" />;
  return <Chip size="small" label="Sin revisar" variant="outlined" />;
}

function StatusVenc({ status }: { status: number }) {
  if (status === 2)
    return (
      <Tooltip title="El documento está próximo a vencer. Se recomienda revisar su vigencia y tomar acciones preventivas.">
        <Chip size="small" label="Por Vencer" color="warning" />
      </Tooltip>
    );
  if (status === 1)
    return (
      <Tooltip title="El documento ha vencido. No es válido para uso normativo.">
        <Chip size="small" label="Vencido" color="error" />
      </Tooltip>
    );
  return (
    <Tooltip title="El documento está vigente y es válido para uso normativo.">
      <Chip size="small" label="Vigente" color="success" />
    </Tooltip>
  );
}

function StatusNorm({ status }: { status: number }) {
  if (status === 1)
    return (
      <Tooltip title="El documento presenta observaciones o posibles brechas normativas que requieren atención.">
        <Chip size="small" label="En observación" color="warning" />
      </Tooltip>
    );
  return (
    <Tooltip title="El documento cumple con los requisitos normativos y no presenta brechas.">
      <Chip size="small" label="Sin brechas normativas" color="success" />
    </Tooltip>
  );
}

export default function DocInfoPanel({
  selectedDoc,
}: Readonly<Props>) {
  const [loading, setLoading] = useState(false);
  const [openSugModal, setOpenSugModal] = useState(false);

  const [statuses, setStatuses] = useState<SuggestionStatus[]>([]);
  const [issuesList, setIssuesList] = useState<Issue[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [docSummary, setDocSummary] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const st = await listSuggestionStatuses();
        setStatuses(st);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    console.log("Cambio de documento, id actual", selectedDoc.id);
    reAnalyze();
    // Obtener resumen del documento
    (async () => {
      try {
        const res = await fetch(`/api/v1/document-summary/${selectedDoc.id}`);
        if (res.ok) {
          const data = await res.json();
          setDocSummary(data.summary);
        } else {
          setDocSummary(null);
        }
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
      const next = prev.map((i) => (i.issue_id === issue.issue_id ? issue : i));
      setPendingCount(computePending(next));
      return next;
    });
  };

  const reAnalyze = async () => {
    setLoading(true);
    try {
      const issues = await getLastDocumentAnalysis(selectedDoc.id);

      // console.log()        
      setIssuesList(issues.issues);
      setPendingCount(computePending(issues.issues));
    } finally {
      setLoading(false);
    }
  };

  const focusBoxes = (page: number | null, boxes: number[][] | undefined) => {
    window.dispatchEvent(
      new CustomEvent("focus-evidence", {
        detail: { items: [{ page, boxes: boxes ?? [] }], noScroll: false },
      })
    );
  };

  const hoverBoxes = (page: number | null, boxes: number[][] | undefined) => {
    window.dispatchEvent(
      new CustomEvent("hover-evidence", {
        detail: { items: [{ page, boxes: boxes ?? [] }], noScroll: true },
      })
    );
  };
  const clearHover = () => {
    window.dispatchEvent(new CustomEvent("hover-evidence", { detail: { items: [] } }));
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
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h6" fontWeight={700}>
        {getBaseFilename(selectedDoc.filename)}
      </Typography>
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

      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          size="small"
          variant="contained"
          onClick={() => setOpenSugModal(true)}
          disabled={loading}
        >
          <Badge color="warning" overlap="circular">
            {loading ? "Cargando" : "Ver sugerencias"}
          </Badge>
        </Button>
        
        <Box component="div" sx={{ color: 'text.secondary', fontSize: '1rem' }}>
          { !loading && pendingCount > 0 ? 
            <Chip label={`${pendingCount} sugerencias pendientes`} color="warning" size="small" />
            :
            <Chip label={`${pendingCount} sugerencias pendientes`} color="success" size="small" />
          }
        </Box>
        <Box component="div" sx={{ color: 'text.secondary', fontSize: '1rem', mb: 1 }}>
          <strong>Resumen:</strong>{" "}
          {docSummary ? docSummary : <span style={{ color: '#aaa' }}>No disponible</span>}
        </Box>
      </Stack>

      {/* ====== Modal con toda la lógica de sugerencias ====== */}
      <SuggestionsModal
        open={openSugModal}
        onClose={() => setOpenSugModal(false)}
        loading={loading}
        issues={issuesList}
        onReanalyze={async () => await reAnalyze()}
        onIssueUpdated={handleIssueUpdated}
        suggestionStatuses={statuses}
      />
    </Paper>
  );
}
