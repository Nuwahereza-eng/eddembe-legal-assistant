// Converts the official law PDFs (ULII and the Uganda Gazette) in data/laws/pdf/ into
// plain .txt files in data/laws/. Only page furniture is removed (cover page, table of
// contents, running headers, footers and page numbers). The law text itself is kept as printed.
// Usage: npm run convert-laws   (needs `pdftotext` from poppler-utils)
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const outDir = path.join(root, "data/laws");

type Source = {
  pdf: string;
  out: string;
  // Where the law body starts and (optionally) stops, matched against whole lines.
  start: RegExp;
  end?: RegExp;
};

const sources: Source[] = [
  {
    pdf: "1995-constitution.pdf",
    out: "constitution-chapter-4.txt",
    start: /^\s+Chapter Four\s*$/,
    end: /^\s+Chapter Five\s*$/,
  },
  { pdf: "2022-9.pdf", out: "landlord-and-tenant-act-2022.txt", start: /^\[Act \d/ },
  { pdf: "1998-16.pdf", out: "land-act-cap-236.txt", start: /^\[Act \d/ },
  { pdf: "2005-6.pdf", out: "access-to-information-act-2005.txt", start: /^\[Act \d/ },
  {
    pdf: "ug-act-2026-10-publication-document.pdf",
    out: "employment-amendment-act-2026.txt",
    start: /^An Act to amend the Employment Act/,
  },
  { pdf: "2006-6.pdf", out: "employment-act-cap-226.txt", start: /^\[Act \d/ },
];

const isHeader = (line: string) =>
  /\s{3,}Uganda\s*$/.test(line) || // ULII: "<Title> (Chapter N)      Uganda"
  /^Act \d+\s{2,}.+\s{2,}\d{4}\s*$/.test(line); // Gazette: "Act 10   Employment (Amendment) Act   2026"

const isFooter = (line: string) => /^\s*By Ulii\.org and Laws\.Africa/.test(line) || /^\s*\d+\s*$/.test(line);

function clean(raw: string, src: Source): string {
  const pages = raw.split("\f").map((page) => {
    const lines = page.split("\n");
    const first = lines.findIndex((l) => l.trim());
    if (first >= 0 && isHeader(lines[first])) lines.splice(first, 1);
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].trim()) continue;
      if (isFooter(lines[i])) lines.splice(i, 1);
      else break;
    }
    return lines.join("\n");
  });

  let lines = pages.join("\n").split("\n");
  const start = lines.findIndex((l) => src.start.test(l));
  if (start < 0) throw new Error(`${src.pdf}: start marker not found`);
  lines = lines.slice(start);
  if (src.end) {
    const end = lines.findIndex((l, i) => i > 0 && src.end!.test(l));
    if (end < 0) throw new Error(`${src.pdf}: end marker not found`);
    lines = lines.slice(0, end);
  }

  return (
    lines
      .map((l) => l.replace(/\s+$/, ""))
      .join("\n")
      // Typographic ligatures from the PDF fonts
      .replace(/ﬁ/g, "fi")
      .replace(/ﬂ/g, "fl")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

mkdirSync(outDir, { recursive: true });
for (const src of sources) {
  const pdfPath = path.join(outDir, "pdf", src.pdf);
  if (!existsSync(pdfPath)) {
    console.warn(`skip ${src.pdf} (not found)`);
    continue;
  }
  const raw = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const text = clean(raw, src);
  writeFileSync(path.join(outDir, src.out), text);
  console.log(`${src.out}: ${text.split("\n").length} lines`);
}
