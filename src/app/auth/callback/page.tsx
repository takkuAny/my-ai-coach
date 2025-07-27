import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AuthCallback() {
  const supabase = createServerComponentClient({ cookies });

  // Retrieve the session from the OAuth callback
  await supabase.auth.getSession();

  // Redirect to the post-login page
  redirect('/dashboard');
}
