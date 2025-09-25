import { createTheme } from '@mui/material/styles';

const COLORS = {
  metal:    '#242F40',
  green:    '#367015',
  gold:     '#CCA43B',
  platinum: '#E5E5E5',
  white:    '#FFFFFF',
  red:      '#c74343',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: COLORS.metal, contrastText: COLORS.white },
    secondary: { main: COLORS.green, contrastText: COLORS.white },
    warning:   { main: COLORS.gold },
    error:     { main: COLORS.red },
    background:{ default: COLORS.platinum, paper: COLORS.white },
    divider: COLORS.platinum,
    text: { primary: COLORS.metal, secondary: '#475264' },
  },
  typography: {
    fontFamily: [
      'Inter','Segoe UI','Roboto','Helvetica Neue','Arial','sans-serif',
    ].join(','),
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: { borderRadius: 10 },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Evita que MUI agregue padding-right al abrir modales
        body: { paddingRight: '0 !important' },

        // 🔒 Ocultar scrollbars en todos los contenedores (mantiene el scroll funcional)
        '*': {
          scrollbarWidth: 'none',       // Firefox
          msOverflowStyle: 'none',      // IE/Edge antiguo
        },
        '*::-webkit-scrollbar': {
          width: 0,                     // WebKit (vertical)
          // height: 0,                 // si también quieres ocultar la horizontal
        },
    },
},
    // AppBar con defaults globales (evita overrides extra y quita sombras)
    MuiAppBar: {
      defaultProps: { elevation: 0 },
    },

    // Botones: sin elevación y radio consistente
    MuiButton: {
      defaultProps: { variant: "contained" },
    },
  },
});
