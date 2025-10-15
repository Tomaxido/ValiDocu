import {
  Box,
  Typography,
  Stack,
  Paper,
  Avatar,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CloudUpload as ReuploadIcon,
  Description as FileTextIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import type { ActivityLog } from './types';

interface ActivityLogPanelProps {
  activities: ActivityLog[];
}

const getActivityIcon = (type: ActivityLog['type']) => {
  switch (type) {
    case 'uploaded':
      return <UploadIcon />;
    case 'reuploaded':
      return <ReuploadIcon />;
    case 'downloaded':
      return <DownloadIcon />;
    case 'deleted':
      return <DeleteIcon />;
    default:
      return <FileTextIcon />;
  }
};

const getActivityColor = (type: ActivityLog['type']) => {
  switch (type) {
    case 'uploaded':
    case 'reuploaded':
      return 'success';
    case 'downloaded':
      return 'info';
    case 'deleted':
      return 'error';
    default:
      return 'default';
  }
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'hace un momento';
  if (diffInMinutes < 60) return `hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `hace ${diffInMonths} mes${diffInMonths > 1 ? 'es' : ''}`;
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `hace ${diffInYears} año${diffInYears > 1 ? 's' : ''}`;
};

export default function ActivityLogPanel({ activities }: ActivityLogPanelProps) {
  return (
    <Box flex={1} display="flex" flexDirection="column">
      <Typography variant="h6" gutterBottom sx={{ color: '#495057', fontWeight: 600 }}>
        Registro de Actividades
      </Typography>
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        <Stack spacing={2}>
          {activities.map((activity) => (
            <Paper key={activity.id} elevation={1} sx={{ 
              p: 2, 
              bgcolor: '#f8f9fa', 
              border: '1px solid #e9ecef' 
            }}>
              <Box display="flex" alignItems="start" gap={2}>
                <Avatar 
                  sx={{ 
                    bgcolor: `${getActivityColor(activity.type)}.main`,
                    width: 32,
                    height: 32
                  }}
                >
                  {getActivityIcon(activity.type)}
                </Avatar>
                <Box flex={1}>
                  <Typography variant="body1" gutterBottom sx={{ color: '#495057', fontWeight: 500 }}>
                    {activity.description}
                  </Typography>
                  {activity.user && (
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Avatar sx={{ width: 20, height: 20, bgcolor: '#6c757d' }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
                        {activity.user.name}
                      </Typography>
                    </Box>
                  )}
                  {!activity.user && (
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Avatar sx={{ width: 20, height: 20, bgcolor: '#6c757d' }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Typography variant="body2" color="text.secondary" sx={{ color: '#6c757d' }}>
                        Sistema
                      </Typography>
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ color: '#6c757d' }}>
                    {formatRelativeTime(activity.timestamp)}
                  </Typography>
                  {activity.comment && activity.comment !== activity.description && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: '#6c757d' }}>
                      "{activity.comment}"
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}