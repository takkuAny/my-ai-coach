'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function ResetPage() {
  const [email, setEmail] = useState('');
  const supabase = createClient();

  const handleReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) alert('リセット失敗: ' + error.message);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-semibold text-center">パスワードリセット</h1>
          <Input type="email" placeholder="登録メール" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button className="w-full" onClick={handleReset}>送信</Button>
        </CardContent>
      </Card>
    </div>
  );
}
