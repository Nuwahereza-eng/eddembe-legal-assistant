// Quick retrieval check: npm run search -- "Can my landlord evict me in three days?"
import "../src/env.js";
import { pool } from "../src/db.js";
import { searchLaw, citationLabel } from "../src/services/retrieval.js";

const query = process.argv.slice(2).join(" ");
if (!query) {
  console.error('Usage: npm run search -- "your question"');
  process.exit(1);
}
for (const c of await searchLaw(query)) {
  console.log(`${c.similarity.toFixed(3)}  ${citationLabel(c)} – ${c.section_title}`);
}
await pool.end();
