import './Home.css';
import { Link } from 'react-router-dom';
import { FolderIcon, Search, Settings2 } from 'lucide-react';
import { useEffect, useState } from "react";
import { getDocumentGroups } from "../../utils/api";
import type { DocumentGroup } from "../../utils/interfaces";

export default function Home() {
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[] | null>(null);

	useEffect(() => {
		const fun = async () => {
			setDocumentGroups(await getDocumentGroups());
		};
		fun();
	}, []);

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

      {/* Folder Grid */}
      <div className="folder-grid">
        {documentGroups.map((group, idx) => (
          <Link
            to={`/grupos/${group.id}`}
            key={idx}
            className="folder-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <FolderIcon size={24} />
            <span>{group.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
