<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\DashboardService;
use App\Services\SiiService;

class DashboardController extends Controller
{
    protected DashboardService $dashboardService;

    public function __construct(SiiService $siiService, DashboardService $dashboardService)
    {
        parent::__construct($siiService);
        $this->dashboardService = $dashboardService;
    }

    /**
     * Obtener métricas principales del dashboard
     * 
     * GET /api/v1/dashboard/metrics
     */
    public function getMetrics(Request $request): JsonResponse
    {
        $filters = $this->parseFilters($request);
        $metrics = $this->dashboardService->getMetrics($filters);

        return response()->json([
            'success' => true,
            'data' => $metrics,
            'filters_applied' => $filters,
        ]);
    }

    /**
     * Obtener distribución de documentos por estado
     * 
     * GET /api/v1/dashboard/charts/documents-by-status
     */
    public function getDocumentsByStatus(Request $request): JsonResponse
    {
        $filters = $this->parseFilters($request);
        $data = $this->dashboardService->getDocumentsByStatus($filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Obtener distribución de documentos por tipo
     * 
     * GET /api/v1/dashboard/charts/documents-by-type
     */
    public function getDocumentsByType(Request $request): JsonResponse
    {
        $filters = $this->parseFilters($request);
        $data = $this->dashboardService->getDocumentsByType($filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Obtener tendencia de tiempo ahorrado
     * 
     * GET /api/v1/dashboard/charts/time-saved-trend
     */
    public function getTimeSavedTrend(Request $request): JsonResponse
    {
        $filters = $this->parseFilters($request);
        $data = $this->dashboardService->getTimeSavedTrend($filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Obtener rendimiento por usuario
     * 
     * GET /api/v1/dashboard/charts/user-performance
     */
    public function getUserPerformance(Request $request): JsonResponse
    {
        $filters = $this->parseFilters($request);
        $data = $this->dashboardService->getUserPerformance($filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Obtener rendimiento por grupo
     * 
     * GET /api/v1/dashboard/charts/group-performance
     */
    public function getGroupPerformance(Request $request): JsonResponse
    {
        $filters = $this->parseFilters($request);
        $data = $this->dashboardService->getGroupPerformance($filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Obtener opciones disponibles para filtros
     * 
     * GET /api/v1/dashboard/filters/available
     */
    public function getAvailableFilters(Request $request): JsonResponse
    {
        $data = $this->dashboardService->getAvailableFilters();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Parsear filtros desde el request
     */
    private function parseFilters(Request $request): array
    {
        $filters = [];

        // Rango de fechas
        if ($request->has('date_from')) {
            $filters['date_from'] = $request->input('date_from');
        }
        if ($request->has('date_to')) {
            $filters['date_to'] = $request->input('date_to');
        }

        // Grupos (puede ser un array o un string separado por comas)
        if ($request->has('group_ids')) {
            $groupIds = $request->input('group_ids');
            $filters['group_ids'] = is_array($groupIds) 
                ? $groupIds 
                : array_map('intval', explode(',', $groupIds));
        }

        // Usuarios
        if ($request->has('user_ids')) {
            $userIds = $request->input('user_ids');
            $filters['user_ids'] = is_array($userIds) 
                ? $userIds 
                : explode(',', $userIds);
        }

        // Tipos de documento
        if ($request->has('document_type_ids')) {
            $typeIds = $request->input('document_type_ids');
            $filters['document_type_ids'] = is_array($typeIds) 
                ? $typeIds 
                : array_map('intval', explode(',', $typeIds));
        }

        return $filters;
    }
}
