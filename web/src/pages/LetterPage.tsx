import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  CircularProgress,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import WorkOutlineIcon from "@mui/icons-material/WorkOutlineOutlined";
import FindInPageOutlinedIcon from "@mui/icons-material/FindInPageOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import { type LetterResponse, postJson } from "../api";
import { useLanguage, useTranslated } from "../i18n";
import { brand } from "../theme";
import PageHeader from "../components/PageHeader";
import CitationCard from "../components/CitationCard";
import LoadingCard from "../components/LoadingCard";
import ErrorAlert from "../components/ErrorAlert";

const letterTypes = [
  {
    id: "landlord_reply",
    label: "Reply to landlord",
    Icon: HomeOutlinedIcon,
    color: brand.green,
    tint: brand.greenTint,
    recipientHint: "For example: Mr. John Doe, Landlord",
    factsHint:
      "For example: On 14 October my landlord told me to leave in three days. I pay rent monthly and have paid up to the end of October.",
  },
  {
    id: "employer_complaint",
    label: "Complaint to employer",
    Icon: WorkOutlineIcon,
    color: brand.amberText,
    tint: brand.amberTint,
    recipientHint: "For example: The Manager, ABC Traders Ltd",
    factsHint:
      "For example: I have worked here since March 2021. I was dismissed without notice and my salary for August and September has not been paid.",
  },
  {
    id: "access_to_information",
    label: "Access to Information request",
    Icon: FindInPageOutlinedIcon,
    color: brand.teal,
    tint: brand.tealTint,
    recipientHint: "For example: The Information Officer, Ministry of Lands",
    factsHint:
      "For example: I want a copy of the land records for plot 12 in my village, because a neighbour claims part of my family's land.",
  },
] as const;

type LetterTypeId = (typeof letterTypes)[number]["id"];

function LetterResult({ result, onEdit }: { result: LetterResponse; onEdit: () => void }) {
  const { language, t } = useLanguage();
  const [snack, setSnack] = useState<string | null>(null);

  // Translated line by line so the letter keeps its layout.
  const lines = result.letter.split("\n");
  const { texts, translating } = useTranslated(lines);
  const letter = texts.join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter);
      setSnack(t("Copied"));
    } catch {
      setSnack(t("Could not copy. Please select the text and copy it yourself."));
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([letter], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `eddembe-letter-${result.id}${language === "lg" ? "-luganda" : ""}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button variant="text" startIcon={<ArrowBackIcon />} onClick={onEdit} sx={{ alignSelf: "flex-start", ml: -1 }}>
        {t("Edit details")}
      </Button>
      <Alert severity="info" variant="outlined" sx={{ bgcolor: brand.amberTint, borderColor: brand.amber, color: brand.amberText }}>
        {t("Fill in the parts in [brackets] before you send it.")}
      </Alert>

      {/* Paper-like letter: serif font for the letter body only. */}
      <Card sx={{ p: { xs: 3, sm: 5 }, bgcolor: "#FFFFFF", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", borderTop: 6, borderTopColor: brand.green }}>
        {translating && <Typography sx={{ color: "text.secondary", mb: 2 }}>{t("Translating…")}</Typography>}
        <Typography
          component="pre"
          sx={{ m: 0, whiteSpace: "pre-wrap", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "1rem", lineHeight: 1.7 }}
        >
          {letter}
        </Typography>
      </Card>

      <Box sx={{ display: "flex", gap: 1.5 }}>
        <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copy} disabled={translating} sx={{ flex: 1, bgcolor: "#fff" }}>
          {t("Copy")}
        </Button>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={download} disabled={translating} sx={{ flex: 1 }}>
          {t("Download")}
        </Button>
      </Box>

      {result.unverified_citations.length > 0 && (
        <Alert severity="warning" variant="outlined">
          {t("Please check these with a legal aid clinic. Eddembe could not confirm them:")} {result.unverified_citations.join(", ")}
        </Alert>
      )}

      {result.citations.length > 0 && (
        <Box>
          <Typography variant="h3" component="h3" sx={{ mb: 1.5 }}>
            {t("Law cited in this letter")}
          </Typography>
          <Box>
            {result.citations.map((c, i) => (
              <CitationCard key={`${c.law_name}-${c.section_number}`} index={i + 1} {...c} />
            ))}
          </Box>
        </Box>
      )}

      <Card sx={{ p: 2, display: "flex", gap: 1.5, alignItems: "flex-start", bgcolor: brand.greenTint, borderColor: brand.greenSoft }}>
        <CheckCircleRoundedIcon sx={{ color: brand.green }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 500, color: brand.green }}>{t("Letter saved")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", wordBreak: "break-all" }}>
            {t("Fingerprint of the English original (SHA-256):")} {result.content_hash}
          </Typography>
        </Box>
      </Card>

      <Snackbar
        open={snack !== null}
        autoHideDuration={2500}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: { xs: 96, sm: 24 } }}
      />
    </>
  );
}

export default function LetterPage() {
  const { t } = useLanguage();
  const [type, setType] = useState<LetterTypeId>("landlord_reply");
  const [facts, setFacts] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LetterResponse | null>(null);

  const spec = letterTypes.find((x) => x.id === type)!;
  const ready = facts.trim().length >= 10 && recipient.trim().length >= 2 && sender.trim().length >= 2;

  async function write() {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await postJson<LetterResponse>("/api/letter", { letter_type: type, facts, recipient, sender_name: sender }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <PageHeader
        Icon={EditNoteOutlinedIcon}
        color={brand.teal}
        tint={brand.tealTint}
        title={t("Write a letter")}
        description={t("Tell us what happened. Eddembe writes a polite, firm letter that cites the law for you.")}
      />

      {!result && (
        <Card sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h3" component="h3" sx={{ mb: 1.5 }}>
            {t("1. What kind of letter?")}
          </Typography>
          <Box
            role="radiogroup"
            aria-label={t("Letter type")}
            sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}
          >
            {letterTypes.map((lt) => {
              const selected = lt.id === type;
              return (
                <ButtonBase
                  key={lt.id}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setType(lt.id)}
                  disabled={loading}
                  sx={{
                    justifyContent: { xs: "flex-start", sm: "center" },
                    flexDirection: { xs: "row", sm: "column" },
                    gap: 1.5,
                    p: 2,
                    minHeight: 64,
                    borderRadius: "12px",
                    border: 2,
                    borderColor: selected ? lt.color : "divider",
                    bgcolor: selected ? lt.tint : "background.paper",
                    textAlign: { xs: "left", sm: "center" },
                  }}
                >
                  <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: lt.tint, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <lt.Icon sx={{ color: lt.color }} />
                  </Box>
                  <Typography sx={{ fontWeight: selected ? 700 : 500 }}>{t(lt.label)}</Typography>
                </ButtonBase>
              );
            })}
          </Box>

          <Typography variant="h3" component="h3" sx={{ mt: 3, mb: 1.5 }}>
            {t("2. Your details")}
          </Typography>
          <Stack spacing={2}>
            <TextField label={t("Your name")} value={sender} onChange={(e) => setSender(e.target.value)} disabled={loading} autoComplete="name" fullWidth />
            <TextField
              label={t("Who is the letter to?")}
              placeholder={t(spec.recipientHint)}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={loading}
              fullWidth
            />
            <TextField
              label={t("What happened")}
              placeholder={t(spec.factsHint)}
              multiline
              minRows={4}
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              disabled={loading}
              helperText={t("Include dates, amounts and what the other person said or did.")}
              fullWidth
            />
          </Stack>
          <Button
            variant="contained"
            fullWidth
            onClick={write}
            disabled={loading || !ready}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ mt: 3 }}
          >
            {loading ? t("Writing your letter…") : t("Write my letter")}
          </Button>
        </Card>
      )}

      <Stack spacing={2} sx={{ mt: result ? 0 : 3 }}>
        {loading && <LoadingCard message={t("Reading the law and writing your letter…")} lines={8} />}
        {error && <ErrorAlert message={error} onRetry={write} />}
        {result && <LetterResult result={result} onEdit={() => setResult(null)} />}
      </Stack>
    </Box>
  );
}
