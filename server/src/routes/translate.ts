import { Router } from "express";
import { z } from "zod";
import { translate } from "../services/sunbird.js";

const bodySchema = z.object({
  texts: z.array(z.string().max(5000)).max(60),
  target: z.enum(["lg", "en"]),
});

// Translations rarely change, so keep recent ones in memory. The cap stops the cache growing
// without limit on a long-running server; the oldest entries are dropped first.
const cache = new Map<string, string>();
const MAX_CACHED = 2000;

function remember(key: string, value: string) {
  cache.set(key, value);
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
}

async function translateOne(text: string, target: "lg" | "en"): Promise<string> {
  if (!text.trim()) return text;
  const key = `${target}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const out = target === "lg" ? await translate(text, "eng", "lug") : await translate(text, "lug", "eng");
  remember(key, out || text);
  return out || text;
}

// Runs at most `limit` translations at a time so Sunbird is not flooded.
async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

export const translateRouter = Router();

translateRouter.post("/", async (req, res, next) => {
  try {
    const body = bodySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Nothing to translate." });
    const { texts, target } = body.data;
    res.json({ texts: await mapLimited(texts, 4, (t) => translateOne(t, target)) });
  } catch (err) {
    next(err);
  }
});
