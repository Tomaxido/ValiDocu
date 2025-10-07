/**
 * Utilidades para manejar permisos de usuario en grupos
 */

import type { DocumentGroup } from './interfaces';

// Tipos de permisos definidos en el backend
export const PERMISSION_TYPES = {
  READ_ONLY: 0,
  EDIT: 1
} as const;

export type PermissionType = typeof PERMISSION_TYPES[keyof typeof PERMISSION_TYPES];

/**
 * Obtiene el texto descriptivo del tipo de permiso
 */
export function getPermissionTypeLabel(permissionType: number): string {
  switch (permissionType) {
    case PERMISSION_TYPES.READ_ONLY:
      return 'Solo lectura';
    case PERMISSION_TYPES.EDIT:
      return 'Lectura y edición';
    default:
      return 'Desconocido';
  }
}

/**
 * Obtiene el color del chip para el tipo de permiso
 */
export function getPermissionTypeColor(permissionType: number): 'info' | 'warning' {
  return permissionType === PERMISSION_TYPES.EDIT ? 'warning' : 'info';
}

/**
 * Verifica si un usuario puede editar en un grupo
 */
export function canUserEdit(group: DocumentGroup | null, userId?: string): boolean {
  if (!group || !userId) return false;
  
  // Si el usuario es el creador, siempre puede editar
  if (group.created_by === userId) {
    return true;
  }
  
  // Verificar si el grupo tiene la información de permisos del usuario
  return Boolean(group.user_can_edit);
}

/**
 * Verifica si un usuario tiene acceso a un grupo
 */
export function canUserAccess(group: DocumentGroup | null, userId?: string): boolean {
  if (!group || !userId) return false;
  
  // Si es un grupo público, todos tienen acceso de lectura
  if (!group.is_private) {
    return true;
  }
  
  // Si el usuario es el creador, siempre tiene acceso
  if (group.created_by === userId) {
    return true;
  }
  
  // Para grupos privados, verificar si el usuario está en la lista de miembros
  // Esta información debe venir del backend en la propiedad user_has_access o similar
  return Boolean(group.user_can_edit !== undefined); // Si tiene información de permisos, tiene acceso
}

/**
 * Obtiene el texto del estado de una solicitud
 */
export function getStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'approved':
      return 'Aprobada';
    case 'rejected':
      return 'Rechazada';
    default:
      return 'Desconocido';
  }
}

/**
 * Obtiene el color del chip para el estado de una solicitud
 */
export function getStatusColor(status: string): 'warning' | 'success' | 'error' | 'default' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Verifica si un usuario es el propietario de un grupo
 */
export function isGroupOwner(group: DocumentGroup | null, userId?: string): boolean {
  if (!group || !userId) return false;
  return group.created_by === userId;
}

/**
 * Formatea la información de usuario que solicita acceso
 */
export function formatRequestingUser(userRname?: string, userRemail?: string): string {
  if (!userRname && !userRemail) return 'Usuario desconocido';
  if (userRname && userRemail) return `${userRname} (${userRemail})`;
  return userRname || userRemail || 'Usuario desconocido';
}

/**
 * Validaciones para solicitudes de acceso
 */
export const requestValidations = {
  /**
   * Valida el email del usuario
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  /**
   * Valida el tipo de permiso
   */
  validatePermissionType(permissionType: number): boolean {
    return Object.values(PERMISSION_TYPES).includes(permissionType as PermissionType);
  },

  /**
   * Valida la razón de la solicitud
   */
  validateRequestReason(reason: string): boolean {
    return reason.trim().length <= 500; // Límite del backend
  }
};