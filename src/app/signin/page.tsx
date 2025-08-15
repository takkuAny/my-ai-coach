'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';

function getOrGenerateClientId(): string {
  let id = localStorage.getItem('client_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('client_id', id);
  }
  return id;
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);

      // サインアップ or ログイン
      const result = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        alert(result.error.message);
        return;
      }

      // サインアップの場合、メール確認が有効だと即セッションはできません
      if (isSignUp) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          alert('Sign-up successful! Please check your email to verify.');
          return;
        }
      }

      // セッションを明示的に同期（Cookie付与を確実に）
      const { data: sessionRes, error: sErr } = await supabase.auth.getSession();
      if (sErr || !sessionRes.session) {
        alert('Login succeeded, but session not found. Please try again.');
        return;
      }

      const user = sessionRes.session.user;

      // プロフィールの作成（無ければ）
      const { data: existing, error: exErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (exErr) {
        console.warn('profiles check error:', exErr);
      }

      if (!existing) {
        const { error: insErr } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name ?? '',
          avatar_url: user.user_metadata?.avatar_url ?? '',
        });
        if (insErr) console.warn('profiles insert error:', insErr);
      }

      // DEMO API key の事前登録（Upsert）
      const clientId = getOrGenerateClientId();
      const { error: upErr } = await supabase.from('api_keys').upsert(
        {
          user_id: user.id,
          provider: 'OpenAI',
          api_key: 'DEMO_KEY_USED_BY_ALL',
          is_demo: true,
          mac_address: clientId,
          created_by: user.id,
        },
        { onConflict: 'user_id,is_demo' }
      );
      if (upErr) console.warn('api_keys upsert error:', upErr);

      // ここまで来たら Cookie（sb-…-auth-token）が付いているはず
      try {
        router.push('/dashboard');
      } catch {
        window.location.href = '/dashboard';
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <Card className="w-full max-w-sm shadow-md">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-semibold text-center">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </h1>

          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            className="w-full"
            onClick={handleEmailAuth}
            disabled={loading}
          >
            {loading
              ? (isSignUp ? 'Creating…' : 'Signing in…')
              : (isSignUp ? 'Create Account' : 'Login')}
          </Button>

          <div className="text-center text-sm">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  className="text-blue-600 underline"
                  onClick={() => setIsSignUp(false)}
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                New here?{' '}
                <button
                  className="text-blue-600 underline"
                  onClick={() => setIsSignUp(true)}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
