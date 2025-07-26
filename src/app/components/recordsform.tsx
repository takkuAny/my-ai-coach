'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Subject {
  id: string
  name: string
  category: {
    name: string
    color: string
  }
}

interface RecordFormProps {
  onSubmit: (form: {
    subjectId: string
    memo: string
    date: string
    startTime: string
    endTime: string
    pages?: number
    items?: number
    attempt: number
  }) => void
  initialValues?: Partial<{
    subjectId: string
    memo: string
    date: string
    startTime: string
    endTime: string
    pages?: number
    items?: number
    attempt: number
  }>
  subjects: Subject[]
  subjectId: string
  setSubjectId: (id: string) => void
  loading: boolean
  isEditing?: boolean
  aiComment?: string
  onSubjectRefresh: () => Promise<void>
}

export function RecordForm({
  onSubmit,
  initialValues = {},
  subjects,
  subjectId,
  setSubjectId,
  loading,
  isEditing = false,
  aiComment = '',
  onSubjectRefresh,
}: RecordFormProps) {
  const [memo, setMemo] = useState(initialValues.memo ?? '')
  const [selectedDate, setSelectedDate] = useState(initialValues.date ?? '')
  const [startTime, setStartTime] = useState(initialValues.startTime ?? '')
  const [endTime, setEndTime] = useState(initialValues.endTime ?? '')
  const [pages, setPages] = useState<number | undefined>(initialValues.pages)
  const [items, setItems] = useState<number | undefined>(initialValues.items)
  const [attempt, setAttempt] = useState(initialValues.attempt ?? 1)

  const [newSubjectName, setNewSubjectName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#999999')

  const handleAddSubject = async () => {
    const trimmedSubject = newSubjectName.trim()
    const trimmedCategory = newCategoryName.trim()

    if (!trimmedSubject || !trimmedCategory) {
      alert('学習対象とカテゴリ名を入力してください')
      return
    }

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) {
      alert('ログインユーザー情報の取得に失敗しました')
      return
    }

    let { data: existingCategory, error: categoryFetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('name', trimmedCategory)
      .is('deleted_at', null)
      .maybeSingle()

    if (categoryFetchError && categoryFetchError.code !== 'PGRST116') {
      alert('カテゴリの検索に失敗しました')
      return
    }

    if (!existingCategory) {
      const { data: inserted, error: categoryInsertError } = await supabase
        .from('categories')
        .insert({
          name: trimmedCategory,
          color: newCategoryColor,
          user_id: userId,
        })
        .select()
        .single()

      if (categoryInsertError || !inserted) {
        alert('カテゴリ作成に失敗しました: ' + categoryInsertError?.message)
        return
      }

      existingCategory = inserted
    }

    const { data: newSubject, error: subjectInsertError } = await supabase
      .from('subjects')
      .insert({
        name: trimmedSubject,
        category_id: existingCategory.id,
        user_id: userId,
      })
      .select('id, name, category_id')
      .single()

    if (subjectInsertError || !newSubject) {
      alert('学習対象の作成に失敗しました: ' + subjectInsertError?.message)
      return
    }

    setNewSubjectName('')
    setNewCategoryName('')
    setNewCategoryColor('#999999')
    setSubjectId(newSubject.id)
    await onSubjectRefresh()
  }

  return (
    <form id="record-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          subjectId,
          memo,
          date: selectedDate,
          startTime,
          endTime,
          pages,
          items,
          attempt,
        })
      }}
      className="space-y-4"
    >
      {/* 学習対象選択 */}
      <div>
        <label className="block font-medium mb-1">学習対象</label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          required
        >
          <option value="">-- 選択してください --</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}（{s.category?.name ?? 'カテゴリ不明'}）
            </option>
          ))}
        </select>
      </div>

      {/* 学習対象＋カテゴリ追加UI */}
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

        {/* カラーパレット */}
        <div className="flex flex-wrap gap-2">
          {[
            '#f87171', // red-400
            '#fbbf24', // yellow-400
            '#34d399', // green-400
            '#60a5fa', // blue-400
            '#a78bfa', // purple-400
            '#f472b6', // pink-400
            '#d1d5db', // gray-300
            '#999999', // default
          ].map((color) => (
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

      {/* 日付 */}
      <div>
        <label className="block font-medium mb-1">日付</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          required
        />
      </div>

      {/* 開始/終了時間 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-1">開始時刻</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">終了時刻</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            required
          />
        </div>
      </div>

      {/* メモ */}
      <div>
        <label className="block font-medium mb-1">メモ</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          rows={3}
        />
      </div>

      {/* ページ・項目数 */}
      <div>
        <label className="block font-medium mb-1">読んだページ数（任意）</label>
        <input
          type="number"
          min={0}
          value={pages ?? ''}
          onChange={(e) => setPages(Number(e.target.value))}
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">覚えた単語・項目数（任意）</label>
        <input
          type="number"
          min={0}
          value={items ?? ''}
          onChange={(e) => setItems(Number(e.target.value))}
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      {/* 取り組み回数 */}
      <div>
        <label className="block font-medium mb-1">取り組み回数</label>
        <select
          value={attempt}
          onChange={(e) => setAttempt(Number(e.target.value))}
          className="border rounded px-3 py-2 w-full"
        >
          <option value={1}>1（初回）</option>
          <option value={2}>2（復習1回目）</option>
          <option value={3}>3（復習2回目）</option>
          <option value={4}>4（復習3回目）</option>
        </select>
      </div>

      {/* AIコメント */}
      {isEditing && (
        <div>
          <label className="block font-medium mb-1">AIコメント</label>
          <textarea
            value={aiComment}
            className="border rounded px-3 py-2 w-full bg-gray-100"
            readOnly
          />
        </div>
      )}
    </form>
  )
}
