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

    // If not logged in and not already on the sign-in page, redirect to /signin
    if (!session && pathname !== "/signin") {
      router.push("/signin");
    }

    // If already logged in and still on /signin, redirect to /dashboard
    if (session && pathname === "/signin") {
      router.push("/dashboard");
    }
  }, [loading, session, pathname, router]);

  if (loading) return <Loading />;

  if (pathname === "/signin") return <>{children}</>; // Allow access to the sign-in page without a session
  if (!session) return <Loading />; // Show loading while redirecting unauthenticated users

  return <>{children}</>;
}
