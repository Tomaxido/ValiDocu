import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Chip, Stack, Typography, Divider, Box, Paper,
  Table, TableHead, TableRow, TableCell, TableBody
} from "@mui/material";
import { fetchGroupOverview, type GroupOverviewResponse } from "../../api/summary_excel";

type Props = {
  open: boolean;
  groupId: number;
  onClose: () => void;
  onExportExcel?: () => void;
};

function StatusChip({ v }: { v: 1 | 2 | null }) {
  if (v === 1) return <Chip label="Conforme" color="success" size="small" />;
  if (v === 2) return <Chip label="Inconforme" color="error" size="small" />;
  return <Chip label="Sin procesar" variant="outlined" size="small" />;
}

export default function GroupOverviewModal({ open, groupId, onClose, onExportExcel }: Props) {
  const [data, setData] = useState<GroupOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErr(null);
    fetchGroupOverview(groupId)
      .then(setData)
      .catch((e) => setErr(e?.message ?? "Error"))
      .finally(() => setLoading(false));
  }, [open, groupId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {data ? `Resumen del Grupo: ${data.group_name}` : "Resumen del Grupo"}
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
            <Typography>Cargando…</Typography>
          </Box>
        )}
        {!loading && err && <Typography color="error">{err}</Typography>}

        {!loading && !err && data && (
          <Stack spacing={2}>
            {/* Resumen de Grupo */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Resumen de Grupo</Typography>
              <Stack direction="row" spacing={3} flexWrap="wrap">
                <Typography variant="body2"><b>Fecha de Generación:</b> {new Date(data.generated_at).toLocaleString()}</Typography>
                <Typography variant="body2"><b>Usuario Responsable:</b> {data.responsible_user}</Typography>
              </Stack>
            </Paper>

            {/* Totales */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Totales</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`Total: ${data.totals.total}`} />
                <Chip label={`Conformes: ${data.totals.conforme}`} color="success" />
                <Chip label={`Inconformes: ${data.totals.inconforme}`} color="error" />
                <Chip label={`Sin procesar: ${data.totals.sin_procesar}`} variant="outlined" />
              </Stack>
            </Paper>

            <Divider />

            {/* 1) Documentos obligatorios no encontrados (Pendientes) */}
            <SectionSimple
              title="Documentos obligatorios no encontrados (Pendientes)"
              rows={data.pending_mandatory}
              emptyText="—"
              stateRight
            />

            {/* 2) Documentos que NO se deben analizar */}
            <SectionSimple
              title="Documentos que NO se deben analizar"
              rows={data.not_to_analyze}
              emptyText="—"
              stateRight
            />

            {/* 3) Documentos sin correspondencia en documentos_obligatorios */}
            <SectionSimple
              title="Documentos sin correspondencia en documentos_obligatorios"
              rows={data.unmatched_in_obligatorios}
              emptyText="—"
            />

            {/* 4) Documentos que se deben analizar */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Documentos que se deben analizar
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre Documento</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Observaciones</TableCell>
                    <TableCell align="right">% Cumplimiento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.analyze.length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center">—</TableCell></TableRow>
                  )}
                  {data.analyze.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell><StatusChip v={r.status} /></TableCell>
                      <TableCell>{r.observations ?? ""}</TableCell>
                      <TableCell align="right">
                        {typeof r.compliance_pct === "number" ? `${r.compliance_pct}%` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {onExportExcel && (
          <Button variant="outlined" onClick={onExportExcel}>Exportar a Excel</Button>
        )}
        <Button variant="contained" onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Sección simple con una o dos columnas (nombre y, opcional, estado a la derecha) */
function SectionSimple({
  title,
  rows,
  emptyText,
  stateRight = false,
}: {
  title: string;
  rows: { name: string; state_label?: string }[];
  emptyText: string;
  stateRight?: boolean;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{title}</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nombre Documento</TableCell>
            {stateRight && <TableCell align="right">Estado</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={stateRight ? 2 : 1} align="center">{emptyText}</TableCell></TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.name}>
              <TableCell>{r.name}</TableCell>
              {stateRight && <TableCell align="right">{r.state_label ?? ""}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
