import { baseURL } from "../../utils/api";
import type { Document } from "../../utils/interfaces";
import "./GroupedImageViewer.css";

interface Props {
  readonly files: readonly Document[];
}

export default function GroupedImageViewer({ files }: Props) {
  if (files.length === 0) {
    return <p>No hay imágenes para mostrar.</p>;
  }

  const sortedFiles = [...files].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="image-viewer-container">
      {sortedFiles.map((doc) => (
        <img
          key={doc.id}
          src={`${baseURL}/secure-pdf/${doc.filepath.split("/").pop()}`}
          alt={doc.filename}
          className="image-viewer-img"
        />
      ))}
    </div>
  );
}
