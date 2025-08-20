import { useEffect, useState } from "react";
import labelColors from "../../utils/labelColors";
import type { Document } from "../../utils/interfaces";

import SuggestionsPanel from "../../components/SuggestionsPanel";
import { analyzeDocument, type AnalyzeResponse, type Issue } from "../../api/analysis";

interface Props {
  selectedDoc: Document;
  semanticGroupData: any[];
}

function getBaseFilename(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return filename;
  return filename.substring(0, lastDot);
}

function getDocumentStatus(docStatus: number): string {
  if (docStatus === 1) return "✅ Conforme";
  if (docStatus === 2) return "❌ Inconforme";
  return "🕓 Sin Revisar";
}

export default function DocInfoPanel({ selectedDoc, semanticGroupData }: Readonly<Props>) {
  // ↓ estado para las sugerencias (HdU 04)
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Llama al análisis cuando cambia el doc
  useEffect(() => {
    if (!selectedDoc?.id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await analyzeDocument(selectedDoc?.id);
        setAnalysis(res);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDoc?.id]);

  const handleIssueUpdated = (issue: Issue) => {
    setAnalysis((prev) =>
      prev ? { ...prev, issues: prev.issues.map((i) => (i.id === issue.id ? issue : i)) } : prev
    );
  };

  // helper para hacer focus desde este panel
  const focusBoxes = (page: number | null, boxes: number[][] | undefined) => {
    window.dispatchEvent(
      new CustomEvent("focus-evidence", {
        detail: { items: [{ page, boxes: boxes ?? [] }] }, // page suele venir 1-indexada en tu filename
      })
    );
  };

  return (
    <div className="doc-info">
      <h3>{getBaseFilename(selectedDoc.filename)}</h3>
      <p>
        <strong>Estado:</strong> {getDocumentStatus(selectedDoc.status)}
      </p>
      <p>
        <strong>Subido:</strong> {new Date(selectedDoc.created_at).toLocaleString()}
      </p>

      {/* ====== Datos detectados por IA ====== */}
      <h2 className="text-lg font-bold mb-2">Datos detectados por IA</h2>
      {semanticGroupData.map((item, i) => {
        const pageStr = item.filename.match(/_p(\d+)\./)?.[1] || null;
        const page = pageStr ? parseInt(pageStr, 10) : null; // 1,2,3... (el visor convierte a 0-index si hace falta)

        return (
          <div key={i} className="mb-4 border-b pb-2">
            <p className="font-semibold text-sm mb-1">Página: {pageStr ?? "¿?"}</p>
            <div className="text-xs whitespace-pre-wrap space-y-1">
              {(() => {
                try {
                  const layout = JSON.parse(item.json_layout);
                  return layout.map((campo: any, idx: number) => {
                    const isError = typeof campo.label === "string" && campo.label.endsWith("_E");
                    const rawLabel = (campo.label || "").replace(/_E$/, "");
                    const displayLabel = rawLabel.replace(/_/g, " ");
                    const color = isError
                      ? "rgba(255, 0, 0, 0.4)"
                      : (labelColors[campo.label] || "rgba(200, 200, 200, 0.4)");

                    return (
                      <div
                        key={idx}
                        className="text-info-block cursor-pointer"
                        onClick={() => focusBoxes(page, campo.boxes)}
                        title="Click para resaltar en el documento"
                      >
                        <span className="color-box" style={{ backgroundColor: color }} />
                        <strong>{displayLabel}:</strong>&nbsp;{campo.text}
                        {isError && <span className="text-red-600"> (inválido)</span>}.
                      </div>
                    );
                  });
                } catch (e) {
                  return <p className="text-red-500">⚠️ Error al procesar datos IA</p>;
                }
              })()}
            </div>
          </div>
        );
      })}

      {/* ====== Sugerencias de corrección (HdU 04) ====== */}
      <div className="mt-4 border rounded-lg p-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Sugerencias de corrección</h2>
          <button
            className="border rounded px-2 py-1"
            onClick={async () => {
              if (!selectedDoc?.id) return;
              setLoading(true);
              try {
                const res = await analyzeDocument(selectedDoc.id);
                setAnalysis(res);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading ? "Analizando…" : "Re-analizar"}
          </button>
        </div>

        {/* Info breve del análisis */}
        <p className="text-xs text-gray-500 mb-2">
          Tipo: <b>{analysis?.doc_type ?? "—"}</b> · Resumen: {analysis?.summary ?? "—"}
        </p>

        {/* La tabla */}
        <SuggestionsPanel issues={analysis?.issues ?? []} onIssueUpdated={handleIssueUpdated} />
      </div>
    </div>
  );
}
