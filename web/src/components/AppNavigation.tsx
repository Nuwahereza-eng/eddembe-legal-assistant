import { Box, ButtonBase, Paper, Typography } from "@mui/material";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import DocumentScannerOutlinedIcon from "@mui/icons-material/DocumentScannerOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import { brand } from "../theme";
import { useLanguage } from "../i18n";

export type PageId = "ask" | "scan" | "letter";

const items = [
  { id: "ask", label: "Ask", Icon: ChatOutlinedIcon },
  { id: "scan", label: "Scan", Icon: DocumentScannerOutlinedIcon },
  { id: "letter", label: "Letter", Icon: EditNoteOutlinedIcon },
] as const;

function NavItem({ id, label, Icon, active, onSelect }: (typeof items)[number] & { active: boolean; onSelect: (id: PageId) => void }) {
  const { t } = useLanguage();
  return (
    <ButtonBase
      onClick={() => onSelect(id)}
      aria-current={active ? "page" : undefined}
      sx={{ flexDirection: "column", gap: 0.5, py: 1.5, px: 1, minWidth: 72, minHeight: 64, borderRadius: "16px" }}
    >
      {/* Material 3 style pill behind the active icon */}
      <Box
        sx={{
          width: 56,
          height: 32,
          borderRadius: "16px",
          display: "grid",
          placeItems: "center",
          bgcolor: active ? brand.greenSoft : "transparent",
          color: active ? "primary.main" : "text.secondary",
          transition: "background-color 150ms",
        }}
      >
        <Icon aria-hidden />
      </Box>
      <Typography
        component="span"
        sx={{ fontSize: "0.875rem", fontWeight: active ? 700 : 500, color: active ? brand.green : "text.secondary" }}
      >
        {t(label)}
      </Typography>
    </ButtonBase>
  );
}

export default function AppNavigation({ page, onSelect }: { page: PageId; onSelect: (id: PageId) => void }) {
  const list = items.map((it) => <NavItem key={it.id} {...it} active={page === it.id} onSelect={onSelect} />);
  return (
    <>
      {/* Phones: bottom bar */}
      <Paper
        component="nav"
        aria-label="Main"
        square
        sx={{
          display: { xs: "flex", sm: "none" },
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          justifyContent: "space-around",
          borderTop: 1,
          borderColor: "divider",
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        {list}
      </Paper>
      {/* Tablets and laptops: navigation rail */}
      <Box
        component="nav"
        aria-label="Main"
        sx={{
          display: { xs: "none", sm: "flex" },
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
          pt: 3,
          width: 96,
          flexShrink: 0,
          position: "sticky",
          top: 72,
          alignSelf: "flex-start",
        }}
      >
        {list}
      </Box>
    </>
  );
}
