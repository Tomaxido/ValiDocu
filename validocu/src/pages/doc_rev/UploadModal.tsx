import React, { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: FileList) => Promise<void>;
}

export default function UploadModal({ isOpen, onClose, onUpload }: Readonly<Props>) {
  const [fileList, setFileList] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileList((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setFileList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (fileList.length === 0) return;
    const dt = new DataTransfer();
    fileList.forEach(file => dt.items.add(file));
    setIsUploading(true);
    await onUpload(dt.files);
    setIsUploading(false);
    setFileList([]);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Subir documentos</h2>
        <input type="file" multiple onChange={handleFiles} />
        <ul>
          {fileList.map((file, i) => (
            <li key={file.name}>
              {file.name}
              <button onClick={() => removeFile(i)} style={{ marginLeft: "8px" }}>❌</button>
            </li>
          ))}
        </ul>
        <div className="modal-buttons">
          <button onClick={onClose}>Cancelar</button>
          <button onClick={handleSubmit} disabled={isUploading || fileList.length === 0}>
            { isUploading ? "Subiendo..." : "Subir" + (fileList.length > 0 ? ` (${fileList.length})` : "") }
          </button>
        </div>
      </div>
    </div>
  );
}
