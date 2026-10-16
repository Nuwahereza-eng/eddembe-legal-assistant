# Build Prompt: Eddembe, a Luganda-first legal rights assistant for Uganda

You are helping me build a hackathon project from scratch. I am Peter, a final-year Software Engineering student in Kampala. I am entering the "Best Use of Gemma 4" category, where judges check that the project actually uses a Gemma model through the Gemini API. Gemma must be the core of the project, not a side feature.

Read this whole file before writing any code. Then make a short plan, show it to me, and start building in the order given under "Build order".

## Ground rules

1.  Using open-source libraries through npm is fine.
2. The idea is inspired by NyayaMitra, an Indian legal aid agent. Credit it in the README under "Inspiration".
3. Never invent law text, section numbers, API endpoints, or model IDs. If you are not sure of something, check the official docs or ask me. Put a `TODO(verify)` comment where something needs checking.
4. The assistant gives legal information, not legal advice. Show a short disclaimer in the UI and in every generated letter.
5. Keep it simple. A working demo matters more than clean architecture. No auth, no admin panel, no microservices.

## The problem

Most Ugandans cannot afford a lawyer, and most laws are written in formal English. A tenant who gets an eviction notice, a worker whose pay is withheld, or a family in a land dispute often does not know their rights or how to respond in writing.

## The product

Eddembe (Luganda for rights/freedom) lets a person:

1. Take a photo of a legal document (eviction notice, land sale agreement, job contract, police bond) and get a plain explanation: what it says, what is missing, and any red flags.
2. Ask a question about their rights, by text or by voice, in Luganda or English, and get an answer grounded in Ugandan law with the exact section cited.
3. Get a ready-to-send letter drafted for them (reply to a landlord, complaint to an employer, Access to Information request).
4. Optional bonus: record a SHA-256 hash of the letter on Stellar testnet as tamper-proof proof of when it was created.

## Tech stack

Use what I already know:

- Backend: Node.js (TypeScript is fine) with Express
- Database: PostgreSQL with the pgvector extension
- AI reasoning: Gemma 4 through the Gemini API using the official `@google/genai` SDK. Look up the exact Gemma 4 model ID in Google AI Studio docs and put it in an env variable. Do not guess it.
- Embeddings: use a current Gemini API embedding model. Check the docs for the correct model name and vector size, and set the pgvector column size to match.
- Luganda speech and translation: Sunbird AI API. Check the official Sunbird AI API docs for the current endpoints for speech-to-text, translation and text-to-speech. Do not hardcode endpoints from memory.
- Frontend: React with Vite, mobile-first layout, plain CSS or Tailwind
- Dev setup: Docker Compose for Postgres with pgvector
- Optional: `@stellar/stellar-sdk` on testnet

## Environment variables

Create `.env.example` with:

```
GEMINI_API_KEY=
GEMMA_MODEL_ID=          # TODO(verify) exact Gemma 4 model ID from AI Studio
EMBEDDING_MODEL_ID=      # TODO(verify)
SUNBIRD_API_KEY=
SUNBIRD_BASE_URL=        # TODO(verify)
DATABASE_URL=postgres://eddembe:eddembe@localhost:5432/eddembe
STELLAR_SECRET_KEY=      # optional, testnet only
```

## Folder structure

```
eddembe/
  docker-compose.yml
  .env.example
  README.md
  data/
    laws/                # I will put the law text files here myself
  server/
    src/
      index.ts
      db.ts
      routes/
        ask.ts
        document.ts
        letter.ts
        speech.ts
        proof.ts         # optional Stellar
      services/
        gemma.ts         # all Gemma calls go through here
        embeddings.ts
        retrieval.ts
        sunbird.ts
        stellar.ts       # optional
      prompts/
        answer.ts
        document.ts
        letter.ts
    scripts/
      ingest.ts          # chunk and embed the laws
  web/
    src/
      App.tsx
      pages/ (Ask, Document, Letter)
      components/
```

## The law data

I will download the law texts myself from ULII (ulii.org) and save them as `.txt` files in `data/laws/`. Start with:

- `constitution-chapter-4.txt`: Constitution of the Republic of Uganda, 1995, Chapter Four only (Protection and Promotion of Fundamental and Other Human Rights and Freedoms)
- `landlord-and-tenant-act-2022.txt`: Landlord and Tenant Act, 2022 (Act 9 of 2022, Chapter 238 in the 2023 revised edition)
- `employment-act-cap-226.txt`: Employment Act, Chapter 226 (originally Act 6 of 2006)
- `employment-amendment-act-2026.txt`: Employment (Amendment) Act, 2026 (Act 10 of 2026). This changes some sections of the Employment Act, especially termination and casual workers. When both files cover the same section, the amendment wins. Store it as a separate law so citations stay clear.
- `land-act-cap-236.txt`: Land Act, Chapter 236 (originally Act 16 of 1998)
- `access-to-information-act-2005.txt`: Access to Information Act, 2005 (Act 6 of 2005)

If the folder is empty when you reach that step, stop and ask me for the files. Do not write law text yourself.

### Ingestion script (`scripts/ingest.ts`)

1. Read each file in `data/laws/`.
2. Split by section where possible (look for patterns like "Section 12" or a line starting with a number and a heading). Fall back to chunks of about 800 tokens with overlap.
3. For each chunk store: law name, section number (if found), section title, chunk text, embedding.
4. Make the script safe to re-run (clear the table for that law first).

### Database schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE law_chunks (
  id SERIAL PRIMARY KEY,
  law_name TEXT NOT NULL,
  section_number TEXT,
  section_title TEXT,
  content TEXT NOT NULL,
  embedding vector(768)   -- TODO(verify) match the embedding model size
);

CREATE TABLE letters (
  id SERIAL PRIMARY KEY,
  letter_type TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  stellar_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## API endpoints

```
POST /api/ask         { question, language: "en" | "lg" }
                      -> { answer, citations: [{ law_name, section_number, excerpt }], language }

POST /api/document    multipart image upload + optional question
                      -> { summary, red_flags: [], missing_items: [], related_sections: [] }

POST /api/letter      { letter_type, facts, recipient, sender_name }
                      -> { letter, id, content_hash }

POST /api/speech/stt  audio upload (Luganda) -> { text }
POST /api/speech/tts  { text, language } -> audio

POST /api/proof       { letter_id } -> { stellar_tx_hash, explorer_url }   (optional)
```

## How the main flows work

### Ask a question

1. If the language is Luganda, translate the question to English with Sunbird.
2. Embed the English question and get the top 5 law chunks by cosine similarity.
3. Send the chunks and the question to Gemma with the answer prompt below.
4. Parse Gemma's JSON reply.
5. If the user asked in Luganda, translate the answer back to Luganda with Sunbird. Keep law names and section numbers unchanged.

### Read a document

1. Send the image directly to Gemma (multimodal input) with the document prompt below. Ask it to first transcribe the key text, then explain it.
2. Use the transcribed text to retrieve related law sections, then do a second short Gemma call that links the red flags to those sections.
3. If Gemma image input does not work through the Gemini API for the chosen model, tell me straight away instead of switching to a different model silently.

### Draft a letter

1. Retrieve relevant law sections for the facts.
2. Gemma drafts a formal but simple letter that cites only the retrieved sections.
3. Save it, compute a SHA-256 hash, return both.

## Prompts

Put these in `server/src/prompts/`. Always ask Gemma for JSON and validate it (use zod). If the JSON is broken, retry once with a "fix this JSON" call.

### Answer prompt

```
You are Eddembe, an assistant that explains Ugandan law in simple English
to ordinary people who are not lawyers.

Rules:
- Use ONLY the law sections given below. Do not use outside knowledge of the law.
- Every claim about the law must cite the law name and section number it came from.
- If the sections below do not answer the question, say so clearly and suggest
  where the person can get help (for example a legal aid clinic). Do not guess.
- Use short sentences and everyday words. Explain any legal term you must use.
- You give legal information, not legal advice.

Law sections:
{{chunks with law_name and section_number}}

Question:
{{question}}

Reply in this JSON format only:
{
  "answer": "plain explanation",
  "citations": [{ "law_name": "", "section_number": "", "excerpt": "" }],
  "next_steps": ["practical step 1", "practical step 2"],
  "confidence": "high" | "medium" | "low"
}
```

### Document prompt

```
You are looking at a photo of a legal document from Uganda.

1. Transcribe the important text you can read.
2. Say in simple words what this document is and what it asks the person to do.
3. List red flags: unfair terms, missing dates, missing signatures, very short
   deadlines, amounts that do not add up.
4. List what is missing that a document like this normally has.
Do not state what the law says here. Law will be checked in a separate step.

Reply in JSON:
{ "document_type": "", "transcription": "", "summary": "",
  "red_flags": [], "missing_items": [] }
```

### Letter prompt

```
Draft a short, polite, firm letter in simple English for the person below.
Cite only the law sections given. Include date and address placeholders.
End with this line: "This letter was prepared with help from an AI tool
and is not legal advice."

Letter type: {{letter_type}}
Facts: {{facts}}
Recipient: {{recipient}}
Sender: {{sender_name}}
Law sections: {{chunks}}

Return the letter as plain text only.
```

## Frontend

Three tabs, mobile-first:

1. **Ask**: text box, microphone button (records audio, sends to `/api/speech/stt`), language toggle (English / Luganda). Show the answer, then the citations as small cards with the law name, section number and excerpt. A play button reads the answer aloud.
2. **Scan a document**: camera/file input, preview, then the summary, red flags (highlighted), missing items, and related law sections.
3. **Write a letter**: pick a letter type, fill a short form, show the letter with Copy and Download buttons. If Stellar is set up, a "Record proof" button shows the transaction hash with a link to the testnet explorer.

Show the disclaimer in the footer on every page. Keep the design clean and readable. Large text, big buttons, works on a cheap Android phone browser.

## Build order

Get each step fully working and committed before moving to the next. After each step, tell me what works and what I should test.

1. Project setup: Docker Compose with pgvector, Express server, Vite React app, health check endpoint.
2. Ingestion script and retrieval (ask me for the law files at this point).
3. `/api/ask` in English with citations, plus the Ask page.
4. `/api/document` with image upload, plus the Scan page.
5. `/api/letter`, plus the Letter page.
6. Luganda: Sunbird speech-to-text, translation both ways, and text-to-speech.
7. Optional: Stellar proof-of-filing on testnet.
8. README with setup steps, architecture diagram (Mermaid), how Gemma is used, inspiration credit, and limitations.

If time runs short, cut step 7 first, then text-to-speech. Never cut the citations.

## Demo scenario (make sure this works end to end)

A tenant in Kampala receives a notice telling her to leave the house in three days.

1. She photographs the notice. Eddembe explains it and flags the very short deadline.
2. She asks by voice in Luganda whether this is allowed. Eddembe answers in Luganda and cites the relevant section of the Landlord and Tenant Act 2022.
3. She generates a reply letter to the landlord and downloads it.
4. (Bonus) She records proof of the letter on Stellar.

Create a few sample test images of fake notices (clearly marked SAMPLE, with made-up names) so I can rehearse the demo.

## README must explain

- The problem and who it helps
- Exactly where and how Gemma 4 is used (reasoning over law, reading document images, drafting letters)
- Architecture diagram
- How to run it locally
- Limitations: covers only a few laws, Luganda quality depends on translation, not legal advice
- Inspiration: NyayaMitra

## When you are unsure

Ask me. I would rather answer a question than debug a wrong guess.
