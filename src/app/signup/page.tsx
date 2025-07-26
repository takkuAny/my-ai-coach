'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert('登録失敗: ' + error.message);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-semibold text-center">サインアップ</h1>
          <Input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full" onClick={handleSignup}>登録</Button>
        </CardContent>
      </Card>
    </div>
  );
}
