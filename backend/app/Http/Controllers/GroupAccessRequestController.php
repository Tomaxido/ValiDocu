<?php

namespace App\Http\Controllers;

use App\Models\GroupAccessRequest;
use App\Models\DocumentGroup;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class GroupAccessRequestController extends Controller
{
    /**
     * Solicitar acceso para otro usuario a un grupo privado
     */
    public function requestAccess(Request $request, $groupId): JsonResponse
    {
        $request->validate([
            'user_email' => 'required|email|exists:users,email',
            'permission_type' => 'required|integer|in:0,1',
            'request_reason' => 'nullable|string|max:500'
        ]);

        $user = $request->user();
        $group = DocumentGroup::findOrFail($groupId);

        // Verificar que el grupo es privado
        if (!$group->isPrivate()) {
            return response()->json([
                'message' => 'No se pueden solicitar permisos para grupos públicos'
            ], 400);
        }

        // Verificar que el usuario es el propietario del grupo
        if ($group->created_by !== $user->id) {
            return response()->json([
                'message' => 'Solo el propietario del grupo puede solicitar acceso para otros usuarios'
            ], 403);
        }

        // Obtener el usuario solicitado
        $requestedUser = User::where('email', $request->user_email)->first();

        // Verificar que no es el mismo propietario
        if ($requestedUser->id === $user->id) {
            return response()->json([
                'message' => 'No puedes solicitar acceso para ti mismo'
            ], 400);
        }

        // Verificar que no ya tiene acceso al grupo
        if ($group->userHasAccess($requestedUser->id)) {
            return response()->json([
                'message' => 'El usuario ya tiene acceso a este grupo'
            ], 400);
        }

        // Verificar que no hay una solicitud pendiente
        $existingRequest = GroupAccessRequest::where('group_id', $groupId)
            ->where('requested_user_id', $requestedUser->id)
            ->where('status', GroupAccessRequest::STATUS_PENDING)
            ->first();

        if ($existingRequest) {
            return response()->json([
                'message' => 'Ya existe una solicitud pendiente para este usuario'
            ], 400);
        }

        // Crear la solicitud
        $accessRequest = GroupAccessRequest::create([
            'group_id' => $groupId,
            'requested_user_id' => $requestedUser->id,
            'requesting_user_id' => $user->id,
            'permission_type' => $request->permission_type,
            'request_reason' => $request->request_reason
        ]);

        return response()->json([
            'message' => 'Solicitud de acceso enviada correctamente',
            'request' => $accessRequest->load(['requestedUser', 'group'])
        ]);
    }

    /**
     * Obtener todas las solicitudes pendientes (solo para administradores)
     */
    public function getPendingRequests(Request $request): JsonResponse
    {
        $user = $request->user();

        // TODO: Verificar que el usuario es administrador
        // Por ahora, asumimos que cualquier usuario puede ver las solicitudes pendientes

        $pendingRequests = GroupAccessRequest::with([
            'group',
            'requestedUser',
            'requestingUser'
        ])
        ->pending()
        ->orderBy('created_at', 'asc') // Ordenar por antigüedad como especifica el criterio
        ->get();

        return response()->json([
            'requests' => $pendingRequests
        ]);
    }

    /**
     * Aprobar o rechazar una solicitud de acceso (solo para administradores)
     */
    public function reviewRequest(Request $request, $requestId): JsonResponse
    {
        $request->validate([
            'action' => 'required|string|in:approve,reject',
            'admin_comment' => 'nullable|string|max:500'
        ]);

        $user = $request->user();
        
        // TODO: Verificar que el usuario es administrador
        // Por ahora, asumimos que cualquier usuario puede revisar solicitudes

        $accessRequest = GroupAccessRequest::with(['group', 'requestedUser', 'requestingUser'])
            ->findOrFail($requestId);

        // Verificar que la solicitud está pendiente
        if ($accessRequest->status !== GroupAccessRequest::STATUS_PENDING) {
            return response()->json([
                'message' => 'Esta solicitud ya ha sido revisada'
            ], 400);
        }

        DB::beginTransaction();
        try {
            if ($request->action === 'approve') {
                // Aprobar la solicitud
                $accessRequest->update([
                    'status' => GroupAccessRequest::STATUS_APPROVED,
                    'reviewed_by' => $user->id,
                    'reviewed_at' => now(),
                    'admin_comment' => $request->admin_comment
                ]);

                // Agregar el usuario al grupo con los permisos especificados
                $accessRequest->group->users()->attach($accessRequest->requested_user_id, [
                    'active' => 1,
                    'managed_by' => $user->id,
                    'can_edit' => $accessRequest->permission_type
                ]);

                $message = 'Solicitud aprobada y usuario agregado al grupo';
            } else {
                // Rechazar la solicitud
                $accessRequest->update([
                    'status' => GroupAccessRequest::STATUS_REJECTED,
                    'reviewed_by' => $user->id,
                    'reviewed_at' => now(),
                    'admin_comment' => $request->admin_comment
                ]);

                $message = 'Solicitud rechazada';
            }

            DB::commit();

            return response()->json([
                'message' => $message,
                'request' => $accessRequest->fresh(['group', 'requestedUser', 'requestingUser', 'reviewedBy'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error reviewing access request: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Error al procesar la solicitud'
            ], 500);
        }
    }

    /**
     * Obtener el historial de solicitudes para un grupo específico
     */
    public function getGroupRequestHistory(Request $request, $groupId): JsonResponse
    {
        $user = $request->user();
        $group = DocumentGroup::findOrFail($groupId);

        // Verificar que el usuario tiene acceso al grupo
        if (!$group->userHasAccess($user->id)) {
            return response()->json([
                'message' => 'No tienes acceso a este grupo'
            ], 403);
        }

        $requests = GroupAccessRequest::with([
            'requestedUser',
            'requestingUser',
            'reviewedBy'
        ])
        ->where('group_id', $groupId)
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json([
            'requests' => $requests
        ]);
    }

    /**
     * Obtener las solicitudes realizadas por el usuario actual
     */
    public function getMyRequests(Request $request): JsonResponse
    {
        $user = $request->user();

        $requests = GroupAccessRequest::with([
            'group',
            'requestedUser',
            'reviewedBy'
        ])
        ->where('requesting_user_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json([
            'requests' => $requests
        ]);
    }
}