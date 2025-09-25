import { useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Typography,
  Stack,
  TextField,
  Select,
  Menu,
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
  Chip,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { Issue, SuggestionStatus } from "../../api/analysis";
import {
  updateIssueStatusById,
} from "../../api/analysis";
import { exportSuggestionsToExcel, exportSuggestionsToPDF } from "../../utils/summary_export";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ReplayIcon from "@mui/icons-material/Replay";

type Props = {
  open: boolean;
  onClose: () => void;
  issues: Issue[];
  loading?: boolean;
  onReanalyze?: () => void | Promise<void>;
  onIssueUpdated: (issue: Issue) => void;
  suggestionStatuses: SuggestionStatus[],
};

export default function SuggestionsModal({
  open,
  onClose,
  issues,
  loading = false,
  onReanalyze,
  onIssueUpdated,
  suggestionStatuses,
}: Readonly<Props>) {
  const [filter, setFilter] = useState<"ALL" | number>("ALL");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };


  const isDirty = useMemo(() => Object.keys(pending).length > 0, [pending]);

  const labelOf = (statusId?: number | null): string => {
    if (!statusId ||   suggestionStatuses.length === 0) return "—";
    const it = suggestionStatuses.find((s) => s.id === statusId);
    return it?.status || "—";
  };

  const statusIdOfIssue = (issue: Issue): number | null => {
    return typeof issue.status_id === "number" ? issue.status_id : null;
  };

  const todoId = 1;
  const pendingIssues = useMemo(
    () => (todoId ? issues.filter((i) => statusIdOfIssue(i) === todoId).length : 0),
    [issues]
  );

  const handleConfirm = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const entries = Object.entries(pending);
      const results = await Promise.all(
        entries.map(([issueId, statusId]) =>
          updateIssueStatusById(Number(issueId), Number(statusId))
        )
      );
      results.forEach(onIssueUpdated);

      // refrescar listado local
    const updated = issues.map((it) =>
      pending[it.issue_id] ? { ...it, status_id: pending[it.issue_id] } : it
    );
    updated.forEach(onIssueUpdated);
      setPending({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pr: 5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Sugerencias de corrección</Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            {/* Botón Descargar con menú */}
            <Button
              size="small"
              onClick={handleClick}
              disabled={loading || saving}
              startIcon={<DownloadIcon />}
              endIcon={<ArrowDropDownIcon />}
            >
              Descargar
              <Divider orientation="vertical" flexItem sx={{ ml: 1 }} />
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={openMenu}
              onClose={handleClose}
            >
              <MenuItem
                onClick={() => {
                  exportSuggestionsToExcel(issues as any, suggestionStatuses as any);
                  handleClose();
                }}
              >
                Descargar como Excel
              </MenuItem>
              <MenuItem
                onClick={() => {
                  exportSuggestionsToPDF(issues as any, suggestionStatuses as any);
                  handleClose();
                }}
              >
                Descargar como PDF
              </MenuItem>
            </Menu>

            {/* Botón cerrar */}
            <IconButton onClick={onClose} aria-label="cerrar">
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              { pendingIssues > 0 ? 
                <Chip label={`${pendingIssues} sugerencias pendientes`} color="warning" size="small" />
                :
                <Chip label={`${pendingIssues} sugerencias pendientes`} color="success" size="small" />

              }
            </Stack>
            {onReanalyze && (
              <Button
                onClick={onReanalyze} 
                disabled={loading || saving}
                startIcon={<ReplayIcon />}
              >
                {loading ? "Cargando…" : "Re-analizar"}
              </Button>
            )}
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              fullWidth
              size="small"
              label="Buscar campo, tipo, problema o sugerencia…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={saving}
            />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="filter-status-label">Estado</InputLabel>
              <Select
                labelId="filter-status-label"
                label="Estado"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                disabled={saving}
              >
                <MenuItem value="ALL">Todos</MenuItem>
                {suggestionStatuses.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 200 }}>Campo</TableCell>
                <TableCell sx={{ width: 200 }}>Motivo</TableCell>
                <TableCell>Sugerencia</TableCell>
                <TableCell sx={{ width: 220 }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {issues.map((i) => {
                const currentId = statusIdOfIssue(i);
                const pendingId = pending[i.issue_id];
                const value = pendingId ?? currentId ?? "";
                return (
                  <TableRow
                    key={i.issue_id}
                    hover
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {i.label}
                      </Typography>
                    </TableCell>
                    <TableCell>{i.reason === 'missing' ? 'Campo faltante' : 'Campo inválido'}</TableCell>
                    <TableCell>{i.suggestion_template}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={value}
                          displayEmpty
                          renderValue={(v) => (v ? labelOf(Number(v)) : "Seleccionar…")}
                          onChange={(e) => setPending((prev) => ({ ...prev, [i.issue_id]: Number(e.target.value) }))}
                          disabled={saving}
                        >
                          {suggestionStatuses.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                              {s.status}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                );
              })}
              {issues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
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
        <Button onClick={onClose} disabled={saving}>Cerrar</Button>
        <Button
          onClick={async () => {
        await handleConfirm();
        window.location.reload(); // Recargar la página después de confirmar cambios
          }}
          color="secondary"
          disabled={!isDirty || saving}
        >
          {saving ? "Guardando…" : "Confirmar cambios"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
