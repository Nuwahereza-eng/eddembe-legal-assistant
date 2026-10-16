import { Router } from "express";
import { z } from "zod";
import { retrieve, formatChunks } from "../services/retrieval.js";
import { generateJson } from "../services/gemma.js";
import { groundCitations } from "../services/citations.js";
import { answerPrompt, answerSchema } from "../prompts/answer.js";
import { translate } from "../services/sunbird.js";

const bodySchema = z.object({
  question: z.string().trim().min(3).max(2000),
  language: z.enum(["en", "lg"]).default("en"),
});

export const askRouter = Router();

askRouter.post("/", async (req, res, next) => {
  try {
    const body = bodySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Please type a question." });
    const { question, language } = body.data;

    // Luganda questions are translated to English for retrieval and Gemma, then the answer back.
    const english = language === "lg" ? await translate(question, "lug", "eng") : question;

    const chunks = await retrieve(english);
    const reply = await generateJson(answerPrompt(formatChunks(chunks), english), answerSchema);
    const citations = groundCitations(reply.citations, chunks);

    // Law names and section numbers stay in the citation cards, untranslated.
    const toLuganda = (t: string) => (language === "lg" ? translate(t, "eng", "lug") : Promise.resolve(t));
    const [answer, ...next_steps] = await Promise.all([reply.answer, ...reply.next_steps].map(toLuganda));

    res.json({
      answer,
      answer_en: reply.answer,
      next_steps_en: reply.next_steps,
      question_en: language === "lg" ? english : undefined,
      citations,
      next_steps,
      // An answer with no citation that checks out cannot be called high confidence.
      confidence: citations.length === 0 ? "low" : reply.confidence,
      language,
    });
  } catch (err) {
    next(err);
  }
});
