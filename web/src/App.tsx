import { useEffect, useState } from "react";
import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "./theme";
import { LanguageProvider } from "./i18n";
import AppTopBar from "./components/AppTopBar";
import AppNavigation, { type PageId } from "./components/AppNavigation";
import Footer from "./components/Footer";
import ErrorAlert from "./components/ErrorAlert";
import AskPage from "./pages/AskPage";
import ScanPage from "./pages/ScanPage";
import LetterPage from "./pages/LetterPage";

export default function App() {
  const [page, setPage] = useState<PageId>("ask");
  const [serverUp, setServerUp] = useState<boolean | null>(null);

  function checkServer() {
    fetch("/api/health")
      .then((r) => setServerUp(r.ok))
      .catch(() => setServerUp(false));
  }
  useEffect(checkServer, []);

  return (
    <ThemeProvider theme={theme}>
      <LanguageProvider>
        <CssBaseline />
        <AppTopBar />
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <AppNavigation page={page} onSelect={setPage} />
          <Box
            component="main"
            sx={{
              flex: 1,
              maxWidth: 760,
              minWidth: 0,
              px: { xs: 2, sm: 3 },
              pt: { xs: 3, sm: 4 },
              // Room for the bottom navigation bar on phones
              pb: { xs: 12, sm: 4 },
            }}
          >
            {serverUp === false && (
              <Box sx={{ mb: 3 }}>
                <ErrorAlert message="We could not reach the server. Check your connection and try again." onRetry={checkServer} />
              </Box>
            )}
            {/* Pages stay mounted so switching tabs keeps answers and forms. */}
            <Box hidden={page !== "ask"}>
              <AskPage />
            </Box>
            <Box hidden={page !== "scan"}>
              <ScanPage />
            </Box>
            <Box hidden={page !== "letter"}>
              <LetterPage />
            </Box>
            <Footer />
          </Box>
          {/* Balances the rail so the content column stays centred on wide screens */}
          <Box sx={{ display: { xs: "none", lg: "block" }, width: 96, flexShrink: 0 }} />
        </Box>
      </LanguageProvider>
    </ThemeProvider>
  );
}
