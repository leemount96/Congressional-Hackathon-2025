import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10 } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search in Pinecone
    const index = pinecone.index('gao-reports'); // Assuming we'll create a separate index for GAO reports
    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
      includeValues: false,
    });

    // Format the results
    const results = searchResponse.matches?.map((match) => ({
      id: match.id,
      score: match.score,
      content: match.metadata?.content as string,
      title: match.metadata?.title as string,
      report_id: match.metadata?.report_id as string,
      date: match.metadata?.date as string,
      topics: match.metadata?.topics as string[],
      snippet: extractSnippet(match.metadata?.content as string, query),
    })) || [];

    return NextResponse.json({
      query,
      results,
      totalResults: results.length,
    });

  } catch (error) {
    console.error('Error searching GAO reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractSnippet(content: string, query: string, maxLength: number = 200): string {
  if (!content) return '';
  
  // Find the best match for the query terms
  const queryTerms = query.toLowerCase().split(/\s+/);
  const contentLower = content.toLowerCase();
  
  // Find the first occurrence of any query term
  let bestIndex = -1;
  let bestScore = 0;
  
  for (const term of queryTerms) {
    const index = contentLower.indexOf(term);
    if (index !== -1) {
      // Score based on how early the term appears and term length
      const score = (content.length - index) + (term.length * 10);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
  }
  
  if (bestIndex === -1) {
    // If no query terms found, return the beginning
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }
  
  // Extract snippet around the best match
  const start = Math.max(0, bestIndex - maxLength / 2);
  const end = Math.min(content.length, start + maxLength);
  
  let snippet = content.substring(start, end);
  
  // Add ellipsis if we're not at the beginning or end
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  
  return snippet;
}
