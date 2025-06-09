import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { baseURL, getDocumentGroupById, uploadDocumentsToGroup, deleteDocuments } from "../../utils/api";
import type { DocumentGroup, Document } from "../../utils/interfaces";
import UploadModal from "./UploadModal"; 
import DeleteModal from "./DeleteModal"; 
import PdfViewer from "./PDFViewer2"; 
import "./Grupo.css";

export default function Grupo() {
	const { grupoId } = useParams<{ grupoId: string }>();
	const [group, setGroup] = useState<DocumentGroup | null>(null);
	const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);


	useEffect(() => {
		if (grupoId) {
			getDocumentGroupById(grupoId).then((g) => {
				setGroup(g);
				if (g.documents.length > 0) setSelectedDoc(g.documents[0]);
				if (g.documents.length > 0) {
					setSelectedDoc(g.documents[0]);
				}
			});
		}

	}, [grupoId]);

	if (!group) return <p>Cargando grupo...</p>;

	const handleFileUpload = async (files: FileList) => {
		if (!grupoId) return;

		try {
			await uploadDocumentsToGroup(grupoId, files);
			const updatedGroup = await getDocumentGroupById(grupoId);
			setGroup(updatedGroup);
			setSelectedDoc(updatedGroup.documents.at(-1) || null);
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
			setSelectedDoc(updatedGroup.documents[0] || null);
		} catch (err: any) {
			alert("Error al eliminar documentos: " + err.message);
		}
	};

			


	return (
		<div className="grupo-layout">
		<aside className={`grupo-sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
			<button className="toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
			{sidebarOpen ? "◀" : "▶"}
			</button>
			{sidebarOpen && (
			<>
				<br></br>
				<h3>Grupo: {group.name}</h3>
				<h3>Listado de Documentos</h3>
				<ul>
					<p><button onClick={() => setIsModalOpen(true)}>+ Añadir documento</button></p>
					{group.documents.map((doc) => {
						const statusClass =
						doc.status === 1
							? "validado"
							: doc.status === 2
							? "rechazado"
							: "sin-procesar";

						return (
						<li key={doc.id} className={`doc-item ${statusClass}`}>
							<button
							onClick={() => setSelectedDoc(doc)}
							className={selectedDoc?.id === doc.id ? "active" : ""}
							>
							{doc.filename}
							</button>
						</li>
						);
					})}
				</ul>
				<p>
					<button onClick={() => setDeleteModalOpen(true)}>🗑 Eliminar documentos</button>
				</p>
			</>
			)}
		</aside>

		<div className="grupo-content">
			{selectedDoc ? (
			<div className="viewer-grid">
			<div className="pdf-viewer">
				<PdfViewer
				url={`${baseURL}/secure-pdf/${selectedDoc.filepath.split("/").pop()}`}
				/>
			</div>

			<div className="doc-info">
				<h3>{selectedDoc.filename}</h3>

				<p>
				<strong>Estado:</strong>{" "}
				{selectedDoc.status === 1
					? "✅ Validado"
					: selectedDoc.status === 2
					? "❌ Rechazado"
					: "🕓 Sin Revisar"}
				</p>

				<p>
				<strong>Subido:</strong>{" "}
				{new Date(selectedDoc.created_at).toLocaleString()}
				</p>
			</div>
			</div>
		)  : (
			<p>Selecciona un documento para ver su contenido.</p>
			)}
		</div>
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
		</div>	
	);
}
