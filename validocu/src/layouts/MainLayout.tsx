import type { ReactNode } from 'react';
import { AppBar, Toolbar, Box, Link, Typography } from '@mui/material';

interface Props { children: ReactNode; }

export default function MainLayout({ children }: Props) {
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
          bgcolor: 'background.secondary'
        }}
      >
        <Toolbar sx={{ minHeight: 56 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img
              src="/ValiDocu_logo_text.svg"
              alt="Logo"
              style={{ width: 130, height: 'auto', marginRight: 10 }}
          />
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Link underline="none" color="inherit" href="/">Inicio</Link>
            <Link underline="none" color="inherit" href="/documentos">Documentos</Link>
            <Link underline="none" color="inherit" href="/perfil">Perfil</Link>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flex: 1,
          bgcolor: 'background.default',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
