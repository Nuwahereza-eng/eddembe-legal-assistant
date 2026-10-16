import { Router } from "express";
import multer from "multer";
import { retrieveMany, formatChunks } from "../services/retrieval.js";
import { generateJson } from "../services/gemma.js";
import { groundCitations, type Citation } from "../services/citations.js";
import { documentPrompt, documentSchema, documentTextPrompt, linkPrompt, linkSchema } from "../prompts/document.js";
import { DOCX, PDF, fileToText } from "../services/fileText.js";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const ACCEPTED = [...IMAGE_TYPES, PDF, DOCX];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ACCEPTED.includes(file.mimetype)),
});

export const documentRouter = Router();

documentRouter.post("/", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please add a photo, PDF or Word document." });
    const question = typeof req.body.question === "string" && req.body.question.trim() ? req.body.question.trim() : undefined;

    // 1. Gemma reads a photo directly. For PDF and Word files we pass Gemma the text inside them.
    let reading;
    if (IMAGE_TYPES.includes(req.file.mimetype)) {
      reading = await generateJson(documentPrompt(), documentSchema, [
        { mimeType: req.file.mimetype, data: req.file.buffer },
      ]);
    } else {
      const text = await fileToText(req.file.mimetype, req.file.buffer);
      if (text.length < 20) {
        return res.status(422).json({
          error: "We could not find any text in this file. If it is a scanned copy, please take a photo of it instead.",
        });
      }
      reading = await generateJson(documentTextPrompt(text), documentSchema);
    }

    // 2. Find the law for the document as a whole, for each red flag, and for the question.
    const context = `${reading.document_type}: `;
    const queries = [
      `${context}${reading.summary}`,
      ...reading.red_flags.map((flag) => `${context}${flag}`),
      ...(question ? [question] : []),
    ];
    const chunks = await retrieveMany(queries, 3, 10);

    // 3. A second, short Gemma call links each red flag to those sections.
    const link = await generateJson(linkPrompt(reading, formatChunks(chunks), question), linkSchema);

    // Keep only links to sections we actually retrieved, with real excerpts.
    type Related = Citation & { red_flags: string[]; explanation: string };
    const related_sections: Related[] = [];
    for (const s of link.related_sections) {
      const [g] = groundCitations([{ law_name: s.law_name, section_number: s.section_number, excerpt: "" }], chunks);
      if (!g) continue;
      const same = related_sections.find((r) => r.law_name === g.law_name && r.section_number === g.section_number);
      if (same) {
        same.red_flags.push(s.red_flag);
        same.explanation += ` ${s.explanation}`;
      } else {
        related_sections.push({ ...g, red_flags: [s.red_flag], explanation: s.explanation });
      }
    }

    res.json({
      document_type: reading.document_type,
      transcription: reading.transcription,
      summary: reading.summary,
      red_flags: reading.red_flags,
      missing_items: reading.missing_items,
      related_sections,
      question_answer: question ? link.question_answer : null,
    });
  } catch (err) {
    next(err);
  }
});
