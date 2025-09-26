<?php

namespace App\Http\Controllers;

use App\Models\AnalysisIssue;
use Illuminate\Http\Request;
use App\Models\Issue;
use App\Models\SuggestionStatus;
use Illuminate\Http\JsonResponse;

class IssueController extends Controller
{
    public function update(int $id, Request $r): JsonResponse
    {
        $data = $r->validate([
            'status' => 'required|in:TODO,NO_APLICA,RESUELTO',
        ]);

        $issue = AnalysisIssue::findOrFail($id);
        $issue->status = $data['status'];
        $issue->save();

        return response()->json(['ok' => true, 'issue' => $issue]);
    }


    public function indexStatuses(): JsonResponse
    {
        $statuses = SuggestionStatus::select('id', 'status')
            ->orderBy('id')
            ->get();
        return response()->json($statuses);
    }


    public function updateStatus(Request $request, Issue $issue): JsonResponse
    {
        $data = $request->validate([
            'status_id' => ['required', 'integer', 'exists:suggestion_status,id'],
        ]);

        $issue->status_id = $data['status_id'];
        $issue->save();
        $relatedIssueIds = AnalysisIssue::where('document_analysis_id', $issue->document_analysis_id)
            ->where('status_id', '!=', 2)
            ->pluck('id');

        if ($relatedIssueIds->isEmpty()) {
            // Usar Eloquent para obtener el DocumentAnalysis y el Document
            $analysis = \App\Models\DocumentAnalysis::find($issue->document_analysis_id);
            if ($analysis && $analysis->document) {
                $analysis->document->normative_gap = 0;
                $analysis->document->save();
            }
        }else{
            $analysis = \App\Models\DocumentAnalysis::find($issue->document_analysis_id);
            if ($analysis && $analysis->document) {
                $analysis->document->normative_gap = 1;
                $analysis->document->save();
            }
        }
        // Opcional: incluir el texto del estado en la respuesta
        $issue->load('status');
        return response()->json([
            'id'            => $issue->id,
            'field_key'     => $issue->field_key,
            'issue_type'    => $issue->issue_type,
            'message'       => $issue->message,
            'suggestion'    => $issue->suggestion,
            'confidence'    => $issue->confidence,
            'evidence'      => $issue->evidence,
            'document_analysis_id' => $issue->document_analysis_id,
            'status_id'     => $issue->status_id,
            'status_text'   => $issue->status?->status,
            'updated_at'    => $issue->updated_at,
        ]);
    }


    public function listByAnalysis(int $analysisId): JsonResponse
    {
        $issues = Issue::with('status')
            ->where('document_analysis_id', $analysisId)
            ->orderBy('id')
            ->get()
            ->map(function (Issue $i) {
                return [
                    'id'            => $i->id,
                    'field_key'     => $i->field_key,
                    'issue_type'    => $i->issue_type,
                    'message'       => $i->message,
                    'suggestion'    => $i->suggestion,
                    'confidence'    => $i->confidence,
                    'evidence'      => $i->evidence,
                    'document_analysis_id' => $i->document_analysis_id,
                    'status_id'     => $i->status_id,
                    'status_text'   => $i->status?->status,
                    'created_at'    => $i->created_at,
                    'updated_at'    => $i->updated_at,
                ];
            });

        return response()->json($issues);
    }
}
