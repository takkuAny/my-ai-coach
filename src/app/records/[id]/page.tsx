'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/** 必要に応じて調整してください（テーブル/カラム名） */
type TaskRow = {
  id: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  memo: string | null;
  pages: number | null;
  items: number | null;
  attempt: number | null;
  subject_id: string | null;
  ai_comment: string | null;
};

export default function RecordDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [task, setTask] = useState<TaskRow | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [aiComment, setAiComment] = useState<string>('');

  // 初期データのロード
  useEffect(() => {
    const run = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const { data: row, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .maybeSingle<TaskRow>();
        if (error) throw error;
        if (!row) return;

        setTask(row);
        setAiComment(row.ai_comment ?? '');

        if (row.subject_id) {
          const { data: subj, error: se } = await supabase
            .from('subjects')
            .select('name')
            .eq('id', row.subject_id)
            .maybeSingle<{ name: string }>();
          if (!se && subj?.name) setSubjectName(subj.name);
        }
      } catch (e) {
        console.error('load error:', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  // 表示用のラベル
  const attemptLabel = useMemo(() => {
    const n = task?.attempt ?? 0;
    if (!n) return 'first attempt';
    if (n === 1) return 'second attempt';
    if (n === 2) return 'third attempt';
    return `${n + 1}th attempt`;
  }, [task?.attempt]);

  // AIコメントの再生成（ここが今回の肝）
  const regenerateAIComment = async () => {
    if (!task) return;

    const prompt = `
On ${task.date ?? 'an unknown date'}, you studied "${subjectName || 'Unknown subject'}" from ${task.start_time ?? '??'} to ${task.end_time ?? '??'}.
You read ${task.pages ?? 0} page(s) and memorized ${task.items ?? 0} item(s).
This was your ${attemptLabel}.
Memo: ${task.memo || 'No additional notes were provided.'}
    `.trim();

    setRegenLoading(true);
    try {
      // 1) アクセストークン取得
      const { data: sessionRes } = await supabase.auth.getSession();
      const accessToken = sessionRes.session?.access_token ?? '';

      // 2) Cookie + Authorization の二段構えで API へ
      const res = await fetch('/api/gpt-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ memo: prompt }),
        credentials: 'include',
      });

      const json = await res.json();
      if (!res.ok) {
        console.error('gpt-comment error:', json);
        setAiComment('Failed to generate AI comment.');
        return;
      }

      const comment: string =
        json?.comment ??
        `AI comment generated. (usage_total: ${json?.usage_total ?? 'n/a'})`;
      setAiComment(comment);

      // 3) DB 更新
      const { error: upErr } = await supabase
        .from('tasks')
        .update({ ai_comment: comment })
        .eq('id', task.id);
      if (upErr) console.warn('update ai_comment error:', upErr);
    } catch (e) {
      console.error('regenerate error:', e);
      setAiComment('Failed to generate AI comment.');
    } finally {
      setRegenLoading(false);
    }
  };

  // 手動保存（任意）
  const save = async () => {
    if (!task) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ ai_comment: aiComment })
        .eq('id', task.id);
      if (error) throw error;
    } catch (e) {
      console.error('save error:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!task) return <div className="p-6">Record not found.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <button
        className="text-sm underline"
        onClick={() => router.back()}
      >
        ← Back
      </button>

      <h1 className="text-2xl font-semibold">Record Detail</h1>

      <div className="grid grid-cols-2 gap-4">
        <div><span className="font-medium">Subject:</span> {subjectName || '(unknown)'}</div>
        <div><span className="font-medium">Date:</span> {task.date ?? '-'}</div>
        <div><span className="font-medium">Time:</span> {task.start_time ?? '??'} - {task.end_time ?? '??'}</div>
        <div><span className="font-medium">Pages:</span> {task.pages ?? 0}</div>
        <div><span className="font-medium">Items:</span> {task.items ?? 0}</div>
        <div><span className="font-medium">Attempt:</span> {attemptLabel}</div>
      </div>

      <div className="space-y-2">
        <label className="font-medium">AI Comment</label>
        <textarea
          className="w-full border rounded p-3 min-h-[160px]"
          value={aiComment}
          onChange={(e) => setAiComment(e.target.value)}
        />
        <div className="flex gap-3">
          <button
            onClick={regenerateAIComment}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
            disabled={regenLoading}
          >
            {regenLoading ? 'Generating…' : 'Regenerate with AI'}
          </button>
          <button
            onClick={save}
            className="px-4 py-2 rounded border disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
