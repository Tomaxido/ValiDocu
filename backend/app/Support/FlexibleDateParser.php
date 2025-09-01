<?php

namespace App\Support;

use Carbon\Carbon;
use InvalidArgumentException;
use DateTimeInterface;

class FlexibleDateParser
{
    /**
     * Convierte una cadena flexible a Carbon (datetime).
     * Soporta español: "12 de noviembre del 2023", con o sin hora.
     */
    public static function parse(string $value, string $tz = 'America/Santiago'): Carbon
    {
        $original = trim($value);
        if ($original === '') {
            throw new InvalidArgumentException('Fecha vacía.');
        }

        // Normalización
        $clean = preg_replace('/\s+/', ' ', $original);
        $lc    = mb_strtolower($clean, 'UTF-8');

        // 1) Patrones ISO-localizados (español)
        $isoPatterns = [
            "D [de] MMMM [de] YYYY HH:mm:ss",
            "D [de] MMMM [de] YYYY HH:mm",
            "D [de] MMMM [de] YYYY",
            "dddd D [de] MMMM [de] YYYY HH:mm",
            "dddd D [de] MMMM [de] YYYY",
            "D [de] MMMM [del] YYYY HH:mm:ss",
            "D [de] MMMM [del] YYYY HH:mm",
            "D [de] MMMM [del] YYYY",
            "dddd D [de] MMMM [del] YYYY HH:mm",
            "dddd D [de] MMMM [del] YYYY",
            "D MMMM YYYY HH:mm",
            "D MMMM YYYY",
        ];

        foreach ($isoPatterns as $pattern) {
            try {
                return Carbon::createFromLocaleIsoFormat($pattern, 'es', $lc, $tz);
            } catch (\Throwable $e) {}
        }

        // Intento alterno si viene "del" en lugar de "de"
        if (str_contains($lc, ' del ')) {
            $lc2 = str_replace(' del ', ' de ', $lc);
            foreach ($isoPatterns as $pattern) {
                try {
                    return Carbon::createFromLocaleIsoFormat($pattern, 'es', $lc2, $tz);
                } catch (\Throwable $e) {}
            }
        }

        // 2) Formatos numéricos comunes (día/mes/año típico en CL)
        $numericFormats = [
            'd/m/Y H:i:s', 'd-m-Y H:i:s', 'd.m.Y H:i:s',
            'd/m/Y H:i',   'd-m-Y H:i',   'd.m.Y H:i',
            'd/m/Y',       'd-m-Y',       'd.m.Y',
            'Y-m-d H:i:s', 'Y-m-d H:i',   'Y-m-d',
            DateTimeInterface::ATOM, // 2023-11-12T14:30:00-03:00
            'U', // Unix timestamp
        ];
        foreach ($numericFormats as $fmt) {
            try {
                return Carbon::createFromFormat($fmt, $clean, $tz);
            } catch (\Throwable $e) {}
        }

        // 3) Parser genérico de Carbon (ISO/inglés)
        try {
            return Carbon::parse($clean, $tz);
        } catch (\Throwable $e) {}

        // 4) Respaldo con IntlDateFormatter (es_CL / es_ES)
        if (class_exists(\IntlDateFormatter::class)) {
            $intlPatterns = [
                "d 'de' MMMM 'de' y HH:mm:ss",
                "d 'de' MMMM 'de' y HH:mm",
                "d 'de' MMMM 'de' y",
            ];
            foreach (['es_CL', 'es_ES'] as $locale) {
                foreach ($intlPatterns as $p) {
                    $fmt = new \IntlDateFormatter(
                        $locale,
                        \IntlDateFormatter::MEDIUM,
                        \IntlDateFormatter::MEDIUM,
                        $tz,
                        \IntlDateFormatter::GREGORIAN,
                        $p
                    );
                    $ts = $fmt->parse($lc);
                    if ($ts !== false) {
                        return Carbon::createFromTimestamp($ts, $tz);
                    }
                }
            }
        }

        throw new InvalidArgumentException("No pude interpretar la fecha: \"{$original}\".");
    }
}
