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

type RecordFormValues = {
  subjectId: string;
  memo: string;
  date: string;
  startTime: string;
  endTime: string;
  pages?: number;
  items?: number;
  attempt: number;
};

export default function RecordNewPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiComment, setAiComment] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [formState, setFormState] = useState<RecordFormValues>({
    subjectId: '',
    memo: '',
    date: '',
    startTime: '',
    endTime: '',
    pages: undefined,
    items: undefined,
    attempt: 1,
  });

  const fetchSubjects = async (): Promise<Subject[]> => {
    const { data, error } = await supabase
      .from('subject_with_category')
      .select('*');

    if (error || !data) {
      console.error('Failed to fetch subjects:', error?.message);
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

  const getSubjectName = (id: string): string => {
    const match = subjects.find((s) => s.id === id);
    return match?.name || 'Unknown Subject';
  };

  const getAttemptLabel = (attempt: number): string => {
    switch (attempt) {
      case 1:
        return 'First time';
      case 2:
        return 'Second time';
      case 3:
        return 'Third time';
      default:
        return `${attempt}th time`;
    }
  };

  const generateAIComment = async (input: RecordFormValues) => {
    const subjectName = getSubjectName(input.subjectId);
    const attemptLabel = getAttemptLabel(input.attempt);

    const prompt = `
        On ${input.date || 'an unknown date'}, you studied "${subjectName}" from ${input.startTime || '??'} to ${input.endTime || '??'}.
        You read ${input.pages ?? 'no'} page(s) and memorized ${input.items ?? 'no'} item(s).
        This was your ${attemptLabel}.
        Memo: ${input.memo || 'No additional notes were provided.'}
    `.trim();

    setRegenerating(true);
    try {
      const res = await fetch('/api/gpt-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: prompt }),
      });

      const result = await res.json();
      const comment = result.comment ?? 'Failed to generate AI comment.';
      setAiComment(comment);
    } catch (err) {
      console.error('AI comment generation failed:', err);
      setAiComment('Failed to generate AI comment.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSubmit = async (form: RecordFormValues) => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    const diffMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);

    if (isNaN(diffMinutes) || diffMinutes <= 0) {
      alert('Invalid time range. Please check start and end time.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('tasks').insert({
      subject_id: form.subjectId,
      memo: form.memo,
      date: form.date,
      start_time: form.startTime,
      end_time: form.endTime,
      time: diffMinutes,
      pages: form.pages,
      items: form.items,
      attempt_number: form.attempt,
      user_id: user?.id,
      ai_comment: aiComment,
    });

    setLoading(false);

    if (error) {
      alert('Failed to submit: ' + error.message);
      return;
    }

    router.push('/records');
  };


  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">New Study Record</h1>

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
        <p className="font-semibold mb-1">💬 AI Comment</p>
        <div className="bg-gray-100 p-2 rounded min-h-[60px] whitespace-pre-wrap">
          {aiComment || '(Not generated yet)'}
        </div>

        <button
          onClick={() => generateAIComment(formState)}
          disabled={regenerating}
          className="mt-2 text-blue-600 underline hover:text-blue-800"
        >
          {regenerating ? 'Generating AI comment...' : 'Regenerate AI comment'}
        </button>
      </div>

      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => router.push('/records')}
          disabled={loading || regenerating}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
        >
          Cancel
        </button>

        <button
          type="submit"
          form="record-form"
          disabled={loading || regenerating}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
