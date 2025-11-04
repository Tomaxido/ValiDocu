import { useState, useEffect, useCallback } from 'react';
import { getPendingAccessRequests } from '../utils/api';
import type { AccessRequest } from '../utils/interfaces';

export interface MappedAccessRequest {
  id: number;
  user_email: string;
  user_name?: string;
  user_rname?: string; // Nombre del usuario que solicita
  user_remail?: string; // Email del usuario que solicita
  group_name: string;
  group_id: number;
  permission_type: number;
  request_reason?: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function usePendingAccessRequests(isAdmin: boolean, refreshInterval: number = 30000) {
  const [requests, setRequests] = useState<MappedAccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!isAdmin) {
      setRequests([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data: AccessRequest[] = await getPendingAccessRequests();
      
      // Mapear los datos del backend al formato esperado
      // TODO: ¿no debería el backend retornar los datos directamente en este formato en vez de hacer que el frontend los mapee?
      const mappedRequests: MappedAccessRequest[] = data.map(request => ({
        id: request.id,
        user_email: request.requested_user.email,
        user_name: request.requested_user.name,
        user_rname: request.requesting_user.name,
        user_remail: request.requesting_user.email,
        group_name: request.group.name,
        group_id: request.group_id,
        permission_type: request.permission_type,
        request_reason: request.request_reason,
        created_at: request.created_at,
        status: request.status === 0 ? 'pending' : request.status === 1 ? 'approved' : 'rejected'
      }));
      
      setRequests(mappedRequests);
    } catch (err: any) {
      setError(err.message || 'Error al cargar solicitudes pendientes');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchRequests();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchRequests, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchRequests, refreshInterval]);

  return {
    requests,
    loading,
    error,
    count: requests.length,
    refresh: fetchRequests
  };
}