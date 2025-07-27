export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      api_keys: {
        Row: {
          id: string
          user_id: string
          provider: string
          api_key: string
          is_demo: boolean | null
          mac_address: string | null
          expires_at: string | null
          created_at: string | null
          created_by: string | null
          updated_at: string | null
          updated_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          usage_count: number | null
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          api_key: string
          is_demo?: boolean | null
          mac_address?: string | null
          expires_at?: string | null
          created_at?: string | null
          created_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          usage_count?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          api_key?: string
          is_demo?: boolean | null
          mac_address?: string | null
          expires_at?: string | null
          created_at?: string | null
          created_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_deleted_by_fkey"
            columns: ["deleted_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_updated_by_fkey"
            columns: ["updated_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    // No views currently defined in this schema
    Views: Record<string, unknown>

    // No stored functions defined
    Functions: Record<string, unknown>

    // No enums currently used
    Enums: Record<string, unknown>

    // No composite types defined
    CompositeTypes: Record<string, unknown>
  }
}
