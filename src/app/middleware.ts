// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // セッションの取得（これがあるとログイン後にセッションが使える）
  await supabase.auth.getSession()

  return res
}

// 必要なルートでのみ middleware を有効化
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
