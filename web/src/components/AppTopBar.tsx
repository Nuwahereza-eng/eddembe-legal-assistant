import { AppBar, Box, ToggleButton, ToggleButtonGroup, Toolbar, Typography } from "@mui/material";
import BalanceIcon from "@mui/icons-material/Balance";
import { brand } from "../theme";
import { type Language, useLanguage } from "../i18n";

export default function AppTopBar() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <AppBar position="sticky" sx={{ background: brand.gradient, color: "#fff" }}>
      <Toolbar sx={{ gap: 1.5, minHeight: { xs: 64, sm: 72 } }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "12px",
            bgcolor: "rgba(255,255,255,0.14)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <BalanceIcon sx={{ color: brand.amber }} aria-hidden />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h1" sx={{ fontSize: "1.25rem", fontWeight: 500, lineHeight: 1.2 }}>
            Eddembe
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, display: { xs: "none", sm: "block" } }}>
            {t("Know your rights under Ugandan law")}
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={language}
          onChange={(_, v: Language | null) => v && setLanguage(v)}
          aria-label="Language"
          sx={{
            "& .MuiToggleButton-root": {
              color: "#fff",
              borderColor: "rgba(255,255,255,0.5)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
            },
            "& .MuiToggleButton-root.Mui-selected": {
              bgcolor: "#fff",
              color: brand.green,
              "&:hover": { bgcolor: "#F1F8F1" },
            },
          }}
        >
          <ToggleButton value="en">English</ToggleButton>
          <ToggleButton value="lg">Luganda</ToggleButton>
        </ToggleButtonGroup>
      </Toolbar>
    </AppBar>
  );
}
