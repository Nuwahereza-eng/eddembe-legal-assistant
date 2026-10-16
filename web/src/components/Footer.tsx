import { Typography } from "@mui/material";
import { useLanguage } from "../i18n";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <Typography component="footer" variant="body2" sx={{ color: "text.secondary", mt: 6, mb: 2, textAlign: "center" }}>
      {t("Eddembe gives legal information, not legal advice. For serious matters, talk to a lawyer or a legal aid clinic.")}
    </Typography>
  );
}
