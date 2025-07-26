'use client'

import { useState } from 'react'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs' // ✅ 修正済み
import type { Database } from '@/lib/database.types'

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient<Database>()) // ✅ 修正済み

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  )
}
