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

  const refreshSubjects = async () => {
    const updated = await fetchSubjects();
    setSubjects(updated);
  };

  useEffect(() => {
    const fetchRecord = async () => {
      const loadedSubjects = await fetchSubjects();
      setSubjects(loadedSubjects);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Failed to fetch record:', error?.message);
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

    fetchRecord();
  }, [id]);

  const handleUpdate = async (form: any) => {
    setLoading(true);

    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    const diffMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);

    if (isNaN(diffMinutes) || diffMinutes <= 0) {
      alert('Please check the time input.');
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
      alert('Failed to update: ' + error.message);
    } else {
      router.push('/records');
    }
  };

  const handleDelete = async () => {
    if (loading || regenerating) return;

    const confirmDelete = confirm('Are you sure you want to delete this record?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      alert('Failed to delete: ' + error.message);
    } else {
      router.push('/records');
    }
  };

  const regenerateAIComment = async () => {
    if (!initialValues) return;

    const { date, startTime, endTime, memo, pages, items } = initialValues;

    const prompt = [
      `Date: ${date}`,
      `Start: ${startTime} / End: ${endTime}`,
      memo ? `Memo: ${memo}` : '',
      pages ? `Pages read: ${pages}` : '',
      items ? `Items learned: ${items}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (!prompt.trim()) {
      setAiComment('Insufficient data to generate AI comment.');
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
      const comment = result.comment ?? 'Failed to generate AI comment.';

      setAiComment(comment);
      await supabase.from('tasks').update({ ai_comment: comment }).eq('id', id);
    } catch (err) {
      console.error('Error regenerating AI comment:', err);
      setAiComment('Failed to generate AI comment.');
    } finally {
      setRegenerating(false);
    }
  };

  if (!initialValues) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Record Details</h1>

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
          {regenerating ? 'Generating AI comment…' : 'Regenerate AI comment'}
        </button>
      </div>

      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => router.push('/records')}
          disabled={regenerating}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
        >
          Cancel
        </button>

        <div className="flex gap-4">
          <button
            onClick={handleDelete}
            disabled={regenerating}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Delete
          </button>
          <button
            type="submit"
            form="record-form"
            disabled={loading || regenerating}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {loading ? 'Updating…' : 'Update'}
          </button>
        </div>
      </div>
    </main>
  );
}
