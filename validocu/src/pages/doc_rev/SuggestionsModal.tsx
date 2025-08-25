import { useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Typography,
  Badge,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { AnalyzeResponse, Issue } from "../../api/analysis";
import { updateIssueStatus } from "../../api/analysis";

type Props = {
  open: boolean;
  onClose: () => void;
  analysis: AnalyzeResponse | null;
  loading?: boolean;
  onReanalyze?: () => void | Promise<void>;
  onIssueUpdated: (issue: Issue) => void;
};

const STATUS_LABEL: Record<Issue["status"], string> = {
  TODO: "Por corregir",
  NO_APLICA: "No aplica",
  RESUELTO: "Resuelto",
};

export default function SuggestionsModal({
  open,
  onClose,
  analysis,
  loading = false,
  onReanalyze,
  onIssueUpdated,
}: Readonly<Props>) {
  const [filter, setFilter] = useState<"ALL" | Issue["status"]>("ALL");
  const [search, setSearch] = useState("");

  const issues = analysis?.issues ?? [];
  const totalIssues = issues.length;
  const pendingIssues = issues.filter((i) => i.status === "TODO").length;

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      const passStatus = filter === "ALL" || i.status === filter;
      const q = search.trim().toLowerCase();
      const source = `${i.field_key} ${i.message} ${i.suggestion ?? ""}`.toLowerCase();
      const passSearch = !q || source.includes(q);
      return passStatus && passSearch;
    });
  }, [issues, filter, search]);

  const handleRowClick = (issue: Issue) => {
    // Resaltar evidencia en el visor
    window.dispatchEvent(new CustomEvent("focus-evidence", { detail: issue.evidence ?? null }));
  };

  const handleChangeStatus = async (issue: Issue, status: Issue["status"]) => {
    const updated = await updateIssueStatus(issue.id, status);
    onIssueUpdated(updated);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 5 }}>
        Sugerencias de corrección
        <IconButton
          aria-label="cerrar"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="row" spacing={2} alignItems="center" justifyItems="center" sx={{ mb: 1 }}>
          <Badge color="warning" badgeContent={totalIssues}>
            <Typography variant="body2" color="text.secondary">
              {pendingIssues} sugerencias pendientes
            </Typography>
            {onReanalyze && 
            <Button onClick={onReanalyze} variant="contained" disabled={loading}>
                {loading ? "Cargando" : "Re-analizar"}
            </Button>
            }
          </Badge>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Tipo: <b>{analysis?.doc_type ?? "—"}</b> · Resumen: {analysis?.summary ?? "—"}
        </Typography>

        {/* Filtros */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Buscar campo, problema o sugerencia…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="filter-status-label">Estado</InputLabel>
            <Select
              labelId="filter-status-label"
              label="Estado"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <MenuItem value="ALL">Todos</MenuItem>
              <MenuItem value="TODO">Por corregir</MenuItem>
              <MenuItem value="NO_APLICA">No aplica</MenuItem>
              <MenuItem value="RESUELTO">Resuelto</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Tabla */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead sx={{ position: "sticky", top: 0, bgcolor: "background.paper", zIndex: 1 }}>
              <TableRow>
                <TableCell sx={{ width: 180 }}>Campo</TableCell>
                <TableCell>Problema</TableCell>
                <TableCell>Sugerencia</TableCell>
                <TableCell sx={{ width: 110 }} align="right">
                  Confianza
                </TableCell>
                <TableCell sx={{ width: 180 }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((i) => (
                <TableRow
                  key={i.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleRowClick(i)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {i.field_key}
                    </Typography>
                  </TableCell>
                  <TableCell>{i.message}</TableCell>
                  <TableCell>{i.suggestion ?? "—"}</TableCell>
                  <TableCell align="right">
                    {i.confidence ? `${(Number(i.confidence) * 100).toFixed(1)}%` : "—"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={i.status}
                        onChange={(e) => handleChangeStatus(i, e.target.value as Issue["status"])}
                      >
                        <MenuItem value="TODO">{STATUS_LABEL.TODO}</MenuItem>
                        <MenuItem value="NO_APLICA">{STATUS_LABEL.NO_APLICA}</MenuItem>
                        <MenuItem value="RESUELTO">{STATUS_LABEL.RESUELTO}</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      align="center"
                      sx={{ py: 2 }}
                    >
                      Sin resultados
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
