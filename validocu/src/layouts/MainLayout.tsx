import { useEffect, useState, type ReactNode, useRef } from 'react';
import { AppBar, Toolbar, Box, Link, IconButton, Menu, CircularProgress, Table, TableHead, TableBody, TableRow, TableCell, Badge } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import BrandMark from '../graphics/ValiDocuLogo';
import UserMenu from '../components/auth/UserMenu';
import AccessRequestsIndicator from '../components/admin/AccessRequestsIndicator';
import { useAuth } from '../contexts/AuthContext';
import { BellIcon, CheckIcon, XIcon, BarChart3 } from 'lucide-react';
import type { DocAnalysisNotification, ProcessedDocumentEvent } from '../utils/interfaces';
import { getUserNotifications, markNotificationsAsRead } from '../utils/api';

interface Props {
  children: ReactNode;
  currentEvent: ProcessedDocumentEvent | null;
  isDocMenuOpen: boolean;
  setIsDocMenuOpen: (open: boolean) => void;
}

export default function MainLayout({ children, currentEvent, isDocMenuOpen, setIsDocMenuOpen }: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const bellButtonRef = useRef<HTMLButtonElement | null>(null);
  
  // Verificar si el usuario tiene rol de admin
  const isAdmin = user?.roles?.some(role => role.slug === 'admin' || role.name === 'admin' || role.name === 'Administrador') || false;

  const [notifications, setNotifications] = useState<DocAnalysisNotification[]>([]);
  const unreadNotifications = notifications.filter(n => !n.is_read);

  useEffect(() => {
    // Cargar notificaciones al montar el componente
    getUserNotifications().then(setNotifications);
  }, []);

  useEffect(() => {
    if (currentEvent !== null)
      getUserNotifications().then(setNotifications);
  }, [currentEvent]);

  useEffect(() => {
    if (isDocMenuOpen) {
      getUserNotifications().then(setNotifications);
    }
  }, [isDocMenuOpen]);

  const onDocMenuClose = () => {
    setIsDocMenuOpen(false);
    setTimeout(
      () => markNotificationsAsRead(unreadNotifications)
        .then(() => getUserNotifications())
        .then(setNotifications),
      300,
    );
  }

  const onDocButtonClick = () => {
    if (isDocMenuOpen) {
      onDocMenuClose();
    } else {
      setIsDocMenuOpen(true);
    }
  }

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        width: '100%',
        bgcolor: 'background.default',
        backgroundClip: 'border-box',
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          boxShadow: 'none',
          border: 0,
          bgcolor: 'primary.main',
        }}
      >
        <Toolbar sx={{ minHeight: 72, gap: 2 }}>
          <Link
            component={RouterLink}
            to="/"
            underline="none"
            aria-label="Ir al inicio"
            sx={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <BrandMark
              background={false}
              bgcolor={theme.palette.primary.main}
              width={180}
              colors={{
                v: theme.palette.primary.contrastText,
                a: theme.palette.primary.contrastText,
                l: theme.palette.primary.contrastText,
                i: theme.palette.primary.contrastText,
                d: theme.palette.primary.contrastText,
                o: theme.palette.primary.contrastText,
                c: theme.palette.primary.contrastText,
                u: theme.palette.primary.contrastText,
              }}
            />
          </Link>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Botón de Dashboard */}
            <IconButton
              component={RouterLink}
              to="/dashboard"
              aria-label="Ir al dashboard"
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <BarChart3 size={24} />
            </IconButton>

            {/* Botón de notificaciones */}
            <div style={{ position: 'relative' }}>
              <IconButton
                ref={bellButtonRef}
                onClick={onDocButtonClick}
                aria-label="Abrir menú de documentos"
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <BellIcon size={24} />
              </IconButton>
              {unreadNotifications.length > 0 &&
                <Box onClick={onDocButtonClick} sx={{ position: 'absolute', top: 0, right: 10 }}>
                  <Badge badgeContent={unreadNotifications.length} color="error" />
                </Box>
              }
            </div>
          </Box>

          <Menu
            anchorEl={bellButtonRef.current}
            open={isDocMenuOpen}
            onClose={onDocMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{ maxHeight: 500 }}
          >
            <Table sx={{ maxHeight: 800, overflowY: 'auto' }}>
              <TableHead sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                <TableRow sx={{ p: 2, borderBottom: '2px solid', borderColor: 'divider', minWidth: 1000 }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Archivo</TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notifications.length === 0
                ? <p>No hay notificaciones.</p>
                : notifications.map((notification, index) => {
                  const { group, document, status } = notification.message;
                  return (
                    <TableRow
                      key={index}
                      sx={{
                          p: 2,
                          bgcolor: notification.is_read ? 'inherit' : 'background.default',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          minWidth: 1000,}}
                    >
                      <TableCell>
                        <a href={`/grupos/${group.id}`}>
                            <Box sx={{ fontWeight: 'bold', overflowX: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{document.filename}</Box>
                            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{group.name}</Box>
                        </a>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ fontSize: '0.75rem', color: 'text.disabled', mt: 1 }}>
                          {status === 'started'
                          ? <CircularProgress size={24} />
                          : status === 'completed'
                          ? <CheckIcon color='green' />
                          : <XIcon color="red" />
                          }
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Menu>

          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {/* Indicador de solicitudes pendientes para administradores */}
            <AccessRequestsIndicator isAdmin={isAdmin} />
            
            {/* Importar y usar UserMenu aquí */}
            <UserMenu />
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, bgcolor: 'background.default' }}>
        {children}
      </Box>
    </Box>
  );
}
