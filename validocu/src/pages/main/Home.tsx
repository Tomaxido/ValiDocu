import './Home.css';
import { Link } from 'react-router-dom';
import { FolderIcon, Search, Settings2 } from 'lucide-react';

const folders = [
  { id: 1,  name: 'Colab Notebooks' },
  { id: 2, name: 'cosas' },
  { id: 3, name: 'Epson iPrint' },
  { id: 4, name: 'Fotos' },
  { id: 5, name: 'Lvp' },
  { id: 6, name: 'School Planner' },
];

export default function Home() {
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
        {folders.map((folder, idx) => (
          <Link
            to={`/grupos/${folder.id}`}
            key={idx}
            className="folder-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <FolderIcon size={24} />
            <span>{folder.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
