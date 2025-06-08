import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configura el worker con el módulo importado localmente
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PDFViewerProps {
  url: string | URL;
}

export default function PDFViewer({ url }: Readonly<PDFViewerProps>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfRef, setPdfRef] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const loadPDF = async () => {
      console.log("Loading PDF...");
      const loadingTask = pdfjsLib.getDocument(url);
      try {
        const pdf = await loadingTask.promise;
        console.log("Loaded PDF")
        setPdfRef(pdf);
        setPageCount(pdf.numPages);
        renderPage(pdf, currentPage);
      } catch (error) {
        console.error('Error al cargar el PDF:', error);
      }
    };

    loadPDF();
  }, [url]);

  const renderPage = async (pdf: pdfjsLib.PDFDocumentProxy | null, pageNum: number) => {
    console.log("AAA")
    if (pdf === null) return;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext('2d');
    if (context === null) return;
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      renderPage(pdfRef, newPage);
    }
  };

  const goToNextPage = () => {
    if (currentPage < pageCount) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      renderPage(pdfRef, newPage);
    }
  };

  return (
    <div>
      <div>
        <button onClick={goToPreviousPage} disabled={currentPage <= 1}>
          Anterior
        </button>
        <span>
          Página {currentPage} de {pageCount}
        </span>
        <button onClick={goToNextPage} disabled={currentPage >= pageCount}>
          Siguiente
        </button>
      </div>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
};