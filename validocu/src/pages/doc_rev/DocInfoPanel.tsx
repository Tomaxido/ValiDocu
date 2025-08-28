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
} from "@mui/material";
import labelColors from "../../utils/labelColors";
import type { Document } from "../../utils/interfaces";

import {
  getLastDocumentAnalysis,
  listSuggestionStatuses,
  type Issue,
  type SuggestionStatus,
} from "../../api/analysis";
import SuggestionsModal from "./SuggestionsModal";
import { downloadDocumentSummaryExcel } from "../../api/summary_excel";


interface Props {
  selectedDoc: Document;
  semanticGroupData: any[];
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

export default function DocInfoPanel({
  selectedDoc,
  semanticGroupData,
}: Readonly<Props>) {
  const [loading, setLoading] = useState(false);
  const [openSugModal, setOpenSugModal] = useState(false);

  const [statuses, setStatuses] = useState<SuggestionStatus[]>([]);
  const [issuesList, setIssuesList] = useState<Issue[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

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

      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Estado:
        </Typography>
        <StatusChip status={selectedDoc.status ?? 0} />
      </Stack>

      <Typography variant="body2">
        <strong>Subido:</strong>{" "}
        {selectedDoc?.created_at
          ? new Date(selectedDoc.created_at).toLocaleString()
          : "—"}
      </Typography>

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
        
        <Typography variant="body2" color="text.secondary">
          { !loading && pendingCount > 0 ? 
            <Chip label={`${pendingCount} sugerencias pendientes`} color="warning" size="small" />
            :
            <Chip label={`${pendingCount} sugerencias pendientes`} color="success" size="small" />
          }
        </Typography>
      </Stack>
      {/* ====== Generación de Documento Resumen (HdU 05) ====== */}
      <Button
        variant="outlined"
        color="primary"
        sx={{ mb: 2,  maxWidth: 280}}
        onClick={() => {
          if (selectedDoc?.id) {
            downloadDocumentSummaryExcel(selectedDoc.id);
          }
        }}
      >
        Generar Documento Resumen
      </Button>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>
        Datos detectados por IA
      </Typography>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 1 }}>
        {semanticGroupData.map((item, i) => {
          try {
            const layout = JSON.parse(item.json_layout);
            const pageStr = item.filename?.match(/_p(\d+)\./)?.[1] || null;
            const page = pageStr ? parseInt(pageStr, 10) : null;

            return (
              <Box
                key={i}
                sx={{ pb: 1, mb: 1, borderBottom: 1, borderColor: "divider" }}
              >
                <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                  Página: {pageStr ?? "¿?"}
                </Typography>

                <Stack spacing={1}>
                  {layout.map((campo: any, idx: number) => {
                    const isError =
                      typeof campo.label === "string" &&
                      campo.label.endsWith("_E");
                    const rawLabel = String(campo.label ?? "").replace(/_E$/, "");
                    const displayLabel = rawLabel.replace(/_/g, " ");
                    const color = isError
                      ? "rgba(255, 0, 0, 0.4)"
                      : labelColors[campo.label] || "rgba(200,200,200,0.4)";

                    return (
                      <Stack
                        key={idx}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        role="button"
                        tabIndex={0}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                          borderRadius: 1,
                          px: 0.5,
                          py: 0.25,
                        }}
                        onClick={() => focusBoxes(page, campo.boxes)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            focusBoxes(page, campo.boxes);
                          }
                        }}
                        onMouseEnter={() => hoverBoxes(page, campo.boxes)}
                        onMouseLeave={clearHover}
                        title="Click para resaltar en el documento"
                      >
                        <Box
                          sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: color }}
                        />
                        <Typography variant="body2">
                          <strong>{displayLabel}:</strong> {campo.text}
                          {isError && (
                            <Box component="span" sx={{ color: "error.main" }}>
                              {" "}
                              (inválido)
                            </Box>
                          )}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            );
          } catch {
            return (
              <Alert key={i} severity="warning">
                ⚠️ Error al procesar datos IA
              </Alert>
            );
          }
        })}
      </Box>

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
