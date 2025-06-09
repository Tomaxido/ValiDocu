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
