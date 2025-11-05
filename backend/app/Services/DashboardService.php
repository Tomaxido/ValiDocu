<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Carbon\Carbon;
use App\Models\Document;
use App\Models\DocumentGroup;
use App\Models\DocumentVersion;
use App\Models\DocumentAnalysis;
use App\Models\User;
use App\Models\DocumentType;
use App\Models\SystemSetting;

class DashboardService
{
    /**
     * Obtener métricas principales del dashboard
     */
    public function getMetrics(array $filters = []): array
    {
        $query = $this->buildBaseQuery($filters);

        // Contar documentos por estado de due_date
        $validDocuments = (clone $query)->where('dv.due_date', 0)->count();
        $expiringSoon = (clone $query)->where('dv.due_date', 2)->count();
        $expired = (clone $query)->where('dv.due_date', 1)->count();
        $totalDocuments = (clone $query)->count();

        // Calcular tiempo ahorrado
        $timeSaved = $this->calculateTimeSaved($filters);

        return [
            'valid_documents' => $validDocuments,
            'expiring_soon' => $expiringSoon,
            'expired' => $expired,
            'total_documents' => $totalDocuments,
            'avg_time_saved_hours' => $timeSaved['avg_hours'],
            'total_time_saved_hours' => $timeSaved['total_hours'],
            'documents_processed' => $timeSaved['documents_count'],
        ];
    }

    /**
     * Obtener distribución de documentos por brecha normativa (normative_gap)
     */
    public function getDocumentsByStatus(array $filters = []): array
    {
        $query = $this->buildBaseQuery($filters);

        // Contar por brecha normativa (normative_gap)
        $conforme = (clone $query)->where('dv.normative_gap', 0)->count();
        $conBrechas = (clone $query)->where('dv.normative_gap', 1)->count();

        return [
            'labels' => ['Conforme', 'Con brechas normativas'],
            'data' => [$conforme, $conBrechas],
            'colors' => ['#4caf50', '#f44336'],
        ];
    }

    /**
     * Obtener distribución de documentos por tipo
     */
    public function getDocumentsByType(array $filters = []): array
    {
        $query = $this->buildBaseQuery($filters);

        $results = (clone $query)
            ->join('document_types as dt', 'd.document_type_id', '=', 'dt.id')
            ->select('dt.nombre_doc as type_name', DB::raw('COUNT(*) as count'))
            ->groupBy('dt.id', 'dt.nombre_doc')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->get();

        // Documentos sin tipo
        $sinTipo = (clone $query)
            ->whereNull('d.document_type_id')
            ->count();

        $labels = $results->pluck('type_name')->toArray();
        $data = $results->pluck('count')->toArray();

        if ($sinTipo > 0) {
            $labels[] = 'Sin tipo';
            $data[] = $sinTipo;
        }

        return [
            'labels' => $labels,
            'data' => $data,
        ];
    }

    /**
     * Obtener tendencia de tiempo ahorrado por mes
     */
    public function getTimeSavedTrend(array $filters = []): array
    {
        $dateFrom = isset($filters['date_from']) 
            ? Carbon::parse($filters['date_from']) 
            : Carbon::now()->subMonths(6);
        
        $dateTo = isset($filters['date_to']) 
            ? Carbon::parse($filters['date_to']) 
            : Carbon::now();

        $manualTime = SystemSetting::getValue('manual_analysis_time_minutes', 60);
        $aiTime = SystemSetting::getValue('ai_analysis_time_minutes', 5);
        $timeSavedPerDoc = ($manualTime - $aiTime) / 60; // En horas

        // Agrupar por mes usando documentos procesados (status != 0)
        $results = DB::table('documents as d')
            ->join('document_versions as dv', function($join) {
                $join->on('d.id', '=', 'dv.document_id')
                     ->where('dv.is_current', '=', true);
            })
            ->whereBetween('dv.created_at', [$dateFrom, $dateTo])
            ->where('d.status', '!=', 0) // Documentos ya procesados
            ->select(
                DB::raw("TO_CHAR(dv.created_at, 'YYYY-MM') as month"),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $labels = [];
        $data = [];

        foreach ($results as $result) {
            $monthDate = Carbon::parse($result->month . '-01');
            $labels[] = $monthDate->format('M Y');
            $data[] = round($result->count * $timeSavedPerDoc, 2);
        }

        return [
            'labels' => $labels,
            'data' => $data,
        ];
    }

    /**
     * Obtener rendimiento por usuario
     */
    public function getUserPerformance(array $filters = []): array
    {
        $query = DB::table('documents as d')
            ->join('document_versions as dv', function($join) {
                $join->on('d.id', '=', 'dv.document_id')
                     ->where('dv.is_current', '=', true);
            })
            ->join('users as u', 'dv.uploaded_by', '=', 'u.id');

        // Aplicar filtros
        if (!empty($filters['date_from'])) {
            $query->where('dv.created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('dv.created_at', '<=', $filters['date_to']);
        }
        if (!empty($filters['group_ids'])) {
            $query->whereIn('d.document_group_id', $filters['group_ids']);
        }

        $results = $query
            ->select(
                'u.name',
                'u.id',
                DB::raw('COUNT(DISTINCT d.id) as documents_processed'),
                DB::raw('SUM(CASE WHEN d.status = 1 THEN 1 ELSE 0 END) as conformes'),
                DB::raw('SUM(CASE WHEN dv.due_date = 1 THEN 1 ELSE 0 END) as vencidos'),
                DB::raw('SUM(CASE WHEN dv.due_date = 2 THEN 1 ELSE 0 END) as por_vencer')
            )
            ->groupBy('u.id', 'u.name')
            ->orderBy('documents_processed', 'desc')
            ->limit(10)
            ->get();

        return [
            'users' => $results->map(function($user) {
                return [
                    'name' => $user->name,
                    'documents_processed' => $user->documents_processed,
                    'conformes' => $user->conformes,
                    'vencidos' => $user->vencidos,
                    'por_vencer' => $user->por_vencer,
                ];
            })->toArray()
        ];
    }

    /**
     * Obtener rendimiento por grupo
     */
    public function getGroupPerformance(array $filters = []): array
    {
        $query = DB::table('document_groups as dg')
            ->join('documents as d', 'dg.id', '=', 'd.document_group_id')
            ->join('document_versions as dv', function($join) {
                $join->on('d.id', '=', 'dv.document_id')
                     ->where('dv.is_current', '=', true);
            });

        // Aplicar filtros
        if (!empty($filters['date_from'])) {
            $query->where('dv.created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('dv.created_at', '<=', $filters['date_to']);
        }
        if (!empty($filters['group_ids'])) {
            $query->whereIn('dg.id', $filters['group_ids']);
        }

        $results = $query
            ->select(
                'dg.name',
                'dg.id',
                DB::raw('COUNT(DISTINCT d.id) as total_documents'),
                DB::raw('SUM(CASE WHEN d.status = 1 THEN 1 ELSE 0 END) as valid'),
                DB::raw('SUM(CASE WHEN dv.due_date = 1 THEN 1 ELSE 0 END) as expired'),
                DB::raw('SUM(CASE WHEN dv.due_date = 2 THEN 1 ELSE 0 END) as expiring'),
                DB::raw('SUM(CASE WHEN dv.normative_gap = 1 THEN 1 ELSE 0 END) as with_gaps')
            )
            ->groupBy('dg.id', 'dg.name')
            ->orderBy('total_documents', 'desc')
            ->get();

        return [
            'groups' => $results->map(function($group) {
                return [
                    'name' => $group->name,
                    'total_documents' => $group->total_documents,
                    'valid' => $group->valid,
                    'expired' => $group->expired,
                    'expiring' => $group->expiring,
                    'with_gaps' => $group->with_gaps,
                ];
            })->toArray()
        ];
    }

    /**
     * Obtener filtros disponibles
     */
    public function getAvailableFilters(): array
    {
        return [
            'groups' => DocumentGroup::select('id', 'name')
                ->orderBy('name')
                ->get()
                ->toArray(),
            
            'users' => User::select('id', 'name', 'email')
                ->orderBy('name')
                ->get()
                ->toArray(),
            
            'document_types' => DocumentType::select('id', 'nombre_doc as name')
                ->orderBy('nombre_doc')
                ->get()
                ->toArray(),
        ];
    }

    /**
     * Calcular tiempo ahorrado
     */
    private function calculateTimeSaved(array $filters = []): array
    {
        $query = $this->buildBaseQuery($filters);
        
        // Contar documentos procesados (status != 0, es decir, ya fueron analizados)
        $documentsCount = (clone $query)
            ->where('d.status', '!=', 0)
            ->count();

        // Obtener tiempos configurados
        $manualTime = SystemSetting::getValue('manual_analysis_time_minutes', 60);
        $aiTime = SystemSetting::getValue('ai_analysis_time_minutes', 5);

        // Calcular tiempo ahorrado por documento (en minutos)
        $timeSavedPerDoc = $manualTime - $aiTime;

        // Tiempo total ahorrado en horas
        $totalHours = ($documentsCount * $timeSavedPerDoc) / 60;
        $avgHours = $documentsCount > 0 ? $timeSavedPerDoc / 60 : 0; // Promedio por documento, no dividir por total

        return [
            'total_hours' => round($totalHours, 2),
            'avg_hours' => round($avgHours, 2),
            'documents_count' => $documentsCount,
            'manual_time_minutes' => $manualTime,
            'ai_time_minutes' => $aiTime,
        ];
    }

    /**
     * Construir query base con filtros
     */
    private function buildBaseQuery(array $filters)
    {
        $query = DB::table('documents as d')
            ->join('document_versions as dv', function($join) {
                $join->on('d.id', '=', 'dv.document_id')
                     ->where('dv.is_current', '=', true);
            });

        // Filtro por rango de fechas
        if (!empty($filters['date_from'])) {
            $query->where('dv.created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('dv.created_at', '<=', $filters['date_to']);
        }

        // Filtro por grupos
        if (!empty($filters['group_ids'])) {
            $query->whereIn('d.document_group_id', $filters['group_ids']);
        }

        // Filtro por usuarios
        if (!empty($filters['user_ids'])) {
            $query->whereIn('dv.uploaded_by', $filters['user_ids']);
        }

        // Filtro por tipos de documento
        if (!empty($filters['document_type_ids'])) {
            $query->whereIn('d.document_type_id', $filters['document_type_ids']);
        }

        return $query;
    }
}
