// Every Gemma 4 call in Eddembe goes through this file.
import type { Part } from "@google/genai";
import type { ZodType } from "zod";
import { genai, requireEnv, withRetry } from "./gemini.js";

export type ImageInput = { mimeType: string; data: Buffer };

const model = () => requireEnv("GEMMA_MODEL_ID");

async function generate(parts: Part[], json: boolean, temperature = 0.2): Promise<string> {
  const started = Date.now();
  const res = await withRetry(() =>
    genai().models.generateContent({
      model: model(),
      contents: [{ role: "user", parts }],
      config: { temperature, ...(json ? { responseMimeType: "application/json" } : {}) },
    })
  );
  const usage = res.usageMetadata;
  console.log(
    `gemma ${model()} ${Date.now() - started}ms in=${usage?.promptTokenCount ?? "?"} out=${usage?.candidatesTokenCount ?? "?"}`
  );
  const text = res.text?.trim();
  if (!text) throw new Error("Gemma returned an empty reply");
  return text;
}

const imageParts = (images: ImageInput[] = []): Part[] =>
  images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data.toString("base64") } }));

// Gemma sometimes wraps JSON in ```json fences even in JSON mode.
function parseJson(text: string): unknown {
  const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? unfenced.slice(start, end + 1) : unfenced);
}

function validate<T>(text: string, schema: ZodType<T>): { ok: true; value: T } | { ok: false; error: string } {
  try {
    const result = schema.safeParse(parseJson(text));
    return result.success ? { ok: true, value: result.data } : { ok: false, error: result.error.message };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// Asks Gemma for JSON and validates it with zod. If the reply is broken, asks Gemma once to fix it.
export async function generateJson<T>(prompt: string, schema: ZodType<T>, images?: ImageInput[]): Promise<T> {
  const first = await generate([...imageParts(images), { text: prompt }], true);
  const checked = validate(first, schema);
  if (checked.ok) return checked.value;

  // Our prompts end with "Reply in ... JSON format", so that tail describes the expected shape.
  const formatAt = prompt.lastIndexOf("Reply in");
  const format = formatAt >= 0 ? prompt.slice(formatAt) : "";
  const fixPrompt =
    `Fix this JSON so it is valid and matches the required format. Keep the content the same. ` +
    `Reply with the JSON only.\n\nProblem: ${checked.error}\n\n${format}\n\nJSON to fix:\n${first}`;
  const fixed = await generate([{ text: fixPrompt }], true, 0);
  const retried = validate(fixed, schema);
  if (retried.ok) return retried.value;
  throw new Error(`Gemma did not return valid JSON: ${retried.error}`);
}

export async function generateText(prompt: string, temperature = 0.3): Promise<string> {
  return generate([{ text: prompt }], false, temperature);
}
