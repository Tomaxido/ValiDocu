import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ChartData } from '../../../utils/interfaces';

interface TimeSavedTrendChartProps {
  data: ChartData | null;
  loading: boolean;
}

export default function TimeSavedTrendChart({ data, loading }: TimeSavedTrendChartProps) {
  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tendencia de Tiempo Ahorrado
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.data.length) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tendencia de Tiempo Ahorrado
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Typography color="text.secondary">No hay datos disponibles</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.labels.map((label, index) => ({
    month: label,
    hours: data.data[index],
  }));

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tendencia de Tiempo Ahorrado (Horas)
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="hours" 
              stroke="#2196f3" 
              strokeWidth={2}
              name="Horas Ahorradas"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
