'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
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

  useEffect(() => {
    let hasRun = false;

    const registerUserData = async () => {
      if (hasRun) return;
      hasRun = true;

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      // Insert profile if not exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existing) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata.full_name ?? '',
          avatar_url: user.user_metadata.avatar_url ?? '',
        });
      }

      // Insert demo API key
      const clientId = getOrGenerateClientId();
      await supabase.from('api_keys').upsert({
        user_id: user.id,
        provider: 'OpenAI',
        api_key: 'DEMO_KEY_USED_BY_ALL',
        is_demo: true,
        mac_address: clientId,
        created_by: user.id,
      }, {
        onConflict: 'user_id,is_demo',
      });

      router.push('/dashboard');
    };

    registerUserData();
  }, []);

  const handleEmailAuth = async () => {
    if (!email || !password) return alert('Please enter both email and password.');

    let result;
    if (isSignUp) {
      result = await supabase.auth.signUp({ email, password });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }

    if (result.error) {
      alert(result.error.message);
    } else {
      alert(isSignUp
        ? 'Sign-up successful! Please check your email to verify.'
        : 'Login successful!');
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/signin`,
      },
    });
    if (error) alert('OAuth error: ' + error.message);
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
          <Button className="w-full" onClick={handleEmailAuth}>
            {isSignUp ? 'Create Account' : 'Login'}
          </Button>

          <div className="text-center text-sm">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button className="text-blue-600 underline" onClick={() => setIsSignUp(false)}>
                  Sign In
                </button>
              </>
            ) : (
              <>
                New here?{' '}
                <button className="text-blue-600 underline" onClick={() => setIsSignUp(true)}>
                  Sign Up
                </button>
              </>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            <Button variant="outline" className="w-full" onClick={() => handleOAuth('google')}>
              <FcGoogle className="mr-2 h-4 w-4" /> Sign in with Google
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleOAuth('github')}>
              <FaGithub className="mr-2 h-4 w-4" /> Sign in with GitHub
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
