import { useRef, useState } from "react";
import { Box } from "@mui/material";
import GroupedImageViewer from "./GroupedImageViewer";
import DocInfoPanel from "./DocInfoPanel";
import { type Document, type SemanticGroup } from "../../utils/interfaces";

interface DocumentViewerProps {
  selectedDoc: Document;
  images: Document[];
  semanticGroupData: SemanticGroup[];
  onViewInDocument?: (fieldKey: string) => void;
  showInfoPanel?: boolean;
}

export default function DocumentViewer({
  selectedDoc,
  images,
  semanticGroupData,
  onViewInDocument,
  showInfoPanel = true,
}: DocumentViewerProps) {
  const splitRef = useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = useState(0.66);
  const MIN_LEFT_PX = 360;
  const MIN_RIGHT_PX = 280;
  const HANDLE_PX = 8;

  const beginDrag = (clientX: number) => {
    const el = splitRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const minLeft = MIN_LEFT_PX;
    const minRight = MIN_RIGHT_PX;
    const minX = rect.left + minLeft;
    const maxX = rect.right - minRight;

    const clampedX = Math.min(Math.max(clientX, minX), maxX);
    const nextRatio = (clampedX - rect.left) / rect.width;
    setRatio(nextRatio);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const move = (ev: MouseEvent) => beginDrag(ev.clientX);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onTouchStart = () => {
    const move = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (t) beginDrag(t.clientX);
    };
    const end = () => {
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
  };

  const leftPct = Math.round(ratio * 100);
  const rightPct = 100 - leftPct;

  // Si no se debe mostrar el panel de información, solo mostrar el visor
  if (!showInfoPanel) {
    return (
      <Box sx={{ width: "100%", height: "100%" }}>
        <GroupedImageViewer
          filename={selectedDoc.filename}
          files={images}
          pdfDoc={selectedDoc}
        />
      </Box>
    );
  }

  // Mostrar con panel de información dividido
  return (
    <Box
      ref={splitRef}
      sx={(theme) => {
        const GAP_PX = parseInt(theme.spacing(2));
        const handle = HANDLE_PX;
        const SAFE = 2;

        const left = `calc(${leftPct}% - ${(handle + GAP_PX) / 2}px)`;
        const right = `calc(${rightPct}% - ${(handle + GAP_PX) / 2 + SAFE}px)`;

        return {
          display: "grid",
          gridTemplateColumns: `${left} ${handle}px ${right}`,
          columnGap: 2,
          alignItems: "stretch",
          height: "100%",
          width: "100%",
          pr: `${SAFE}px`,
          boxSizing: "border-box",
        };
      }}
    >
      <Box sx={{ minWidth: 0, height: "100%", minHeight: 0 }}>
        <GroupedImageViewer
          filename={selectedDoc.filename}
          files={images}
          pdfDoc={selectedDoc}
        />
      </Box>

      <Box
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionar paneles"
        tabIndex={0}
        sx={{
          cursor: "col-resize",
          bgcolor: "divider",
          borderRadius: 1,
          transition: "background-color .15s",
          "&:hover, &:focus-visible": { bgcolor: "text.disabled" },
        }}
      />

      <Box sx={{ minWidth: MIN_RIGHT_PX, minHeight: 0, display: "flex" }}>
        <DocInfoPanel
          selectedDoc={selectedDoc}
          semanticGroupData={semanticGroupData}
          onViewInDocument={onViewInDocument}
        />
      </Box>
    </Box>
  );
}
