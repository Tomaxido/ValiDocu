import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Typography, Grid, Alert } from '@mui/material';
import { BarChart3 } from 'lucide-react';
import { useEchoPublic } from '@laravel/echo-react';
import MetricsCards from './MetricsCards';
import DashboardFiltersComponent from './DashboardFilters';
import DocumentsByStatusChart from './charts/DocumentsByStatusChart';
import DocumentsByTypeChart from './charts/DocumentsByTypeChart';
import TimeSavedTrendChart from './charts/TimeSavedTrendChart';
import type {
  DashboardFilters,
  DashboardMetrics,
  ChartData,
  ProcessedDocumentEvent,
} from '../../utils/interfaces';
import {
  getDashboardMetrics,
  getDocumentsByStatus,
  getDocumentsByType,
  getTimeSavedTrend,
} from '../../utils/api';

export default function ExecutiveDashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [statusChartData, setStatusChartData] = useState<ChartData | null>(null);
  const [typeChartData, setTypeChartData] = useState<ChartData | null>(null);
  const [trendChartData, setTrendChartData] = useState<ChartData | null>(null);
  
  const [loading, setLoading] = useState({
    metrics: true,
    statusChart: true,
    typeChart: true,
    trendChart: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Cargar datos del dashboard
  const loadDashboardData = useCallback(async () => {

    try {
      setError(null);
      setLoading({
        metrics: true,
        statusChart: true,
        typeChart: true,
        trendChart: true,
      });


      // Cargar todas las métricas en paralelo
      const [metricsData, statusData, typeData, trendData] = await Promise.all([
        getDashboardMetrics(filters),
        getDocumentsByStatus(filters),
        getDocumentsByType(filters),
        getTimeSavedTrend(filters),
      ]);


      setMetrics(metricsData);
      setStatusChartData(statusData);
      setTypeChartData(typeData);
      setTrendChartData(trendData);
      setLastUpdated(new Date());

      setLoading({
        metrics: false,
        statusChart: false,
        typeChart: false,
        trendChart: false,
      });

    } catch (err) {
      setError('Error al cargar los datos del dashboard. Por favor, intente nuevamente.');
      setLoading({
        metrics: false,
        statusChart: false,
        typeChart: false,
        trendChart: false,
      });
    }
  }, [filters]);

  // Cargar datos al montar y cuando cambien los filtros
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Actualización en tiempo real con WebSocket usando echo-react
  useEchoPublic<ProcessedDocumentEvent>('documents-processed', 'DocumentsProcessed', () => {
    loadDashboardData();
  });

  const handleFiltersChange = (newFilters: DashboardFilters) => {
    setFilters(newFilters);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <BarChart3 size={36} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Dashboard Ejecutivo
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Panel de métricas clave de gestión documentaria
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <DashboardFiltersComponent filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Métricas Principales */}
      <MetricsCards metrics={metrics} loading={loading.metrics} />

      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Documentos por Estado */}
        <Grid size={{ xs: 12, md: 6 }}>
          <DocumentsByStatusChart data={statusChartData} loading={loading.statusChart} />
        </Grid>

        {/* Documentos por Tipo */}
        <Grid size={{ xs: 12, md: 6 }}>
          <DocumentsByTypeChart data={typeChartData} loading={loading.typeChart} />
        </Grid>

        {/* Tendencia de Tiempo Ahorrado */}
        <Grid size={{ xs: 12 }}>
          <TimeSavedTrendChart data={trendChartData} loading={loading.trendChart} />
        </Grid>
      </Grid>

      {/* Footer Info */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Los datos se actualizan automáticamente cuando se procesan nuevos documentos.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Última actualización: {lastUpdated.toLocaleTimeString('es-CL', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          })}
        </Typography>
      </Box>
    </Container>
  );
}
