import { Box, Card, CircularProgress, Skeleton, Typography } from "@mui/material";

// Skeleton shaped like a result card, with a friendly line of text.
export default function LoadingCard({ message, lines = 4 }: { message: string; lines?: number }) {
  return (
    <Card sx={{ p: 2.5 }} aria-busy="true" aria-live="polite">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <CircularProgress size={20} />
        <Typography sx={{ color: "text.secondary" }}>{message}</Typography>
      </Box>
      <Skeleton variant="text" width="40%" height={28} />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? "70%" : "100%"} />
      ))}
      <Skeleton variant="rounded" height={64} sx={{ mt: 2 }} />
    </Card>
  );
}
