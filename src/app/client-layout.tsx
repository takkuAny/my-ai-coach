'use client'

import { SidebarNav } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Suspense } from 'react'
import AuthGuard from '@/components/authguard'
import Loading from '@/components/common/loading'
import { usePathname } from 'next/navigation'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // 認証ページではサイドバー・ヘッダーを非表示にする
  const hideLayout =
    pathname === '/login' || pathname === '/signup' || pathname === '/signin'

  if (hideLayout) {
    return (
      <main className="flex h-full items-center justify-center p-6 bg-background">
        {children}
      </main>
    )
  }

  return (
    <div className="flex h-full">
      <SidebarNav />
      <div className="flex flex-col flex-1">
        <div className="sticky top-0 z-10">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<Loading />}>
            <AuthGuard>{children}</AuthGuard>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
