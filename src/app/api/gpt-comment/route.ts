// src/app/api/gpt-comment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const USAGE_LIMIT = Number.parseInt(process.env.MAX_USAGE_PER_DAY ?? '', 10) || 100;

/** Cookieの中身で使う可能性がある形 */
type TokenShapes =
  | { access_token?: unknown; currentSession?: { access_token?: unknown }; session?: { access_token?: unknown } }
  | string[]
  | string
  | null;

/** Authorizationヘッダ or Cookie から access_token を取り出す（配列/二重JSONにも対応） */
async function getAccessToken(req: NextRequest): Promise<string | null> {
  // 1) Authorization: Bearer xxx を優先
  const h = req.headers.get('authorization');
  if (h && /^bearer\s+/i.test(h)) return h.replace(/^bearer\s+/i, '').trim();

  // 2) Supabase の auth cookie を解析
  const jar = await cookies();
  const c = jar.getAll().find((v) => /-auth-token$/.test(v.name));
  if (!c?.value) return null;

  // URLデコード
  let raw: unknown = (() => {
    try {
      return decodeURIComponent(c.value);
    } catch {
      return c.value;
    }
  })();

  // 最大2回まで JSON.parse を試す
  const tryParse = (x: unknown): unknown => {
    if (typeof x === 'string') {
      try {
        return JSON.parse(x);
      } catch {
        return x;
      }
    }
    return x;
  };
  raw = tryParse(raw);
  if (typeof raw === 'string') raw = tryParse(raw);

  // 旧フォーマット: ["access_token","refresh_token"]
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];

  // 新フォーマット群
  if (raw && typeof raw === 'object') {
    const r = raw as Extract<TokenShapes, { [k: string]: unknown }>;
    if (typeof r.access_token === 'string') return r.access_token;
    if (r.currentSession && typeof r.currentSession.access_token === 'string') return r.currentSession.access_token;
    if (r.session && typeof r.session.access_token === 'string') return r.session.access_token;
  }

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
    const body = (await req.json().catch(() => ({}))) as { memo?: unknown };
    const memo = typeof body.memo === 'string' ? body.memo : '';
    if (!memo.trim()) return NextResponse.json({ error: 'Memo is missing.' }, { status: 400 });

    const token = await getAccessToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = makeSupabase(token);

    // DBに上限判定を任せて原子的に+1（RPC: public.increment_usage(p_delta int, p_max int)）
    const { data: incData, error: incError } = await supabase.rpc('increment_usage', {
      p_delta: 1,
      p_max: USAGE_LIMIT,
    });

    // エラー型に any を使わず、最小限の形に絞って型主張
    const status = (incError as { status?: number } | null | undefined)?.status;
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (incError) {
      console.error('increment_usage failed:', incError);
      return NextResponse.json({ error: 'Failed to increment usage.' }, { status: 500 });
    }

    const incRow =
      (Array.isArray(incData) ? incData[0] : incData) as { ok?: boolean; new_total?: number } | null;
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
      usage_total: incRow.new_total ?? null,
      usage_limit: USAGE_LIMIT,
    });
  } catch (e) {
    console.error('route /api/gpt-comment error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
