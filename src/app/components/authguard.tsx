'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/lib/supabase/useSession';
import Loading from '@/components/common/loading';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // 未ログインなら /signin にリダイレクト
    if (!session && pathname !== "/signin") {
      router.push("/signin");
    }

    // ログイン済み & /signin にいたら /dashboard にリダイレクト
    if (session && pathname === "/signin") {
      router.push("/dashboard");
    }
  }, [loading, session, pathname, router]);

  if (loading) return <Loading />;

  if (pathname === "/signin") return <>{children}</>; // サインインページはガード対象外
  if (!session) return <Loading />; // 未ログイン状態で他ページへ来た場合、ローディング中にしてリダイレクト待機

  return <>{children}</>;
}
