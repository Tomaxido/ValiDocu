import { useMemo, useState } from "react";
import type { Document } from "../../utils/interfaces";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, List, ListItem, ListItemIcon, ListItemText,
  Checkbox, Stack, Chip
} from "@mui/material";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  onDelete: (ids: number[]) => Promise<void>;
}

// Base: "contrato.pdf" -> "contrato"; "contrato_p1.png" -> "contrato"
function getBaseName(filename: string): string {
  const lower = filename.toLowerCase();
  const imgMatch = /^(.+?)_p\d+\.(png|jpe?g|webp)$/i.exec(lower);
  if (imgMatch) return imgMatch[1];
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(0, dot) : lower;
}
const isPdf = (name: string) => /\.pdf$/i.test(name);

type Group = {
  key: string;
  pdf: Document;
  images: Document[];
  allIds: number[];
};

export default function DeleteModal({ isOpen, onClose, documents, onDelete }: Readonly<Props>) {
  const groups = useMemo<Group[]>(() => {
    const byBase = new Map<string, { pdf?: Document; images: Document[] }>();

    for (const doc of documents) {
      const base = getBaseName(doc.filename);
      if (!byBase.has(base)) byBase.set(base, { images: [] });
      const bucket = byBase.get(base)!;
      if (isPdf(doc.filename)) bucket.pdf = doc;
      else bucket.images.push(doc);
    }

    const result: Group[] = [];
    for (const [base, { pdf, images }] of byBase.entries()) {
      if (!pdf) continue; // Mostrar solo PDFs
      result.push({
        key: base,
        pdf,
        images,
        allIds: [pdf.id, ...images.map(i => i.id)],
      });
    }

    result.sort((a, b) => a.pdf.filename.localeCompare(b.pdf.filename, undefined, { numeric: true }));
    return result;
  }, [documents]);

  // Selección por grupo (PDF)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelection = (groupKey: string) => {
    setSelectedKeys(prev =>
      prev.includes(groupKey) ? prev.filter(k => k !== groupKey) : [...prev, groupKey]
    );
  };

  const allChecked = selectedKeys.length === groups.length && groups.length > 0;
  const toggleSelectAll = () => {
    setSelectedKeys(allChecked ? [] : groups.map(g => g.key));
  };

  // Contar SOLO PDFs
  const totalPdfsToDelete = selectedKeys.length;

  const handleDelete = async () => {
    if (selectedKeys.length === 0) return;
    const ids = groups
      .filter(g => selectedKeys.includes(g.key))
      .flatMap(g => g.allIds); // borra pdf + imágenes asociadas

    setIsDeleting(true);
    await onDelete(ids);
    setIsDeleting(false);
    setSelectedKeys([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Selecciona documentos a eliminar</DialogTitle>

      <DialogContent dividers>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Button size="small" variant="outlined" onClick={toggleSelectAll}>
            {allChecked ? "Deseleccionar todos" : "Seleccionar todos"}
          </Button>

          {/* Solo un contador: PDFs a eliminar */}
          <Chip
            size="small"
            color={totalPdfsToDelete > 0 ? "warning" : "default"}
            label={`${totalPdfsToDelete} archivo(s) a eliminar`}
            variant="outlined"
          />
        </Stack>

        {/* Lista SOLO de PDFs */}
        <List dense>
          {groups.map((g) => {
            const checked = selectedKeys.includes(g.key);
            return (
              <ListItem
                key={g.key}
                onClick={() => toggleSelection(g.key)}
                sx={{ cursor: "pointer" }}
                secondaryAction={null}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={checked}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ "aria-label": `Seleccionar ${g.pdf.filename}` }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={g.pdf.filename}
                />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleDelete}
          disabled={isDeleting || selectedKeys.length === 0}
          color="error"
        >
          {isDeleting
            ? "Eliminando..."
            : `Eliminar seleccionados (${totalPdfsToDelete})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
