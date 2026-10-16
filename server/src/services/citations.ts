import type { LawChunk } from "./retrieval.js";

export type Citation = { law_name: string; section_number: string; excerpt: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sectionKey = (s: string) => s.replace(/^(section|article|s\.|art\.)\s*/i, "").replace(/\(.*$/, "").trim().toUpperCase();

// Keeps only citations that point at a section we actually gave Gemma, and makes sure the
// excerpt is real law text. A quote Gemma made up is replaced with the start of the section.
export function groundCitations(cited: Citation[], chunks: LawChunk[]): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const c of cited) {
    const matches = chunks.filter(
      (ch) =>
        ch.section_number &&
        sectionKey(ch.section_number) === sectionKey(c.section_number) &&
        (norm(ch.law_name).includes(norm(c.law_name)) || norm(c.law_name).includes(norm(ch.law_name)))
    );
    if (matches.length === 0) continue;

    const quoted = norm(c.excerpt);
    const source = matches.find((m) => quoted.length > 0 && norm(m.content).includes(quoted)) ?? matches[0];
    const key = `${source.law_name}|${source.section_number}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const excerpt = quoted && norm(source.content).includes(quoted) ? c.excerpt.trim() : firstWords(source.content);
    out.push({ law_name: source.law_name, section_number: source.section_number!, excerpt });
  }
  return out;
}

function firstWords(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : flat.slice(0, flat.lastIndexOf(" ", max)) + "…";
}

// Short names people and Gemma use for each law, most specific first.
const LAW_ALIASES: [RegExp, string][] = [
  [/Employment \(Amendment\) Act/i, "Employment (Amendment) Act, 2026"],
  [/Employment Act/i, "Employment Act, Cap. 226"],
  [/Landlord and Tenant Act/i, "Landlord and Tenant Act, 2022"],
  [/Access to Information Act/i, "Access to Information Act, 2005"],
  [/\bLand Act/i, "Land Act, Cap. 236"],
  [/Constitution/i, "Constitution of the Republic of Uganda, 1995"],
];

const MENTION_RE = /\b(Section|Article)s?\s+(\d+[A-Z]?)/gi;

// Finds every "Section N ... of the <law>" in free text (a letter) and checks it against the
// sections Gemma was given. A mention without its own law name takes the next law named,
// as in "Sections 69 and 70 of the Employment Act".
export function checkMentions(text: string, chunks: LawChunk[]) {
  const mentions = [...text.matchAll(MENTION_RE)].map((m) => ({ unit: m[1], number: m[2].toUpperCase(), at: m.index! }));
  const cited = new Map<number, LawChunk>();
  const unknown: string[] = [];

  mentions.forEach((m, i) => {
    let law: string | null = null;
    for (let j = i; j < mentions.length && !law; j++) {
      const end = j + 1 < mentions.length ? mentions[j + 1].at : text.length;
      const window = text.slice(mentions[j].at, Math.min(end, mentions[j].at + 120));
      law = LAW_ALIASES.find(([re]) => re.test(window))?.[1] ?? null;
    }
    const matches = chunks.filter((c) => c.section_number?.toUpperCase() === m.number && (!law || c.law_name === law));
    if (matches.length) matches.forEach((c) => cited.set(c.id, c));
    else unknown.push(`${m.unit} ${m.number}${law ? ` of the ${law}` : ""}`);
  });

  return { cited: [...cited.values()], unknown: [...new Set(unknown)] };
}
