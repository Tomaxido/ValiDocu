import { useEffect, useRef, useState } from "react";
import { baseURL, buscarJsonLayoutPorIdDocumento } from "../../utils/api";
import type { BoxAnnotation, GroupedImageViewerProps } from "../../utils/interfaces";

import labelColors from "../../utils/labelColors.ts";
import jsPDF from "jspdf";
import "./GroupedImageViewer.css";

type Box = [number, number, number, number];

export default function GroupedImageViewer({ files }: Readonly<GroupedImageViewerProps>) {
  // Escala por página (según tamaño renderizado vs tamaño natural)
  const [scales, setScales] = useState<{ x: number; y: number }[]>([]);
  // Anotaciones del extractor, agrupadas por página
  const [annotationsByPage, setAnnotationsByPage] = useState<BoxAnnotation[][]>([]);
  // Referencias a <img> por página
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  // Observers para recomputar escala en resize
  const observers = useRef<ResizeObserver[]>([]);
  // NUEVO: cajas enfocadas (por página), empujadas por SuggestionsPanel
  const [focusByPage, setFocusByPage] = useState<Record<number, Box[]>>({});
  // NUEVO: refs de los contenedores de cada página (para scroll)
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 🔍 Cargar layouts desde API para cada archivo/página
  useEffect(() => {
    let cancelado = false;

    async function fetchLayouts() {
      setAnnotationsByPage([]); // limpia mientras cargas
      const layouts: BoxAnnotation[][] = await Promise.all(
        files.map(async (doc) => {
          try {
            const data = await buscarJsonLayoutPorIdDocumento(doc.id);
            return (data ?? []) as BoxAnnotation[];
          } catch (error) {
            console.error("Error cargando layout del documento", doc.id, error);
            return [];
          }
        })
      );
      if (!cancelado) setAnnotationsByPage(layouts);
    }

    if (files.length > 0) fetchLayouts();

    return () => { cancelado = true; };
  }, [files]);

  // 📏 Observar cambios de tamaño de las imágenes (por zoom o responsive)
  useEffect(() => {
    // desconecta cualquier observer previo
    observers.current.forEach((obs) => obs.disconnect());
    observers.current = [];

    files.forEach((_, i) => {
      const img = imgRefs.current[i];
      if (!img) return;

      const handleLoad = () => {
        // set inicial
        setScales((prev) => {
          const next = [...prev];
          next[i] = {
            x: img.clientWidth / img.naturalWidth,
            y: img.clientHeight / img.naturalHeight,
          };
          return next;
        });

        // observa cambios
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
      };

      if (img.complete) handleLoad();
      else img.onload = handleLoad;
    });

    return () => {
      observers.current.forEach((obs) => obs.disconnect());
    };
  }, [files]);

  // ⬇️ NUEVO: escuchar "focus-evidence" para pintar capa de foco y hacer scroll
  useEffect(() => {
    function onFocus(ev: Event) {
      const custom = ev as CustomEvent;
      const evidence = (custom.detail ?? {}) as { items?: { boxes?: number[][]; page?: number | null }[] };

      const map: Record<number, Box[]> = {};
      const items = evidence.items ?? [];

      for (const it of items) {
        const bxs = (it.boxes ?? []) as number[][];
        if (!bxs.length) continue;

        // Índice de página robusto:
        // - Si viene 1-indexado (1..N), conviértelo a 0-index
        // - Si ya es 0-index, respétalo
        // - Si viene null/undefined, cae en 0
        let pageIndex = 0;
        if (typeof it.page === "number") {
          pageIndex = it.page > 0 ? it.page - 1 : it.page; // 1->0, 2->1, 0->0
        }
        // clamp (por seguridad)
        if (pageIndex < 0) pageIndex = 0;
        if (pageIndex > files.length - 1) pageIndex = files.length - 1;

        if (!map[pageIndex]) map[pageIndex] = [];
        for (const b of bxs) map[pageIndex].push(b as Box);
      }

      setFocusByPage(map);

      // scroll a la primera página con foco
      const firstKey = Object.keys(map)[0];
      if (typeof firstKey !== "undefined") {
        const first = Number(firstKey);
        const wrapper = wrapperRefs.current[first];
        if (wrapper) wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setFocusByPage({});
    }

    window.addEventListener("focus-evidence", onFocus as any);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("focus-evidence", onFocus as any);
      window.removeEventListener("keydown", onEscape);
    };
  }, [files.length]);

  // ⬇️ Export con marcas (usa las anotaciones del extractor)
  async function exportToPdf() {
    const pdf = new jsPDF();

    for (let pageIndex = 0; pageIndex < files.length; pageIndex++) {
      const file = files[pageIndex];
      const filename = file.filepath.split("/").pop();
      const imageUrl = `${baseURL}/secure-pdf/${filename}`;

      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        canvas.width = bitmap.width;
        canvas.height = bitmap.height;

        // 1) Dibuja la imagen
        ctx.drawImage(bitmap, 0, 0);

        // 2) Dibuja las marcas del extractor
        const annotations = annotationsByPage[pageIndex] || [];
        for (const anno of annotations) {
          const color = anno.label.endsWith("_E")
            ? "rgba(255, 0, 0, 0.4)"
            : labelColors[anno.label] || "rgba(255,255,0,0.4)";
          ctx.fillStyle = color;
          for (const [x1, y1, x2, y2] of anno.boxes) {
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
          }
        }

        // 3) Exporta canvas como imagen para PDF
        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, width, height);
      } catch (err) {
        console.error(`No se pudo exportar la imagen ${filename}`, err);
      }
    }

    pdf.save("imagenes_con_marcas.pdf");
  }

  if (files.length === 0) return <p>No hay imágenes para mostrar.</p>;

  return (
    <>
      <button onClick={exportToPdf} className="download-button">Descargar como PDF</button>

      <div className="image-viewer-container">
        {files.map((doc, pageIndex) => (
          <div
            key={doc.id}
            className="image-wrapper"
            ref={(el) => { wrapperRefs.current[pageIndex] = el; }}
          >
            <img
              ref={(el) => { imgRefs.current[pageIndex] = el; }}
              src={`${baseURL}/secure-pdf/${doc.filepath.split("/").pop()}`}
              alt={doc.filename}
              className="image-viewer-img"
            />

            {/* Capa original de highlights del extractor */}
            <div className="highlight-layer">
              {(annotationsByPage[pageIndex] || []).map((anno, i) =>
                anno.boxes.map((box, j) => {
                  const [x1, y1, x2, y2] = box;
                  const scale = scales[pageIndex] || { x: 1, y: 1 };
                  const color = anno.label.endsWith("_E")
                    ? "rgba(255, 0, 0, 0.4)" // rojo para campos marcados con error
                    : labelColors[anno.label] || "rgba(255,255,0,0.4)";

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

            {/* NUEVO: Capa de foco (issues seleccionados en la tabla) */}
            <div className="focus-layer">
              {(focusByPage[pageIndex] ?? []).map((box, k) => {
                const [x1, y1, x2, y2] = box;
                const scale = scales[pageIndex] || { x: 1, y: 1 };
                return (
                  <div
                    key={`focus-${pageIndex}-${k}`}
                    className="focus-box"
                    style={{
                      left: `${x1 * scale.x}px`,
                      top: `${y1 * scale.y}px`,
                      width: `${(x2 - x1) * scale.x}px`,
                      height: `${(y2 - y1) * scale.y}px`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
