import type { BoxAnnotation, Document, DocumentGroup, ExpiredDocumentResponse, SemanticGroup, GroupConfigurationResponse, DocumentTypeWithFields } from "./interfaces";
import { authService } from "../api/auth";

// let baseURL = "";
// if (process.env.NODE_ENV === "development") {
  //     baseURL = process.env.REACT_APP_LOCAL_ADDRESS + baseURL;
  // }
  
  // TODO: arreglar
  export const baseURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
  
  
  async function getAuthHeaders(): Promise<HeadersInit> {
    const token = authService.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    return headers;
  }
  
  async function getJSON(url: string): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch(baseURL + url, { headers });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData?.message ?? "Error en la petición");
    }
    return await res.json();
  }
  
  async function post(url: string, body: any): Promise<any> {
    const token = authService.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(baseURL + url, { 
      method: "POST", 
      headers,
      body: body 
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData?.message ?? "Error al subir documentos");
    }
    return await res.json();
  }
  
  async function postJSON(url: string, body: any): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch(baseURL + url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData?.message ?? "Error en la petición");
    }
    return await res.json();
  }
  
  export async function getSemanticGroupData(documents: Document[]): Promise<SemanticGroup[]> {
    const ids = documents.map(doc => doc.id);
    const data = await postJSON("/api/v1/semantic-data/by-filenames", { ids: ids });
    for (const semanticGroup of data) {
      semanticGroup.json_layout = JSON.parse(semanticGroup.json_layout);
    }
    return data as SemanticGroup[];
  }
  
  export async function getDocumentGroups(): Promise<DocumentGroup[]> {
    return await getJSON("/api/v1/documents") as DocumentGroup[];
  }
  
  export async function getDocumentGroupById(idGrupo: string | number): Promise<DocumentGroup> {
    return await getJSON(`/api/v1/documents/${idGrupo}`) as DocumentGroup;
  }
  
  export async function createGroup(grupoNombre: string, files: FileList): Promise<{ group_id: number }> {
    const formData = new FormData();
    formData.append("group_name", grupoNombre);
    for (const file of Array.from(files)) {
      formData.append("documents[]", file);
    }
    
    const response = await post(`/api/v1/documents/`, formData);
    return response;
  }
  
  export async function uploadDocumentsToGroup(grupoId: string | number, files: FileList): Promise<void> {
    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("documents[]", file);
    }
    
    await post(`/api/v1/documents/${grupoId}`, formData);
    return;
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
  
  export async function obtenerDocumentosVencidos(): Promise<ExpiredDocumentResponse> {
    return await getJSON(`/api/v1/documentos_vencidos`);
  }
  
  export async function marcarDocumentosVencidos(): Promise<void> {
    await post(`/api/v1/documentos_vencidos`, "");
    return;
  }
  
  
  export async function obtenerDocumentosVencidosDeGrupo(idGrupo: string | number): Promise<ExpiredDocumentResponse> {
    return await getJSON(`/api/v1/documents/group/${idGrupo}/vencidos`);
  }
  
  export type Filters = { value: number | string; label: string };
  
  export async function getDocumentFilters(): Promise<{
    status_values: Filters[];
    doc_type_values: Filters[];
    normative_gap_values: Filters[];
  }> {
    const res = await fetch(`${baseURL}/api/v1/document-filters`);
    if (!res.ok) throw new Error("No se pudo obtener filtros");
    return await res.json();
  }

export interface SemanticRow {
  id: number;
  resumen: string | null;
  archivo: string | null;
  document_id: number;
  document_group_id: number | null;
  document_name: string | null;
  due_date: number | null;
  tipo: number | null;
  normative_gap: number | null;
  group_name: string | null;
  score?: number; // 0..1
}

export async function buscarSemanticaConFiltros(params: {
  texto: string;
  status?: (number | string)[];
  doc_type?: number[];
  normative_gap?: number[];
  min_score?: number; // opcional (default 0.4 en backend)
  limit?: number;     // opcional (default 10 en backend)
}): Promise<SemanticRow[]> {
  const res = await fetch(`${baseURL}/api/v1/buscar-similar-filtros`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  // Tu backend retorna directamente el array ($resultados)
  const data = await res.json();
  // Si en algún momento lo envías como {results: [...]}, esto lo tolera:
  return Array.isArray(data) ? data : (data.results ?? []);
}

// Funciones para configuración de grupos
export async function getGroupConfiguration(groupId: number): Promise<any> {
  return getJSON(`/api/v1/groups/${groupId}/configuration`);
}

export async function getAllAvailableDocumentTypes(): Promise<any> {
  return getJSON(`/api/v1/document-types/available`);
}

export async function getAvailableDocumentTypes(groupId: number): Promise<any> {
  return getJSON(`/api/v1/groups/${groupId}/document-types`);
}

export async function updateGroupConfiguration(groupId: number, configuration: any): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${baseURL}/api/v1/groups/${groupId}/configuration`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ configurations: configuration })
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData?.message ?? "Error al actualizar configuración");
  }
  
  return await res.json();
}

export async function getDefaultConfiguration(): Promise<any> {
  return getJSON("/api/v1/groups/configuration/defaults");
}

export async function initializeGroupConfiguration(groupId: number): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${baseURL}/api/v1/groups/${groupId}/initialize-configuration`, {
    method: "POST",
    headers
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData?.message ?? "Error al inicializar configuración");
  }
  
  return await res.json();
}