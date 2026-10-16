// Splits the law texts in data/laws/ into sections, embeds them and stores them in law_chunks.
// Safe to re-run: each law's old rows are deleted before its new rows are inserted.
// Usage: npm run ingest            (embed and store every law)
//        npm run ingest -- --dry   (only print how the laws were split; no API calls)
import "../src/env.js";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool, initSchema } from "../src/db.js";
import { embedDocuments, toPgVector } from "../src/services/embeddings.js";

const lawsDir = fileURLToPath(new URL("../../data/laws/", import.meta.url));

// File name -> the law name shown in citations.
const LAW_NAMES: Record<string, string> = {
  "constitution-chapter-4.txt": "Constitution of the Republic of Uganda, 1995",
  "landlord-and-tenant-act-2022.txt": "Landlord and Tenant Act, 2022",
  "employment-act-cap-226.txt": "Employment Act, Cap. 226",
  "employment-amendment-act-2026.txt": "Employment (Amendment) Act, 2026",
  "land-act-cap-236.txt": "Land Act, Cap. 236",
  "access-to-information-act-2005.txt": "Access to Information Act, 2005",
};

// About 800 tokens at roughly 4 characters per token.
const MAX_CHARS = 3200;
const OVERLAP_CHARS = 400;

type Chunk = { section_number: string | null; section_title: string | null; content: string };

// "38. Termination after notice" near the left margin. Headings start with a capital letter,
// which rules out list items such as "(a)" and wrapped sentences.
// "\.+" because the Gazette prints at least one heading as "24..".
const SECTION_RE = /^ {0,4}(\d+[A-Z]{0,2})\.+\s+([A-Z].*?)[\s.]*$/;
// Part and sub-part headings are centred, so they have a large left indent.
const CENTRED_RE = /^ {20,}\S/;

function splitSections(text: string): Chunk[] {
  const sections: Chunk[] = [];
  let current: Chunk | null = null;
  let lastNumber = 0;
  let inSchedule = false;

  for (const line of text.split("\n")) {
    const centred = CENTRED_RE.test(line);
    if (centred && /^\s*Schedule\b/.test(line)) {
      // Schedules are not sections. Keep each one as its own chunk.
      inSchedule = true;
      current = { section_number: null, section_title: line.trim(), content: "" };
      sections.push(current);
      continue;
    }
    if (centred && !inSchedule) continue; // drop Part headings between sections

    const m = inSchedule ? null : line.match(SECTION_RE);
    // Section numbers only go up, which filters out numbered lines inside a section.
    if (m && parseInt(m[1], 10) >= lastNumber) {
      lastNumber = parseInt(m[1], 10);
      current = { section_number: m[1], section_title: m[2].trim(), content: "" };
      sections.push(current);
      continue;
    }
    if (current) current.content += line + "\n";
  }

  return sections
    .map((s) => ({ ...s, content: tidy(s.content) }))
    .filter((s) => s.content.length > 0);
}

// Whitespace only: removes PDF layout indentation and column gaps, never words.
const tidy = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim().replace(/ {2,}/g, " "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Long sections are cut on line boundaries into overlapping parts that keep the section number.
function splitLong(chunk: Chunk): Chunk[] {
  if (chunk.content.length <= MAX_CHARS) return [chunk];
  const lines = chunk.content.split("\n");
  const parts: string[] = [];
  let buf: string[] = [];
  let len = 0;
  for (const line of lines) {
    if (len + line.length > MAX_CHARS && buf.length) {
      parts.push(buf.join("\n"));
      // Carry the last few lines over so a sentence cut at the boundary appears in both parts.
      const carry: string[] = [];
      let carryLen = 0;
      for (let i = buf.length - 1; i >= 0 && carryLen < OVERLAP_CHARS; i--) {
        carry.unshift(buf[i]);
        carryLen += buf[i].length + 1;
      }
      buf = carry;
      len = carryLen;
    }
    buf.push(line);
    len += line.length + 1;
  }
  if (buf.length) parts.push(buf.join("\n"));
  return parts.map((content, i) => ({
    ...chunk,
    section_title: `${chunk.section_title ?? ""} (part ${i + 1} of ${parts.length})`.trim(),
    content,
  }));
}

// Fallback for a file with no recognisable section headings.
function splitBySize(text: string): Chunk[] {
  return splitLong({ section_number: null, section_title: null, content: tidy(text) });
}

async function main() {
  const dry = process.argv.includes("--dry");
  const files = readdirSync(lawsDir).filter((f) => f.endsWith(".txt"));
  if (files.length === 0) {
    console.error(`No .txt files in ${lawsDir}. Run \`npm run convert-laws\` first.`);
    process.exit(1);
  }
  if (!dry) await initSchema();

  for (const file of files) {
    const lawName = LAW_NAMES[file];
    if (!lawName) {
      console.warn(`skip ${file}: add it to LAW_NAMES in scripts/ingest.ts`);
      continue;
    }
    const text = readFileSync(path.join(lawsDir, file), "utf8");
    let chunks = splitSections(text).flatMap(splitLong);
    if (chunks.length < 3) chunks = splitBySize(text);

    console.log(`${lawName}: ${chunks.length} chunks`);
    if (dry) {
      for (const c of chunks) console.log(`  ${c.section_number ?? "-"} | ${c.section_title} | ${c.content.length} chars`);
      continue;
    }

    const vectors = await embedDocuments(
      chunks.map((c) => ({
        title: [lawName, c.section_number && `section ${c.section_number}`, c.section_title].filter(Boolean).join(", "),
        text: c.content,
      }))
    );

    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      await db.query("DELETE FROM law_chunks WHERE law_name = $1", [lawName]);
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        await db.query(
          `INSERT INTO law_chunks (law_name, section_number, section_title, content, embedding)
           VALUES ($1, $2, $3, $4, $5::vector)`,
          [lawName, c.section_number, c.section_title, c.content, toPgVector(vectors[i])]
        );
      }
      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    } finally {
      db.release();
    }
  }

  const missing = Object.keys(LAW_NAMES).filter((f) => !files.includes(f));
  if (missing.length) console.warn(`Missing law files: ${missing.join(", ")}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
