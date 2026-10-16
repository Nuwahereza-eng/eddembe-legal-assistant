import { pool } from "../db.js";
import { embedQueries, embedQuery, toPgVector } from "./embeddings.js";

export type LawChunk = {
  id: number;
  law_name: string;
  section_number: string | null;
  section_title: string | null;
  content: string;
  similarity: number;
};

// The Constitution is divided into articles, the Acts into sections.
export const unitFor = (lawName: string) => (lawName.startsWith("Constitution") ? "Article" : "Section");

export function citationLabel(c: Pick<LawChunk, "law_name" | "section_number">) {
  return c.section_number ? `${c.law_name}, ${unitFor(c.law_name)} ${c.section_number}` : c.law_name;
}

export async function searchLaw(query: string, k = 5): Promise<LawChunk[]> {
  return searchByVector(await embedQuery(query), k);
}

async function searchByVector(embedding: number[], k: number): Promise<LawChunk[]> {
  const vector = toPgVector(embedding);
  const { rows } = await pool.query<LawChunk>(
    `SELECT id, law_name, section_number, section_title, content,
            1 - (embedding <=> $1::vector) AS similarity
       FROM law_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT $2`,
    [vector, k]
  );
  return rows;
}

// Formats chunks for a Gemma prompt so every excerpt carries its citation.
export function formatChunks(chunks: LawChunk[]): string {
  return chunks
    .map((c) => `[${citationLabel(c)}${c.section_title ? ` – ${c.section_title}` : ""}]\n${c.content.trim()}`)
    .join("\n\n---\n\n");
}

const PRINCIPAL_ACT = "Employment Act, Cap. 226";
const AMENDMENT_ACT = "Employment (Amendment) Act, 2026";

// The 2026 amendment changes some Employment Act sections. When one of those sections is retrieved,
// also bring in the amendment that changes it so Gemma can apply the newer law.
export async function withAmendments(chunks: LawChunk[]): Promise<LawChunk[]> {
  const sections = [
    ...new Set(chunks.filter((c) => c.law_name === PRINCIPAL_ACT && c.section_number).map((c) => c.section_number!)),
  ];
  if (sections.length === 0) return chunks;

  // Amendment titles read like "Substitution of section 88 of principal Act".
  const patterns = sections.map((n) => `section ${n} of principal Act`);
  const { rows } = await pool.query<LawChunk>(
    `SELECT id, law_name, section_number, section_title, content, 0 AS similarity
       FROM law_chunks
      WHERE law_name = $1 AND section_title ILIKE ANY ($2)`,
    [AMENDMENT_ACT, patterns.map((p) => `%${p}%`)]
  );
  const seen = new Set(chunks.map((c) => c.id));
  return [...chunks, ...rows.filter((r) => !seen.has(r.id))];
}

export async function retrieve(query: string, k = 5): Promise<LawChunk[]> {
  return withAmendments(await searchLaw(query, k));
}

// Several searches at once (one embedding call), e.g. one per red flag in a document.
// Results are merged without duplicates, best match first, up to `max` chunks.
export async function retrieveMany(queries: string[], perQuery = 2, max = 10): Promise<LawChunk[]> {
  const vectors = await embedQueries(queries);
  const results = await Promise.all(vectors.map((v) => searchByVector(v, perQuery)));
  const best = new Map<number, LawChunk>();
  for (const chunk of results.flat()) {
    const prev = best.get(chunk.id);
    if (!prev || chunk.similarity > prev.similarity) best.set(chunk.id, chunk);
  }
  const merged = [...best.values()].sort((a, b) => b.similarity - a.similarity).slice(0, max);
  return withAmendments(merged);
}
