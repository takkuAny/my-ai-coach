import './globals.css'
import { SupabaseProvider } from '@/lib/supabase/supabase-provider'
import ClientLayout from './client-layout'

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
          <ClientLayout>{children}</ClientLayout>
        </SupabaseProvider>
      </body>
    </html>
  )
}
