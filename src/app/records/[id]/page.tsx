'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { RecordForm } from '@/components/recordsform';

interface Subject {
  id: string;
  name: string;
  category: {
    name: string;
    color: string;
  };
}

type RawSubject = {
  id: string;
  name: string;
  category_name: string;
  category_color: string;
};

export default function RecordDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [initialValues, setInitialValues] = useState<any>(null);
  const [aiComment, setAiComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchSubjects = async (): Promise<Subject[]> => {
    const { data, error } = await supabase
      .from('subject_with_category')
      .select('*');

    if (error || !data) {
      console.error('学習対象の取得に失敗:', error?.message);
      return [];
    }

    return data.map((item: RawSubject) => ({
      id: item.id,
      name: item.name,
      category: {
        name: item.category_name,
        color: item.category_color,
      },
    }));
  };

  const refreshSubjects = async (): Promise<void> => {
    const updated = await fetchSubjects();
    setSubjects(updated);
  };

  useEffect(() => {
    const fetchData = async () => {
      const loadedSubjects = await fetchSubjects();
      setSubjects(loadedSubjects);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('学習記録の取得に失敗:', error?.message);
        return;
      }

      setInitialValues({
        subjectId: data.subject_id,
        memo: data.memo ?? '',
        date: data.date ?? '',
        startTime: data.start_time ?? '',
        endTime: data.end_time ?? '',
        pages: data.pages ?? undefined,
        items: data.items ?? undefined,
        attempt: data.attempt_number ?? 1,
      });

      setAiComment(data.ai_comment ?? '');
    };

    fetchData();
  }, [id]);

  const handleUpdate = async (form: any) => {
    setLoading(true);

    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    const diffMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);

    if (isNaN(diffMinutes) || diffMinutes <= 0) {
      alert('時刻の入力を確認してください');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        subject_id: form.subjectId,
        memo: form.memo,
        date: form.date,
        start_time: form.startTime,
        end_time: form.endTime,
        time: diffMinutes,
        pages: form.pages,
        items: form.items,
        attempt_number: form.attempt,
      })
      .eq('id', id);

    setLoading(false);

    if (error) {
      alert('更新に失敗しました: ' + error.message);
    } else {
      router.push('/records');
    }
  };

  const handleDelete = async () => {
    if (regenerating || loading) return;

    const confirmDelete = confirm('本当に削除しますか？');
    if (!confirmDelete) return;

    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
    } else {
      router.push('/records');
    }
  };

  const regenerateAIComment = async () => {
    if (!initialValues) return;

    const { date, startTime, endTime, memo, pages, items } = initialValues;

    const prompt = [
      `学習日: ${date}`,
      `開始: ${startTime} / 終了: ${endTime}`,
      memo ? `メモ: ${memo}` : '',
      pages ? `読んだページ数: ${pages}` : '',
      items ? `覚えた項目数: ${items}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (!prompt.trim()) {
      setAiComment('AIコメントを生成する情報が不足しています。');
      return;
    }

    setRegenerating(true);
    try {
      const res = await fetch('/api/gpt-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: prompt }),
      });

      const result = await res.json();
      const comment = result.comment ?? 'AIコメントの生成に失敗しました。';

      setAiComment(comment);

      await supabase.from('tasks').update({ ai_comment: comment }).eq('id', id);
    } catch (err) {
      console.error('AIコメント再生成失敗:', err);
      setAiComment('AIコメントの生成に失敗しました。');
    } finally {
      setRegenerating(false);
    }
  };

  if (!initialValues) return <div className="p-6">読み込み中...</div>;

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">学習記録の詳細</h1>

      <RecordForm
        onSubmit={handleUpdate}
        initialValues={initialValues}
        subjects={subjects}
        subjectId={initialValues.subjectId}
        setSubjectId={(id: string) =>
          setInitialValues((prev: any) => ({ ...prev, subjectId: id }))
        }
        loading={loading || regenerating}
        isEditing
        aiComment={aiComment}
        onSubjectRefresh={refreshSubjects}
      />

      <div className="text-sm text-gray-600 mt-2">
        <button
          onClick={regenerateAIComment}
          disabled={regenerating}
          className="text-blue-600 underline hover:text-blue-800"
        >
          {regenerating ? 'AIコメントを生成中…' : 'AIコメントを再生成する'}
        </button>
      </div>

      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => router.push('/records')}
          disabled={regenerating}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
        >
          キャンセル
        </button>

        <div className="flex gap-4">
          <button
            onClick={handleDelete}
            disabled={regenerating}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            削除
          </button>
          <button
            type="submit"
            form="record-form"
            disabled={loading || regenerating}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {loading ? '更新中…' : '更新'}
          </button>
        </div>
      </div>
    </main>
  );
}
