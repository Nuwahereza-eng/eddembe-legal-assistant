# Eddembe

**Eddembe** (Luganda for *rights* or *freedom*) is a Luganda-first legal rights assistant for Uganda, built on
**Gemma 4** through the Gemini API.

Most Ugandans cannot afford a lawyer, and most laws are written in formal English. Eddembe helps a tenant facing
eviction, a worker whose pay is withheld, or a family in a land dispute to:

1. **Scan a document**: photograph an eviction notice, sale agreement, job contract or police bond and get a plain
   explanation, with red flags and missing items.
2. **Ask about their rights**: by text or voice, in Luganda or English, with answers that cite the exact section
   of Ugandan law.
3. **Write a letter**: get a ready-to-send letter, such as a reply to a landlord, a complaint to an employer, or an
   Access to Information request.

> Eddembe gives legal information, not legal advice.

## Status

Built step by step during the hackathon.

- [x] Project setup: Postgres + pgvector, Express server, React app, health check
- [x] Law text conversion and ingestion (section-level chunks, Gemini embeddings)
- [x] Ask (English and Luganda) with citations
- [x] Scan a document (Gemma 4 reads the photo)
- [x] Write a letter (saved with a SHA-256 hash)
- [x] Luganda: speech-to-text, translation, text-to-speech (Sunbird AI)
- [ ] Optional: proof of letter on Stellar testnet (not built)

Gemma 4 (`gemma-4-26b-a4b-it` via the Gemini API) does all the reasoning: answering from retrieved law,
reading document photos, linking red flags to law sections, and drafting letters.
Sample documents for the demo are in `samples/` (all fake, marked SAMPLE).

## Run it locally

Needs Node.js 20+, Docker, and `pdftotext` (poppler-utils).

```bash
cp .env.example .env              # then add GEMINI_API_KEY
docker-compose up -d              # Postgres with pgvector on port 5433

cd server
npm install
npm run convert-laws              # data/laws/pdf/*.pdf -> data/laws/*.txt
npm run ingest                    # split into sections, embed, store
npm run search -- "Can my landlord evict me in three days?"
npm run dev                       # http://localhost:4100/api/health

cd ../web
npm install
npm run dev                       # http://localhost:5180
```

## Laws covered

See [data/laws/README.md](data/laws/README.md).

## Inspiration

Inspired by [NyayaMitra](https://github.com/abhishek220205-hash/NyayaMitra), an AI legal aid agent for Indian
citizens. Eddembe is a separate project written from scratch for Uganda.

## License

MIT © 2026 Nuwahereza Peter. The law texts in `data/laws/` keep their own licences (see the README there).
