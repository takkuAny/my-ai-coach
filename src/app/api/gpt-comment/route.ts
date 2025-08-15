// src/app/api/gpt-comment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const USAGE_LIMIT = Number.parseInt(process.env.MAX_USAGE_PER_DAY ?? '', 10) || 100;

/** Authorizationヘッダ or Cookie から access_token を取り出す（配列/二重JSONにも対応） */
async function getAccessToken(req: NextRequest): Promise<string | null> {
  // 1) Authorization: Bearer xxx を優先
  const h = req.headers.get('authorization');
  if (h && /^bearer\s+/i.test(h)) return h.replace(/^bearer\s+/i, '').trim();

  // 2) Supabase の auth cookie を解析（いくつかのフォーマットに対応）
  const jar = await cookies();
  const c = jar.getAll().find(v => /-auth-token$/.test(v.name));
  if (!c?.value) return null;

  // URLデコード
  let raw: any = (() => {
    try { return decodeURIComponent(c.value); } catch { return c.value; }
  })();

  // 最大2回まで JSON を再帰的に解凍（"文字列化されたJSON"ケース対策）
  const tryParse = (x: any) => { try { return JSON.parse(x); } catch { return x; } };
  raw = tryParse(raw);
  raw = typeof raw === 'string' ? tryParse(raw) : raw;

  // 旧フォーマット: ["access_token","refresh_token"]
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];

  // 新フォーマット群
  if (typeof raw?.access_token === 'string') return raw.access_token;
  if (typeof raw?.currentSession?.access_token === 'string') return raw.currentSession.access_token;
  if (typeof raw?.session?.access_token === 'string') return raw.session.access_token;

  return null;
}

/** 無状態(Stateless) Supabase クライアント（Cookieは書き換えない） */
function makeSupabase(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'public' },
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function localCommentFrom(memo: string) {
  const s = memo.trim().replace(/\s+/g, ' ');
  return `Summary: ${s.slice(0, 180)}${s.length > 180 ? '…' : ''} — Keep it up!`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const memo: string = (body?.memo ?? '').toString();
    if (!memo.trim()) return NextResponse.json({ error: 'Memo is missing.' }, { status: 400 });

    const token = await getAccessToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = makeSupabase(token);

    // DBに上限判定を任せて原子的に+1（RPC: public.increment_usage(p_delta int, p_max int)）
    const { data: incData, error: incError } = await supabase.rpc('increment_usage', {
      p_delta: 1,
      p_max: USAGE_LIMIT,
    });
    if (incError) {
      const s = (incError as any)?.status ?? 0;
      if (s === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      console.error('increment_usage failed:', incError);
      return NextResponse.json({ error: 'Failed to increment usage.' }, { status: 500 });
    }

    const incRow = Array.isArray(incData) ? incData[0] : incData;
    if (!incRow?.ok) {
      return NextResponse.json(
        { error: 'Usage limit reached.', usage_total: incRow?.new_total ?? null, usage_limit: USAGE_LIMIT },
        { status: 429 }
      );
    }

    const comment = localCommentFrom(memo);
    return NextResponse.json({
      ok: true,
      comment,
      usage_total: incRow.new_total,
      usage_limit: USAGE_LIMIT,
    });
  } catch (e) {
    console.error('route /api/gpt-comment error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
