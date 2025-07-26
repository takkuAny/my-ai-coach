'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { isDueForReview, getReviewLabel } from '@/lib/utils/reviewschedule'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

export default function DashboardPage() {
  const [dueTasks, setDueTasks] = useState<any[]>([])
  const [aiComments, setAiComments] = useState<string[]>([])
  const [progressData, setProgressData] = useState<any[]>([])
  const [todoTasks, setTodoTasks] = useState<any[]>([])

  useEffect(() => {
    const fetchAll = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('ユーザー取得エラー:', userError)
        return
      }

      const userId = user.id
      await Promise.all([fetchStudyData(userId), fetchTodoTasks(userId)])
    }

    const fetchStudyData = async (userId: string) => {
      const { data, error } = await supabase
        .from('task_view_with_category')
        .select(`
          id,
          user_id,
          date,
          time,
          ai_comment,
          attempt_number,
          subject_name,
          category_name,
          category_color
        `)
        .eq('user_id', userId)
        .is('deleted_at', null)

      if (error || !data) {
        console.error('Error fetching tasks:', error)
        return
      }

      const due = data.filter((t) => isDueForReview(t.date, t.attempt_number))
      setDueTasks(due)

      const comments = data
        .filter((t) => t.ai_comment)
        .slice(-5)
        .map((t) => t.ai_comment)
      setAiComments(comments)

      const grouped: Record<string, number> = {}
      data.forEach((t) => {
        if (t.date && t.time) {
          grouped[t.date] = (grouped[t.date] || 0) + t.time
        }
      })

      const sorted = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([date, time]) => ({ date, time }))
      setProgressData(sorted)
    }

    const fetchTodoTasks = async (userId: string) => {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('schedule_with_subject')
        .select(`
          id,
          user_id,
          date,
          planned_pages,
          planned_items,
          memo,
          subject_id,
          subject_name,
          category_name,
          category_color,
          created_at
        `)
        .eq('user_id', userId)
        .eq('date', today)
        .is('deleted_at', null)
        .order('date', { ascending: true })

        console.log(data)
        console.log('今日は',today)
      if (error) {
        console.error('ToDo取得エラー:', error)
        return
      }

      setTodoTasks(data || [])
    }

    fetchAll()
  }, [])

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">📊 ダッシュボード</h1>

      {/* ✅ ToDo */}
      <section>
        <h2 className="text-lg font-semibold mb-2">✅ 今日の予定タスク（ToDo）</h2>
        {todoTasks.length === 0 ? (
          <p className="text-gray-500">📭 今日の予定はまだありません。</p>
        ) : (
          <ul className="space-y-2">
            {todoTasks.map((todo) => (
              <li key={todo.id} className="border p-3 rounded shadow-sm bg-white">
                <div className="text-sm text-muted-foreground">
                  🕒{' '}
                  {todo.start_time
                    ? new Date(`1970-01-01T${todo.start_time}`).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '未定'}
                </div>
                <div className="font-medium">{todo.subject_name ?? '（未設定）'}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 📌 復習タスク */}
      <section>
        <h2 className="text-lg font-semibold mb-2">📌 今日の復習タスク</h2>
        {dueTasks.length === 0 ? (
          <p className="text-gray-500">🔕 今日やるべき復習はありません。</p>
        ) : (
          <ul className="space-y-2">
            {dueTasks.map((task) => (
              <li key={task.id} className="border p-3 rounded shadow-sm">
                {task.subject_name}（{task.category_name}） - {getReviewLabel(task.attempt_number)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 📈 学習グラフ */}
      <section>
        <h2 className="text-lg font-semibold mb-2">📈 学習進捗（直近7日）</h2>
        {progressData.length === 0 ? (
          <p className="text-gray-500">📉 学習記録がありません。</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis unit="分" />
              <Tooltip />
              <Legend />
              <Bar dataKey="time" name="学習時間" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* 🧠 AIコメント */}
      <section>
        <h2 className="text-lg font-semibold mb-2">🧠 AIコメント集（直近）</h2>
        {aiComments.length === 0 ? (
          <p className="text-gray-500">🤖 コメントはまだありません。</p>
        ) : (
          <ul className="space-y-2 text-sm text-gray-700">
            {aiComments.map((comment, i) => (
              <li key={i} className="bg-gray-100 p-3 rounded border-l-4 border-blue-400">
                {comment}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
