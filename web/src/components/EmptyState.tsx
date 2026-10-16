import { Box, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

export default function EmptyState({ Icon, text }: { Icon: SvgIconComponent; text: string }) {
  return (
    <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
      <Icon sx={{ fontSize: 56, color: "#BDBDBD" }} aria-hidden />
      <Typography sx={{ mt: 1 }}>{text}</Typography>
    </Box>
  );
}
