import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Select, FormControl, InputLabel, Box, CircularProgress } from "@mui/material";
import { getDocumentGroups, addDocumentsToGroup, createGroupWithDocuments } from "../utils/api";
import type { DocumentGroup } from "../utils/interfaces";

export default function AddToGroupModal({
  open,
  onClose,
  documentIds,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  documentIds: number[];
  onDone: () => void;
}) {
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const g = await getDocumentGroups();
      setGroups(g);
    })();
  }, [open]);

  const handleAddToExisting = async () => {
    if (!selectedGroupId) return;
    setLoading(true);
    try {
      await addDocumentsToGroup(selectedGroupId, documentIds);
      onDone();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      await createGroupWithDocuments(newGroupName.trim(), false, documentIds);
      onDone();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Añadir documentos seleccionados a grupo</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: "flex", gap: 2, flexDirection: "column" }}>
          <FormControl fullWidth size="small">
            <InputLabel id="existing-group-label">Grupo existente</InputLabel>
            <Select
              labelId="existing-group-label"
              value={selectedGroupId ?? ""}
              label="Grupo existente"
              onChange={(e) => setSelectedGroupId(Number(e.target.value))}
            >
              <MenuItem value="">
                <em>Seleccionar...</em>
              </MenuItem>
              {groups.map(g => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ textAlign: "center", color: "text.secondary" }}>— o —</Box>

          <TextField
            size="small"
            label="Crear nuevo grupo y mover documentos"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading || creating}>Cancelar</Button>
        <Button onClick={handleAddToExisting} disabled={!selectedGroupId || loading} variant="contained">
          {loading ? <CircularProgress size={18} /> : "Agregar a grupo existente"}
        </Button>
        <Button onClick={handleCreateAndAdd} disabled={!newGroupName.trim() || creating} variant="outlined">
          {creating ? <CircularProgress size={18} /> : "Crear grupo y mover"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}