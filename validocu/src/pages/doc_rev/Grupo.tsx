import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDocumentGroupById, uploadDocumentsToGroup, deleteDocuments } from "../../utils/api";
import type { DocumentGroup, Document, GroupedDocument } from "../../utils/interfaces";
import UploadModal from "./UploadModal";
import DeleteModal from "./DeleteModal";
import GroupedImageViewer from "./GroupedImageViewer";

import "./Grupo.css";


function groupDocuments(documents: Document[]): GroupedDocument[] {
	const groups: { [key: string]: Document[] } = {};

	for (const doc of documents) {
		if (doc.filename.toLowerCase().endsWith(".pdf")) continue;

		const match = RegExp(/^(.+?)_p\d+\.(png|jpg|jpeg)$/i).exec(doc.filename);
		const key = match ? match[1] : doc.filename;

		if (!groups[key]) {
			groups[key] = [];
		}
		groups[key].push(doc);
	}

	return Object.entries(groups).map(([key, files]) => ({
		name: key,
		files,
		representative: files[0], // Usamos el primero como ítem clickeable
	}));
}

export default function Grupo() {
	const { grupoId } = useParams<{ grupoId: string }>();
	const [group, setGroup] = useState<DocumentGroup | null>(null);
	const [groupedDocs, setGroupedDocs] = useState<GroupedDocument[]>([]);
	const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);

	useEffect(() => {
		if (grupoId) {
			getDocumentGroupById(grupoId).then((g) => {
				console.log("Archivos recibidos:", g);
				setGroup(g);
				const grouped = groupDocuments(g.documents);
				setGroupedDocs(grouped);
				if (grouped.length > 0) setSelectedDoc(grouped[0].representative);
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
			const grouped = groupDocuments(updatedGroup.documents);
			setGroupedDocs(grouped);
			setSelectedDoc(grouped.at(-1)?.representative || null);
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
			setSelectedDoc(grouped[0]?.representative || null);
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
						<br />
						<h3>Grupo: {group.name}</h3>
						<h3>Listado de Documentos</h3>
						<ul>
							<p><button onClick={() => setIsModalOpen(true)}>+ Añadir documento</button></p>
							{groupedDocs.map((grouped) => {
								const statusClass =
									grouped.representative.status === 1
										? "validado"
										: grouped.representative.status === 2
										? "rechazado"
										: "sin-procesar";

								return (
									<li key={grouped.representative.id} className={`doc-item ${statusClass}`}>
										<button
											onClick={() => setSelectedDoc(grouped.representative)}
											className={selectedDoc?.id === grouped.representative.id ? "active" : ""}
										>
											{grouped.name}
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
							<GroupedImageViewer
								files={groupedDocs.find(g => g.representative.id === selectedDoc.id)?.files || [selectedDoc]}
							/>
						</div>

						<div className="doc-info">
							<h3>{selectedDoc.filename}</h3>
							<p><strong>Estado:</strong>{" "}
								{selectedDoc.status === 1
									? "✅ Validado"
									: selectedDoc.status === 2
										? "❌ Rechazado"
										: "🕓 Sin Revisar"}
							</p>
							<p><strong>Subido:</strong> {new Date(selectedDoc.created_at).toLocaleString()}</p>
						</div>
					</div>
				) : (
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
