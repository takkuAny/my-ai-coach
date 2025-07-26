import './globals.css'
import { SidebarNav } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Suspense } from 'react'
import AuthGuard from '@/components/authguard'
import Loading from '@/components/common/loading'
import { SupabaseProvider } from '@/lib/supabase/supabase-provider'

export const metadata = {
  title: '学習AIコーチ',
  description: 'Supabase + Next.js App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <SupabaseProvider>
          <div className="flex min-h-screen">
            <SidebarNav />
            <div className="flex-1">
              <Header />
              <Suspense fallback={<Loading />}>
                <AuthGuard>
                  <main className="p-6">{children}</main>
                </AuthGuard>
              </Suspense>
            </div>
          </div>
        </SupabaseProvider>
      </body>
    </html>
  )
}
