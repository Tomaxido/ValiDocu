import { useEffect, useState } from "react";
import { Paper, Typography, Stack, Box, Chip, Alert, Button } from "@mui/material";
import labelColors from "../../utils/labelColors";
import type { Document } from "../../utils/interfaces";

import SuggestionsPanel from "../../components/SuggestionsPanel";
import { analyzeDocument, getLastDocumentAnalysis, type AnalyzeResponse, type Issue } from "../../api/analysis";

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

export default function DocInfoPanel({ selectedDoc, semanticGroupData }: Readonly<Props>) {
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Ejecuta análisis al cambiar el documento
  useEffect(() => {
    if (!selectedDoc?.id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await getLastDocumentAnalysis(selectedDoc.id);
        console.log("resultado de ultimo analisis",res);
        setAnalysis(res);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDoc?.id]);

  const handleIssueUpdated = (issue: Issue) => {
    setAnalysis((prev) =>
      prev ? { ...prev, issues: prev.issues.map((i) => (i.id === issue.id ? issue : i)) } : prev
    );
  };

  const reAnalyze = async (documentId: number) => {
    if (!documentId) return;

    setLoading(true);
    try {
      const res = await analyzeDocument(documentId);
      setAnalysis(res);
    } catch (err) {
      console.error("Error en reAnalyze:", err);
      alert("Hubo un error al re-analizar el documento");
    } finally {
      setLoading(false);
    }
  };

  // Click → foco persistente (con scroll)
  const focusBoxes = (page: number | null, boxes: number[][] | undefined) => {
    window.dispatchEvent(
      new CustomEvent("focus-evidence", {
        detail: { items: [{ page, boxes: boxes ?? [] }], noScroll: false },
      })
    );
  };

  // Hover → resalta sin scroll
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
        {selectedDoc?.created_at ? new Date(selectedDoc.created_at).toLocaleString() : "—"}
      </Typography>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>
        Datos detectados por IA
      </Typography>

      {/* Zona scrollable */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 1 }}>
        {semanticGroupData.map((item, i) => {
          try {
            const layout = JSON.parse(item.json_layout);
            const pageStr = item.filename?.match(/_p(\d+)\./)?.[1] || null;
            const page = pageStr ? parseInt(pageStr, 10) : null;

            return (
              <Box key={i} sx={{ pb: 1, mb: 1, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                  Página: {pageStr ?? "¿?"}
                </Typography>

                <Stack spacing={1}>
                  {layout.map((campo: any, idx: number) => {
                    const isError =
                      typeof campo.label === "string" && campo.label.endsWith("_E");
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
                        <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: color }} />
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
            return <Alert key={i} severity="warning">⚠️ Error al procesar datos IA</Alert>;
          }
        })}
      </Box>

      {/* ====== Sugerencias de corrección ====== */}
      <Box
        sx={{
          mt: 1,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          p: 2,
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Sugerencias de corrección
          </Typography>

          <Button
            size="small"
            variant="outlined"
            onClick={async () => await reAnalyze(selectedDoc?.id)}
            disabled={loading}
          >
            {loading ? "Cargando" : "Re-analizar"}
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Tipo: <b>{analysis?.doc_type ?? "—"}</b> · Resumen: {analysis?.summary ?? "—"}
        </Typography>

        <SuggestionsPanel issues={analysis?.issues ?? []} onIssueUpdated={handleIssueUpdated} />
      </Box>
    </Paper>
  );
}
