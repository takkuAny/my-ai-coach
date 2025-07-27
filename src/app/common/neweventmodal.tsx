'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { supabase } from '@/lib/supabase/client'

interface Subject {
  id: string
  name: string
  category: {
    name: string
    color: string
  }
}

interface NewEventModalProps {
  isOpen: boolean
  onClose: () => void
  onAdded: (newEvent: any) => void
  selectedDate: string | null
  selectedStartTime?: string
  selectedEndTime?: string
  subjects: Subject[]
  subjectId: string
  setSubjectId: (id: string) => void
  allSubjects: Subject[]
  onSubjectRefresh: () => void
  is24HMode: boolean
}

export default function NewEventModal({
  isOpen,
  onClose,
  onAdded,
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  subjects,
  subjectId,
  setSubjectId,
  allSubjects,
  onSubjectRefresh,
  is24HMode,
}: NewEventModalProps) {
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [pages, setPages] = useState<number | undefined>()
  const [items, setItems] = useState<number | undefined>()
  const [memo, setMemo] = useState('')

  const [newSubjectName, setNewSubjectName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#60a5fa')

  useEffect(() => {
    if (isOpen) {
      setSubjectId('')
      setDate(selectedDate ? selectedDate.slice(0, 10) : '')
      setStartTime(selectedStartTime || '')
      setEndTime(selectedEndTime || '')
      setPages(undefined)
      setItems(undefined)
      setMemo('')
      setNewSubjectName('')
      setNewCategoryName('')
      setNewCategoryColor('#60a5fa')
    }
  }, [isOpen])

  const handleAdd = async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user || !subjectId || !date) return

    const typeValue = is24HMode === true ? '24h' : 'todo' // 明示的に判定
    console.log('📝 inserting with type:', typeValue)

    const { data, error } = await supabase
      .from('schedules')
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        date,
        start_time: startTime || null,
        end_time: endTime || null,
        planned_pages: pages || null,
        planned_items: items || null,
        memo,
        type: typeValue, // ✅ 安定化
      })
      .select('*')
      .single()

    if (error) {
      console.error('Insert error:', error)
      return
    }

    onAdded(data)
    onClose()
  }


  const handleAddSubject = async () => {
    if (!newSubjectName || !newCategoryName) return

    const user = (await supabase.auth.getUser()).data.user
    if (!user) return

    let { data: existingCategory } = await supabase
      .from('categories')
      .select('id, name, color')
      .eq('name', newCategoryName)
      .maybeSingle()

    if (!existingCategory) {
      const { data: newCat } = await supabase
        .from('categories')
        .insert({ name: newCategoryName, color: newCategoryColor, user_id: user.id })
        .select()
        .single()
      existingCategory = newCat
    }

    const { data: insertedSubject } = await supabase
      .from('subjects')
      .insert({
        name: newSubjectName,
        category_id: existingCategory!.id,
        user_id: user.id,
      })
      .select('id')
      .single()

    if (insertedSubject) {
      setSubjectId(insertedSubject.id)
      onSubjectRefresh()
      setNewSubjectName('')
      setNewCategoryName('')
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <DialogPanel className="bg-white p-6 rounded shadow-md w-full max-w-md">
          <DialogTitle className="text-lg font-bold mb-4">イベントを追加</DialogTitle>

          <label className="block mb-2">
            学習対象:
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full mt-1 p-2 border rounded"
            >
              <option value="">-- 選択してください --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}（{s.category.name}）
                </option>
              ))}
            </select>
          </label>

          <div className="bg-gray-100 p-3 rounded mb-4">
            <p className="text-sm font-semibold mb-2">💡 新しい学習対象とカテゴリを追加</p>
            <input
              type="text"
              placeholder="学習対象名"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
            />
            <input
              type="text"
              placeholder="カテゴリ名"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
            />

            <div className="flex flex-wrap gap-2 mb-2">
              {["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#d1d5db", "#999999"].map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-6 h-6 rounded-full border-2 ${newCategoryColor === color ? 'border-black' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewCategoryColor(color)}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-2">カテゴリカラーを選択</p>
            <button
              onClick={handleAddSubject}
              className="bg-blue-400 text-white px-3 py-1 text-sm rounded hover:bg-blue-500"
            >
              学習対象を追加
            </button>
          </div>

          <label className="block mb-2">
            日付:
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 p-2 border rounded"
            />
          </label>

          <label className="block mb-2">
            開始時刻（空欄可）:
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full mt-1 p-2 border rounded"
            />
          </label>

          <label className="block mb-2">
            終了時刻（空欄可）:
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full mt-1 p-2 border rounded"
            />
          </label>

          <label className="block mb-2">
            ページ数:
            <input
              type="number"
              value={pages ?? ''}
              onChange={(e) => setPages(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full mt-1 p-2 border rounded"
            />
          </label>

          <label className="block mb-2">
            項目数:
            <input
              type="number"
              value={items ?? ''}
              onChange={(e) => setItems(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full mt-1 p-2 border rounded"
            />
          </label>

          <label className="block mb-4">
            メモ:
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full mt-1 p-2 border rounded"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleAdd}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              作成
            </button>
            <button
              onClick={onClose}
              className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
            >
              キャンセル
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
