export type Citation = { law_name: string; section_number: string; excerpt: string };

export type AskResponse = {
  answer: string;
  citations: Citation[];
  next_steps: string[];
  confidence: "high" | "medium" | "low";
  language: "en" | "lg";
  // Always present: the English version, used when the reader switches language later
  answer_en: string;
  next_steps_en: string[];
};

export type RelatedSection = Citation & { red_flags: string[]; explanation: string };

export type DocumentResponse = {
  document_type: string;
  transcription: string;
  summary: string;
  red_flags: string[];
  missing_items: string[];
  related_sections: RelatedSection[];
  question_answer: string | null;
};

export type LetterResponse = {
  letter: string;
  id: number;
  content_hash: string;
  citations: { law_name: string; section_number: string }[];
  unverified_citations: string[];
};

const OFFLINE = "We could not reach the server. Check your connection and try again.";
const GENERIC = "Something went wrong. Please try again.";

// Never shows raw errors: network failures and server errors become plain sentences.
async function send(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error(OFFLINE);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = typeof data?.error === "string" ? data.error : res.status >= 502 ? OFFLINE : GENERIC;
    throw new Error(message);
  }
  return res;
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await send(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export async function postForm<T>(url: string, form: FormData): Promise<T> {
  const res = await send(url, { method: "POST", body: form });
  return (await res.json()) as T;
}

export async function speak(text: string, language: "en" | "lg"): Promise<Blob> {
  const res = await send("/api/speech/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  return res.blob();
}

export const unitFor = (lawName: string) => (lawName.startsWith("Constitution") ? "Article" : "Section");

// Phone photos are often 4–12 MB. Shrinking them before upload saves data and time.
export async function shrinkImage(file: File, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // e.g. HEIC on browsers that cannot decode it: send as is
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85));
}
