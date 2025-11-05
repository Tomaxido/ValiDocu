import { baseURL } from '../utils/api';
import { authService } from './auth';

export interface Comment {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  text: string;
  timestamp: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  time_ago: string;
}

export interface CommentResponse {
  success: boolean;
  comment: Comment;
  message?: string;
}

export interface CommentsListResponse {
  success: boolean;
  comments: Comment[];
  total: number;
}

export interface CommentStatsResponse {
  success: boolean;
  stats: {
    total_comments: number;
    unique_commenters: number;
    last_comment_at: string | null;
  };
}

/**
 * Get all comments for a specific document version
 */
export async function getDocumentComments(documentVersionId: number): Promise<Comment[]> {
  const token = authService.getToken();
  
  const response = await fetch(
    `${baseURL}/api/v1/documents/versions/${documentVersionId}/comments`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener los comentarios');
  }

  const data: CommentsListResponse = await response.json();
  return data.comments;
}

/**
 * Create a new comment
 */
export async function createComment(
  documentVersionId: number,
  commentText: string
): Promise<Comment> {
  const token = authService.getToken();
  
  const response = await fetch(
    `${baseURL}/api/v1/documents/versions/${documentVersionId}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({ comment: commentText }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al crear el comentario');
  }

  const data: CommentResponse = await response.json();
  return data.comment;
}

/**
 * Update an existing comment
 */
export async function updateComment(
  commentId: string,
  commentText: string
): Promise<Comment> {
  const token = authService.getToken();
  
  const response = await fetch(
    `${baseURL}/api/v1/comments/${commentId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({ comment: commentText }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al actualizar el comentario');
  }

  const data: CommentResponse = await response.json();
  return data.comment;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<void> {
  const token = authService.getToken();
  
  const response = await fetch(
    `${baseURL}/api/v1/comments/${commentId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al eliminar el comentario');
  }
}

/**
 * Get comment statistics for a document version
 */
export async function getCommentStats(documentVersionId: number): Promise<CommentStatsResponse['stats']> {
  const token = authService.getToken();
  
  const response = await fetch(
    `${baseURL}/api/v1/documents/versions/${documentVersionId}/comments/stats`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener estadísticas');
  }

  const data: CommentStatsResponse = await response.json();
  return data.stats;
}
