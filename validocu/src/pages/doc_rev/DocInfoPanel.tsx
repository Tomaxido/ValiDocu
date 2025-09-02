import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Stack,
  Box,
  Chip,
  Button,
  Badge,
  Tooltip,
} from "@mui/material";
import type { Document, SemanticGroup } from "../../utils/interfaces";

import {
  getLastDocumentAnalysis,
  listSuggestionStatuses,
  type Issue,
  type SuggestionStatus,
  summaryDoc
} from "../../api/analysis";
import SuggestionsModal from "./SuggestionsModal";



interface Props {
  selectedDoc: Document;
  semanticGroupData: SemanticGroup[];
}

function getBaseFilename(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? filename : filename.substring(0, lastDot);
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
  }, [selectedDoc]);

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
      </Stack>
      <Box component="div" sx={{ color: 'text.secondary', fontSize: '1rem', mb: 1 }}>
        <strong>Resumen:</strong>{" "}
        {docSummary ? (
          <Box sx={{ mt: 1, mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {(() => {
              // Formateo simple por campos clave
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
                const match = docSummary.match(rgx);
                if (match) lines.push(`<strong>${label}:</strong> ${match[1].trim()}`);
              });
              // Si no se detecta nada, mostrar el texto original
              if (lines.length === 0) return <span>{docSummary}</span>;
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
