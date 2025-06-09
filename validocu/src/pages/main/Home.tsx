import './Home.css';
import { useNavigate } from 'react-router-dom';
import { FolderIcon, PlusIcon, Search, Settings2 } from 'lucide-react';
import { useEffect, useState } from "react";
import { createGroup, getDocumentGroups } from "../../utils/api";
import type { DocumentGroup } from "../../utils/interfaces";
import NewGroupModal from './NewGroupModal';

export default function Home() {
  const navigate = useNavigate();
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

	useEffect(() => {
		const fun = async () => {
			setDocumentGroups(await getDocumentGroups());
		};
		fun();
	}, []);

  const handleFileUpload = async (groupName: string, files: FileList) => {
    try {
      await createGroup(groupName, files);
			setDocumentGroups(await getDocumentGroups());
    } catch (err: any) {
      alert("Error al subir: " + err.message);
    }
  };

	if (documentGroups === null) {
		return <p>Cargando...</p>;
	}
  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <h1>Unidad de: TEST</h1>
        <button className="icon-btn">
          <Settings2 size={20} />
        </button>
      </header>

      {/* Search and Filters */}
      <div className="home-filters">
        <div className="home-search">
          <Search size={18} />
          <input type="text" placeholder="Buscar en ValiDocu" />
        </div>
        <button className="filter-btn">Tipo</button>
        <button className="filter-btn">Personas</button>
        <button className="filter-btn">Modificado</button>
        <button className="filter-btn">Fuente</button>
      </div>

      {/* Botón de nuevo grupo */}
      <button onClick={() => setIsModalOpen(true)} className="add-group-btn">
        <PlusIcon size={24}/> Agregar grupo
      </button>

      <NewGroupModal
        isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
        onUpload={handleFileUpload}
      />

      {/* Folder Grid */}
      <div className="folder-grid">
        {documentGroups.map(group => (
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
