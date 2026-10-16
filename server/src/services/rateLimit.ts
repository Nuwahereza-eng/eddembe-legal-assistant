import type { RequestHandler } from "express";

// A small in-memory limit per visitor, so a public demo cannot run up the Gemini and Sunbird bill.
// Each server instance keeps its own counts, which is enough for a demo.
export function rateLimit({ max, windowMs }: { max: number; windowMs: number }): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;

    // Forget old visitors now and then so the map does not grow forever.
    if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);

    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: "You have asked many questions in a short time. Please wait a few minutes and try again." });
    }
    next();
  };
}
