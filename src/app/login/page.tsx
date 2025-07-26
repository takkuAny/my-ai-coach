'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '../components/ui/button';

export default function LoginButton() {
  const supabase = createClientComponentClient();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert('ログインに失敗しました');
      console.error(error.message);
    }
  };

  return (
    <Button onClick={handleLogin} className="w-full">
      Googleでログイン
    </Button>
  );
}
