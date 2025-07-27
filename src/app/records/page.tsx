'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'

interface RecordItem {
  id: string
  date: string
  memo: string
  start_time: string
  end_time: string
  subject_name: string
  category_name: string | null
  category_color: string | null
}

export default function RecordListPage() {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [filtered, setFiltered] = useState<RecordItem[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [categories, setCategories] = useState<{ name: string; color: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const [sortKey, setSortKey] = useState<'date' | 'category' | 'subject' | 'memo' | 'time'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const fetchRecords = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setAuthError('No login session found. Please sign in.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('task_view_with_category')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) {
        console.error(error)
      } else if (data) {
        setRecords(data)
        setFiltered(data)
        extractCategories(data)
      }

      setLoading(false)
    }

    fetchRecords()
  }, [])

  const extractCategories = (data: RecordItem[]) => {
    const cats = Array.from(
      new Set(
        data.map((item) =>
          JSON.stringify({ name: item.category_name, color: item.category_color })
        )
      )
    ).map((str) => JSON.parse(str))
    setCategories(cats.filter((c: any) => c.name))
  }

  const calcMinutes = (start: string, end: string) => {
    const t1 = new Date(`1970-01-01T${start}Z`).getTime()
    const t2 = new Date(`1970-01-01T${end}Z`).getTime()
    return Math.floor((t2 - t1) / 1000 / 60)
  }

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const sortRecords = (data: RecordItem[]) => {
    return [...data].sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

      switch (sortKey) {
        case 'date':
          aValue = a.date
          bValue = b.date
          break
        case 'category':
          aValue = a.category_name ?? ''
          bValue = b.category_name ?? ''
          break
        case 'subject':
          aValue = a.subject_name ?? ''
          bValue = b.subject_name ?? ''
          break
        case 'memo':
          aValue = a.memo ?? ''
          bValue = b.memo ?? ''
          break
        case 'time':
          aValue = calcMinutes(a.start_time, a.end_time)
          bValue = calcMinutes(b.start_time, b.end_time)
          break
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }

  useEffect(() => {
    const textMatch = (text: string) => text.toLowerCase().includes(searchText.toLowerCase())
    const filteredData = records.filter((record) => {
      const categoryMatch =
        selectedCategory === 'All' || record.category_name === selectedCategory
      const memoMatch = textMatch(record.memo ?? '')
      const subjectMatch = textMatch(record.subject_name ?? '')
      return categoryMatch && (memoMatch || subjectMatch)
    })
    setFiltered(filteredData)
    setCurrentPage(1)
  }, [searchText, selectedCategory, records])

  const paginated = sortRecords(filtered).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  if (loading) return <div className="p-6">Loading...</div>
  if (authError) return <div className="p-6 text-red-600">{authError}</div>

  return (
    <main className="p-6 overflow-x-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Study Records</h1>
        <Link href="/records/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            ＋ New Record
          </Button>
        </Link>
      </div>

      {/* Filter */}
      <div className="flex flex-col md:flex-row md:items-center mb-4 gap-2">
        <select
          className="border rounded px-3 py-2"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option key="all" value="All">📂 All Categories</option>
          {categories.map((c) => (
            <option key={c.name} value={c.name}>
              📌 {c.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Search by keyword"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border px-3 py-2 rounded w-full md:w-72"
        />
      </div>

      <table className="w-full text-left border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 cursor-pointer" onClick={() => handleSort('date')}>Date {sortKey === 'date' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
            <th className="p-2 cursor-pointer" onClick={() => handleSort('category')}>Category {sortKey === 'category' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
            <th className="p-2 cursor-pointer" onClick={() => handleSort('subject')}>Subject {sortKey === 'subject' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
            <th className="p-2 cursor-pointer" onClick={() => handleSort('memo')}>Memo {sortKey === 'memo' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
            <th className="p-2 cursor-pointer" onClick={() => handleSort('time')}>Duration {sortKey === 'time' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((item) => (
            <tr key={item.id} className="border-t hover:bg-gray-100 cursor-pointer" onClick={() => (window.location.href = `/records/${item.id}`)}>
              <td className="p-2">{item.date}</td>
              <td className="p-2">
                <Badge style={{ backgroundColor: item.category_color ?? '#ccc' }}>
                  {item.category_name ?? '—'}
                </Badge>
              </td>
              <td className="p-2">{item.subject_name ?? '—'}</td>
              <td className="p-2">{item.memo}</td>
              <td className="p-2">{calcMinutes(item.start_time, item.end_time)} min</td>
              <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center items-center gap-2">
                  <Link
                    href={`/records/${item.id}`}
                    className="p-1 rounded hover:bg-blue-100 text-blue-600 transition"
                    title="Edit"
                  >
                    <Pencil className="w-5 h-5" strokeWidth={2} />
                  </Link>
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this record?')) {
                        const { error } = await supabase.from('tasks').delete().eq('id', item.id)
                        if (!error) {
                          setRecords((prev) => prev.filter((r) => r.id !== item.id))
                        } else {
                          alert('Failed to delete the record.')
                        }
                      }
                    }}
                    className="p-1 rounded hover:bg-red-100 text-red-600 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" strokeWidth={2} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center mt-4 text-sm">
        <span>
          {filtered.length === 0
            ? '0 records'
            : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(
                currentPage * itemsPerPage,
                filtered.length
              )} of ${filtered.length} records`}
        </span>
        <div className="space-x-2">
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </Button>
          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </main>
  )
}
