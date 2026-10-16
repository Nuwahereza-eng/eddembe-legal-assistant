import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Must match the outputDimensionality used in services/embeddings.ts
export const EMBEDDING_DIM = 768;

export async function initSchema() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS law_chunks (
      id SERIAL PRIMARY KEY,
      law_name TEXT NOT NULL,
      section_number TEXT,
      section_title TEXT,
      content TEXT NOT NULL,
      embedding vector(${EMBEDDING_DIM})
    );

    CREATE TABLE IF NOT EXISTS letters (
      id SERIAL PRIMARY KEY,
      letter_type TEXT NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      stellar_tx_hash TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}
