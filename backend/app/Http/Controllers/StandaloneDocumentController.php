<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Controllers\AnalysisController;
use App\Models\DocumentGroup;
use App\Models\Document;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StandaloneDocumentController extends Controller
{
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

        $group = DocumentGroup::create([
            'name' => $payload['name'],
            'is_private' => $payload['is_private'],
            'created_by' => $request->user()->id ?? null,
        ]);

        if (!empty($payload['document_ids'])) {
            Document::whereIn('id', $payload['document_ids'])
                ->update(['document_group_id' => $group->id]);
        }

        try {
            app()->make(AnalysisController::class)->regenerateGroupSuggestions($group->id);
        } catch (\Exception $e) {
            Log::error("Error regenerando sugerencias para grupo {$group->id}: " . $e->getMessage());
        }

        return response()->json($group, 201);
    }
}
