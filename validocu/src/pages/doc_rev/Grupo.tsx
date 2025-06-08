import { useParams } from 'react-router-dom';

export default function Grupo() {
  const { grupoId } = useParams();

  return (
    <div>
      <h2>Grupo: {grupoId}</h2>

      {/* Aquí podrías cargar los documentos desde backend o mockearlos */}
      <ul>
        <li>Documento 1.pdf</li>
        <li>Documento 2.pdf</li>
        <li>Documento 3.pdf</li>
      </ul>
    </div>
  );
}
