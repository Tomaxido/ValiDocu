<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Exports\DocumentSummaryExport;
use Maatwebsite\Excel\Facades\Excel;

class DocumentSummaryController extends Controller
{
    public function downloadSummaryExcel($documentId)
    {
        $si = DB::table('semantic_doc_index')
            ->where('document_id', $documentId)
            ->first(['json_global']);

        if (!$si) {
            Log::info('No se encontró el layout para este documento', ['document_id' => $documentId]);
            abort(404, 'No se encontró el layout para este documento.');
        }

        // json_global ahora es un objeto plano { "CLAVE": "VALOR", ... }
        $data = json_decode($si->json_global, true);

        if (!is_array($data)) {
            Log::info('json_global no tiene formato válido.', ['document_id' => $documentId]);
            abort(400, 'El layout no tiene formato válido.');
        }

        $headerRows = [
            ['Deudor',  $data['NOMBRE_COMPLETO_DEUDOR'] ?? ''],
            ['RUT',     $data['RUT_DEUDOR'] ?? ($data['EMPRESA_DEUDOR_RUT'] ?? '')],
            ['Empresa', $data['EMPRESA_DEUDOR'] ?? ''],
        ];

        // Construir filas: [VARIABLE, INFORMACIÓN]
        $rows = [];
        foreach ($data as $key => $value) {
            // Asegurar string en INFORMACIÓN (si viene arreglo u objeto)
            if (is_array($value) || is_object($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE);
            }
            $rows[] = [(string)$key, (string)$value];
        }

        $export = new DocumentSummaryExport($rows, ['VARIABLE','INFORMACIÓN'], $headerRows);
        $filename = 'resumen_doc_id_' . $documentId . '.xlsx';

        return Excel::download($export, $filename);
    }
}
