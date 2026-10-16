import { z } from "zod";

export const documentSchema = z.object({
  document_type: z.string(),
  transcription: z.string(),
  summary: z.string().min(1),
  red_flags: z.array(z.string()).default([]),
  missing_items: z.array(z.string()).default([]),
});

export type DocumentReading = z.infer<typeof documentSchema>;

export function documentPrompt(): string {
  return `You are looking at a photo of a legal document from Uganda.

1. Transcribe the important text you can read.
2. Say in simple words what this document is and what it asks the person to do.
3. List red flags: unfair terms, missing dates, missing signatures, very short
   deadlines, amounts that do not add up.
4. List what is missing that a document like this normally has.
Do not state what the law says here. Law will be checked in a separate step.
If the image is not a document or cannot be read, say so in "summary" and leave the lists empty.

Reply in JSON:
{ "document_type": "", "transcription": "", "summary": "",
  "red_flags": [], "missing_items": [] }`;
}

// Same task as documentPrompt, for PDF and Word files whose text we extracted ourselves.
export function documentTextPrompt(text: string): string {
  return documentPrompt()
    .replace("You are looking at a photo of a legal document from Uganda.", "Below is the text of a legal document from Uganda.")
    .replace("1. Transcribe the important text you can read.", "1. Copy the important text into \"transcription\".")
    .replace("If the image is not a document or cannot be read", "If the text is not a legal document")
    .replace("Reply in JSON:", `Document text:\n${text.slice(0, 30000)}\n\nReply in JSON:`);
}

export const linkSchema = z.object({
  related_sections: z
    .array(
      z.object({
        law_name: z.string(),
        section_number: z.string(),
        red_flag: z.string(),
        explanation: z.string(),
      })
    )
    .default([]),
  question_answer: z.string().nullable().default(null),
});

export function linkPrompt(reading: DocumentReading, chunks: string, question?: string): string {
  return `You are Eddembe. You explain Ugandan law in simple English to people who are not lawyers.

A person photographed this document:
Type: ${reading.document_type}
Summary: ${reading.summary}
Text: ${reading.transcription}

Red flags found in it:
${reading.red_flags.map((f, i) => `${i + 1}. ${f}`).join("\n") || "(none)"}

Rules:
- Use ONLY the law sections given below. Do not use outside knowledge of the law.
- For each red flag, find the law section below that relates to it, if any, and explain the link
  in one or two short sentences. Skip red flags that no section covers. Do not guess.
- The Constitution is divided into articles. For the Constitution, put the article number in "section_number".
- Where the Employment (Amendment) Act, 2026 changes a section of the Employment Act, Cap. 226, the amendment wins.
- ${question ? `Also answer the person's question in "question_answer", citing the sections you rely on.` : `Set "question_answer" to null.`}
- You give legal information, not legal advice.

Law sections:
${chunks}
${question ? `\nThe person's question:\n${question}\n` : ""}
Reply in this JSON format only:
{
  "related_sections": [{ "law_name": "", "section_number": "", "red_flag": "", "explanation": "" }],
  "question_answer": null
}`;
}
