import React, { useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, List, ListItem, ListItemText, IconButton,
  Box, Typography
} from "@mui/material";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (groupName: string, files: FileList) => Promise<void>;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function NewGroupModal({ isOpen, onClose, onUpload }: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [groupName, setGroupName] = useState("");
  const [fileList, setFileList] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const dedupeMerge = (incoming: File[]) => {
    setFileList(prev => {
      const map = new Map<string, File>();
      for (const f of prev) map.set(`${f.name}-${f.size}-${f.lastModified}`, f);
      for (const f of incoming) map.set(`${f.name}-${f.size}-${f.lastModified}`, f);
      return Array.from(map.values());
    });
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) dedupeMerge(files);
    if (inputRef.current) inputRef.current.value = ""; // permitir elegir los mismos archivos después
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) dedupeMerge(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragging) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Evitar "falsos" leave cuando se entra a un hijo
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
    setDragging(false);
  };

  const removeFile = (index: number) => {
    setFileList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!groupName || fileList.length === 0) return;
    const dt = new DataTransfer();
    fileList.forEach(f => dt.items.add(f));
    setIsUploading(true);
    await onUpload(groupName, dt.files);
    setIsUploading(false);
    setFileList([]);
    setGroupName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nuevo grupo</DialogTitle>

      <DialogContent dividers>
        <TextField
          label="Nombre"
          fullWidth
          size="small"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        />

        {/* Dropzone clickeable */}
        <Box
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          tabIndex={0}
          aria-label="Zona para arrastrar o seleccionar archivos"
          sx={(t) => ({
            cursor: "pointer",
            border: "2px dashed",
            borderColor: dragging ? "warning.main" : "divider",
            bgcolor: dragging ? t.palette.action.hover : "background.paper",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            transition: t.transitions.create(["border-color", "background-color"], {
              duration: 150,
              easing: t.transitions.easing.easeInOut,
            }),
            outline: "none",
            "&:focus-visible": {
              boxShadow: `0 0 0 3px ${t.palette.warning.main}33`,
            },
          })}
        >
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
            Arrastra tus archivos aquí
          </Typography>
          <Typography variant="body2" color="text.secondary">
            o haz clic para seleccionar desde tu equipo
          </Typography>

          {/* input oculto para file picker */}
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleInput}
            style={{ display: "none" }}
          />
        </Box>

        {/* Lista de seleccionados */}
        <List dense sx={{ mt: 2 }}>
          {fileList.map((file, i) => (
            <ListItem
              key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
              secondaryAction={
                <IconButton edge="end" onClick={() => removeFile(i)} aria-label="quitar">
                  <X size={16} />
                </IconButton>
              }
            >
              <ListItemText primary={file.name} secondary={formatBytes(file.size)} />
            </ListItem>
          ))}
        </List>

        {fileList.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Aún no has seleccionado archivos.
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          disabled={isUploading || fileList.length === 0 || !groupName}
          variant="contained"
          color="primary"
        >
          {isUploading ? "Subiendo..." : "Crear grupo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
