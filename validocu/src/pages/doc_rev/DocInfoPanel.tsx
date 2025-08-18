import labelColors from "../../utils/labelColors";
import type { Document } from "../../utils/interfaces";
import {
  Paper, Typography, Stack, Box, Chip, Alert
} from "@mui/material";

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
  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: "divider", maxWidth: 480 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {getBaseFilename(selectedDoc.filename)}
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">Estado:</Typography>
        <StatusChip status={selectedDoc.status ?? 0} />
      </Stack>

      <Typography variant="body2" sx={{ mb: 2 }}>
        <strong>Subido:</strong> {new Date(selectedDoc.created_at).toLocaleString()}
      </Typography>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        Datos detectados por IA
      </Typography>

      <Stack spacing={2}>
        {semanticGroupData.map((item, i) => {
          try {
            const layout = JSON.parse(item.json_layout);
            return (
              <Box key={i} sx={{ pb: 1, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                  Página: {item.filename.match(/_p(\d+)\./)?.[1] || "¿?"}
                </Typography>

                <Stack spacing={1}>
                  {layout.map((campo: any, idx: number) => {
                    const isError = String(campo.label).endsWith("_E");
                    const rawLabel = String(campo.label).replace(/_E$/, "");
                    const displayLabel = rawLabel.replace(/_/g, " ");
                    const color = isError
                      ? "rgba(255, 0, 0, 0.4)"
                      : (labelColors[campo.label] || "rgba(200,200,200,0.4)");

                    return (
                      <Stack key={idx} direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: color }} />
                        <Typography variant="body2">
                          <strong>{displayLabel}:</strong> {campo.text}
                          {isError && <Box component="span" sx={{ color: "error.main" }}> (inválido)</Box>}
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
      </Stack>
    </Paper>
  );
}
