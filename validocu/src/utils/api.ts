import type { BoxAnnotation, DocumentGroup } from "./interfaces";

// let baseURL = "";
// if (process.env.NODE_ENV === "development") {
//     baseURL = process.env.REACT_APP_LOCAL_ADDRESS + baseURL;
// }

// TODO: arreglar
export const baseURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";


async function getJSON(url: string): Promise<any> {
	const res = await fetch(baseURL + url, { headers: { "Content-Type": "application/json" } });
	return await res.json();
}

async function post(url: string, body: any): Promise<void> {
	const res = await fetch(baseURL + url, { method: "POST", body: body });
	if (!res.ok) {
		const errorData = await res.json();
		throw new Error(errorData?.message ?? "Error al subir documentos");
	}
}

export async function getDocumentGroups(): Promise<DocumentGroup[]> {
	return await getJSON("/api/v1/documents") as DocumentGroup[];
}

export async function getDocumentGroupById(id: string | number): Promise<DocumentGroup> {
	return await getJSON(`/api/v1/documents/${id}`) as DocumentGroup;
}

export async function createGroup(grupoNombre: string, files: FileList): Promise<void> {
	const formData = new FormData();
	formData.append("group_name", grupoNombre);
	for (const file of Array.from(files)) {
		formData.append("documents[]", file);
	}

	await post(`/api/v1/documents/`, formData);
}

export async function uploadDocumentsToGroup(grupoId: string | number, files: FileList): Promise<void> {
	const formData = new FormData();
	for (const file of Array.from(files)) {
		formData.append("documents[]", file);
	}

	await post(`/api/v1/documents/${grupoId}`, formData);
}

export async function deleteDocuments(ids: number[]): Promise<void> {
  for (const id of ids) {
    const res = await fetch(`${baseURL}/api/v1/documents/file/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData?.message || `Error al eliminar documento ${id}`);
    }
  }
}

export async function buscarDocumentosPorTexto(texto: string): Promise<any[]> {
  const res = await fetch(`${baseURL}/api/v1/buscar-similar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData?.message || "Error al buscar documentos");
  }

  return await res.json();
}

export async function buscarJsonLayoutPorIdDocumento(id: number): Promise<BoxAnnotation[]> {
  const res = await fetch(`${baseURL}/api/v1/documents/${id}/layout`);

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData?.message || "Error al buscar documentos");
  }

  return await res.json();
}
