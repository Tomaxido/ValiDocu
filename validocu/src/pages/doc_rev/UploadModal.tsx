import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, List, ListItem, ListItemText, IconButton
} from "@mui/material";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: FileList) => Promise<void>;
}

export default function UploadModal({ isOpen, onClose, onUpload }: Readonly<Props>) {
  const [fileList, setFileList] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileList(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setFileList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (fileList.length === 0) return;
    const dt = new DataTransfer();
    fileList.forEach(f => dt.items.add(f));
    setIsUploading(true);
    await onUpload(dt.files);
    setIsUploading(false);
    setFileList([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Subir documentos</DialogTitle>
      <DialogContent dividers>
        <Button variant="outlined" component="label">
          Seleccionar archivos
          <input hidden type="file" multiple onChange={handleFiles} />
        </Button>

        <List dense sx={{ mt: 2 }}>
          {fileList.map((file, i) => (
            <ListItem
              key={`${file.name}-${i}`}
              secondaryAction={
                <IconButton edge="end" aria-label="quitar" onClick={() => removeFile(i)}>
                  <X size={16} />
                </IconButton>
              }
            >
              <ListItemText primary={file.name} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          disabled={isUploading || fileList.length === 0}
          variant="contained"
          color="primary"
        >
          {isUploading ? "Subiendo..." : `Subir (${fileList.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
