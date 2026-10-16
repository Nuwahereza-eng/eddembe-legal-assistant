import "./env.js";
import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pool, initSchema } from "./db.js";
import { askRouter } from "./routes/ask.js";
import { documentRouter } from "./routes/document.js";
import { letterRouter } from "./routes/letter.js";
import { speechRouter } from "./routes/speech.js";
import { translateRouter } from "./routes/translate.js";
import { rateLimit } from "./services/rateLimit.js";

const app = express();
// Behind Vercel's proxy, so the visitor's address comes from X-Forwarded-For.
app.set("trust proxy", true);
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT count(*)::int AS chunks FROM law_chunks");
    res.json({ ok: true, db: "up", law_chunks: rows[0].chunks, model: process.env.GEMMA_MODEL_ID ?? null });
  } catch (err) {
    // Details go to the server log only; the public endpoint just reports the status.
    console.error("health check failed:", (err as Error).message);
    res.status(503).json({ ok: false, db: "down" });
  }
});

// Gemma calls are the expensive ones; translations are cheap and requested often by the UI.
const aiLimit = rateLimit({ max: 30, windowMs: 10 * 60 * 1000 });
const translateLimit = rateLimit({ max: 300, windowMs: 10 * 60 * 1000 });

app.use("/api/ask", aiLimit, askRouter);
app.use("/api/document", aiLimit, documentRouter);
app.use("/api/letter", aiLimit, letterRouter);
app.use("/api/speech", aiLimit, speechRouter);
app.use("/api/translate", translateLimit, translateRouter);

// The built web app. On Vercel it is built into server/web-dist and bundled with this function
// (see vercel.json); locally the Vite dev server serves the web app instead.
const webDist = fileURLToPath(new URL("../web-dist/", import.meta.url));
if (existsSync(webDist)) {
  app.use(express.static(webDist, { maxAge: "1h", index: "index.html" }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile("index.html", { root: webDist }));
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

// On Vercel the exported app runs as a serverless function and the schema is created by
// `npm run ingest`. Locally we set up the schema and listen on a port.
export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT ?? 4100);
  initSchema()
    .then(() => app.listen(port, () => console.log(`Eddembe server on http://localhost:${port}`)))
    .catch((err) => {
      console.error("Could not set up the database. Is `docker-compose up -d` running?", err.message);
      process.exit(1);
    });
}
