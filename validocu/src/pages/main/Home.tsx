import './Home.css';
import { useNavigate } from 'react-router-dom';
import { FolderIcon, PlusIcon, Search, Settings2 } from 'lucide-react';
import { useEffect, useState } from "react";
import { createGroup, getDocumentGroups } from "../../utils/api";
import type { DocumentGroup } from "../../utils/interfaces";
import { buscarDocumentosPorTexto } from "../../utils/api";

import NewGroupModal from './NewGroupModal';

export default function Home() {
  const navigate = useNavigate();
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);

  useEffect(() => {
    const fun = async () => {
      setDocumentGroups(await getDocumentGroups());
    };
    fun();
  }, []);

  const buscar = async () => {
    if (!query.trim()) {
      setResultados([]);
      return;
    }

    try {
      const data = await buscarDocumentosPorTexto(query);
      setResultados(data);
    } catch (err: any) {
      alert("Error al buscar: " + err.message);
    }
  };

  const handleFileUpload = async (groupName: string, files: FileList) => {
    try {
      await createGroup(groupName, files);
      setDocumentGroups(await getDocumentGroups());
    } catch (err: any) {
      alert("Error al subir: " + err.message);
    }
  };

  if (documentGroups === null) return <p>Cargando...</p>;

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Unidad de: TEST</h1>
        <button className="icon-btn"><Settings2 size={20} /></button>
      </header>

      <div className="home-filters">
        <div className="home-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar en ValiDocu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
          />
        </div>
        <button className="filter-btn">Tipo</button>
        <button className="filter-btn">Personas</button>
        <button className="filter-btn">Modificado</button>
        <button className="filter-btn">Fuente</button>
      </div>

      <button onClick={() => setIsModalOpen(true)} className="add-group-btn">
        <PlusIcon size={24}/> Agregar grupo
      </button>

      <NewGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleFileUpload}
      />

      {/* Resultados IA */}
      {resultados.length > 0 && (
        <div className="search-results">
          <h2>Resultados:</h2>
          <ul className="result-list">
            {resultados.map((res, idx) => (
              <li key={idx} className="result-item">
                <button
                  className="result-link"
                  onClick={() => navigate(`/grupos/${res.document_group_id}/documentos/${res.document_id}`)}
                >
                  📂 {res.group_name} — 📄 {res.document_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grupos visibles si no hay búsqueda activa o si coincide con el nombre */}
      <div className="folder-grid">
        {documentGroups
          .filter(group =>
            !query ||
            group.name.toLowerCase().includes(query.toLowerCase())
          )
          .map(group => (
            <button
              onClick={() => navigate(`/grupos/${group.id}`)}
              key={group.id}
              className="folder-card"
            >
              <FolderIcon size={24} /> {group.name}
            </button>
        ))}
      </div>
    </div>
  );
}
