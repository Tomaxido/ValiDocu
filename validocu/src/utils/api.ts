import type { DocumentGroup } from "./interfaces";

// let baseURL = "";
// if (process.env.NODE_ENV === "development") {
//     baseURL = process.env.REACT_APP_LOCAL_ADDRESS + baseURL;
// }

// TODO: arreglar
export const baseURL = "http://backend.test";


async function getJSON(url: string): Promise<any> {
    const res = await fetch(baseURL + url, { headers: { "Content-Type": "application/json" } });
    return await res.json();
} 

export async function getDocumentGroups(): Promise<DocumentGroup[]> {
    return await getJSON("/api/v1/documents") as DocumentGroup[];
}

export async function getDocumentGroupById(id: string | number): Promise<DocumentGroup> {
  return await getJSON(`/api/v1/documents/${id}`) as DocumentGroup;
}

export async function uploadDocumentsToGroup(grupoId: string | number, files: FileList): Promise<void> {
  const formData = new FormData();

  for (const file of Array.from(files)) {
    formData.append("documents[]", file);
  }

  const res = await fetch(`${baseURL}/api/v1/documents/${grupoId}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData?.message || "Error al subir documentos");
  }
}
