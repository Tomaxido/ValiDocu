import { useEffect, useRef, useState } from "react";
import { baseURL } from "../../utils/api";
import type { BoxAnnotation, GroupedImageViewerProps } from "../../utils/interfaces";
import labelColors from "../../utils/labelColors.ts";
import "./GroupedImageViewer.css";

// 🔸 Cada elemento del array representa las anotaciones de una página
const hardcodedAnnotations: BoxAnnotation[][] = [
  [
    {
      label: "TIPO_DOCUMENTO",
      text: "DOCUMENTO DE ACUERDO",
      boxes: [[131, 154, 796, 192]],
    },
    {
      label: "FECHA",
      text: "05/02/2025",
      boxes: [[431, 270, 674, 312]],
    },
    {
      label: "NOMBRE_COMPLETO",
      text: "Maria Romina Rojas Mufhoz,",
      boxes: [[858, 266, 1533, 308]],
    },
    {
      label: "RUT",
      text: "17286500-1,",
      boxes: [[1706, 270, 1977, 315]],
    },
    {
      label: "DIRECCION",
      text: "Avenida Gabriela Mistral 3902 Piso 56...",
      boxes: [
        [126, 389, 2344, 427],
        [129, 505, 575, 554],
      ],
    },
    {
      label: "EMPRESA",
      text: "Santos Alvarez E.I.R.L.",
      boxes: [[635, 508, 1143, 543]],
    },
    {
      label: "RUT",
      text: "13450681-1).",
      boxes: [[1302, 505, 1587, 550]],
    },
    {
      label: "MONTO",
      text: "$4.198.064.",
      boxes: [[769, 859, 1024, 905]],
    },
    {
      label: "NOMBRE_COMPLETO",
      text: "Maria Romina Rojas Munoz",
      boxes: [[131, 2157, 744, 2199]],
    },
    {
      label: "FIRMA",
      text: "Santos Alvarez E.I.R.L.",
      boxes: [[131, 2280, 640, 2318]],
    },
  ],

];

export default function GroupedImageViewer({ files }: Readonly<GroupedImageViewerProps>) {
  const [scales, setScales] = useState<{ x: number; y: number }[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const newScales = files.map((_, i) => {
      const img = imgRefs.current[i];
      if (img?.naturalWidth && img?.naturalHeight) {

        return {
          x: img.clientWidth / img.naturalWidth,
          y: img.clientHeight / img.naturalHeight,
        };
      }
      return { x: 1, y: 1 };
    });
    setScales(newScales);
  }, [files]);

  if (files.length === 0) return <p>No hay imágenes para mostrar.</p>;

  return (
    <div className="image-viewer-container">
      {files.map((doc, pageIndex) => (
        <div key={doc.id} className="image-wrapper">
          <img
            ref={(el) => {
              imgRefs.current[pageIndex] = el;
            }}
            src={`${baseURL}/secure-pdf/${doc.filepath.split("/").pop()}`}
            alt={doc.filename}
            className="image-viewer-img"
            onLoad={() => {
              const img = imgRefs.current[pageIndex];
              if (img?.naturalWidth && img?.naturalHeight) {
                setScales((prev) => {
                  const next = [...prev];
                  next[pageIndex] = {
                    x: img.clientWidth / img.naturalWidth,
                    y: img.clientHeight / img.naturalHeight,
                  };
                  return next;
                });
              }
            }}
          />
          <div className="highlight-layer">
            {(hardcodedAnnotations[pageIndex] || []).map((anno, i) =>
              anno.boxes.map((box, j) => {
                const [x1, y1, x2, y2] = box;
                const scale = scales[pageIndex] || { x: 1, y: 1 };
                const color = labelColors[anno.label] || "rgba(255,255,0,0.4)";

                return (
                  <div
                    key={`${pageIndex}-${i}-${j}`}
                    className="highlight-box"
                    style={{
                      left: `${x1 * scale.x}px`,
                      top: `${y1 * scale.y}px`,
                      width: `${(x2 - x1) * scale.x}px`,
                      height: `${(y2 - y1) * scale.y}px`,
                      backgroundColor: color,
                    }}
                    title={`${anno.label}: ${anno.text}`}
                  />
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
