import { useMemo, useState } from 'react';
import type { Issue } from '../api/analysis';
import { updateIssueStatus } from '../api/analysis';

type Props = {
  issues: Issue[];
  onIssueUpdated?: (issue: Issue) => void;
};

const STATUS_LABEL: Record<Issue['status'], string> = {
  TODO: 'Por corregir',
  NO_APLICA: 'No aplica',
  RESUELTO: 'Resuelto',
};

export default function SuggestionsPanel({ issues, onIssueUpdated }: Props) {
  const [filter, setFilter] = useState<'ALL' | Issue['status']>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return issues.filter(i => {
      const passStatus = filter === 'ALL' || i.status === filter;
      const q = search.trim().toLowerCase();
      const passSearch = !q || `${i.field_key} ${i.message} ${i.suggestion ?? ''}`.toLowerCase().includes(q);
      return passStatus && passSearch;
    });
  }, [issues, filter, search]);

  const handleRowClick = (issue: Issue) => {
    // Dispara evento global para que el visor resalte bbox
    window.dispatchEvent(new CustomEvent('focus-evidence', { detail: issue.evidence ?? null }));
  };

  const handleChangeStatus = async (issue: Issue, status: Issue['status']) => {
    const updated = await updateIssueStatus(issue.id, status);
    onIssueUpdated?.(updated);
  };

  return (
    <div className="w-full h-full flex flex-col border rounded-lg overflow-hidden">
      <div className="p-3 flex gap-2 border-b items-center bg-white">
        <input
          className="border rounded px-2 py-1 w-full"
          placeholder="Buscar campo, problema o sugerencia…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-2 py-1"
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
        >
          <option value="ALL">Todos</option>
          <option value="TODO">Por corregir</option>
          <option value="NO_APLICA">No aplica</option>
          <option value="RESUELTO">Resuelto</option>
        </select>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left p-2 w-40">Campo</th>
              <th className="text-left p-2">Problema</th>
              <th className="text-left p-2">Sugerencia</th>
              <th className="text-left p-2 w-40">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(i)}>
                <td className="p-2 font-medium">{i.field_key}</td>
                <td className="p-2">{i.message}</td>
                <td className="p-2">{i.suggestion ?? '—'}</td>
                <td className="p-2 text-right">
                  {i.confidence ? `${(Number(i.confidence) * 100).toFixed(1)}%` : '—'}
                </td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={i.status}
                    onChange={e => handleChangeStatus(i, e.target.value as any)}
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="TODO">{STATUS_LABEL.TODO}</option>
                    <option value="NO_APLICA">{STATUS_LABEL.NO_APLICA}</option>
                    <option value="RESUELTO">{STATUS_LABEL.RESUELTO}</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
