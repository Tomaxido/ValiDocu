import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import './PdfViewer.css';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfViewerProps {
  url?: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [pdfImages, setPdfImages] = useState<string[]>([]);

  // Cargar PDF automáticamente si se pasa por props
  useEffect(() => {
    const loadPdf = async () => {
      if (!url) return;
      setIsLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const loadedPdf = await loadingTask.promise;
        setPdf(loadedPdf);
        setCurrentPage(1);
        const images = await convertPdfToImages(loadedPdf);
        setPdfImages(images);
      } catch (error) {
        console.error("Error al cargar el PDF:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [url]);


  // Render actual
  useEffect(() => {
    if (pdf && canvasRef.current) {
      const renderPage = async () => {
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
      };
      renderPage();
    }
  }, [pdf, currentPage]);

  const convertPdfToImages = async (pdf: pdfjsLib.PDFDocumentProxy) => {
    const images: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      const viewport = page.getViewport({ scale: 1 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      images.push(canvas.toDataURL('image/png'));
    }
    return images;
  };

  const downloadAllImagesAsZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder("pdf_imagenes");

    pdfImages.forEach((dataUrl, index) => {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      folder?.file(`pagina-${index + 1}.png`, base64Data, { base64: true });
    });

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "pdf_paginas.zip");
  };

  const toggleFullScreen = () => {
    if (viewerRef.current) {
      if (!document.fullscreenElement) {
        viewerRef.current.requestFullscreen().catch(err => {
          console.error(`Error al entrar en pantalla completa: ${err}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="viewer-container" ref={viewerRef}>
      {isLoading && <p>Cargando PDF...</p>}

      {pdf && (
        <div className="pdf-viewer-wrapper">
          <div className="pdf-pane">
            <div className="page-controls">
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage <= 1}>
                Anterior
              </button>
              <span>Página {currentPage} de {pdf.numPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, pdf.numPages))} disabled={currentPage >= pdf.numPages}>
                Siguiente
              </button>
              <button onClick={downloadAllImagesAsZip}>Descargar como imágenes</button>
              <button onClick={toggleFullScreen}>Pantalla completa</button>
            </div>
            <div className="pdf-display">
              <canvas className='pdf-canvas' ref={canvasRef}></canvas>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
