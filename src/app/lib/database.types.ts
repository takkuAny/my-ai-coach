export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
    }
    Views: {
      task_view_with_category: {
        Row: {
          id: string
          user_id: string
          subject_id: string
          memo: string | null
          date: string | null
          start_time: string | null
          end_time: string | null
          pages: number | null
          items: number | null
          attempt_number: number | null
          created_at: string | null
          created_by: string | null
          updated_at: string | null
          updated_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          time: number | null
          ai_comment: string | null
          subject_name: string | null
          category_name: string | null
          category_color: string | null
        }
      }
    }
    Functions: {} 
  }
}
