import { useEffect, useRef, useState } from "react";
import { baseURL, buscarJsonLayoutPorIdDocumento } from "../../utils/api";
import type { BoxAnnotation, GroupedImageViewerProps } from "../../utils/interfaces";
import labelColors from "../../utils/labelColors.ts";
import "./GroupedImageViewer.css";

export default function GroupedImageViewer({ files }: Readonly<GroupedImageViewerProps>) {
  const [scales, setScales] = useState<{ x: number; y: number }[]>([]);
  const [annotationsByPage, setAnnotationsByPage] = useState<BoxAnnotation[][]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const observers = useRef<ResizeObserver[]>([]);

  // 🔍 Cargar layouts desde API
  useEffect(() => {
    let cancelado = false;

    async function fetchLayouts() {
      // 🧼 Limpiar las anotaciones anteriores mientras se cargan nuevas
      setAnnotationsByPage([]); // ← Esto es lo que faltaba

      const layouts: BoxAnnotation[][] = await Promise.all(
        files.map(async (doc) => {
          try {
            const data = await buscarJsonLayoutPorIdDocumento(doc.id);
            return data as BoxAnnotation[];
          } catch (error) {
            console.error("Error cargando layout del documento", doc.id, error);
            return [];
          }
        })
      );

      if (!cancelado) {
        setAnnotationsByPage(layouts);
      }
    }

    if (files.length > 0) {
      fetchLayouts();
    }

    return () => {
      cancelado = true; // por si cambia rápidamente de documento
    };
  }, [files]);

  // 📏 Observar cambios de tamaño de las imágenes (por zoom o responsive)
  useEffect(() => {
    observers.current.forEach((obs) => obs.disconnect());
    observers.current = [];

    files.forEach((_, i) => {
      const img = imgRefs.current[i];
      if (img?.naturalWidth && img?.naturalHeight) {
        const observer = new ResizeObserver(() => {
          setScales((prev) => {
            const next = [...prev];
            next[i] = {
              x: img.clientWidth / img.naturalWidth,
              y: img.clientHeight / img.naturalHeight,
            };
            return next;
          });
        });

        observer.observe(img);
        observers.current.push(observer);
      }
    });

    return () => {
      observers.current.forEach((obs) => obs.disconnect());
    };
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
          />
          <div className="highlight-layer">
            {(annotationsByPage[pageIndex] || []).map((anno, i) =>
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
