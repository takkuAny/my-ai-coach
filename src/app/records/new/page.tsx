'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function RecordNewPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiComment, setAiComment] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [formState, setFormState] = useState<any>({});

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
    (async () => {
      const loaded = await fetchSubjects();
      setSubjects(loaded);
    })();
  }, []);

  const generateAIComment = async (input: typeof formState) => {
    const prompt = [
      `学習日: ${input.date}`,
      `開始: ${input.startTime} / 終了: ${input.endTime}`,
      input.memo ? `メモ: ${input.memo}` : '',
      input.pages ? `読んだページ数: ${input.pages}` : '',
      input.items ? `覚えた項目数: ${input.items}` : '',
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
    } catch (err) {
      console.error('AIコメント生成失敗:', err);
      setAiComment('AIコメントの生成に失敗しました。');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSubmit = async (form: {
    subjectId: string;
    memo: string;
    date: string;
    startTime: string;
    endTime: string;
    pages?: number;
    items?: number;
    attempt: number;
  }) => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error, data } = await supabase.from('tasks').insert({
      subject_id: form.subjectId,
      memo: form.memo,
      date: form.date,
      start_time: form.startTime,
      end_time: form.endTime,
      pages: form.pages,
      items: form.items,
      attempt_number: form.attempt,
      user_id: user?.id,
      ai_comment: aiComment,
    });

    setLoading(false);

    if (error) {
      alert('登録に失敗しました: ' + error.message);
      return;
    }

    router.push('/records');
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">学習記録の新規作成</h1>

      <RecordForm
        onSubmit={(form) => {
          setFormState(form);
          handleSubmit(form);
        }}
        initialValues={{}}
        subjects={subjects}
        subjectId={subjectId}
        setSubjectId={setSubjectId}
        loading={loading || regenerating}
        isEditing={false}
        aiComment={aiComment}
        onSubjectRefresh={refreshSubjects}
      />

      <div className="text-sm text-gray-600 mt-2">
        <p className="font-semibold mb-1">💬 AIコメント</p>
        <div className="bg-gray-100 p-2 rounded min-h-[60px]">{aiComment || '（まだ生成されていません）'}</div>

        <button
          onClick={() => generateAIComment(formState)}
          disabled={regenerating}
          className="mt-2 text-blue-600 underline hover:text-blue-800"
        >
          {regenerating ? 'AIコメントを生成中…' : 'AIコメントを再生成する'}
        </button>
      </div>

      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => router.push('/records')}
          disabled={loading || regenerating}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
        >
          キャンセル
        </button>

        <div className="flex gap-2">
          <button
            type="submit"
            form="record-form"
            disabled={loading || regenerating}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {loading ? '登録中…' : '登録'}
          </button>
        </div>
      </div>
    </div>
  );
}
