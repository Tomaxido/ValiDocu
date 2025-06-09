import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: FileList) => void;
}

export default function UploadModal({ isOpen, onClose, onUpload }: Props) {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (selectedFiles) {
      onUpload(selectedFiles);
      setSelectedFiles(null);
    }
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Subir documentos</h2>
        <input type="file" multiple onChange={(e) => setSelectedFiles(e.target.files)} />
        <div className="modal-buttons">
          <button onClick={onClose}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!selectedFiles}>Subir</button>
        </div>
      </div>
    </div>
  );
}
