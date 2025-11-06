<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Controllers\AnalysisController;
use App\Models\DocumentGroup;
use App\Models\Document;
use App\Services\GroupValidationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StandaloneDocumentController extends Controller
{
    protected GroupValidationService $groupValidationService;

    public function __construct(GroupValidationService $groupValidationService)
    {
        $this->groupValidationService = $groupValidationService;
    }

    public function addToExistingGroup(Request $request, int $groupId)
    {
        $data = $request->validate([
            'document_ids' => 'required|array',
            'document_ids.*' => 'integer|exists:documents,id',
        ]);

        DB::transaction(function () use ($groupId, $data) {
            Document::whereIn('id', $data['document_ids'])
                ->update([
                    'document_group_id' => $groupId,
                ]);
            // Actualizar tabla semantic_doc_index para los documentos movidos y actualizar valor de document_group_id
            DB::table('semantic_doc_index')
                ->whereIn('document_version_id', function ($query) use ($data) {
                    $query->select('dv.id')
                        ->from('document_versions as dv')
                        ->join('documents as d', 'd.id', '=', 'dv.document_id')
                        ->whereIn('d.id', $data['document_ids'])
                        ->where('dv.is_current', true);
                })
                ->update([
                    'document_group_id' => $groupId,
                ]);
            // Lo mismo para semantic_index
            DB::table('semantic_index')
                ->whereIn('document_version_id', function ($query) use ($data) {
                    $query->select('dv.id')
                        ->from('document_versions as dv')
                        ->join('documents as d', 'd.id', '=', 'dv.document_id')
                        ->whereIn('d.id', $data['document_ids'])
                        ->where('dv.is_current', true);
                })
                ->update([
                    'document_group_id' => $groupId,
                ]);
            // opcional: log, auditar, despachar jobs para re-análisis
            Log::info('Documents moved to group ' . $groupId, ['documents' => $data['document_ids']]);
        });

        try {
            app()->make(AnalysisController::class)->regenerateGroupSuggestions($groupId);
        } catch (\Exception $e) {
            Log::error("Error regenerando sugerencias para grupo {$groupId}: " . $e->getMessage());
        }

        return response()->json(['ok' => true]);
    }

    // Si tu store ya existe, añade manejo de document_ids
    public function addToNewGroup(Request $request)
    {
        $payload = $request->validate([
            'name' => 'required|string|max:255',
            'is_private' => 'nullable|boolean',
            'document_ids' => 'nullable|array',
            'document_ids.*' => 'integer|exists:documents,id',
        ]);
        $user = $request->user();

        $group = DocumentGroup::create([
            'name' => $payload['name'],
            'status' => 0,
            'is_private' => $payload['is_private'],
            'created_by' => $user->id,
        ]);

        // Añadir el usuario autenticado como propietario del grupo
        $group->users()->attach($user->id, [
            'active' => 1, // puede ver (predeterminado para quien lo crea)
            'managed_by' => $user->id, // quien lo aprobó (él mismo)
            'can_edit' => 1 // el creador siempre puede editar
        ]);

        if (!empty($payload['document_ids'])) {
            Document::whereIn('id', $payload['document_ids'])
                ->update(['document_group_id' => $group->id]);
            // Actualizar tabla semantic_doc_index para los documentos movidos y actualizar valor de document_group_id
            DB::table('semantic_doc_index')
                ->whereIn('document_version_id', function ($query) use ($payload) {
                    $query->select('dv.id')
                        ->from('document_versions as dv')
                        ->join('documents as d', 'd.id', '=', 'dv.document_id')
                        ->whereIn('d.id', $payload['document_ids'])
                        ->where('dv.is_current', true);
                })
                ->update([
                    'document_group_id' => $group->id,
                ]);
            // Lo mismo para semantic_index
            DB::table('semantic_index')
                ->whereIn('document_version_id', function ($query) use ($payload) {
                    $query->select('dv.id')
                        ->from('document_versions as dv')
                        ->join('documents as d', 'd.id', '=', 'dv.document_id')
                        ->whereIn('d.id', $payload['document_ids'])
                        ->where('dv.is_current', true);
                })
                ->update([
                    'document_group_id' => $group->id,
                ]);
        }

        // Inicializar configuración por defecto si no existe
        if (!$this->groupValidationService->hasGroupConfiguration($group->id)) {
            $this->groupValidationService->initializeGroupConfiguration($group->id);
        }

        try {
            app()->make(AnalysisController::class)->regenerateGroupSuggestions($group->id);
        } catch (\Exception $e) {
            Log::error("Error regenerando sugerencias para grupo {$group->id}: " . $e->getMessage());
        }

        return response()->json(["group" => $group], 201);
    }
}
