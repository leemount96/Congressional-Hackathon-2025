import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for your congressional hearings data
export interface CongressionalHearing {
  id: number
  title: string
  committee: string
  date: string
  transcript_status: string
  witnesses: string[]
  pages?: number
  citations?: number
  related_docs?: number
  topics: string[]
  summary: string
  created_at?: string
  updated_at?: string
}

// Helper functions for database operations
export const db = {
  // Get all hearings
  async getAllHearings() {
    const { data, error } = await supabase
      .from('congressional_hearings')
      .select('*')
      .order('date', { ascending: false })
    
    if (error) throw error
    return data as CongressionalHearing[]
  },

  // Get hearing by ID
  async getHearingById(id: number) {
    const { data, error } = await supabase
      .from('congressional_hearings')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as CongressionalHearing
  },

  // Search hearings by title or committee
  async searchHearings(query: string) {
    const { data, error } = await supabase
      .from('congressional_hearings')
      .select('*')
      .or(`title.ilike.%${query}%,committee.ilike.%${query}%,summary.ilike.%${query}%`)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data as CongressionalHearing[]
  },

  // Get hearings by committee
  async getHearingsByCommittee(committee: string) {
    const { data, error } = await supabase
      .from('congressional_hearings')
      .select('*')
      .eq('committee', committee)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data as CongressionalHearing[]
  },

  // Get recent hearings (last 30 days)
  async getRecentHearings() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data, error } = await supabase
      .from('congressional_hearings')
      .select('*')
      .gte('date', thirtyDaysAgo.toISOString())
      .order('date', { ascending: false })
    
    if (error) throw error
    return data as CongressionalHearing[]
  },

  // Insert new hearing
  async insertHearing(hearing: Omit<CongressionalHearing, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('congressional_hearings')
      .insert([hearing])
      .select()
      .single()
    
    if (error) throw error
    return data as CongressionalHearing
  },

  // Update hearing
  async updateHearing(id: number, updates: Partial<CongressionalHearing>) {
    const { data, error } = await supabase
      .from('congressional_hearings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as CongressionalHearing
  }
}
