import "./env.js";
import express from "express";
import cors from "cors";
import { pool, initSchema } from "./db.js";
import { askRouter } from "./routes/ask.js";
import { documentRouter } from "./routes/document.js";
import { letterRouter } from "./routes/letter.js";
import { speechRouter } from "./routes/speech.js";
import { translateRouter } from "./routes/translate.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT count(*)::int AS chunks FROM law_chunks");
    res.json({ ok: true, db: "up", law_chunks: rows[0].chunks, model: process.env.GEMMA_MODEL_ID ?? null });
  } catch (err) {
    res.status(503).json({ ok: false, db: "down", error: (err as Error).message });
  }
});

app.use("/api/ask", askRouter);
app.use("/api/document", documentRouter);
app.use("/api/letter", letterRouter);
app.use("/api/speech", speechRouter);
app.use("/api/translate", translateRouter);

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
