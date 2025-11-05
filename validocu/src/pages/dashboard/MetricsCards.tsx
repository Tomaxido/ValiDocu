import { Card, CardContent, Typography, Box } from '@mui/material';
import { TrendingUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { DashboardMetrics } from '../../utils/interfaces';

interface MetricsCardsProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

export default function MetricsCards({ metrics, loading }: MetricsCardsProps) {
  const cards = [
    {
      title: 'Documentos al día',
      value: metrics?.valid_documents ?? 0,
      icon: CheckCircle,
      color: '#4caf50',
      bgColor: '#e8f5e9',
    },
    {
      title: 'Por Vencer',
      value: metrics?.expiring_soon ?? 0,
      icon: AlertTriangle,
      color: '#ff9800',
      bgColor: '#fff3e0',
    },
    {
      title: 'Vencidos',
      value: metrics?.expired ?? 0,
      icon: XCircle,
      color: '#f44336',
      bgColor: '#ffebee',
    },
    {
      title: 'Tiempo Ahorrado (hrs)',
      value: metrics?.total_time_saved_hours?.toFixed(1) ?? '0.0',
      icon: TrendingUp,
      color: '#2196f3',
      bgColor: '#e3f2fd',
    },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            sx={{
              position: 'relative',
              overflow: 'visible',
              boxShadow: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-4px)',
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {loading ? '...' : card.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: 2,
                    backgroundColor: card.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={32} color={card.color} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
