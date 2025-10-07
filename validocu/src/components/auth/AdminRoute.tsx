import type { ReactNode } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  children: ReactNode;
}

export default function AdminRoute({ children }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography>Cargando...</Typography>
      </Box>
    );
  }

  // Verificar si el usuario tiene rol de admin
  const isAdmin = user?.roles?.some(role => role.slug === 'admin') || false;

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            maxWidth: 600,
            mx: 'auto',
            mt: 4
          }}
        >
          <Shield size={20} />
          <Box>
            <Typography variant="h6" component="div">
              Acceso denegado
            </Typography>
            <Typography variant="body2">
              No tienes permisos para acceder a esta página. Se requieren privilegios de administrador.
            </Typography>
          </Box>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}