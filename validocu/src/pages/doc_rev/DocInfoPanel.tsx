import labelColors from "../../utils/labelColors";
import type { Document } from "../../utils/interfaces";

interface Props {
  selectedDoc: Document;
  semanticGroupData: any[];
}

function getBaseFilename(filename: string): string {
  const lastUnderscore = filename.lastIndexOf("_");
  if (lastUnderscore === -1) return filename;
  return filename.substring(0, lastUnderscore);
}

function getDocumentStatus(docStatus: number): string {
    if(docStatus === 1){
        return "✅ Validado";
    }
    else if(docStatus === 2){
        return "❌ Rechazado";
    }
    return "🕓 Sin Revisar";
}

export default function DocInfoPanel({ selectedDoc, semanticGroupData }: Readonly<Props>) {
  return (
    <div className="doc-info">
      <h3>{getBaseFilename(selectedDoc.filename)}</h3>
      <p>
        <strong>Estado:</strong>{" "}
        {getDocumentStatus(selectedDoc.status)}
      </p>
      <p>
        <strong>Subido:</strong> {new Date(selectedDoc.created_at).toLocaleString()}
      </p>

      <h2 className="text-lg font-bold mb-2">Datos detectados por IA</h2>
      {semanticGroupData.map((item, i) => (
        <div key={i} className="mb-4 border-b pb-2">
          <p className="font-semibold text-sm mb-1">
            Página: {item.filename.match(/_p(\d+)\./)?.[1] || "¿?"}
          </p>
          <pre className="text-xs whitespace-pre-wrap">
            <div className="text-xs whitespace-pre-wrap space-y-1">
              {(() => {
                try {
                  const layout = JSON.parse(item.json_layout);
                  return layout.map((campo: any, i: number) => {
                    const label = campo.label;
                    const color = label.endsWith("_E")
                      ? "rgba(255, 0, 0, 0.4)"
                      : labelColors[label] || "rgba(200, 200, 200, 0.4)";

                    return (
                      <div key={i} className="text-info-block">
                        <span className="color-box" style={{ backgroundColor: color }} />
                        <strong>{campo.label}:</strong>&nbsp;{campo.text}
                      </div>
                    );
                  });
                } catch (e) {
                  return <p className="text-red-500">⚠️ Error al procesar datos IA</p>;
                }
              })()}
            </div>
          </pre>
        </div>
      ))}
    </div>
  );
}
