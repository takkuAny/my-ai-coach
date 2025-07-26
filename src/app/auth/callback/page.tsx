import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AuthCallback() {
  const supabase = createServerComponentClient({ cookies });

  // OAuth コールバックのセッションを取得
  await supabase.auth.getSession();

  // ログイン後に遷移させたいページへリダイレクト
  redirect('/dashboard');
}
