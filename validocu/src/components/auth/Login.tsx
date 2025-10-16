import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import BrandMark from '../../graphics/ValiDocuLogo';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = {
    metal:    '#242F40',
    gold:     '#CCA43B',
    platinum: '#E5E5E5',
    white:    '#FFFFFF',
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: COLORS.platinum,
        padding: 3
      }}
    >
      <Card
        sx={{
          backgroundColor: COLORS.metal,
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)'
        }}
      >
        <CardContent sx={{ p: 5 }}>
          {/* Header con logo */}
          <Box
            sx={{
              backgroundColor: COLORS.metal,
              padding: 2,
              borderRadius: 1,
              textAlign: 'center',
              mb: 4
            }}
          >
            <BrandMark
              background={false}
              bgcolor={COLORS.metal}
              width={180}
              colors={{
                v: COLORS.white,
                a: COLORS.white,
                l: COLORS.white,
                i: COLORS.white,
                d: COLORS.white,
                o: COLORS.white,
                c: COLORS.white,
                u: COLORS.white,
              }}
            />
          </Box>

          {/* Formulario */}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="usuario@ejemplo.com"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: COLORS.platinum,
                    borderWidth: 2
                  },
                  '&:hover fieldset': {
                    borderColor: COLORS.gold,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: COLORS.gold,
                  },
                },
                '& .MuiOutlinedInput-input': {
                  color: COLORS.white,
                },
                '& .MuiInputLabel-root': {
                  color: COLORS.white,
                  fontWeight: 500,
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: COLORS.white,
                }
              }}
            />

            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: COLORS.platinum,
                    borderWidth: 2
                  },
                  '&:hover fieldset': {
                    borderColor: COLORS.gold,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: COLORS.gold,
                  },
                },
                '& .MuiOutlinedInput-input': {
                  color: COLORS.white,
                },
                '& .MuiInputLabel-root': {
                  color: COLORS.white,
                  fontWeight: 500,
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: COLORS.white,
                }
              }}
            />

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{
                backgroundColor: COLORS.gold,
                color: COLORS.white,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: COLORS.platinum,
                  color: COLORS.metal,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 5px 15px rgba(36, 47, 64, 0.3)`
                },
                '&:disabled': {
                  opacity: 0.6,
                  transform: 'none',
                  boxShadow: 'none'
                },
                transition: 'all 0.3s ease'
              }}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;