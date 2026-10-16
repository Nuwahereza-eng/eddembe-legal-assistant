import { Alert, Button } from "@mui/material";
import { brand } from "../theme";
import { useLanguage, useTranslated } from "../i18n";

export default function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLanguage();
  // Server messages are English sentences; translate them like any other result.
  const {
    texts: [text],
  } = useTranslated([message]);
  return (
    <Alert
      severity="error"
      variant="outlined"
      sx={{ bgcolor: brand.redTint, alignItems: "center" }}
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            {t("Try again")}
          </Button>
        )
      }
    >
      {text}
    </Alert>
  );
}
