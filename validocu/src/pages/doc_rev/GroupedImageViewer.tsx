import { useEffect, useRef, useState } from "react";
import { baseURL, buscarJsonLayoutPorIdDocumento } from "../../utils/api";
import type { BoxAnnotation, GroupedImageViewerProps } from "../../utils/interfaces";
import labelColors from "../../utils/labelColors.ts";
import jsPDF from "jspdf";
import { Box, Button, Stack } from "@mui/material";

export default function GroupedImageViewer({ files }: Readonly<GroupedImageViewerProps>) {
  const [scales, setScales] = useState<{ x: number; y: number }[]>([]);
  const [annotationsByPage, setAnnotationsByPage] = useState<BoxAnnotation[][]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const observers = useRef<ResizeObserver[]>([]);

  // Cargar layouts desde API
  useEffect(() => {
    let cancelado = false;
    async function fetchLayouts() {
      setAnnotationsByPage([]);
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
      if (!cancelado) setAnnotationsByPage(layouts);
    }
    if (files.length > 0) fetchLayouts();
    return () => { cancelado = true; };
  }, [files]);

  // Observar cambios de tamaño de las imágenes (zoom/responsive)
  useEffect(() => {
    observers.current.forEach((obs) => obs.disconnect());
    observers.current = [];

    files.forEach((_, i) => {
      const img = imgRefs.current[i];
      if (img) {
        const handleLoad = () => {
          const computeScale = () => setScales(prev => {
            const next = [...prev];
            next[i] = {
              x: img.clientWidth / img.naturalWidth,
              y: img.clientHeight / img.naturalHeight,
            };
            return next;
          });
          computeScale();
          const observer = new ResizeObserver(computeScale);
          observer.observe(img);
          observers.current.push(observer);
        };
        if (img.complete) handleLoad();
        else img.onload = handleLoad;
      }
    });

    return () => {
      observers.current.forEach((obs) => obs.disconnect());
    };
  }, [files]);

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

        // 1. Imagen
        ctx.drawImage(bitmap, 0, 0);

        // 2. Marcas
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

        // 3. A PDF
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

  if (files.length === 0) return <Box>No hay imágenes para mostrar.</Box>;

  return (
    <Box>
      <Button
        onClick={exportToPdf}
        variant="contained"
        color="warning"
        sx={{ mb: 2 }}
      >
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
          <Box key={doc.id} sx={{ position: "relative", display: "inline-block" }}>
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
            {/* Capa de resaltado */}
            <Box
              sx={{
                pointerEvents: "none",
                position: "absolute",
                inset: 0,
              }}
            >
              {(annotationsByPage[pageIndex] || []).flatMap((anno, i) =>
                anno.boxes.map((box, j) => {
                  const [x1, y1, x2, y2] = box;
                  const scale = scales[pageIndex] || { x: 1, y: 1 };
                  const color = anno.label.endsWith("_E")
                    ? "rgba(255, 0, 0, 0.4)"
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
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
