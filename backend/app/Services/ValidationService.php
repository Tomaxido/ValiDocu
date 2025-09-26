<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

use App\Models\DocumentFieldSpec;

class ValidationService
{
    /* =========================
     * Helpers de normalización
     * ========================= */
    private function norm(string $s): string {
        $s = Str::ascii($s);
        $s = strtoupper(trim($s));
        $s = preg_replace('/[_\.\-]+/',' ', $s);  // _ . - → espacio
        $s = preg_replace('/\s+/', ' ', $s);     // colapsa espacios
        return $s;
    }

    private function looksLikeMoney(string $v): bool {
        // $1.234.567,89 — $ 1.234.567 — 1.234.567 — admite punto final del OCR y opcional " CLP"
        return (bool) preg_match('/^\$?\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?(?:\s*CLP)?\.?$/u', trim($v));
    }

    private function sanitizeMoney(string $v): string {
        $v = trim($v);
        $v = str_replace([' CLP','CLP',' '], '', $v);
        return rtrim($v, '.'); // algunos OCR dejan un punto final
    }

    private function normalizeDate(string $v): string {
        $v = trim($v);
        // dd/mm/yyyy → yyyy-mm-dd
        if (preg_match('/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/', $v, $m)) {
            return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]); // 16/03/2025 → 2025-03-16
        }
        return $v; // ya venía iso o no matchea
    }

    private function isValidRut(string $rut): bool {
        $clean = strtoupper(preg_replace('/[^0-9K]/', '', $rut));
        if (!preg_match('/^(\d+)([0-9K])$/', $clean, $m)) return false;
        [, $num, $dv] = $m;
        $s = 0; $mul = 2;
        for ($i = strlen($num) - 1; $i >= 0; $i--) {
            $s += intval($num[$i]) * $mul;
            $mul = $mul == 7 ? 2 : $mul + 1;
        }
        $expect = 11 - ($s % 11);
        $dvCalc = $expect == 11 ? '0' : ($expect == 10 ? 'K' : (string)$expect);
        return $dvCalc === $dv;
    }

    /* =========================
     * Alias desde BD + fallback
     * ========================= */
    private function defaultAliases(): array {
        // Etiquetas normalizadas -> clave canónica
        return [
            // Tipo de doc
            'TIPO DOCUMENTO'  => 'doc_type_raw',
            'TIPO DE DOCUMENTO' => 'doc_type_raw',

            // Fecha
            'FECHA'           => 'fecha',
            'DATE'            => 'fecha',

            // Nombres
            'NOMBRE COMPLETO' => 'nombre_any',
            'NOMBRE'          => 'nombre_any',

            // RUT (genérico). También soportamos "R U T" (cuando vienen con puntos)
            'RUT'             => 'rut_any',
            'R U T'           => 'rut_any',

            // Dirección
            'DIRECCION'       => 'direccion',
            'DOMICILIO'       => 'direccion',

            // Empresa / Razón social (genérico)
            'EMPRESA'         => 'empresa_any',
            'RAZON SOCIAL'    => 'empresa_any',

            // Montos
            'MONTO'           => 'monto_total',
            'MONTO TOTAL'     => 'monto_total',
            'TOTAL'           => 'monto_total',
            'VALOR'           => 'monto_total',
        ];
    }

    private function loadAliases(?string $docType = null): array {
        // Si no existe la tabla, usar fallback interno
        if (!Schema::hasTable('document_label_aliases')) {
            return $this->defaultAliases();
        }

        // Cache 5 minutos (todas las filas). Si cache devolviera 0 filas, hacemos merge con fallback igualmente.
        $rows = Cache::remember('label_aliases:all', 300, function () {
            return DB::table('document_label_aliases')
                ->where('active', true)
                ->orderBy('priority') // menor número = mayor prioridad
                ->get(['doc_type','normalized_label','field_key'])
                ->toArray();
        });

        $generic = [];
        $specific = [];
        foreach ($rows as $r) {
            $doc = $r->doc_type ?? null;
            $lab = $r->normalized_label;
            $fk  = $r->field_key;
            if ($doc) {
                $specific[$doc][$lab] = $fk;
            } else {
                $generic[$lab] = $fk;
            }
        }

        // Merge alias: primero fallback genérico interno, luego genéricos de BD, y al final específicos por docType (si hay)
        $map = $this->defaultAliases();
        if (!empty($generic)) {
            $map = array_merge($map, $generic);
        }
        if ($docType && isset($specific[$docType])) {
            $map = array_merge($map, $specific[$docType]);
        }
        return $map;
    }

    /* =========================
     * Núcleo de validación
     * ========================= */
    public function validate(string $docType, int $documentId): array
{
    // 1) Ubica el grupo del documento
    $doc = DB::table('documents')
        ->where('id', $documentId)
        ->first(['id','document_group_id','filename']);

    if (!$doc) {
        // sin documento => nada que analizar
        return [[
            'field_key'  => '_document',
            'issue_type' => 'MISSING',
            'message'    => 'Documento no encontrado.',
            'evidence'   => null,
        ]];
    }

    // 2) Carga TODAS las páginas del grupo desde semantic_index
    $rows = DB::table('semantic_index')
        ->where('document_group_id', $doc->document_group_id)
        ->orderBy('id') // o page_index si lo agregas luego
        ->get(['json_layout','archivo']);

    // Fallback: si por alguna razón no hay por grupo, intenta por document_id exacto
    if ($rows->isEmpty()) {
        $rows = DB::table('semantic_index')
            ->where('document_id', $documentId)
            ->orderBy('id')
            ->get(['json_layout','archivo']);
    }

    // 3) Une todos los layouts y asegura que cada item tenga "page" (0-index)
    $layout = [];
    $auto = 0;
    foreach ($rows as $r) {
        $items = json_decode($r->json_layout ?? '[]', true) ?: [];
        $pageIndex = $this->extractPageIndex($r->archivo ?? '', $auto);
        foreach ($items as &$it) {
            if (!isset($it['page'])) $it['page'] = $pageIndex; // <- crucial para focus en el visor
        }
        $layout = array_merge($layout, $items);
        $auto++;
    }

    // 4) Normaliza con alias y heurísticas (busca en todas las páginas)
    [$fields, $evidences] = $this->normalize($layout, $docType);

    // 5) Reglas por tipo
    // Buscar el ID del tipo de documento basado en el nombre
    $docTypeId = DB::table('document_types')->where('nombre_doc', $docType)->value('id');
    $specs = DocumentFieldSpec::where('doc_type_id', $docTypeId)->get()->keyBy('field_key');
    $issues = [];

    // Faltantes obligatorios
    foreach ($specs as $key => $spec) {
        if ($spec->is_required && empty($fields[$key])) {
            $issues[] = [
                'field_key'  => $key,
                'issue_type' => 'MISSING',
                'message'    => "Falta el campo obligatorio: {$spec->label}.",
                'evidence'   => $evidences[$key] ?? null,
            ];
        }
    }

    // Formatos
    foreach ($specs as $key => $spec) {
        $val = $fields[$key] ?? null;
        if (!$val) continue;

        if ($spec->regex) {
            if (@preg_match('/'.$spec->regex.'/u', $val) !== 1) {
                $issues[] = [
                    'field_key'  => $key,
                    'issue_type' => 'FORMAT',
                    'message'    => "{$spec->label} no cumple el formato esperado.",
                    'evidence'   => $evidences[$key] ?? null,
                ];
            }
        } else {
            switch ($spec->datatype) {
                case 'rut':
                    if (!$this->isValidRut($val)) {
                        $issues[] = [
                            'field_key'  => $key,
                            'issue_type' => 'FORMAT',
                            'message'    => "{$spec->label} no es un RUT válido.",
                            'evidence'   => $evidences[$key] ?? null,
                        ];
                    }
                    break;
                case 'date':
                    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $val)) {
                        $issues[] = [
                            'field_key'  => $key,
                            'issue_type' => 'FORMAT',
                            'message'    => "{$spec->label} debe ser YYYY-MM-DD.",
                            'evidence'   => $evidences[$key] ?? null,
                        ];
                    }
                    break;
                case 'money':
                    if (!$this->looksLikeMoney($val)) {
                        $issues[] = [
                            'field_key'  => $key,
                            'issue_type' => 'FORMAT',
                            'message'    => "{$spec->label} no parece un monto válido.",
                            'evidence'   => $evidences[$key] ?? null,
                        ];
                    }
                    break;
            }
        }
    }

    return $issues;
}
private function extractPageIndex(string $filename, int $fallback): int
{
    // soporta ..._p1.png, ..._p12.jpg, etc. → 0-index
    if (preg_match('/_p(\d+)\./i', $filename, $m)) {
        return max(0, ((int)$m[1]) - 1);
    }
    return $fallback; // si no viene, usamos el orden
}


    /**
     * Normaliza labels del extractor a claves canónicas + junta evidencias (page, boxes, text).
     */
    private function normalize(array $layout, ?string $docType = null): array
    {
        $ALIASES = $this->loadAliases($docType);

        $fields   = [];
        $evidences= [];
        $nombres  = [];
        $ruts     = [];
        $empresas = [];

        foreach ($layout as $et) {
            $rawLabel = (string)($et['label'] ?? '');
            $text     = trim((string)($et['text'] ?? ''));
            $item = [
                'label' => $rawLabel,
                'text'  => $text,
                'boxes' => $et['boxes'] ?? null,
                'page'  => $et['page'] ?? null,
            ];

            // 1) Ignora sufijo de error del extractor: RUT_E → RUT
            $rawLabel = preg_replace('/_E$/', '', $rawLabel);

            // 2) Normaliza y mapea
            $L = $this->norm($rawLabel);
            $mapped = $ALIASES[$L] ?? null;

            if ($mapped) {
                switch ($mapped) {
                    case 'doc_type_raw':
                    case 'fecha':
                    case 'direccion':
                        $fields[$mapped] = $text;
                        $evidences[$mapped]['items'][] = $item;
                        break;

                    case 'monto_total':
                        $fields[$mapped] = $this->sanitizeMoney($text);
                        $evidences[$mapped]['items'][] = $item;
                        break;

                    case 'nombre_any':
                        $nombres[] = $item;
                        break;

                    case 'rut_any':
                        $ruts[] = $item;
                        break;

                    case 'empresa_any':
                        $empresas[] = $item;
                        break;
                }
                continue;
            }

            // 3) Heurísticas por contenido (por si el label es raro)
            if ($this->looksLikeMoney($text) && !isset($fields['monto_total'])) {
                $fields['monto_total'] = $this->sanitizeMoney($text);
                $evidences['monto_total']['items'][] = $item;
            }
            if (preg_match('/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/u', $text, $m) && !isset($fields['fecha'])) {
                $fields['fecha'] = $this->normalizeDate($m[0]);
                $evidences['fecha']['items'][] = $item;
            }
            if (preg_match('/\b\d{1,2}\.?\d{3}\.?\d{3}-[0-9Kk]\b/u', $text)) {
                $ruts[] = $item;
            }
        }

        // 4) Asignación por orden: emisor → receptor
        if (!isset($fields['nombre_emisor']) && count($nombres) > 0) {
            $fields['nombre_emisor'] = $nombres[0]['text'];
            $evidences['nombre_emisor']['items'][] = $nombres[0];
        }
        if (!isset($fields['nombre_receptor']) && count($nombres) > 1) {
            $fields['nombre_receptor'] = $nombres[1]['text'];
            $evidences['nombre_receptor']['items'][] = $nombres[1];
        }
        if (!isset($fields['rut_emisor']) && count($ruts) > 0) {
            $fields['rut_emisor'] = $ruts[0]['text'];
            $evidences['rut_emisor']['items'][] = $ruts[0];
        }
        if (!isset($fields['rut_receptor']) && count($ruts) > 1) {
            $fields['rut_receptor'] = $ruts[1]['text'];
            $evidences['rut_receptor']['items'][] = $ruts[1];
        }
        if (!isset($fields['empresa_emisor']) && !empty($empresas[0])) {
            $fields['empresa_emisor'] = $empresas[0]['text'];
            $evidences['empresa_emisor']['items'][] = $empresas[0];
        }

        return [$fields, $evidences];
    }
}
