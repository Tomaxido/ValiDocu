import { useState } from "react";
import type { Document } from "../../utils/interfaces";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  onDelete: (ids: number[]) => Promise<void>;
}

export default function DeleteModal({ isOpen, onClose, documents, onDelete }: Readonly<Props>) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDelete = () => {
    if (selectedIds.length > 0) {
      setIsDeleting(true);
      onDelete(selectedIds);
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Selecciona documentos a eliminar</h2>
        <ul>
          {documents.map((doc) => (
            <li key={doc.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(doc.id)}
                  onChange={() => toggleSelection(doc.id)}
                />
                {doc.filename}
              </label>
            </li>
          ))}
        </ul>
        <div className="modal-buttons">
          <button onClick={onClose}>Cancelar</button>
          <button onClick={handleDelete} disabled={isDeleting || selectedIds.length === 0}>
            { isDeleting ? "Eliminando..." : "Eliminar seleccionados" }
          </button>
        </div>
      </div>
    </div>
  );
}
