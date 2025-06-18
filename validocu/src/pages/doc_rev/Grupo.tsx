import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDocumentGroupById, uploadDocumentsToGroup, deleteDocuments } from "../../utils/api";
import type { DocumentGroup, Document, GroupedDocument } from "../../utils/interfaces";
import UploadModal from "./UploadModal";
import DeleteModal from "./DeleteModal";
import GroupedImageViewer from "./GroupedImageViewer";
import DocInfoPanel from "./DocInfoPanel";
import "./Grupo.css";

function groupDocuments(documents: Document[]): GroupedDocument[] {
  const pdfs = documents.filter((doc) => doc.filename.toLowerCase().endsWith(".pdf"));
  const images = documents.filter((doc) => !doc.filename.toLowerCase().endsWith(".pdf"));

  const groups: { [key: string]: Document[] } = {};

  for (const doc of images) {
    const match = /^(.+?)_p\d+\.(png|jpg|jpeg)$/i.exec(doc.filename);
    const key = match ? match[1] : doc.filename;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(doc);
  }

  return Object.entries(groups).map(([key, imgs]) => {
    const matchingPdf = pdfs.find((pdf) => pdf.filename.toLowerCase().startsWith(key.toLowerCase()));
    return {
      name: key,
      images: imgs,
      pdf: matchingPdf,
    };
  });
}

export default function Grupo() {
  const { grupoId } = useParams<{ grupoId: string }>();
  const [group, setGroup] = useState<DocumentGroup | null>(null);
  const [groupedDocs, setGroupedDocs] = useState<GroupedDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [semanticGroupData, setSemanticGroupData] = useState<any[]>([]);

  const fetchSemanticGroupData = async (groupFiles: Document[]) => {
    const ids = groupFiles.map(doc => doc.id);

    const res = await fetch(`http://localhost:8000/api/v1/semantic-data/by-filenames`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids })
    });

    const data = await res.json();
    setSemanticGroupData(data);
  };

  useEffect(() => {
    if (grupoId) {
      getDocumentGroupById(grupoId).then((g) => {
        console.log("Archivos recibidos:", g);
        setGroup(g);
        const grouped = groupDocuments(g.documents);
        setGroupedDocs(grouped);
        if (grouped.length > 0 && grouped[0].pdf) {
          setSelectedDoc(grouped[0].pdf);
          fetchSemanticGroupData(grouped[0].images);
        }
      });
    }
  }, [grupoId]);

  if (!group) return <p>Cargando grupo...</p>;

  const handleFileUpload = async (files: FileList) => {
    if (!grupoId) return;
    try {
      await uploadDocumentsToGroup(grupoId, files);
      const updatedGroup = await getDocumentGroupById(grupoId);
      setGroup(updatedGroup);
      const grouped = groupDocuments(updatedGroup.documents);
      setGroupedDocs(grouped);
      const lastPdf = grouped.at(-1)?.pdf;
      setSelectedDoc(lastPdf || null);
    } catch (err: any) {
      alert("Error al subir: " + err.message);
    }
  };

  const handleDeleteDocuments = async (ids: number[]) => {
    if (!grupoId) return;
    try {
      await deleteDocuments(ids);
      const updatedGroup = await getDocumentGroupById(grupoId);
      setGroup(updatedGroup);
      const grouped = groupDocuments(updatedGroup.documents);
      setGroupedDocs(grouped);
      const firstPdf = grouped[0]?.pdf;
      setSelectedDoc(firstPdf || null);
    } catch (err: any) {
      alert("Error al eliminar documentos: " + err.message);
    }
  };

  return (
    <div className="grupo-layout">
      <aside className={`grupo-sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <button className="toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? "◀" : "▶"}
        </button>
        {sidebarOpen && (
          <>
            <br />
            <h3>Grupo: {group.name}</h3>
            <h3>Listado de Documentos</h3>
            <ul>
              <p><button onClick={() => setIsModalOpen(true)}>+ Añadir documento</button></p>
              {groupedDocs.map((grouped) => {
                const statusClass =
                  grouped.pdf?.status === 1
                    ? "validado"
                    : grouped.pdf?.status === 2
                    ? "rechazado"
                    : "sin-procesar";

                return (
                  <li key={grouped.name} className={`doc-item ${statusClass}`}>
                    <button
                      onClick={() => {
                        if (grouped.pdf) {
                          setSelectedDoc(grouped.pdf);
                          fetchSemanticGroupData(grouped.images);
                        }
                      }}
                      className={selectedDoc?.id === grouped.pdf?.id ? "active" : ""}
                    >
                      {grouped.name}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p>
              <button onClick={() => setDeleteModalOpen(true)}>🗑 Eliminar documentos</button>
            </p>
          </>
        )}
      </aside>

      <div className="grupo-content">
        {selectedDoc ? (
          <div className="viewer-grid">
            <div className="pdf-viewer">
              <GroupedImageViewer
                files={groupedDocs.find(g => g.pdf?.id === selectedDoc.id)?.images || [selectedDoc]}
              />
            </div>
            <DocInfoPanel selectedDoc={selectedDoc} semanticGroupData={semanticGroupData} />
          </div>
        ) : (
          <p>Selecciona un documento para ver su contenido.</p>
        )}
      </div>

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleFileUpload}
      />
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        documents={group.documents}
        onDelete={handleDeleteDocuments}
      />
    </div>
  );
}
