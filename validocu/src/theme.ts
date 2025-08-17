import { createTheme } from '@mui/material/styles';

const COLORS = {
  primary:   '#367015',
  secondary: '#242F40',
  accent:    '#CCA43B',
  gray:      '#E5E5E5',
  white:     '#FFFFFF',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: COLORS.primary, contrastText: COLORS.white },
    secondary: { main: COLORS.secondary, contrastText: COLORS.white },
    warning:   { main: COLORS.accent },
    background:{ default: COLORS.white, paper: COLORS.white },
    divider: COLORS.gray,
    text: { primary: COLORS.secondary, secondary: '#475264' },
  },
  typography: {
    fontFamily: [
      'Inter','Segoe UI','Roboto','Helvetica Neue','Arial','sans-serif',
    ].join(','),
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },

  components: {
    // AppBar con defaults globales (evita overrides extra y quita sombras)
    MuiAppBar: {
      defaultProps: { color: 'secondary', elevation: 0 },
    },

    // Botones: sin elevación y radio consistente
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10 } },
      variants: [
        { props: { color: 'warning', variant: 'contained' },
          style: { color: COLORS.secondary } },
      ],
    },
  },
});
