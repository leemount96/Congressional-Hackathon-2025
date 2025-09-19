import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chamber = searchParams.get('chamber');
  const type = searchParams.get('type') || 'all'; // 'upcoming', 'historical', or 'all'
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const search = searchParams.get('search') || '';

  try {
    const results = {
      upcoming: [] as any[],
      historical: [] as any[],
      totalUpcoming: 0,
      totalHistorical: 0
    };

    // Fetch upcoming hearings if needed
    if (type === 'upcoming' || type === 'all') {
      const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      });

      try {
        await client.connect();

        let query = `
          SELECT
            id,
            event_id,
            chamber,
            congress,
            event_date,
            title,
            committee_name,
            committee_system_code,
            location_building,
            location_room,
            meeting_type,
            meeting_status,
            api_url,
            related_bills,
            related_nominations,
            meeting_documents,
            ai_summary,
            ai_key_topics,
            ai_witnesses,
            ai_bills_impact,
            ai_generated_at
          FROM upcoming_committee_hearings
          WHERE event_date >= CURRENT_DATE
        `;

        const params: any[] = [];
        let paramIndex = 1;

        if (chamber) {
          query += ` AND LOWER(chamber) = LOWER($${paramIndex})`;
          params.push(chamber);
          paramIndex++;
        }

        if (search) {
          query += ` AND (LOWER(title) LIKE LOWER($${paramIndex}) OR LOWER(committee_name) LIKE LOWER($${paramIndex}))`;
          params.push(`%${search}%`);
          paramIndex++;
        }

        query += ` ORDER BY event_date ASC`;
        
        // Only apply pagination if fetching upcoming only
        if (type === 'upcoming') {
          query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
          params.push(limit, offset);
        }

        const result = await client.query(query, params);
        results.upcoming = result.rows.map(row => ({
          ...row,
          type: 'upcoming'
        }));

        // Get total count
        let countQuery = `
          SELECT COUNT(*) as total
          FROM upcoming_committee_hearings
          WHERE event_date >= CURRENT_DATE
        `;
        const countParams: any[] = [];
        let countParamIndex = 1;
        
        if (chamber) {
          countQuery += ` AND LOWER(chamber) = LOWER($${countParamIndex})`;
          countParams.push(chamber);
          countParamIndex++;
        }
        
        if (search) {
          countQuery += ` AND (LOWER(title) LIKE LOWER($${countParamIndex}) OR LOWER(committee_name) LIKE LOWER($${countParamIndex}))`;
          countParams.push(`%${search}%`);
        }

        const countResult = await client.query(countQuery, countParams);
        results.totalUpcoming = parseInt(countResult.rows[0].total);
      } finally {
        await client.end();
      }
    }

    // Fetch historical hearings if needed
    if (type === 'historical' || type === 'all') {
      let query = supabase
        .from('congressional_hearings_markdown')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%,committee.ilike.%${search}%`);
      }

      if (chamber) {
        // Historical hearings don't have chamber field, but we can filter by committee name patterns
        if (chamber.toLowerCase() === 'house') {
          query = query.ilike('committee', '%house%');
        } else if (chamber.toLowerCase() === 'senate') {
          query = query.ilike('committee', '%senate%');
        }
      }

      // Only apply pagination if fetching historical only
      if (type === 'historical') {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      results.historical = (data || []).map(hearing => ({
        id: hearing.id,
        title: hearing.title,
        committee_name: hearing.committee || "Committee information not available",
        event_date: hearing.date,
        meeting_status: 'completed',
        type: 'historical',
        pages: Math.ceil(hearing.word_count / 250) || 1,
        word_count: hearing.word_count,
        content_source: hearing.content_source,
        has_transcript: true
      }));

      results.totalHistorical = count || 0;
    }

    // Combine and paginate results if fetching all
    let combinedResults = [];
    let totalCount = 0;

    if (type === 'all') {
      // Combine both arrays and sort by date
      combinedResults = [
        ...results.upcoming,
        ...results.historical
      ].sort((a, b) => {
        const dateA = new Date(a.event_date).getTime();
        const dateB = new Date(b.event_date).getTime();
        return dateB - dateA; // Most recent first
      });

      totalCount = results.totalUpcoming + results.totalHistorical;

      // Apply pagination to combined results
      combinedResults = combinedResults.slice(offset, offset + limit);
    } else if (type === 'upcoming') {
      combinedResults = results.upcoming;
      totalCount = results.totalUpcoming;
    } else {
      combinedResults = results.historical;
      totalCount = results.totalHistorical;
    }

    return NextResponse.json({
      hearings: combinedResults,
      pagination: {
        total: totalCount,
        totalUpcoming: results.totalUpcoming,
        totalHistorical: results.totalHistorical,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching hearings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hearings' },
      { status: 500 }
    );
  }
}
