import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useEchoPublic } from "@laravel/echo-react";
import { getDocumentById } from "../../utils/api";
import { type Document, type GroupedDocument, type DocumentVersionProcessedEvent } from "../../utils/interfaces";
import DocumentViewer from "./DocumentViewer";

import {
  Box, CircularProgress, Typography, Button, Alert
} from "@mui/material";
import { ArrowLeft } from "lucide-react";

function groupDocuments(documents: Document[]): GroupedDocument[] {
  if (!documents || documents.length === 0) {
    return [];
  }

  // Filtrar documentos válidos
  const validDocuments = documents.filter(doc => doc.filename);
  const pdfs = validDocuments.filter((doc) => doc.filename.toLowerCase().endsWith(".pdf"));

  // Crear grupos desde los PDFs y sus páginas
  const result: GroupedDocument[] = pdfs.map(pdf => {
    const nameWithoutExt = pdf.filename.replace(/\.pdf$/i, "");
    
    // Convertir las páginas a formato Document para compatibilidad con GroupedImageViewer
    const pageDocuments: Document[] = (pdf.pages || []).map(page => ({
      id: page.id,
      document_group_id: pdf.document_group_id,
      document_version_id: page.document_version_id ?? 0,
      filename: `page_${page.page_number}.png`,
      filepath: page.image_path,
      mime_type: 'image/png',
      status: pdf.status,
      created_at: page.created_at,
      updated_at: page.updated_at,
      normative_gap: pdf.normative_gap,
      due_date: pdf.due_date,
      json_layout: page.json_layout,
    }));
    
    return { 
      name: nameWithoutExt, 
      images: pageDocuments,
      pdf 
    };
  });

  return result;
}

export default function Documento() {
  const { documentoId } = useParams<{ documentoId: string }>();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedDocs, setGroupedDocs] = useState<GroupedDocument[]>([]);

  const getDocumentRoutine = async (docId: string, showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      // Obtener el documento por su ID usando el endpoint específico
      const doc = await getDocumentById(docId);
      setDocument(doc);
      
      // Agrupar el documento (aunque sea solo uno)
      const grouped = groupDocuments([doc]);
      setGroupedDocs(grouped);
    } catch (err: any) {
      console.error('Error cargando documento:', err);
      setError(err.message || 'Error al cargar el documento');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Carga inicial del documento
  useEffect(() => {
    if (!documentoId) {
      navigate('/');
      return;
    }
    getDocumentRoutine(documentoId, true);
  }, [documentoId, navigate]);

  // Listen for document version processed events (real-time updates)
  useEchoPublic<DocumentVersionProcessedEvent>(
    'documents',
    '.document.version.processed',
    (e) => {
      console.log('📢 Version processed event received:', e);
      // Only reload if the event is for the current document
      if (documentoId && e.document_id.toString() === documentoId) {
        console.log('🔄 Reloading document data for version update...');
        // Recargar sin mostrar el loading para una actualización más fluida
        getDocumentRoutine(documentoId, false);
      }
    }
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button startIcon={<ArrowLeft />} onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
      </Box>
    );
  }

  if (!document || groupedDocs.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Documento no encontrado o sin imágenes procesadas
        </Alert>
        <Button startIcon={<ArrowLeft />} onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 72px)", overflow: "hidden" }}>
      {/* Botón para volver */}
      <Box sx={{ px: 3, pt: 2, pb: 1, borderBottom: 1, borderColor: "divider" }}>
        <Button
          startIcon={<ArrowLeft />}
          onClick={() => navigate('/')}
          variant="contained"
          color="primary"
          sx={{
            mb: 1,
            boxShadow: 2,
            '&:hover': {
              boxShadow: 4,
            }
          }}
        >
          Volver
        </Button>
      </Box>

      {/* Visor de documento */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        <Box sx={{ flex: 1, overflow: "hidden", p: 2, pt: 1 }}>
          {groupedDocs[0] && (
            <DocumentViewer
              selectedDoc={groupedDocs[0].pdf!}
              images={groupedDocs[0].images}
              semanticGroupData={[]}
              showInfoPanel={true}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
