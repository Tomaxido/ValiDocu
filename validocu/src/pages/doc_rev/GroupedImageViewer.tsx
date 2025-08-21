import { useEffect, useRef, useState } from "react";
import { baseURL, buscarJsonLayoutPorIdDocumento } from "../../utils/api";
import type { BoxAnnotation, GroupedImageViewerProps } from "../../utils/interfaces";

import labelColors from "../../utils/labelColors.ts";
import jsPDF from "jspdf";
import { Box, Button, Stack } from "@mui/material";

// Evita confundir con MUI <Box/>:
type BBox = [number, number, number, number];

export default function GroupedImageViewer({ files }: Readonly<GroupedImageViewerProps>) {
  // Escala por página (según tamaño renderizado vs tamaño natural)
  const [scales, setScales] = useState<{ x: number; y: number }[]>([]);
  // Anotaciones del extractor, agrupadas por página
  const [annotationsByPage, setAnnotationsByPage] = useState<BoxAnnotation[][]>([]);
  // Referencias a <img> por página
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  // Observers para recomputar escala en resize
  const observers = useRef<ResizeObserver[]>([]);
  // Cajas enfocadas (por página), empujadas por SuggestionsPanel
  const [focusByPage, setFocusByPage] = useState<Record<number, BBox[]>>({});
  // Refs de los contenedores de cada página (para scroll)
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Cargar layouts desde API para cada archivo/página
  useEffect(() => {
    let cancelado = false;

    async function fetchLayouts() {
      setAnnotationsByPage([]);
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
    return () => {
      cancelado = true;
    };
  }, [files]);

  // Observar cambios de tamaño de las imágenes (zoom/responsive)
  useEffect(() => {
    // desconecta cualquier observer previo
    observers.current.forEach((obs) => obs.disconnect());
    observers.current = [];

    files.forEach((_, i) => {
      const img = imgRefs.current[i];
      if (!img) return;

      const setScale = () =>
        setScales((prev) => {
          const next = [...prev];
          next[i] = {
            x: img.clientWidth / img.naturalWidth,
            y: img.clientHeight / img.naturalHeight,
          };
          return next;
        });

      const handleLoad = () => {
        setScale();
        const observer = new ResizeObserver(() => setScale());
        observer.observe(img);
        observers.current.push(observer);
      };

      if (img.complete) handleLoad();
      else img.onload = handleLoad;
    });

    return () => {
      observers.current.forEach((obs) => obs.disconnect());
      observers.current = [];
    };
  }, [files]);

  // Escuchar "focus-evidence" para pintar capa de foco y hacer scroll
  useEffect(() => {
    function onFocus(ev: Event) {
      const custom = ev as CustomEvent;
      const evidence = (custom.detail ?? {}) as {
        items?: { boxes?: number[][]; page?: number | null }[];
      };

      const map: Record<number, BBox[]> = {};
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
        for (const b of bxs) map[pageIndex].push(b as BBox);
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

  // Exportar a PDF con marcas (usa las anotaciones del extractor)
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

        // 1) Imagen
        ctx.drawImage(bitmap, 0, 0);

        // 2) Marcas
        const annotations = annotationsByPage[pageIndex] || [];
        for (const anno of annotations) {
          const color = anno.label.endsWith("_E")
            ? "rgba(255, 0, 0, 0.4)" // rojo para error
            : labelColors[anno.label] || "rgba(255,255,0,0.4)";

          ctx.fillStyle = color;
          for (const [x1, y1, x2, y2] of anno.boxes as unknown as BBox[]) {
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
          }
        }

        // 3) A PDF
        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, width, height);
      } catch (err) {
        console.error(`No se pudo exportar la imagen ${filename}`, err);
      }
    }
    pdf.save("documento_con_marcas.pdf");
  }

  if (files.length === 0) return <Box>No hay imágenes para mostrar.</Box>;

  return (
    <Box>
      <Button onClick={exportToPdf} variant="contained" color="warning" sx={{ mb: 2 }}>
        Descargar como PDF
      </Button>

      <Stack
        sx={{
          alignItems: "center",
          gap: 2,
          p: 2,
          maxHeight: "90dvh",
          overflowY: "auto",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        {files.map((doc, pageIndex) => (
          <Box
            key={doc.id}
            ref={(el: HTMLDivElement | null) => {
              wrapperRefs.current[pageIndex] = el;
            }}
            sx={{ position: "relative", display: "inline-block" }}
          >
            {/* Imagen de la página */}
            <Box
              component="img"
              ref={(el: HTMLImageElement | null) => {
                imgRefs.current[pageIndex] = el;
              }}
              src={`${baseURL}/secure-pdf/${doc.filepath.split("/").pop()}`}
              alt={doc.filename}
              sx={{
                display: "block",
                maxWidth: "100%",
                height: "auto",
                border: 1,
                borderColor: "divider",
                boxShadow: 1,
              }}
            />

            {/* Capa de resaltado (anotaciones) */}
            <Box
              sx={{
                pointerEvents: "none",
                position: "absolute",
                inset: 0,
              }}
            >
              {(annotationsByPage[pageIndex] || []).flatMap((anno, i) =>
                anno.boxes.map((box, j) => {
                  const [x1, y1, x2, y2] = box as unknown as BBox;
                  const scale = scales[pageIndex] || { x: 1, y: 1 };
                  const color = anno.label.endsWith("_E")
                    ? "rgba(255, 0, 0, 0.4)" // error
                    : labelColors[anno.label] || "rgba(255,255,0,0.4)";

                  return (
                    <Box
                      key={`${pageIndex}-${i}-${j}`}
                      title={`${anno.label}: ${anno.text}`}
                      sx={{
                        position: "absolute",
                        left: x1 * scale.x,
                        top: y1 * scale.y,
                        width: (x2 - x1) * scale.x,
                        height: (y2 - y1) * scale.y,
                        bgcolor: color,
                        borderRadius: "2px",
                      }}
                    />
                  );
                })
              )}
            </Box>

            {/* Capa de foco (issues seleccionados desde la tabla) */}
            <Box
              sx={{
                pointerEvents: "none",
                position: "absolute",
                inset: 0,
              }}
            >
              {(focusByPage[pageIndex] ?? []).map((box, k) => {
                const [x1, y1, x2, y2] = box;
                const scale = scales[pageIndex] || { x: 1, y: 1 };
                return (
                  <Box
                    key={`focus-${pageIndex}-${k}`}
                    sx={{
                      position: "absolute",
                      left: x1 * scale.x,
                      top: y1 * scale.y,
                      width: (x2 - x1) * scale.x,
                      height: (y2 - y1) * scale.y,
                      outline: "2px solid rgba(204,164,59,0.9)", // acento
                      outlineOffset: "-1px",
                      borderRadius: "2px",
                      background:
                        "repeating-linear-gradient(45deg, rgba(204,164,59,0.15), rgba(204,164,59,0.15) 6px, transparent 6px, transparent 12px)",
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
