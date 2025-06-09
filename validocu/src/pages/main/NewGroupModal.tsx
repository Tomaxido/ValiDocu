import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (groupName: string, files: FileList) => Promise<void>;
}

export default function NewGroupModal({ isOpen, onClose, onUpload }: Readonly<Props>) {
  const [groupName, setGroupName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (groupName && selectedFiles) {
      await onUpload(groupName, selectedFiles);
      setSelectedFiles(null);
    }
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Nuevo grupo</h2>
        <label>
          Nombre <input type="text" onChange={e => setGroupName(e.target.value)} className="modal-input" />
        </label>
        <input type="file" multiple onChange={(e) => setSelectedFiles(e.target.files)} />
        <div className="modal-buttons">
          <button onClick={onClose}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!selectedFiles}>Subir</button>
        </div>
      </div>
    </div>
  );
}
