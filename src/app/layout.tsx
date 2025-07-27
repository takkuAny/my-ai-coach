import './globals.css'
import { SidebarNav } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Suspense } from 'react'
import AuthGuard from '@/components/authguard'
import Loading from '@/components/common/loading'
import { SupabaseProvider } from '@/lib/supabase/supabase-provider'

export const metadata = {
  title: 'Learning AI Coach',
  description: 'Supabase + Next.js App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <SupabaseProvider>
          <div className="flex h-full">
            {/* Sidebar (fixed) */}
            <SidebarNav />

            {/* Main content area (Header + Content) */}
            <div className="flex flex-col flex-1">
              {/* Fixed header */}
              <div className="sticky top-0 z-10">
                <Header />
              </div>

              {/* Scrollable content */}
              <main className="flex-1 overflow-y-auto p-6">
                <Suspense fallback={<Loading />}>
                  <AuthGuard>{children}</AuthGuard>
                </Suspense>
              </main>
            </div>
          </div>
        </SupabaseProvider>
      </body>
    </html>
  )
}
