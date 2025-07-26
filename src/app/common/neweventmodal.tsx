'use client';

import { useEffect, useState } from 'react';
import Modal from './modal';
import { supabase } from '@/lib/supabase/client';

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

interface ScheduleModalProps {
  initialValues?: Partial<{
    subjectId: string;
    memo: string;
    date: string;
    startTime: string;
    endTime: string;
    pages?: number;
    items?: number;
    attempt: number;
  }>;
  subjects: Subject[];
  subjectId: string;
  setSubjectId: (id: string) => void;
  isEditing?: boolean;
  aiComment?: string;
  onSubjectRefresh: () => Promise<void>;
  selectedDate: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAdded: (newEvent: any) => void;
  allSubjects: Subject[];
}

export default function NewEventModal({
  selectedDate,
  isOpen,
  onClose,
  onAdded,
  subjectId,
  setSubjectId,
  allSubjects,
  onSubjectRefresh,
}: ScheduleModalProps) {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#999999');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [pages, setPages] = useState('');
  const [items, setItems] = useState('');
  const [memo, setMemo] = useState('');

  const handleAddSubject = async () => {
    const trimmedSubject = newSubjectName.trim();
    const trimmedCategory = newCategoryName.trim();
    if (!trimmedSubject || !trimmedCategory) {
      alert('学習対象とカテゴリ名を入力してください');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      alert('ログインユーザー情報の取得に失敗しました');
      return;
    }

    let { data: existingCategory } = await supabase
      .from('categories')
      .select('*')
      .eq('name', trimmedCategory)
      .is('deleted_at', null)
      .maybeSingle();

    if (!existingCategory) {
      const { data: inserted } = await supabase
        .from('categories')
        .insert({
          name: trimmedCategory,
          color: newCategoryColor,
          user_id: userId,
        })
        .select()
        .single();
      existingCategory = inserted;
    }

    const { data: newSubject } = await supabase
      .from('subjects')
      .insert({
        name: trimmedSubject,
        category_id: existingCategory.id,
        user_id: userId,
      })
      .select('id, name, category_id')
      .single();

    if (!newSubject) {
      alert('学習対象の作成に失敗しました');
      return;
    }

    setNewSubjectName('');
    setNewCategoryName('');
    setNewCategoryColor('#999999');
    setSubjectId(newSubject.id);
    await onSubjectRefresh();
  };

  const handleSave = async () => {
    if (!subjectId || !selectedDate) {
      alert('学習対象と日付は必須です');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      alert('ログインが必要です');
      return;
    }

    const { error: insertError } = await supabase.from('schedules').insert({
      user_id: userId,
      type: 'todo',
      subject_id: subjectId,
      date: selectedDate,
      planned_pages: pages ? Number(pages) : null,
      planned_items: items ? Number(items) : null,
      memo: memo || null,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      alert('保存に失敗しました: ' + insertError.message);
      return;
    }

    // 登録直後の最新イベントをビューから取得
    const { data: newRows, error: fetchError } = await supabase
      .from('schedule_with_subject')
      .select('*')
      .eq('user_id', userId)
      .eq('date', selectedDate)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !newRows || newRows.length === 0) {
      alert('新規イベントの取得に失敗しました: ' + fetchError?.message);
      return;
    }

    const newItem = newRows[0];

    // FullCalendar 形式で渡す
    onAdded({
      id: newItem.id,
      title: newItem.subject_name ?? '未設定',
      date: newItem.date,
      allDay: true,
      backgroundColor: newItem.category_color ?? '#999',
      raw: {
        id: newItem.id,
        date: newItem.date,
        start_time: newItem.start_time,
        end_time: newItem.end_time,
        planned_pages: newItem.planned_pages ?? undefined,
        planned_items: newItem.planned_items ?? undefined,
        memo: newItem.memo ?? undefined,
        subject: {
          id: newItem.subject_id,
          name: newItem.subject_name,
          category: {
            name: newItem.category_name,
            color: newItem.category_color,
          },
        },
      },
    });

    setSubjectId('');
    setPages('');
    setItems('');
    setMemo('');
    onClose();
  };

  const fetchSubjects = async (): Promise<Subject[]> => {
    const { data, error } = await supabase.from('subject_with_category').select(`*`);
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

  useEffect(() => {
    (async () => {
      const loaded = await fetchSubjects();
      setSubjects(loaded);
    })();
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-4 space-y-4">
        <h3 className="text-lg font-bold">新しいToDo（{selectedDate ?? '未選択'}）</h3>

        <div>
          <label className="block text-sm font-medium">学習対象</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">-- 選択してください --</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}（{s.category?.name ?? 'カテゴリ不明'}）
              </option>
            ))}
          </select>
        </div>

        <div className="bg-gray-100 p-3 rounded space-y-2">
          <p className="text-sm font-semibold">💡 新しい学習対象とカテゴリを追加</p>
          <input
            type="text"
            placeholder="学習対象名"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
          <input
            type="text"
            placeholder="カテゴリ名"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />

          <div className="flex flex-wrap gap-2">
            {["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#d1d5db", "#999999"].map((color) => (
              <button
                key={color}
                type="button"
                className={`w-6 h-6 rounded-full border-2 ${
                  newCategoryColor === color ? 'border-black' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setNewCategoryColor(color)}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500">カテゴリカラーを選択</p>

          <button
            type="button"
            onClick={handleAddSubject}
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
          >
            学習対象を追加
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            className="border p-2 w-full"
            placeholder="📄 ページ数"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
          />
          <input
            type="number"
            className="border p-2 w-full"
            placeholder="📘 単語・項目数"
            value={items}
            onChange={(e) => setItems(e.target.value)}
          />
        </div>

        <textarea
          className="border p-2 w-full"
          placeholder="📝 メモ（任意）"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />

        <div className="flex justify-end space-x-2 pt-2">
          <button onClick={onClose} className="px-4 py-1 bg-gray-300 text-black rounded">
            キャンセル
          </button>
          <button onClick={handleSave} className="px-4 py-1 bg-blue-500 text-white rounded">
            登録
          </button>
        </div>
      </div>
    </Modal>
  );
}
