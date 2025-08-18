import { useState } from "react";
import type { Document } from "../../utils/interfaces";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, List, ListItem, ListItemIcon, ListItemText, Checkbox, Stack
} from "@mui/material";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  onDelete: (ids: number[]) => Promise<void>;
}

export default function DeleteModal({ isOpen, onClose, documents, onDelete }: Readonly<Props>) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    await onDelete(selectedIds);
    setIsDeleting(false);
    setSelectedIds([]);
    onClose();
  };

  const allChecked = selectedIds.length === documents.length && documents.length > 0;

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Selecciona documentos a eliminar</DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setSelectedIds(allChecked ? [] : documents.map(d => d.id))}
          >
            {allChecked ? "Deseleccionar todos" : "Seleccionar todos"}
          </Button>
        </Stack>
        <List dense>
          {documents.map((doc) => {
            const checked = selectedIds.includes(doc.id);
            return (
              <ListItem
                key={doc.id}
                onClick={() => toggleSelection(doc.id)}
                sx={{ cursor: "pointer" }}
                secondaryAction={null}
              >
                <ListItemIcon>
                  <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                </ListItemIcon>
                <ListItemText primary={doc.filename} />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleDelete}
          disabled={isDeleting || selectedIds.length === 0}
          variant="contained"
          color="error"
        >
          {isDeleting ? "Eliminando..." : `Eliminar seleccionados (${selectedIds.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
