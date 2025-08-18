import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDocumentGroupById, uploadDocumentsToGroup, deleteDocuments } from "../../utils/api";
import type { DocumentGroup, Document, GroupedDocument } from "../../utils/interfaces";
import UploadModal from "./UploadModal";
import DeleteModal from "./DeleteModal";
import GroupedImageViewer from "./GroupedImageViewer";
import DocInfoPanel from "./DocInfoPanel";

import {
  Box, Paper, Button, Typography, List, ListItemButton,
  ListItemText, Chip, Stack, IconButton, Divider
} from "@mui/material";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

function groupDocuments(documents: Document[]): GroupedDocument[] {
  const pdfs = documents.filter((doc) => doc.filename.toLowerCase().endsWith(".pdf"));
  const images = documents.filter((doc) => !doc.filename.toLowerCase().endsWith(".pdf"));

  const groups: { [key: string]: Document[] } = {};
  for (const doc of images) {
    const match = /^(.+?)_p\d+\.(png|jpg|jpeg)$/i.exec(doc.filename);
    const key = match ? match[1] : doc.filename;
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  }

  return Object.entries(groups).map(([key, imgs]) => {
    const matchingPdf = pdfs.find((pdf) => pdf.filename.toLowerCase().startsWith(key.toLowerCase()));
    const nameWithoutExt = matchingPdf ? matchingPdf.filename.replace(/\.pdf$/i, "") : key;
    return { name: nameWithoutExt, images: imgs, pdf: matchingPdf };
  });
}

function statusChip(status?: number) {
  if (status === 1) return <Chip label="Conforme" color="success" size="small" />;
  if (status === 2) return <Chip label="Inconforme" color="error" size="small" />;
  return <Chip label="Sin procesar" variant="outlined" size="small" />;
}

export default function Grupo() {
  const { grupoId } = useParams<{ grupoId: string }>();
  const [group, setGroup] = useState<DocumentGroup | null>(null);
  const [groupedDocs, setGroupedDocs] = useState<GroupedDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [semanticGroupData, setSemanticGroupData] = useState<any[]>([]);

  const fetchSemanticGroupData = async (groupFiles: Document[]) => {
    const ids = groupFiles.map(doc => doc.id);
    const res = await fetch(`http://localhost:8000/api/v1/semantic-data/by-filenames`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids })
    });
    const data = await res.json();
    setSemanticGroupData(data);
  };

  useEffect(() => {
    if (grupoId) {
      getDocumentGroupById(grupoId).then((g) => {
        setGroup(g);
        const grouped = groupDocuments(g.documents);
        setGroupedDocs(grouped);
        if (grouped.length > 0 && grouped[0].pdf) {
          setSelectedDoc(grouped[0].pdf);
          fetchSemanticGroupData(grouped[0].images);
        }
      });
    }
  }, [grupoId]);

  if (!group) return <Typography sx={{ p: 2 }}>Cargando grupo...</Typography>;

  const handleFileUpload = async (files: FileList) => {
    if (!grupoId) return;
    try {
      await uploadDocumentsToGroup(grupoId, files);
      const updatedGroup = await getDocumentGroupById(grupoId);
      setGroup(updatedGroup);
      const grouped = groupDocuments(updatedGroup.documents);
      setGroupedDocs(grouped);
      const lastPdf = grouped.at(-1)?.pdf;
      setSelectedDoc(lastPdf || null);
    } catch (err: any) {
      alert("Error al subir: " + err.message);
    }
  };

  const handleDeleteDocuments = async (ids: number[]) => {
    if (!grupoId) return;
    try {
      await deleteDocuments(ids);
      const updatedGroup = await getDocumentGroupById(grupoId);
      setGroup(updatedGroup);
      const grouped = groupDocuments(updatedGroup.documents);
      setGroupedDocs(grouped);
      const firstPdf = grouped[0]?.pdf;
      setSelectedDoc(firstPdf || null);
    } catch (err: any) {
      alert("Error al eliminar documentos: " + err.message);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "background.default" }}>
      {/* Sidebar */}
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          bgcolor: "grey.100",
          borderRight: 1,
          borderColor: "divider",
          transition: "width .3s ease",
          width: sidebarOpen ? 300 : 56,
          minWidth: sidebarOpen ? 300 : 56,
          p: sidebarOpen ? 2 : 1,
          overflowY: "auto",
        }}
      >
        <IconButton
          size="small"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </IconButton>

        {sidebarOpen && (
          <>
            <Typography variant="h6" fontWeight={700}>Grupo: {group.name}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
              <Button
                variant="contained"
                color="warning"
                startIcon={<Plus size={18} />}
                onClick={() => setIsModalOpen(true)}
              >
                Añadir documento
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={18} />}
                onClick={() => setDeleteModalOpen(true)}
              >
                Eliminar
              </Button>
            </Stack>

            <Divider sx={{ mb: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Listado de documentos</Typography>

            <List dense disablePadding>
              {groupedDocs.map((grouped) => {
                const active = selectedDoc?.id === grouped.pdf?.id;
                return (
                  <ListItemButton
                    key={grouped.name}
                    selected={active}
                    onClick={() => {
                      if (grouped.pdf) {
                        setSelectedDoc(grouped.pdf);
                        fetchSemanticGroupData(grouped.images);
                      }
                    }}
                    sx={{
                      mb: .5, border: 1, borderColor: active ? "secondary.main" : "divider",
                      borderRadius: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={700}>{grouped.name}</Typography>
                          {statusChip(grouped.pdf?.status)}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </>
        )}
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, p: 3 }}>
        {selectedDoc ? (
          <Box sx={{ display: "flex", gap: 3 }}>
            <Box sx={{ flex: 2, minWidth: 0 }}>
              <GroupedImageViewer
                files={groupedDocs.find(g => g.pdf?.id === selectedDoc.id)?.images || [selectedDoc]}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 280 }}>
              <DocInfoPanel selectedDoc={selectedDoc} semanticGroupData={semanticGroupData} />
            </Box>
          </Box>
        ) : (
          <Typography>Selecciona un documento para ver su contenido.</Typography>
        )}
      </Box>

      {/* Modales */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleFileUpload}
      />
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        documents={group.documents}
        onDelete={handleDeleteDocuments}
      />
    </Box>
  );
}
