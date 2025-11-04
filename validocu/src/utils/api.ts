import type { BoxAnnotation, Document, DocumentGroup, ExpiredDocumentResponse, SemanticGroup, DocAnalysisNotification, DashboardFilters, DashboardMetrics, ChartData, UserPerformance, GroupPerformance, DashboardFilterOptions, AccessRequest } from "./interfaces";
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

  async function postFormData(url: string, formData: FormData): Promise<any> {
    const token = authService.getToken();
    const headers: HeadersInit = {};
    
    // Para FormData NO establecer Content-Type, el navegador lo hace automáticamente
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(baseURL + url, { 
      method: "POST", 
      headers,
      body: formData 
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
  
  async function patchJSON(url: string, body: any): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch(baseURL + url, {
      method: "PATCH",
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
  
  export async function createGroup(grupoNombre: string, files: FileList, isPrivate: boolean = false): Promise<{ group_id: number }> {
    const formData = new FormData();
    formData.append("group_name", grupoNombre);
    formData.append("is_private", isPrivate ? "1" : "0");
    for (const file of Array.from(files)) {
      formData.append("documents[]", file);
    }
    
    const response = await postFormData(`/api/v1/documents`, formData);
    return response;
  }
  
  export async function uploadDocumentsToGroup(grupoId: string | number, files: FileList): Promise<void> {
    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("documents[]", file);
    }
    
    await postFormData(`/api/v1/documents/${grupoId}`, formData);
    return;
  }
  
  export async function uploadNewDocumentVersion(
    documentId: string | number, 
    file: File, 
    comment: string
  ): Promise<{ success: boolean; message: string; document_id: number }> {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("comment", comment);
    
    const response = await postFormData(`/api/v1/documents/${documentId}/version`, formData);
    return response;
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

  export async function buscarJsonLayoutPorIdDocumento(id: number, versionId: number, pageId: number): Promise<BoxAnnotation[]> {
    console.log("bucando layout con parametros docId:", id, " versionId:", versionId, " pageId: ", pageId);
    const res = await fetch(`${baseURL}/api/v1/documents/${id}/version/${versionId}/page/${pageId}/layout`);
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData?.message || "Error al buscar documentos");
    }
    
    return await res.json();
  }
  
  export async function buscaDocJsonLayoutPorIdDocumento(id: number): Promise<BoxAnnotation[]> {
    const res = await fetch(`${baseURL}/api/v1/documents/${id}/layout-doc`);
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData?.message || "Error al buscar layout del documento");
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

export async function getGroupConfigurationHistory(groupId: number): Promise<any> {
  return getJSON(`/api/v1/groups/${groupId}/configuration/history`);
}

// === Gestión de solicitudes de acceso a grupos ===

export async function requestGroupAccess(groupId: string | number, userEmail: string, permissionType: number, requestReason?: string): Promise<any> {
  const body = {
    user_email: userEmail,
    permission_type: permissionType,
    request_reason: requestReason
  };
  
  return await postJSON(`/api/v1/groups/${groupId}/request-access`, body);
}

export async function getPendingAccessRequests(): Promise<AccessRequest[]> {
  const response = await getJSON('/api/v1/admin/access-requests/pending');
  return response.requests || [];
}

export async function reviewAccessRequest(requestId: string | number, action: 'approve' | 'reject', adminComment?: string): Promise<any> {
  const body = {
    action,
    admin_comment: adminComment
  };
  
  return await patchJSON(`/api/v1/admin/access-requests/${requestId}/review`, body);
}

export async function getGroupRequestHistory(groupId: string | number): Promise<any> {
  return await getJSON(`/api/v1/groups/${groupId}/access-requests`);
}

// === Información detallada del grupo ===

export async function getGroupDetails(groupId: string | number): Promise<any> {
  return await getJSON(`/api/v1/groups/${groupId}/details`);
}

export async function getGroupMembers(groupId: string | number): Promise<any> {
  return await getJSON(`/api/v1/groups/${groupId}/members`);
}

export async function getMyAccessRequests(): Promise<any> {
  return await getJSON('/api/v1/my-access-requests');
}

// === Búsqueda de usuarios ===

export async function searchUsers(query: string): Promise<{ id: string; email: string; name?: string }[]> {
  if (!query.trim()) return [];
  
  try {
    return await getJSON(`/api/v1/users/search?q=${encodeURIComponent(query)}`);
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

// === Verificación de acceso a grupos ===

export async function checkGroupAccess(groupId: string): Promise<{ hasAccess: boolean; reason?: string }> {
  try {
    return await getJSON(`/api/v1/groups/${groupId}/check-access`);
  } catch (error: any) {
    // Si hay error 403, el usuario no tiene acceso
    if (error.status === 403) {
      return { hasAccess: false, reason: 'access_denied' };
    }
    // Si hay error 404, el grupo no existe
    if (error.status === 404) {
      return { hasAccess: false, reason: 'group_not_found' };
    }
    throw error;
  }
}

export async function getUserNotifications(): Promise<DocAnalysisNotification[]> {
  try {
    return await getJSON('/api/v1/notifications');
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    throw error;
  }
}

export async function markNotificationsAsRead(notifications: DocAnalysisNotification[]): Promise<void> {
  try {
    await postJSON('/api/v1/notifications/mark-as-read', { notifications });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    throw error;
  }
}

// ============================================
// Dashboard Ejecutivo - HDU 13
// ============================================

/**
 * Helper para construir query string de filtros con cache-busting
 */
function buildFilterQueryString(filters: DashboardFilters): string {
  const params = new URLSearchParams();
  
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.group_ids?.length) params.append('group_ids', filters.group_ids.join(','));
  if (filters.user_ids?.length) params.append('user_ids', filters.user_ids.join(','));
  if (filters.document_type_ids?.length) params.append('document_type_ids', filters.document_type_ids.join(','));
  
  // Agregar timestamp para evitar caché del navegador
  params.append('_t', Date.now().toString());
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Obtener métricas principales del dashboard
 */
export async function getDashboardMetrics(filters: DashboardFilters = {}): Promise<DashboardMetrics> {
  try {
    const queryString = buildFilterQueryString(filters);
    const response = await getJSON(`/api/v1/dashboard/metrics${queryString}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    throw error;
  }
}

/**
 * Obtener distribución de documentos por estado
 */
export async function getDocumentsByStatus(filters: DashboardFilters = {}): Promise<ChartData> {
  try {
    const queryString = buildFilterQueryString(filters);
    const response = await getJSON(`/api/v1/dashboard/charts/documents-by-status${queryString}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching documents by status:", error);
    throw error;
  }
}

/**
 * Obtener distribución de documentos por tipo
 */
export async function getDocumentsByType(filters: DashboardFilters = {}): Promise<ChartData> {
  try {
    const queryString = buildFilterQueryString(filters);
    const response = await getJSON(`/api/v1/dashboard/charts/documents-by-type${queryString}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching documents by type:", error);
    throw error;
  }
}

/**
 * Obtener tendencia de tiempo ahorrado
 */
export async function getTimeSavedTrend(filters: DashboardFilters = {}): Promise<ChartData> {
  try {
    const queryString = buildFilterQueryString(filters);
    const response = await getJSON(`/api/v1/dashboard/charts/time-saved-trend${queryString}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching time saved trend:", error);
    throw error;
  }
}

/**
 * Obtener rendimiento por usuario
 */
export async function getUserPerformance(filters: DashboardFilters = {}): Promise<{ users: UserPerformance[] }> {
  try {
    const queryString = buildFilterQueryString(filters);
    const response = await getJSON(`/api/v1/dashboard/charts/user-performance${queryString}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user performance:", error);
    throw error;
  }
}

/**
 * Obtener rendimiento por grupo
 */
export async function getGroupPerformance(filters: DashboardFilters = {}): Promise<{ groups: GroupPerformance[] }> {
  try {
    const queryString = buildFilterQueryString(filters);
    const response = await getJSON(`/api/v1/dashboard/charts/group-performance${queryString}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching group performance:", error);
    throw error;
  }
}

/**
 * Obtener opciones disponibles para filtros
 */
export async function getDashboardFilterOptions(): Promise<DashboardFilterOptions> {
  try {
    const response = await getJSON('/api/v1/dashboard/filters/available');
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard filter options:", error);
    throw error;
  }
}
