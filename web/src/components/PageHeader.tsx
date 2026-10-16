import { Box, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

export default function PageHeader({
  title,
  description,
  Icon,
  color,
  tint,
}: {
  title: string;
  description: string;
  Icon: SvgIconComponent;
  color: string;
  tint: string;
}) {
  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", mb: 3 }}>
      <Box
        sx={{ width: 48, height: 48, borderRadius: "14px", bgcolor: tint, display: "grid", placeItems: "center", flexShrink: 0 }}
      >
        <Icon sx={{ color }} aria-hidden />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h1" component="h2">
          {title}
        </Typography>
        <Typography sx={{ color: "text.secondary", mt: 0.5 }}>{description}</Typography>
      </Box>
    </Box>
  );
}
