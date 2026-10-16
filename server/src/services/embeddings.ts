import { genai, requireEnv, sleep, withRetry } from "./gemini.js";
import { EMBEDDING_DIM } from "../db.js";

// gemini-embedding-2 takes the task as a text prefix instead of a taskType field
// (https://ai.google.dev/gemini-api/docs/embeddings).
const queryText = (q: string) => `task: search result | query: ${q}`;
const documentText = (title: string, text: string) => `title: ${title || "none"} | text: ${text}`;

async function embed(texts: string[]): Promise<number[][]> {
  const res = await withRetry(() =>
    genai().models.embedContent({
      model: requireEnv("EMBEDDING_MODEL_ID"),
      contents: texts.map((text) => ({ parts: [{ text }] })),
      config: { outputDimensionality: EMBEDDING_DIM },
    })
  );
  const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
  if (vectors.length !== texts.length || vectors.some((v) => v.length !== EMBEDDING_DIM)) {
    throw new Error(`Unexpected embedding response: got ${vectors.length} vectors for ${texts.length} texts`);
  }
  return vectors;
}

export async function embedQuery(question: string): Promise<number[]> {
  const [vector] = await embed([queryText(question)]);
  return vector;
}

export async function embedQueries(questions: string[]): Promise<number[][]> {
  return embed(questions.map(queryText));
}

// The free tier counts every text in a batch as one request (100 per minute), so ingestion is paced.
const TEXTS_PER_MINUTE = Number(process.env.EMBED_TEXTS_PER_MINUTE ?? 90);

export async function embedDocuments(docs: { title: string; text: string }[], batchSize = 20): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < docs.length; i += batchSize) {
    const started = Date.now();
    const batch = docs.slice(i, i + batchSize);
    out.push(...(await embed(batch.map((d) => documentText(d.title, d.text)))));
    // Also pause after the last batch, because the next law starts straight away.
    const minGap = (batch.length / TEXTS_PER_MINUTE) * 60_000;
    await sleep(Math.max(0, minGap - (Date.now() - started)));
  }
  return out;
}

export const toPgVector = (v: number[]) => `[${v.join(",")}]`;
