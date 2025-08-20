<?php

namespace App\Services;

use App\Models\DocumentFieldSpec;
use App\Models\DocumentAnalysis;
use App\Models\AnalysisIssue;


class SuggestionService
{
    /**
     * Construye una sugerencia corta y accionable según la spec y tipo de dato.
     */
    public function build(DocumentFieldSpec $spec, ?string $currentValue = null, array $context = []): string
    {
        if ($spec->suggestion_template) {
            return $spec->suggestion_template;
        }
        if ($spec->example_text) {
            return "Completar con una redacción similar a: {$spec->example_text}";
        }

        return match ($spec->datatype) {
            'rut'     => 'Ingrese un RUT válido (ej: 12.345.678-9).',
            'money'   => 'Especifique el monto total en CLP. Ej: $1.250.000.',
            'date'    => 'Indique la fecha en formato AAAA-MM-DD (ej: 2025-12-31).',
            'integer' => 'Indique un número entero (por ejemplo, 90 días).',
            default   => "Complete el campo «{$spec->label}».",
        };
    }
}
