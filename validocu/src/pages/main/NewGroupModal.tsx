import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (groupName: string, files: FileList) => Promise<void>;
}

export default function NewGroupModal({ isOpen, onClose, onUpload }: Readonly<Props>) {
  const [groupName, setGroupName] = useState("");
  const [fileList, setFileList] = useState<File[]>([]);

  if (!isOpen) return null;
  
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileList((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setFileList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!groupName || fileList.length === 0) return;
    const dt = new DataTransfer();
    fileList.forEach(file => dt.items.add(file));
    await onUpload(groupName, dt.files);
    setFileList([]);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Nuevo grupo</h2>
        <label>
          Nombre <input type="text" onChange={e => setGroupName(e.target.value)} className="modal-input" />
        </label>
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
          <button onClick={handleSubmit} disabled={fileList.length === 0}>Subir</button>
        </div>
      </div>
    </div>
  );
}
