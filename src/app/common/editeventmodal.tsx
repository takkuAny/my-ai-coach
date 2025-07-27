'use client';

import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

interface Subject {
  id: string;
  name: string;
  category: {
    name: string;
    color: string;
  };
}

interface ScheduleEvent {
  id: string;
  date: string;
  pages?: number;
  items?: number;
  memo?: string;
  subject: {
    id: string;
    name: string;
    category: {
      name: string;
      color: string;
    };
  };
  start_time?: string | null;
  end_time?: string | null;
}

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (form: {
    subjectId: string;
    date: string;
    startTime: string;
    endTime: string;
    pages?: number;
    items?: number;
    memo?: string;
  }) => void;
  onDeleteRequest: () => void;
  subjects: Subject[];
  subjectId: string;
  setSubjectId: (id: string) => void;
  selectedEvent: ScheduleEvent;
}

export default function EditEventModal({
  isOpen,
  onClose,
  onUpdate,
  onDeleteRequest,
  subjects,
  subjectId,
  setSubjectId,
  selectedEvent,
}: EditEventModalProps) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [pages, setPages] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<number | undefined>(undefined);
  const [memo, setMemo] = useState<string>("");

  useEffect(() => {
    if (selectedEvent) {
      setDate(selectedEvent.date);
      setStartTime(selectedEvent.start_time?.slice(0, 5) ?? ''); // "HH:MM"
      setEndTime(selectedEvent.end_time?.slice(0, 5) ?? '');
      setPages(selectedEvent.pages ?? undefined);
      setItems(selectedEvent.items ?? undefined);
      setMemo(selectedEvent.memo ?? '');
      setSubjectId(selectedEvent.subject.id);
    }
  }, [selectedEvent, setSubjectId]);

  const handleUpdate = () => {
    if (!date || !subjectId) return;
    onUpdate({
      subjectId,
      date,
      startTime,
      endTime,
      pages,
      items,
      memo,
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <DialogPanel className="bg-white p-6 rounded shadow-md w-full max-w-md">
          <DialogTitle className="text-lg font-bold mb-4">イベントを編集</DialogTitle>

          <label className="block mb-2">
            学習対象:
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full mt-1 p-2 border rounded"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}（{s.category.name}）
                </option>
              ))}
            </select>
          </label>

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
              value={pages ?? ""}
              onChange={(e) => setPages(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full mt-1 p-2 border rounded"
            />
          </label>

          <label className="block mb-2">
            項目数:
            <input
              type="number"
              value={items ?? ""}
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

          <div className="flex justify-between">
            <button
              onClick={handleUpdate}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              更新
            </button>
            <button
              onClick={onDeleteRequest}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              削除
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
  );
}
