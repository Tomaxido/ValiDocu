import { useEffect, useRef, useState } from "react";
import { baseURL, buscarJsonLayoutPorIdDocumento } from "../../utils/api";
import type { BoxAnnotation, GroupedImageViewerProps } from "../../utils/interfaces";

import labelColors from "../../utils/labelColors.ts";
import { Box, Button, Stack } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import jsPDF from "jspdf";
import TraceabilityModal from "./TraceabilityModal";

type BBox = [number, number, number, number];

export default function GroupedImageViewer({ filename, files, pdfDoc }: Readonly<GroupedImageViewerProps>) {
  const [scales, setScales] = useState<{ x: number; y: number }[]>([]);
  const [annotationsByPage, setAnnotationsByPage] = useState<BoxAnnotation[][]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const observers = useRef<ResizeObserver[]>([]);

  const [focusByPage, setFocusByPage] = useState<Record<number, BBox[]>>({});
  const [hoverByPage, setHoverByPage] = useState<Record<number, BBox[]>>({}); // nuevo

  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Estado para el modal de trazabilidad
  const [traceabilityModalOpen, setTraceabilityModalOpen] = useState(false);

  // Cargar layouts desde API
  useEffect(() => {
    let cancelado = false;
    async function fetchLayouts() {
      setAnnotationsByPage([]);
      
      // Fallback: cargar desde API (para compatibilidad con sistema antiguo)
      const layouts: BoxAnnotation[][] = await Promise.all(
        files.map(async (doc) => {
          try {
            const data = await buscarJsonLayoutPorIdDocumento(doc.id);
            return (data ?? []) as BoxAnnotation[];
          } catch {
            return [];
          }
        })
      );
      if (!cancelado) setAnnotationsByPage(layouts);
    }
    if (files.length > 0) fetchLayouts();
    return () => { cancelado = true; };
  }, [files]);

  // Limpiar estados de focus y hover cuando cambian los archivos (cambio de documento)
  useEffect(() => {
    setFocusByPage({});
    setHoverByPage({});
  }, [files]);

  // Escalas
  useEffect(() => {
    observers.current.forEach((obs) => obs.disconnect());
    observers.current = [];

    files.forEach((_, i) => {
      const img = imgRefs.current[i];
      if (!img) return;

      const handleLoad = () => {
        setScales((prev) => {
          const next = [...prev];
          next[i] = {
            x: img.clientWidth / img.naturalWidth,
            y: img.clientHeight / img.naturalHeight,
          };
          return next;
        });

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

  // Focus (click con scroll)
  useEffect(() => {
    function onFocus(ev: Event) {
      const custom = ev as CustomEvent;
      const evidence = (custom.detail ?? {}) as {
        items?: { boxes?: number[][]; page?: number | null }[];
        noScroll?: boolean;
      };

      const map: Record<number, BBox[]> = {};
      const items = evidence.items ?? [];
      for (const it of items) {
        const bxs = (it.boxes ?? []) as number[][];
        if (!bxs.length) continue;
        let pageIndex = 0;
        if (typeof it.page === "number") {
          pageIndex = it.page > 0 ? it.page - 1 : it.page;
        }
        if (pageIndex < 0) pageIndex = 0;
        if (pageIndex > files.length - 1) pageIndex = files.length - 1;
        if (!map[pageIndex]) map[pageIndex] = [];
        for (const b of bxs) map[pageIndex].push(b as BBox);
      }
      setFocusByPage(map);

      if (!evidence.noScroll) {
        const firstKey = Object.keys(map)[0];
        if (typeof firstKey !== "undefined") {
          const first = Number(firstKey);
          const wrapper = wrapperRefs.current[first];
          
          if (wrapper) {
            // Calcular el promedio de Y de las cajas para decidir el tipo de scroll
            const boxes = map[first] || [];
            if (boxes.length > 0) {
              // Calcular el promedio de las coordenadas Y (segundo valor de cada caja)
              const avgY = boxes.reduce((sum, box) => {
                const [, y1, , y2] = box;
                return sum + (y1 + y2) / 2; // Promedio del centro Y de cada caja
              }, 0) / boxes.length;
              
              // Decidir el tipo de bloque basado en la posición Y
              const blockPosition = avgY > 1000 ? 'end' : 'start';
              
              wrapper.scrollIntoView({ 
                behavior: "smooth", 
                block: blockPosition as ScrollLogicalPosition
              });
            } else {
              // Fallback: scroll al centro si no hay cajas
              wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }
        }
      }
    }
    window.addEventListener("focus-evidence", onFocus as any);
    return () => window.removeEventListener("focus-evidence", onFocus as any);
  }, [files.length]);

  // Hover (sin scroll)
  useEffect(() => {
    function onHover(ev: Event) {
      const custom = ev as CustomEvent;
      const evidence = (custom.detail ?? {}) as {
        items?: { boxes?: number[][]; page?: number | null }[];
      };

      const map: Record<number, BBox[]> = {};
      const items = evidence.items ?? [];
      for (const it of items) {
        const bxs = (it.boxes ?? []) as number[][];
        if (!bxs.length) continue;
        let pageIndex = 0;
        if (typeof it.page === "number") {
          pageIndex = it.page > 0 ? it.page - 1 : it.page;
        }
        if (pageIndex < 0) pageIndex = 0;
        if (pageIndex > files.length - 1) pageIndex = files.length - 1;
        if (!map[pageIndex]) map[pageIndex] = [];
        for (const b of bxs) map[pageIndex].push(b as BBox);
      }
      setHoverByPage(map);
    }
    window.addEventListener("hover-evidence", onHover as any);
    return () => window.removeEventListener("hover-evidence", onHover as any);
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

    pdf.save(filename);
  }

  if (files.length === 0) return <Box>No hay imágenes para mostrar.</Box>;

  return (
    <Box sx={{ position: 'relative' }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={exportToPdf} startIcon={<DownloadIcon />}>
          Descargar como PDF
        </Button>
        
        <Button 
          onClick={() => setTraceabilityModalOpen(true)} 
          startIcon={<HistoryIcon />}
        >
          Ver Trazabilidad
        </Button>
      </Stack>

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
            ref={(el: HTMLDivElement | null) => { wrapperRefs.current[pageIndex] = el; }}
            sx={{ position: "relative", display: "inline-block" }}
          >
            <Box
              component="img"
              ref={(el: HTMLImageElement | null) => { imgRefs.current[pageIndex] = el; }}
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

            {/* Anotaciones */}
            <Box sx={{ pointerEvents: "none", position: "absolute", inset: 0 }}>
              {(Array.isArray(annotationsByPage[pageIndex])
                ? annotationsByPage[pageIndex]
                : Object.values(annotationsByPage[pageIndex] || {})
              ).flatMap((anno: any, i: number) =>
                anno.boxes.map((box: number[], j: number) => {
                  const [x1, y1, x2, y2] = box;
                  const scale = scales[pageIndex] || { x: 1, y: 1 };
                  const color = anno.label.endsWith("_E")
                    ? "rgba(255,0,0,0.4)"
                    : labelColors[anno.label] || "rgba(255,255,0,0.4)";
                  return (
                    <Box
                      key={`${pageIndex}-${i}-${j}`}
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


            {/* Hover */}
            <Box sx={{ pointerEvents: "none", position: "absolute", inset: 0 }}>
              {(hoverByPage[pageIndex] ?? []).map((box, k) => {
                const [x1, y1, x2, y2] = box;
                const scale = scales[pageIndex] || { x: 1, y: 1 };
                return (
                  <Box
                    key={`hover-${pageIndex}-${k}`}
                    sx={{
                      position: "absolute",
                      left: x1 * scale.x,
                      top: y1 * scale.y,
                      width: (x2 - x1) * scale.x,
                      height: (y2 - y1) * scale.y,
                      outline: "2px dashed rgba(36,47,64,0.9)",
                      outlineOffset: "-1px",
                      borderRadius: "2px",
                      background: "rgba(36,47,64,0.1)",
                    }}
                  />
                );
              })}
            </Box>

            {/* Focus persistente */}
            <Box sx={{ pointerEvents: "none", position: "absolute", inset: 0 }}>
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
                      outline: "2px solid #CCA43B",
                      borderRadius: "2px",
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        ))}
      </Stack>

      {/* Modal de Trazabilidad */}
      <TraceabilityModal
        open={traceabilityModalOpen}
        onClose={() => setTraceabilityModalOpen(false)}
        documentId={files[0]?.id?.toString() || ""}
        documentName={filename}
      />
    </Box>
  );
}
