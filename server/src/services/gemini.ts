import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function genai(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set in .env");
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in .env`);
  return value;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A 429 says how long to wait, e.g. "Please retry in 23.96s".
function retryDelayMs(err: unknown): number | null {
  const m = String((err as Error).message ?? "").match(/retry in ([\d.]+)s/i);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) + 1000 : null;
}

// Retries network drops, rate limits and transient server errors with backoff.
export async function withRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      const networkError = err instanceof TypeError && /fetch failed/i.test(err.message);
      const retryable = networkError || status === 429 || (status !== undefined && status >= 500);
      if (!retryable || i >= attempts - 1) throw err;
      const wait = retryDelayMs(err) ?? 2000 * 2 ** i;
      console.warn(`Gemini API ${status ?? "network error"}, retry ${i + 1} in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    }
  }
}
