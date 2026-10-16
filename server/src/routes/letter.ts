import { Router } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { pool } from "../db.js";
import { retrieve, formatChunks } from "../services/retrieval.js";
import { checkMentions } from "../services/citations.js";
import { generateText } from "../services/gemma.js";
import { DISCLAIMER_LINE, LETTER_TYPES, letterPrompt, type LetterType } from "../prompts/letter.js";

const bodySchema = z.object({
  letter_type: z.enum(Object.keys(LETTER_TYPES) as [LetterType, ...LetterType[]]),
  facts: z.string().trim().min(10).max(4000),
  recipient: z.string().trim().min(2).max(300),
  sender_name: z.string().trim().min(2).max(200),
});

function finish(letter: string): string {
  const text = letter.replace(/^```\w*\s*/, "").replace(/\s*```$/, "").trim();
  return text.includes(DISCLAIMER_LINE) ? text : `${text}\n\n${DISCLAIMER_LINE}`;
}

export const letterRouter = Router();

letterRouter.post("/", async (req, res, next) => {
  try {
    const body = bodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Please fill in every field. Describe what happened in a few sentences." });
    }
    const { letter_type, facts, recipient, sender_name } = body.data;

    const chunks = await retrieve(`${LETTER_TYPES[letter_type].label}: ${facts}`);
    const prompt = letterPrompt({ letterType: letter_type, facts, recipient, senderName: sender_name, chunks: formatChunks(chunks) });

    let letter = finish(await generateText(prompt));
    const { unknown } = checkMentions(letter, chunks);
    if (unknown.length) {
      // Gemma cited something we did not give it. Ask once more, naming the problem.
      letter = finish(
        await generateText(
          `${prompt}\n\nImportant: an earlier draft cited ${unknown.join(", ")}, which are not in the law sections above. ` +
            `Cite only the sections given above.`
        )
      );
    }

    const content_hash = createHash("sha256").update(letter, "utf8").digest("hex");
    const { rows } = await pool.query<{ id: number }>(
      "INSERT INTO letters (letter_type, content, content_hash) VALUES ($1, $2, $3) RETURNING id",
      [letter_type, letter, content_hash]
    );

    const check = checkMentions(letter, chunks);
    res.json({
      letter,
      id: rows[0].id,
      content_hash,
      citations: check.cited.map((c) => ({ law_name: c.law_name, section_number: c.section_number })),
      unverified_citations: check.unknown,
    });
  } catch (err) {
    next(err);
  }
});
