import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, List, ListItem, ListItemText, IconButton
} from "@mui/material";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (groupName: string, files: FileList) => Promise<void>;
}

export default function NewGroupModal({ isOpen, onClose, onUpload }: Readonly<Props>) {
  const [groupName, setGroupName] = useState("");
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
          sx={{ mt: 1 }}
        />

        <Button
          variant="outlined"
          component="label"
          sx={{ mt: 2 }}
        >
          Seleccionar archivos
          <input hidden type="file" multiple onChange={handleFiles} />
        </Button>

        <List dense sx={{ mt: 1 }}>
          {fileList.map((file, i) => (
            <ListItem
              key={`${file.name}-${i}`}
              secondaryAction={
                <IconButton edge="end" onClick={() => removeFile(i)} aria-label="quitar">
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
          disabled={isUploading || fileList.length === 0 || !groupName}
          variant="contained"
          color="primary"
        >
          {isUploading ? "Subiendo..." : "Subir"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
