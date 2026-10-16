// Sunbird AI v2 API (https://docs.sunbird.ai): translation, speech-to-text, text-to-speech.
import { requireEnv } from "./gemini.js";

const base = () => requireEnv("SUNBIRD_BASE_URL").replace(/\/$/, "");
const auth = () => ({ Authorization: `Bearer ${requireEnv("SUNBIRD_API_KEY")}` });

async function check(res: Response, what: string) {
  if (!res.ok) throw new Error(`Sunbird ${what} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res;
}

// Sunbird often turns "employer" into "omukozi" (worker) and "landlord" into "mwami wange"
// (my husband). Rewording these into plain English it translates reliably fixes that.
const CLEARER_ENGLISH: [RegExp, string][] = [
  // Phrases with an article or "my/your" first, so the result stays good English
  [/\b(an|a) employer\b/gi, "a boss at work"],
  [/\b(an|a) employee\b/gi, "a worker"],
  [/\byour landlord\b/gi, "the owner of the house you rent"],
  [/\bmy landlord\b/gi, "the owner of the house I rent"],
  [/\b(the|a) landlord\b/gi, "the owner of the rented house"],
  [/\bemployers'/gi, "bosses' at work"],
  [/\bemployer's/gi, "boss's at work"],
  [/\bemployers\b/gi, "bosses at work"],
  [/\bemployer\b/gi, "boss at work"],
  [/\blandlords'/gi, "house owners'"],
  [/\blandlord's/gi, "house owner's"],
  [/\blandlords\b/gi, "owners of rented houses"],
  [/\blandlord\b/gi, "owner of the rented house"],
  [/\bemployees\b/gi, "workers"],
  [/\bemployee\b/gi, "worker"],
];

export function clearerEnglish(text: string): string {
  // Keep a capital letter where the original word had one (start of a sentence).
  const keepCase = (match: string, plain: string) =>
    match[0] === match[0].toUpperCase() ? plain[0].toUpperCase() + plain.slice(1) : plain;
  return CLEARER_ENGLISH.reduce((t, [re, plain]) => t.replace(re, (m) => keepCase(m, plain)), text);
}

export async function translate(text: string, source: "eng" | "lug", target: "eng" | "lug"): Promise<string> {
  if (source === "eng") text = clearerEnglish(text);
  const res = await check(
    await fetch(`${base()}/tasks/translate`, {
      method: "POST",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ source_language: source, target_language: target, text }),
    }),
    "translation"
  );
  const data = await res.json();
  return data.output?.translated_text ?? "";
}

export async function speechToText(
  audio: Buffer,
  mimeType: string,
  filename: string,
  language: "lug" | "eng" = "lug"
): Promise<string> {
  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(audio)], { type: mimeType }), filename);
  form.append("language", language);
  const res = await check(
    await fetch(`${base()}/tasks/audio/transcriptions`, { method: "POST", headers: auth(), body: form }),
    "speech-to-text"
  );
  const data = await res.json();
  return data.audio_transcription ?? "";
}

export async function textToSpeech(text: string): Promise<{ audio: Buffer; contentType: string }> {
  const res = await check(
    await fetch(`${base()}/tasks/audio/speech`, {
      method: "POST",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: "lug", response_mode: "stream" }),
    }),
    "text-to-speech"
  );
  return { audio: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "audio/wav" };
}
