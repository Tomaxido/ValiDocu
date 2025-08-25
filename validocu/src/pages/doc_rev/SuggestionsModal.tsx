import { useEffect, useMemo, useState } from "react";
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
import type { AnalyzeResponse, Issue, SuggestionStatus } from "../../api/analysis";
import { listSuggestionStatuses, updateIssueStatusById } from "../../api/analysis";

type Props = {
  open: boolean;
  onClose: () => void;
  analysis: AnalyzeResponse | null;
  loading?: boolean;
  onReanalyze?: () => void | Promise<void>;
  onIssueUpdated: (issue: Issue) => void;
};

export default function SuggestionsModal({
  open,
  onClose,
  analysis,
  loading = false,
  onReanalyze,
  onIssueUpdated,
}: Readonly<Props>) {
  const [catalog, setCatalog] = useState<SuggestionStatus[]>([]);
  const [filter, setFilter] = useState<"ALL" | number>("ALL");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  const issues = analysis?.issues ?? [];

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const data = await listSuggestionStatuses();
        setCatalog(data);
        setPending({});
      } catch {}
    })();
  }, [open]);

  const isDirty = useMemo(() => Object.keys(pending).length > 0, [pending]);

  const labelOf = (statusId?: number | null): string => {
    if (!statusId) return "—";
    const it = catalog.find((s) => s.id === statusId);
    return it?.status || "—";
  };

  const statusIdOfIssue = (issue: Issue): number | null => {
    if (typeof issue.status_id === "number") return issue.status_id;
    if (issue.status) {
      const match = catalog.find((s) => s.status === issue.status);
      if (match) return match.id;
    }
    return null;
  };

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      const q = search.trim().toLowerCase();
      const source = `${i.field_key} ${i.issue_type} ${i.message} ${i.suggestion ?? ""}`.toLowerCase();
      const passSearch = !q || source.includes(q);

      if (filter === "ALL") return passSearch;

      const sid = statusIdOfIssue(i);
      return passSearch && sid === filter;
    });
  }, [issues, filter, search, catalog]);

  const todoId = useMemo(
    () => catalog.find((s) => s.status === "TODO")?.id,
    [catalog]
  );
  const pendingIssues = useMemo(
    () => (todoId ? issues.filter((i) => statusIdOfIssue(i) === todoId).length : 0),
    [issues, todoId, catalog]
  );
  const totalIssues = issues.length;

  const handleRowClick = (issue: Issue) => {
    window.dispatchEvent(new CustomEvent("focus-evidence", { detail: issue.evidence ?? null }));
  };

  const handleLocalSelect = (issue: Issue, statusId: number) => {
    setPending((prev) => ({ ...prev, [issue.id]: statusId }));
  };

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
      setPending({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
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
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Badge color="warning">
                <Typography variant="body2" color="text.secondary">
                  {pendingIssues} sugerencias pendientes de {totalIssues} en total.
                </Typography>
              </Badge>
            </Stack>
            {onReanalyze && (
              <Button onClick={onReanalyze} variant="contained" disabled={loading || saving}>
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
                {catalog.map((s) => (
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
                <TableCell sx={{ width: 160 }}>Tipo</TableCell>
                <TableCell>Mensaje</TableCell>
                <TableCell>Sugerencia</TableCell>
                <TableCell sx={{ width: 110 }} align="right">
                  Confianza
                </TableCell>
                <TableCell sx={{ width: 220 }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((i) => {
                const currentId = statusIdOfIssue(i);
                const pendingId = pending[i.id];
                const value = pendingId ?? currentId ?? "";
                return (
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
                    <TableCell>{i.issue_type}</TableCell>
                    <TableCell>{i.message}</TableCell>
                    <TableCell>{i.suggestion ?? "—"}</TableCell>
                    <TableCell align="right">
                      {i.confidence != null
                        ? `${(Number(i.confidence) * 100).toFixed(1)}%`
                        : "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={value}
                          displayEmpty
                          renderValue={(v) => (v ? labelOf(Number(v)) : "Seleccionar…")}
                          onChange={(e) => handleLocalSelect(i, Number(e.target.value))}
                          disabled={saving}
                        >
                          {catalog.map((s) => (
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
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
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
          onClick={handleConfirm}
          variant="contained"
          disabled={!isDirty || saving}
        >
          {saving ? "Guardando…" : "Confirmar cambios"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
