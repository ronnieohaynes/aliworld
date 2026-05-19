/**
 * Extend this file with generated types from Supabase CLI:
 * `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      battle_sessions: {
        Row: {
          id: string
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      battle_events: {
        Row: {
          id: number
          session_id: string
          move_id: string
          player_hp: number
          foe_hp: number
          created_at: string
        }
        Insert: {
          id?: number
          session_id: string
          move_id: string
          player_hp: number
          foe_hp: number
          created_at?: string
        }
        Update: {
          id?: number
          session_id?: string
          move_id?: string
          player_hp?: number
          foe_hp?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'battle_events_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'battle_sessions'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
