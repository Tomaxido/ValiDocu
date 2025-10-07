import { useState, useEffect, useCallback } from 'react';
import { getPendingAccessRequests } from '../utils/api';

export interface PendingRequest {
  id: number;
  user_email: string;
  user_name?: string;
  group_name: string;
  group_id: number;
  permission_type: number;
  request_reason?: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

// Interfaz para los datos tal como vienen del backend
interface BackendRequest {
  id: number;
  group_id: number;
  requested_user_id: string;
  requesting_user_id: string;
  permission_type: number;
  request_reason?: string;
  status: number;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_comment: string | null;
  group: {
    id: number;
    name: string;
  };
  requested_user: {
    id: string;
    name: string;
    email: string;
  };
  requesting_user: {
    id: string;
    name: string;
    email: string;
  };
}

export function usePendingAccessRequests(isAdmin: boolean, refreshInterval: number = 30000) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
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
      const data: BackendRequest[] = await getPendingAccessRequests();
      
      // Mapear los datos del backend al formato esperado
      const mappedRequests: PendingRequest[] = data.map(request => ({
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