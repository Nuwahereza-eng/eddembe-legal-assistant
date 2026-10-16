import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { type AskResponse, postForm, postJson, speak } from "../api";
import { type Language, rememberTranslations, useLanguage, useTranslated } from "../i18n";
import { brand } from "../theme";
import PageHeader from "../components/PageHeader";
import CitationCard from "../components/CitationCard";
import LoadingCard from "../components/LoadingCard";
import ErrorAlert from "../components/ErrorAlert";
import EmptyState from "../components/EmptyState";

const suggestions = [
  { label: "Tenant", question: "Can my landlord evict me without notice?" },
  { label: "Employment", question: "My employer has not paid my salary for two months. What can I do?" },
  { label: "Land", question: "Can I be evicted from land I have occupied for many years?" },
];

const confidence = {
  high: { label: "High confidence", sx: { bgcolor: brand.greenTint, color: brand.green } },
  medium: { label: "Medium confidence", sx: { bgcolor: brand.amberTint, color: brand.amberText } },
  low: { label: "Low confidence", sx: { bgcolor: "#F1F3F4", color: "text.secondary" } },
} as const;

type Turn = { id: number; question: string; language: Language; result?: AskResponse; error?: string };

// Finished questions and answers are kept in this browser, so reloading the page shows the
// conversation again without asking the server (no extra API calls).
const CHAT_KEY = "eddembe.chat.v1";
const MAX_SAVED = 30;

function loadChat(): Turn[] {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "[]") as Turn[];
    return Array.isArray(saved) ? saved.filter((t) => t.result) : [];
  } catch {
    return [];
  }
}

function saveChat(turns: Turn[]) {
  try {
    const done = turns.filter((t) => t.result).slice(-MAX_SAVED);
    if (done.length) localStorage.setItem(CHAT_KEY, JSON.stringify(done));
    else localStorage.removeItem(CHAT_KEY);
  } catch {
    /* storage full or blocked: the chat just is not remembered */
  }
}

function AnswerCard({ result }: { result: AskResponse }) {
  const { language, t } = useLanguage();
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Shown in whichever language is selected now, not only the one it was asked in.
  const { texts, translating } = useTranslated([result.answer_en, ...result.next_steps_en]);
  const [answer, ...nextSteps] = texts;

  async function listen() {
    setPlaying(true);
    setAudioError(null);
    try {
      const audio = new Audio(URL.createObjectURL(await speak(answer, "lg")));
      audio.onended = () => setPlaying(false);
      await audio.play();
    } catch (err) {
      setAudioError((err as Error).message);
      setPlaying(false);
    }
  }

  const conf = confidence[result.confidence];

  return (
    <Card sx={{ overflow: "hidden", maxWidth: "94%", borderTopLeftRadius: "4px" }}>
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 1.5, bgcolor: brand.greenTint, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h3" component="h3" sx={{ flex: 1, color: brand.green }}>
          {t("Answer")}
        </Typography>
        <Chip size="small" label={t(conf.label)} sx={{ ...conf.sx, bgcolor: "#fff" }} />
      </Box>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {translating && (
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
            {t("Translating…")}
          </Typography>
        )}
        <Typography sx={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{answer}</Typography>

        {/* Sunbird reads Luganda aloud, so Listen is offered when Luganda is selected. */}
        {language === "lg" && !translating && (
          <Button
            variant="text"
            startIcon={playing ? <CircularProgress size={18} /> : <VolumeUpOutlinedIcon />}
            onClick={listen}
            disabled={playing}
            sx={{ mt: 1, ml: -1 }}
          >
            {playing ? t("Playing…") : t("Listen")}
          </Button>
        )}
        {audioError && <ErrorAlert message={audioError} />}

        {result.citations.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h3" component="h4" sx={{ mb: 1.5 }}>
              {t("Where this comes from")}
            </Typography>
            <Box>
              {result.citations.map((c, i) => (
                <CitationCard key={`${c.law_name}-${c.section_number}`} index={i + 1} {...c} />
              ))}
            </Box>
          </Box>
        )}

        {nextSteps.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h3" component="h4" sx={{ mb: 1 }}>
              {t("What you can do next")}
            </Typography>
            <Stack spacing={1}>
              {nextSteps.map((step, i) => (
                <Box key={i} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      bgcolor: brand.amber,
                      color: "#1F1F1F",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Typography>{step}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    </Card>
  );
}

export default function AskPage() {
  const { language, t } = useLanguage();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>(() => {
    const saved = loadChat();
    // Saved Luganda answers already contain their translation; reuse it instead of re-translating.
    for (const { result: r } of saved) {
      if (r?.language === "lg") rememberTranslations([r.answer_en, ...r.next_steps_en], [r.answer, ...r.next_steps]);
    }
    return saved;
  });
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(Math.max(0, ...turns.map((t) => t.id)) + 1);

  useEffect(() => saveChat(turns), [turns]);

  // Keep the newest answer in view, but do not scroll on first load.
  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, loading]);

  async function run(turn: Turn) {
    setLoading(true);
    try {
      const result = await postJson<AskResponse>("/api/ask", { question: turn.question, language: turn.language });
      if (result.language === "lg") {
        // The server already translated these; reuse them instead of translating again.
        rememberTranslations([result.answer_en, ...result.next_steps_en], [result.answer, ...result.next_steps]);
      }
      setTurns((ts) => ts.map((x) => (x.id === turn.id ? { ...x, result, error: undefined } : x)));
    } catch (err) {
      setTurns((ts) => ts.map((x) => (x.id === turn.id ? { ...x, error: (err as Error).message } : x)));
    } finally {
      setLoading(false);
    }
  }

  function ask() {
    const q = question.trim();
    if (q.length < 3 || loading) return;
    const turn: Turn = { id: nextId.current++, question: q, language };
    setTurns((ts) => [...ts, turn]);
    setQuestion("");
    run(turn);
  }

  // Records speech and turns it into text with Sunbird, in the selected language.
  async function toggleMic() {
    if (recording) return recorder.current?.stop();
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const parts: Blob[] = [];
      rec.ondataavailable = (e) => parts.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setRecording(false);
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", new Blob(parts, { type: rec.mimeType }), "question.webm");
          form.append("language", language);
          const { text } = await postForm<{ text: string }>("/api/speech/stt", form);
          setQuestion(text);
        } catch (err) {
          setMicError((err as Error).message);
        } finally {
          setTranscribing(false);
        }
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setMicError("We could not use your microphone. Please allow microphone access, or type your question.");
    }
  }

  const hasText = question.trim().length > 0;

  return (
    <Box>
      <PageHeader
        Icon={ChatOutlinedIcon}
        color={brand.green}
        tint={brand.greenSoft}
        title={t("Ask about your rights")}
        description={t("Ask in English or Luganda. Answers come from Ugandan law, with the exact section shown.")}
      />

      {turns.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: -1.5, mb: 1 }}>
          <Button
            size="small"
            variant="text"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => setTurns([])}
            disabled={loading}
            sx={{ color: "text.secondary" }}
          >
            {t("Clear chat")}
          </Button>
        </Box>
      )}

      <Stack spacing={2.5} sx={{ mb: 2, minHeight: { xs: 120, sm: 160 } }}>
        {turns.length === 0 && <EmptyState Icon={ForumOutlinedIcon} text={t("Your questions and answers will appear here.")} />}
        {turns.map((turn) => (
          <Stack key={turn.id} spacing={1.5}>
            <Box
              sx={{
                alignSelf: "flex-end",
                maxWidth: "85%",
                background: brand.gradient,
                color: "#fff",
                px: 2,
                py: 1.25,
                borderRadius: "18px 18px 4px 18px",
              }}
            >
              <Typography>{turn.question}</Typography>
            </Box>
            {turn.result && <AnswerCard result={turn.result} />}
            {turn.error && <ErrorAlert message={turn.error} onRetry={loading ? undefined : () => run(turn)} />}
            {!turn.result && !turn.error && <LoadingCard message={t("Reading the law…")} />}
          </Stack>
        ))}
        <div ref={endRef} />
      </Stack>

      {/* Composer pinned above the bottom navigation, like a chat app */}
      <Box
        sx={{
          position: "sticky",
          bottom: { xs: "calc(76px + env(safe-area-inset-bottom))", sm: 16 },
          zIndex: 5,
          pt: 1,
          // Fades the chat out behind the composer instead of a hard edge
          background: `linear-gradient(to bottom, rgba(241,246,240,0) 0, ${brand.page} 14px)`,
        }}
      >
        <Box
          sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 1, scrollbarWidth: "none" }}
          role="group"
          aria-label={t("Example questions")}
        >
          {suggestions.map((s) => (
            <Chip
              key={s.label}
              label={t(s.question)}
              onClick={() => setQuestion(t(s.question))}
              disabled={loading}
              sx={{
                flexShrink: 0,
                maxWidth: { xs: 250, sm: 320 },
                height: "auto",
                minHeight: 40,
                py: 0.75,
                bgcolor: "#fff",
                border: 1,
                borderColor: brand.greenSoft,
                color: brand.green,
                "& .MuiChip-label": { whiteSpace: "normal", lineHeight: 1.35 },
              }}
            />
          ))}
        </Box>

        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              bgcolor: "#fff",
              borderRadius: "26px",
              border: 1,
              borderColor: recording ? "error.main" : "divider",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              px: 2,
              py: 0.75,
              minHeight: 52,
            }}
          >
            {recording ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.75 }} aria-live="polite">
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: "error.main",
                    "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.25 } },
                    animation: "pulse 1.2s ease-in-out infinite",
                  }}
                />
                <Typography sx={{ color: "error.main", fontWeight: 500 }}>{t("Listening…")}</Typography>
              </Box>
            ) : (
              <TextField
                variant="standard"
                multiline
                maxRows={5}
                fullWidth
                placeholder={
                  transcribing
                    ? t("Turning speech into text…")
                    : t("Ask about your rights, e.g. Can my landlord evict me without notice?")
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask();
                  }
                }}
                disabled={loading || transcribing}
                slotProps={{ input: { disableUnderline: true }, htmlInput: { "aria-label": t("Your question") } }}
              />
            )}
          </Box>

          {/* One round button: send when there is text, microphone when the box is empty */}
          <IconButton
            onClick={hasText && !recording ? ask : toggleMic}
            disabled={loading || transcribing}
            aria-label={hasText && !recording ? t("Ask") : recording ? t("Stop recording") : t("Speak your question")}
            sx={{
              width: 52,
              height: 52,
              flexShrink: 0,
              color: "#fff",
              background: recording ? brand.red : brand.gradient,
              boxShadow: "0 2px 6px rgba(27,94,32,0.35)",
              "&:hover": { background: recording ? "#9C1F18" : brand.green },
              "&.Mui-disabled": { background: "#9E9E9E", color: "#fff" },
            }}
          >
            {loading || transcribing ? (
              <CircularProgress size={22} sx={{ color: "#fff" }} />
            ) : recording ? (
              <StopRoundedIcon />
            ) : hasText ? (
              <SendRoundedIcon />
            ) : (
              <MicRoundedIcon />
            )}
          </IconButton>
        </Box>
        {micError && (
          <Box sx={{ mt: 1 }}>
            <ErrorAlert message={micError} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
