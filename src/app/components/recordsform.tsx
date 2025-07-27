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
      alert('Please enter both subject and category names.')
      return
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) {
      alert('Failed to retrieve user information.')
      return
    }

    let { data: existingCategory, error: categoryFetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('name', trimmedCategory)
      .is('deleted_at', null)
      .maybeSingle()

    if (categoryFetchError && categoryFetchError.code !== 'PGRST116') {
      alert('Failed to fetch category.')
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
        alert('Failed to create category: ' + categoryInsertError?.message)
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
      alert('Failed to create subject: ' + subjectInsertError?.message)
      return
    }

    setNewSubjectName('')
    setNewCategoryName('')
    setNewCategoryColor('#999999')
    setSubjectId(newSubject.id)
    await onSubjectRefresh()
  }

  return (
    <form
      id="record-form"
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
      {/* Subject Selection */}
      <div>
        <label className="block font-medium mb-1">Subject</label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          required
        >
          <option value="">-- Please select --</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.category?.name ?? 'Unknown Category'})
            </option>
          ))}
        </select>
      </div>

      {/* Add Subject + Category */}
      <div className="bg-gray-100 p-3 rounded space-y-2">
        <p className="text-sm font-semibold">💡 Add new subject and category</p>
        <input
          type="text"
          placeholder="Subject name"
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        />
        <input
          type="text"
          placeholder="Category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        />
        <div className="flex flex-wrap gap-2">
          {[
            '#f87171',
            '#fbbf24',
            '#34d399',
            '#60a5fa',
            '#a78bfa',
            '#f472b6',
            '#d1d5db',
            '#999999',
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
        <p className="text-sm text-gray-500">Choose category color</p>

        <button
          type="button"
          onClick={handleAddSubject}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
        >
          Add Subject
        </button>
      </div>

      {/* Date */}
      <div>
        <label className="block font-medium mb-1">Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          required
        />
      </div>

      {/* Start / End Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-1">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            required
          />
        </div>
      </div>

      {/* Pages and Items */}
      <div>
        <label className="block font-medium mb-1">Pages read (optional)</label>
        <input
          type="number"
          min={0}
          value={pages ?? ''}
          onChange={(e) => setPages(Number(e.target.value))}
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Words/items memorized (optional)</label>
        <input
          type="number"
          min={0}
          value={items ?? ''}
          onChange={(e) => setItems(Number(e.target.value))}
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      {/* Attempts */}
      <div>
        <label className="block font-medium mb-1">Attempt count</label>
        <select
          value={attempt}
          onChange={(e) => setAttempt(Number(e.target.value))}
          className="border rounded px-3 py-2 w-full"
        >
          <option value={1}>1 (First time)</option>
          <option value={2}>2 (Review 1)</option>
          <option value={3}>3 (Review 2)</option>
          <option value={4}>4 (Review 3)</option>
        </select>
      </div>

      {/* Memo */}
      <div>
        <label className="block font-medium mb-1">Memo</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          rows={3}
        />
      </div>

      {/* AI Comment */}
      {isEditing && (
        <div>
          <label className="block font-medium mb-1">AI Comment</label>
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
