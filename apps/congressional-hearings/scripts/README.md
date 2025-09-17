# Pinecone Upsert Script

This script fetches chunks from the `congressional_hearings_markdown` table in Supabase and upserts them into Pinecone with embeddings.

## Prerequisites

1. Make sure you have all required environment variables set in `.env`:
   - `PINECONE_API_KEY` - Your Pinecone API key
   - `OPENAI_API_KEY` - Your OpenAI API key (for generating embeddings)
   - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` - Supabase database connection details

2. Ensure the `congressional_hearings_markdown` table exists in your Supabase database with the following structure:
   - `id` - Unique identifier for each chunk
   - `content` - The text content of the chunk
   - `hearing_id` - ID of the hearing this chunk belongs to
   - `chunk_index` - Index of this chunk within the hearing
   - `metadata` - Additional metadata (JSON)

## Usage

Run the script using npm:

```bash
npm run upsert-pinecone
```

Or directly with tsx:

```bash
npx tsx scripts/upsert-to-pinecone.ts
```

## What the script does

1. Connects to your Supabase PostgreSQL database
2. Fetches chunks from the `congressional_hearings_markdown` table in batches
3. Generates embeddings for each chunk using OpenAI's text-embedding-3-small model
4. Upserts the chunks with their embeddings into Pinecone
5. Includes rate limiting to avoid API limits

## Configuration

- **Batch size**: Default is 50 chunks per batch (can be modified in the `processAllChunks` method)
- **Pinecone index**: Uses the `congresshacks` index (can be modified in the constructor)
- **Embedding model**: Uses `text-embedding-3-small` (can be modified in the `generateEmbedding` method)

## Error handling

The script includes error handling for:
- Database connection issues
- Embedding generation failures
- Pinecone upsert failures

Failed chunks will be logged but won't stop the overall process.