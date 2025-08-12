import './Home.css';
import { useNavigate } from 'react-router-dom';
import { FolderIcon, PlusIcon, Search, Settings2 } from 'lucide-react';
import { useEffect, useState } from "react";
import { createGroup, getDocumentGroups, buscarDocumentosPorTexto } from "../../utils/api";
import type { DocumentGroup } from "../../utils/interfaces";

import NewGroupModal from './NewGroupModal';

export default function Home() {
  const navigate = useNavigate();
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false); // 👈 NUEVO

  useEffect(() => {
    const fun = async () => {
      setDocumentGroups(await getDocumentGroups());
    };
    fun();
  }, []);

  const buscar = async () => {
    if (!query.trim()) {
      setResultados([]);
      setBusquedaRealizada(false); // 👈 si el texto está vacío, no hay búsqueda real
      return;
    }

    setBuscando(true);
    setBusquedaRealizada(true); // 👈 Se marca como búsqueda ejecutada

    try {
      const data = await buscarDocumentosPorTexto(query);
      setResultados(data);
    } catch (err: any) {
      alert("Error al buscar: " + err.message);
    } finally {
      setBuscando(false);
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
        <h1>Unidad de PMV</h1>
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
        <button onClick={() => setIsModalOpen(true)} className="add-group-btn">
          <PlusIcon size={24}/> Agregar grupo
        </button>
      </div>

      <NewGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleFileUpload}
      />

      {/* Indicador de búsqueda */}
      {buscando && <p style={{ marginLeft: '1rem' }}>🔎 Buscando...</p>}

      {/* Sin resultados SOLO si se hizo búsqueda */}
      {!buscando && busquedaRealizada && resultados.length === 0 && (
        <p style={{ marginLeft: '1rem' }}>❌ No existen resultados</p>
      )}

      {/* Resultados IA en tabla clickeable */}
      {resultados.length > 0 && (
        <div className="search-results">
          <h2>🔍 Resultados encontrados:</h2>
          <div className="table-container">
            <table className="result-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>📂 Grupo</th>
                  <th>📄 Documento</th>
                  <th>🎯 Score</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((res, idx) => (
                  <tr
                    key={idx}
                    className="clickable-row"
                    onClick={() => navigate(`/grupos/${res.document_group_id}`)}
                  >
                    <td>{idx + 1}</td>
                    <td>{res.group_name}</td>
                    <td>{res.document_name}</td>
                    <td>{(res.score * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
