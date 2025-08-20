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
          bgcolor: 'secondary.main',
        }}
      >
        <Toolbar sx={{ minHeight: 56, gap: 2 }}>
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
                v: theme.palette.primary.main,
                a: theme.palette.primary.main,
                l: theme.palette.primary.main,
                i: theme.palette.primary.main,
                d: theme.palette.primary.main,
                o: theme.palette.primary.main,
                c: theme.palette.primary.main,
                u: theme.palette.primary.main,
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
