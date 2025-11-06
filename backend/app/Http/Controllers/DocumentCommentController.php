<?php

namespace App\Http\Controllers;

use App\Models\DocumentComment;
use App\Models\DocumentVersion;
use App\Events\CommentCreated;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DocumentCommentController extends Controller
{
    /**
     * Get all comments for a specific document version
     * Ordered chronologically (oldest first by default)
     *
     * @param int $documentVersionId
     * @return JsonResponse
     */
    public function index(int $documentVersionId): JsonResponse
    {
        try {
            // Verify document version exists
            $documentVersion = DocumentVersion::findOrFail($documentVersionId);

            // Get comments with user information
            $comments = DocumentComment::forDocumentVersion($documentVersionId)
                ->with(['user:id,name,email'])
                ->oldest() // Orden cronológico (más antiguo primero)
                ->get()
                ->map(function ($comment) {
                    return [
                        'id' => (string) $comment->id,
                        'user' => [
                            'id' => $comment->user->id,
                            'name' => $comment->user->name,
                            'email' => $comment->user->email,
                        ],
                        'text' => $comment->comment,
                        'timestamp' => $comment->created_at->toIso8601String(),
                        'is_edited' => $comment->is_edited === 1,
                        'created_at' => $comment->created_at->toIso8601String(),
                        'updated_at' => $comment->updated_at->toIso8601String(),
                        'time_ago' => $comment->time_ago,
                    ];
                });

            return response()->json([
                'success' => true,
                'comments' => $comments,
                'total' => $comments->count(),
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching comments', [
                'document_version_id' => $documentVersionId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los comentarios',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a new comment
     *
     * @param Request $request
     * @param int $documentVersionId
     * @return JsonResponse
     */
    public function store(Request $request, int $documentVersionId): JsonResponse
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'comment' => 'required|string|min:1|max:5000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos inválidos',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Verify document version exists
            $documentVersion = DocumentVersion::findOrFail($documentVersionId);

            // Get authenticated user
            $user = Auth::user();

            // Create comment
            $comment = DocumentComment::create([
                'document_version_id' => $documentVersionId,
                'user_id' => $user->id,
                'comment' => trim($request->comment),
                'is_edited' => 0,
            ]);

            // Load user relation
            $comment->load('user:id,name,email');

            // Get document information for notification
            $documentVersion->load(['document.group.users', 'document.documentType']);
            $document = $documentVersion->document;
            $group = $document->group;

            // Determine which users should receive notification
            // All users in the group EXCEPT the comment author
            $notifiableUsers = $group->users()
                ->where('users.id', '!=', $user->id) // Excluir al autor del comentario
                ->where('users_groups.active', 1) // Solo usuarios activos
                ->get();

            // Create notification records in notification_history
            foreach ($notifiableUsers as $notifiedUser) {
                DB::table('notification_history')->insert([
                    'user_id' => $notifiedUser->id,
                    'type' => 'comment',
                    'message' => json_encode([
                        'comment_id' => $comment->id,
                        'document_version_id' => $documentVersion->id,
                        'document_id' => $document->id,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                        'document_name' => $documentVersion->filename,
                        'document_type' => $document->documentType?->name ?? 'Documento',
                        'comment_text' => strlen($comment->comment) > 100
                            ? substr($comment->comment, 0, 100) . '...'
                            : $comment->comment,
                        'author_name' => $user->name,
                        'author_id' => $user->id,
                    ]),
                    'is_read' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Prepare notification message for WebSocket broadcast
            $notificationMessage = [
                'type' => 'comment',
                'message' => "{$user->name} comentó en {$documentVersion->filename}",
                'group' => [
                    'id' => $group->id,
                    'name' => $group->name,
                ],
                'document' => [
                    'id' => $document->id,
                    'name' => $documentVersion->filename,
                    'type' => $document->documentType?->name ?? 'Documento',
                ],
                'author' => [
                    'id' => $user->id,
                    'name' => $user->name,
                ],
            ];

            // Broadcast event to WebSocket channel
            event(new CommentCreated($comment, $documentVersion, $notificationMessage));

            return response()->json([
                'success' => true,
                'message' => 'Comentario creado exitosamente',
                'comment' => [
                    'id' => (string) $comment->id,
                    'user' => [
                        'id' => $comment->user->id,
                        'name' => $comment->user->name,
                        'email' => $comment->user->email,
                    ],
                    'text' => $comment->comment,
                    'timestamp' => $comment->created_at->toIso8601String(),
                    'is_edited' => false,
                    'created_at' => $comment->created_at->toIso8601String(),
                    'updated_at' => $comment->updated_at->toIso8601String(),
                    'time_ago' => $comment->time_ago,
                ],
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error creating comment', [
                'document_version_id' => $documentVersionId,
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear el comentario',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update an existing comment
     *
     * @param Request $request
     * @param int $commentId
     * @return JsonResponse
     */
    public function update(Request $request, int $commentId): JsonResponse
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'comment' => 'required|string|min:1|max:5000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos inválidos',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Find comment
            $comment = DocumentComment::findOrFail($commentId);

            // Check if user can edit this comment
            $user = Auth::user();
            if (!$comment->canBeEditedBy($user->id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para editar este comentario',
                ], 403);
            }

            // Update comment
            $comment->update([
                'comment' => trim($request->comment),
                'is_edited' => 1,
            ]);

            // Reload user relation
            $comment->load('user:id,name,email');

            return response()->json([
                'success' => true,
                'message' => 'Comentario actualizado exitosamente',
                'comment' => [
                    'id' => (string) $comment->id,
                    'user' => [
                        'id' => $comment->user->id,
                        'name' => $comment->user->name,
                        'email' => $comment->user->email,
                    ],
                    'text' => $comment->comment,
                    'timestamp' => $comment->created_at->toIso8601String(),
                    'is_edited' => $comment->is_edited === 1,
                    'created_at' => $comment->created_at->toIso8601String(),
                    'updated_at' => $comment->updated_at->toIso8601String(),
                    'time_ago' => $comment->time_ago,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating comment', [
                'comment_id' => $commentId,
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el comentario',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a comment (soft delete)
     *
     * @param int $commentId
     * @return JsonResponse
     */
    public function destroy(int $commentId): JsonResponse
    {
        try {
            // Find comment
            $comment = DocumentComment::findOrFail($commentId);

            // Check if user can delete this comment
            $user = Auth::user();
            if (!$comment->canBeDeletedBy($user->id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para eliminar este comentario',
                ], 403);
            }

            // Soft delete comment
            $comment->delete();

            return response()->json([
                'success' => true,
                'message' => 'Comentario eliminado exitosamente',
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting comment', [
                'comment_id' => $commentId,
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el comentario',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get comment statistics for a document version
     *
     * @param int $documentVersionId
     * @return JsonResponse
     */
    public function stats(int $documentVersionId): JsonResponse
    {
        try {
            // Verify document version exists
            $documentVersion = DocumentVersion::findOrFail($documentVersionId);

            $stats = [
                'total_comments' => DocumentComment::forDocumentVersion($documentVersionId)->count(),
                'unique_commenters' => DocumentComment::forDocumentVersion($documentVersionId)
                    ->distinct('user_id')
                    ->count('user_id'),
                'last_comment_at' => DocumentComment::forDocumentVersion($documentVersionId)
                    ->latest('created_at')
                    ->value('created_at'),
            ];

            return response()->json([
                'success' => true,
                'stats' => $stats,
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching comment stats', [
                'document_version_id' => $documentVersionId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
