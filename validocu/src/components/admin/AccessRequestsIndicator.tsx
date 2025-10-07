import { Badge, IconButton, Tooltip } from '@mui/material';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePendingAccessRequests } from '../../hooks/usePendingAccessRequests';

interface Props {
  isAdmin: boolean;
}

export default function AccessRequestsIndicator({ isAdmin }: Props) {
  const navigate = useNavigate();
  const { count } = usePendingAccessRequests(isAdmin, 30000); // Actualizar cada 30 segundos

  if (!isAdmin) {
    return null;
  }

  return (
    <Tooltip title={`Solicitudes de acceso pendientes: ${count}`}>
      <IconButton
        onClick={() => navigate('/admin/access-requests')}
        sx={{ 
          color: 'inherit',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <Badge 
          badgeContent={count} 
          color="error"
          max={99}
          invisible={count === 0}
        >
          <Shield size={20} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}