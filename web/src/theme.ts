import { createTheme } from "@mui/material/styles";

const border = "#E0E0E0";

// Brand colours used across pages, so every screen shares one palette.
export const brand = {
  green: "#1B5E20",
  greenMid: "#2E7D32",
  greenSoft: "#C8E6C9",
  greenTint: "#E8F5E9",
  amber: "#F9A825",
  amberTint: "#FFF4D6",
  amberText: "#6B4A00",
  teal: "#00695C",
  tealTint: "#E0F2F1",
  red: "#B3261E",
  redTint: "#FCE8E6",
  page: "#F1F6F0",
  gradient: "linear-gradient(135deg, #154D19 0%, #1B5E20 45%, #2E7D32 100%)",
};

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1B5E20", contrastText: "#FFFFFF" },
    // Amber is for highlights and warnings only. Dark text keeps it readable.
    secondary: { main: "#F9A825", contrastText: "#1F1F1F" },
    warning: { main: "#F9A825", contrastText: "#1F1F1F" },
    error: { main: "#B3261E" },
    success: { main: "#1B5E20" },
    background: { default: brand.page, paper: "#FFFFFF" },
    text: { primary: "#1F1F1F", secondary: "#5F6368" },
    divider: border,
  },
  shape: { borderRadius: 12 },
  spacing: 8,
  typography: {
    fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSize: 16,
    htmlFontSize: 16,
    h1: { fontSize: "1.75rem", fontWeight: 500, lineHeight: 1.3 },
    h2: { fontSize: "1.25rem", fontWeight: 500, lineHeight: 1.4 },
    h3: { fontSize: "1.0625rem", fontWeight: 500, lineHeight: 1.4 },
    body1: { fontSize: "1rem", lineHeight: 1.6 },
    body2: { fontSize: "0.875rem", lineHeight: 1.55 },
    button: { textTransform: "none", fontWeight: 500, fontSize: "0.9375rem" },
    caption: { fontSize: "0.875rem" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: brand.page },
        // Clear focus ring for keyboard users on every interactive element.
        ":focus-visible": { outline: "3px solid #1B5E20", outlineOffset: 2 },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 20, minHeight: 48, paddingInline: 24 },
        sizeSmall: { minHeight: 40, paddingInline: 16 },
      },
    },
    MuiIconButton: { styleOverrides: { root: { minWidth: 48, minHeight: 48 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 20, fontSize: "0.875rem" } } },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: { root: { borderRadius: 12, borderColor: border } },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiAppBar: { defaultProps: { elevation: 0, color: "inherit" } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12, backgroundColor: "#FFFFFF" } } },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          minHeight: 40,
          paddingInline: 12,
          fontWeight: 500,
          "&.Mui-selected": { backgroundColor: "#C8E6C9", color: "#1B5E20" },
          "&.Mui-selected:hover": { backgroundColor: "#B5DDB7" },
        },
      },
    },
    // One joined segmented button: rounded outside, square inside.
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          flexShrink: 0,
          "& .MuiToggleButton-root": { borderRadius: 0 },
          "& .MuiToggleButton-root:first-of-type": { borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
          "& .MuiToggleButton-root:last-of-type": { borderTopRightRadius: 20, borderBottomRightRadius: 20 },
        },
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiAccordion: {
      defaultProps: { disableGutters: true, elevation: 0 },
      styleOverrides: { root: { border: `1px solid ${border}`, borderRadius: 12, "&::before": { display: "none" } } },
    },
  },
});
