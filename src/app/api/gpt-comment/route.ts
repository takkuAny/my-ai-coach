import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { memo } = await req.json();

  if (!memo || typeof memo !== 'string') {
    return NextResponse.json({ error: 'Memo is missing.' }, { status: 400 });
  }

  const MAX_USAGE = Number(process.env.MAX_USAGE_PER_DAY ?? 100);

  //Get total usage_count
  const { data: usageData, error: usageError } = await supabase
    .from('api_usage')
    .select('usage_count')
    .not('deleted_at', 'is', null)
    .not('usage_count', 'is', null);

  if (usageError) {
    console.error('❌ Failed to fetch usage_count:', usageError);
    return NextResponse.json({ error: 'Failed to retrieve usage count.' }, { status: 500 });
  }

  const totalUsage = usageData.reduce((sum, row) => sum + (row.usage_count || 0), 0);
  if (totalUsage >= MAX_USAGE) {
    return NextResponse.json({ error: 'Daily usage limit reached.' }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is not set.' }, { status: 500 });
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a learning advisor. Based on the study memo, provide a short, positive, and encouraging comment in English (1–2 sentences).',
          },
          {
            role: 'user',
            content: `Please give feedback on the following study record:\n${memo}`,
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('🔴 OpenAI error:', text);
      return NextResponse.json({ error: 'Failed to call OpenAI API.' }, { status: 502 });
    }

    const result = await openaiRes.json();
    const comment = result.choices?.[0]?.message?.content ?? 'Failed to generate AI comment.';

    //Increment usage_count (global id assumed)
    await supabase
      .from('api_usage')
      .update({ usage_count: totalUsage + 1 })
      .eq('id', 'global') // Adjust ID as needed
      .select();

    return NextResponse.json({ comment });
  } catch (err) {
    console.error('🔴 Server error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
