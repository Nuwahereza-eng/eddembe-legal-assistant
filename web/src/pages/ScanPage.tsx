import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  ButtonBase,
  Card,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DocumentScannerOutlinedIcon from "@mui/icons-material/DocumentScannerOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { type DocumentResponse, postForm, shrinkImage } from "../api";
import { useLanguage, useTranslated } from "../i18n";
import { brand } from "../theme";
import PageHeader from "../components/PageHeader";
import CitationCard from "../components/CitationCard";
import LoadingCard from "../components/LoadingCard";
import ErrorAlert from "../components/ErrorAlert";

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ACCEPT = `image/*,${PDF},${DOCX},.pdf,.docx`;

// Some phones report an empty type for .docx files, so fall back to the file name.
function kindOf(file: File): "image" | "pdf" | "docx" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === PDF || /\.pdf$/i.test(file.name)) return "pdf";
  if (file.type === DOCX || /\.docx$/i.test(file.name)) return "docx";
  return null;
}

function Row({ icon, text, bg }: { icon: React.ReactNode; text: string; bg?: string }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", p: 1.5, borderRadius: "10px", bgcolor: bg }}>
      <Box sx={{ mt: 0.25, display: "flex" }}>{icon}</Box>
      <Typography>{text}</Typography>
    </Box>
  );
}

function SectionCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <Card sx={{ p: { xs: 2, sm: 3 }, borderTop: 4, borderTopColor: accent }}>
      <Typography variant="h3" component="h3" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Card>
  );
}

function Results({ result }: { result: DocumentResponse }) {
  const { t } = useLanguage();
  const rs = result.related_sections;

  // Everything Gemma wrote, in one list so it is translated in one request.
  const english = [
    result.document_type,
    result.summary,
    result.question_answer ?? "",
    ...result.red_flags,
    ...result.missing_items,
    ...rs.map((s) => s.explanation),
    ...rs.flatMap((s) => s.red_flags),
  ];
  const { texts, translating } = useTranslated(english);
  let i = 0;
  const take = (n: number) => texts.slice(i, (i += n));
  const [docType, summary, questionAnswer] = take(3);
  const redFlags = take(result.red_flags.length);
  const missing = take(result.missing_items.length);
  const explanations = take(rs.length);
  const about = rs.map((s) => take(s.red_flags.length));

  return (
    <>
      {translating && <Typography sx={{ color: "text.secondary" }}>{t("Translating…")}</Typography>}
      <SectionCard title={t("What this document is")} accent={brand.green}>
        {docType && <Chip label={docType} sx={{ mb: 1.5, bgcolor: brand.greenTint, color: brand.green, fontWeight: 600 }} />}
        <Typography sx={{ lineHeight: 1.6 }}>{summary}</Typography>
      </SectionCard>

      {result.question_answer && (
        <SectionCard title={t("Your question")} accent={brand.teal}>
          <Typography sx={{ lineHeight: 1.6 }}>{questionAnswer}</Typography>
        </SectionCard>
      )}

      {redFlags.length > 0 && (
        <SectionCard title={t("Red flags")} accent={brand.red}>
          <Stack spacing={1}>
            {redFlags.map((f, k) => (
              <Row key={k} text={f} bg={brand.redTint} icon={<WarningAmberRoundedIcon sx={{ color: "error.main" }} />} />
            ))}
          </Stack>
        </SectionCard>
      )}

      {missing.length > 0 && (
        <SectionCard title={t("What is missing")} accent={brand.amber}>
          <Stack spacing={0.5}>
            {missing.map((m, k) => (
              <Row key={k} text={m} bg={k % 2 ? undefined : brand.amberTint} icon={<InfoOutlinedIcon sx={{ color: brand.amberText }} />} />
            ))}
          </Stack>
        </SectionCard>
      )}

      {rs.length > 0 && (
        <SectionCard title={t("Related law")} accent={brand.amber}>
          <Box>
            {rs.map((s, k) => (
              <CitationCard
                key={`${s.law_name}-${s.section_number}`}
                index={k + 1}
                law_name={s.law_name}
                section_number={s.section_number}
                excerpt={s.excerpt}
                about={about[k]}
                explanation={explanations[k]}
              />
            ))}
          </Box>
        </SectionCard>
      )}

      {result.transcription && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 500 }}>{t("Text we read from the document")}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}>
              {result.transcription}
            </Typography>
          </AccordionDetails>
        </Accordion>
      )}
    </>
  );
}

export default function ScanPage() {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentResponse | null>(null);
  const [dragging, setDragging] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const kind = file ? kindOf(file) : null;

  useEffect(() => {
    if (!file || kindOf(file) !== "image") return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(f: File | undefined) {
    if (!f) return;
    if (!kindOf(f)) return setError("Please choose a photo, a PDF or a Word (.docx) file.");
    setFile(f);
    setResult(null);
    setError(null);
  }

  async function scan() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      if (kind === "image") form.append("image", await shrinkImage(file), "document.jpg");
      else form.append("image", new File([file], file.name, { type: kind === "pdf" ? PDF : DOCX }));
      if (question.trim()) form.append("question", question.trim());
      setResult(await postForm<DocumentResponse>("/api/document", form));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    choose(e.target.files?.[0]);
    e.target.value = "";
  };

  return (
    <Box>
      <PageHeader
        Icon={DocumentScannerOutlinedIcon}
        color={brand.amberText}
        tint={brand.amberTint}
        title={t("Scan a document")}
        description={t("Take a photo, or upload a PDF or Word file. Eddembe explains it and checks it against the law.")}
      />

      {/* Camera only for photos; the file picker also takes PDF and Word files. */}
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={picker} type="file" accept={ACCEPT} hidden onChange={onPick} />

      {!file ? (
        <Box
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            choose(e.dataTransfer.files?.[0]);
          }}
          sx={{
            border: "2px dashed",
            borderColor: dragging ? brand.green : "#C9B37A",
            borderRadius: "16px",
            background: dragging ? brand.greenTint : `linear-gradient(160deg, #FFFFFF 0%, ${brand.amberTint} 100%)`,
            p: { xs: 3, sm: 5 },
            textAlign: "center",
          }}
        >
          <Box
            sx={{ width: 72, height: 72, mx: "auto", borderRadius: "50%", background: brand.gradient, display: "grid", placeItems: "center" }}
          >
            <PhotoCameraOutlinedIcon sx={{ fontSize: 34, color: "#fff" }} />
          </Box>
          <Typography sx={{ fontWeight: 500, fontSize: "1.125rem", mt: 2 }}>{t("Take a photo or upload a document")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {t("Photos, PDF and Word (.docx) files")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap", mt: 2.5 }}>
            <Button variant="contained" startIcon={<PhotoCameraOutlinedIcon />} onClick={() => camera.current?.click()}>
              {t("Take photo")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileOutlinedIcon />}
              onClick={() => picker.current?.click()}
              sx={{ bgcolor: "#fff" }}
            >
              {t("Upload file")}
            </Button>
          </Box>
        </Box>
      ) : (
        <Card sx={{ p: 2 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            {preview ? (
              <Box
                component="img"
                src={preview}
                alt={t("Preview of the document you chose")}
                sx={{ width: 96, height: 120, objectFit: "cover", borderRadius: "8px", border: 1, borderColor: "divider" }}
              />
            ) : (
              <ButtonBase
                onClick={() => picker.current?.click()}
                aria-label={t("Change file")}
                sx={{ width: 96, height: 120, borderRadius: "8px", bgcolor: kind === "pdf" ? brand.redTint : "#E3F2FD", flexShrink: 0 }}
              >
                {kind === "pdf" ? (
                  <PictureAsPdfOutlinedIcon sx={{ fontSize: 44, color: brand.red }} />
                ) : (
                  <DescriptionOutlinedIcon sx={{ fontSize: 44, color: "#1565C0" }} />
                )}
              </ButtonBase>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file.name || t("Photo")}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {kind === "pdf" ? "PDF" : kind === "docx" ? "Word" : t("Photo")}
              </Typography>
              <Button variant="text" onClick={() => picker.current?.click()} disabled={loading} sx={{ ml: -1.5 }}>
                {t("Change file")}
              </Button>
            </Box>
          </Box>
          <TextField
            label={t("Anything you want to ask about it? (optional)")}
            placeholder={t("For example: Do I have to leave?")}
            fullWidth
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            sx={{ mt: 2 }}
          />
          <Button
            variant="contained"
            fullWidth
            onClick={scan}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ mt: 2 }}
          >
            {loading ? t("Reading your document…") : t("Explain this document")}
          </Button>
        </Card>
      )}

      <Stack spacing={2} sx={{ mt: 3 }}>
        {loading && (
          <>
            <LoadingCard message={t("Reading your document…")} />
            <LoadingCard message={t("Checking the law…")} lines={2} />
          </>
        )}
        {error && <ErrorAlert message={error} onRetry={file ? scan : undefined} />}
        {result && <Results result={result} />}
      </Stack>
    </Box>
  );
}
