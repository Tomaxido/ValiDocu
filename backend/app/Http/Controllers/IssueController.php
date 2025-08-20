<?php

namespace App\Http\Controllers;

use App\Models\AnalysisIssue;
use Illuminate\Http\Request;

class IssueController extends Controller
{
    public function update(int $id, Request $r)
    {
        $data = $r->validate([
            'status' => 'required|in:TODO,NO_APLICA,RESUELTO',
        ]);

        $issue = AnalysisIssue::findOrFail($id);
        $issue->status = $data['status'];
        $issue->save();

        return response()->json(['ok' => true, 'issue' => $issue]);
    }
}
