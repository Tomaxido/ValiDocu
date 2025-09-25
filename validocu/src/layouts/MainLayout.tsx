import type { ReactNode } from 'react';
import { AppBar, Toolbar, Box, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import BrandMark from '../graphics/ValiDocuLogo';

interface Props { children: ReactNode; }

export default function MainLayout({ children }: Props) {
  const theme = useTheme();
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

          <Box sx={{ display: 'flex', gap: 3 }}>
            <Link component={RouterLink} underline="none" color="inherit" to="/">
              Inicio
            </Link>
            <Link component={RouterLink} underline="none" color="inherit" to="/documentos">
              Documentos
            </Link>
            <Link component={RouterLink} underline="none" color="inherit" to="/perfil">
              Perfil
            </Link>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, bgcolor: 'background.default' }}>
        {children}
      </Box>
    </Box>
  );
}
