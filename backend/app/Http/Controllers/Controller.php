<?php

namespace App\Http\Controllers;
use App\Services\SiiService;
use Illuminate\Support\Facades\Log;

abstract class Controller
{
    protected $siiService;

    public function __construct(SiiService $siiService)
    {
        $this->siiService = $siiService;
    }

    public function checkRut($rut, $dv)
    {
        $max_intentos = 10;
        $intentos = 0;
        $ultimoError = null;

        while ($intentos < $max_intentos) {
            try {
                $datos = $this->siiService->checkDte($rut, $dv);
                return response()->json($datos, 200);
            } catch (\Exception $e) {
                $intentos++;
                $ultimoError = $e; // Guarda el último error
                Log::error("Intento $intentos fallido: " . $e->getMessage());
            }
        }

        // Fuera del while: si llegamos aquí, todos los intentos fallaron
        return response()->json([
            'code' => 400,
            'intentos' => $intentos,
            'message' => $ultimoError ? $ultimoError->getMessage() : 'Error desconocido.'
        ], 400);
    }
}
