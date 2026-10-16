// Translates the web app's interface text into Luganda with Sunbird and saves it in
// web/src/i18n/lg.json. Only new strings are sent, so re-running is cheap.
// Usage: npm run translate-ui
import "../src/env.js";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { translate } from "../src/services/sunbird.js";

const webSrc = fileURLToPath(new URL("../../web/src/", import.meta.url));
const outFile = path.join(webSrc, "i18n/lg.json");

// Words built at runtime that never appear as a literal t("...") call.
const EXTRA = ["Section", "Article", "Ask", "Scan", "Letter"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

const unquote = (s: string) => JSON.parse(`"${s}"`) as string;

function collect(): string[] {
  const found = new Set(EXTRA);
  for (const file of files(webSrc)) {
    const src = readFileSync(file, "utf8");
    // t("..."), plus text kept in data objects and passed to t() later
    for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g)) found.add(unquote(m[1]));
    for (const m of src.matchAll(/\b(?:label|question|recipientHint|factsHint):\s*"((?:[^"\\]|\\.)*)"/g)) found.add(unquote(m[1]));
    // Plain-English messages passed to ErrorAlert are translated at runtime, so skip them here.
  }
  return [...found].sort();
}

const existing = JSON.parse(readFileSync(outFile, "utf8")) as Record<string, string>;
const strings = collect();
const todo = strings.filter((s) => !existing[s]);
console.log(`${strings.length} strings, ${todo.length} to translate`);

for (const [i, s] of todo.entries()) {
  try {
    existing[s] = (await translate(s, "eng", "lug")).trim() || s;
    console.log(`${i + 1}/${todo.length}  ${s}  ->  ${existing[s]}`);
  } catch (err) {
    console.warn(`skip "${s}": ${(err as Error).message}`);
  }
}

// Drop strings no longer used, keep the file sorted for clean diffs.
const out = Object.fromEntries(strings.filter((s) => existing[s]).map((s) => [s, existing[s]]));
writeFileSync(outFile, JSON.stringify(out, null, 2) + "\n");
console.log(`saved ${Object.keys(out).length} translations to ${outFile}`);
