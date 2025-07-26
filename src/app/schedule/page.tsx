'use client';

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { EventDropArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import "@fullcalendar/common/main.css";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { supabase } from "@/lib/supabase/client";

import NewEventModal from "@/common/neweventmodal";
import EditEventModal from "@/common/editeventmodal";
// DeleteEventModal は未使用なら削除してOK
// import DeleteEventModal from "@/common/deleteeventmodal";

/* ---------- types ---------- */

interface Subject {
  id: string;
  name: string;
  category: {
    name: string;
    color: string;
  };
}

// DB から取り出して FullCalendar の extendedProps.raw に入れておく形
type RawScheduleFromView = {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  planned_pages?: number | null;
  planned_items?: number | null;
  memo?: string | null;
  subject_id: string;
  subject_name: string;
  category_name: string;
  category_color: string;
};

// EditEventModal に渡すためのイベント型（EditEventModal.tsx の ScheduleEvent と同じ形）
type ModalScheduleEvent = {
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
};

type RawSubject = {
  id: string;
  name: string;
  category_name: string;
  category_color: string;
};

/* ---------- component ---------- */

export default function Page() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [calendarKey, setCalendarKey] = useState(0);

  const [editDate, setEditDate] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ModalScheduleEvent | null>(null);

  const [allSubjects, setAllSubjects] = useState<any[]>([]); // NewEventModal で必要なら保持
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

  /* ---------- data fetchers ---------- */

  const fetchSubjects = async (): Promise<Subject[]> => {
    const { data, error } = await supabase.from("subject_with_category").select("*");
    if (error || !data) {
      console.error("学習対象の取得に失敗:", error?.message);
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

  const fetchEvents = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("schedule_with_subject")
      .select("*")
      .eq("user_id", userId);

    if (!error && data) {
      const formatted = (data as RawScheduleFromView[]).map((item) => ({
        id: item.id,
        title: item.subject_name ?? "未設定",
        date: item.date,
        allDay: true,
        backgroundColor: item.category_color ?? "#999",
        raw: {
          id: item.id,
          date: item.date,
          start_time: item.start_time,
          end_time: item.end_time,
          planned_pages: item.planned_pages ?? undefined,
          planned_items: item.planned_items ?? undefined,
          memo: item.memo ?? undefined,
          subject: {
            id: item.subject_id,
            name: item.subject_name,
            category: {
              name: item.category_name,
              color: item.category_color,
            },
          },
        },
      }));
      setEvents(formatted);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchSubjects().then(setSubjects);
  }, [fetchEvents]);

  /* ---------- handlers ---------- */

  const handleDateClick = (arg: DateClickArg) => {
    setSelectedDate(arg.dateStr);
    setIsNewModalOpen(true);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const { event } = info;
    const id = event.id;
    const newDate = event.startStr;

    const { error } = await supabase.from("schedules").update({ date: newDate }).eq("id", id);

    if (error) {
      alert("更新に失敗しました");
      info.revert();
    } else {
      await fetchEvents();
      setCalendarKey((prev) => prev + 1);
    }
  };

  const refreshSubjects = async () => {
    const loaded = await fetchSubjects();
    setSubjects(loaded);
  };

  /* ---------- render ---------- */

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">スケジューラー</h2>

      <FullCalendar
        key={calendarKey}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        eventClick={(info) => {
          const fullData = info.event.extendedProps.raw as {
            id: string;
            date: string;
            start_time: string | null;
            end_time: string | null;
            planned_pages?: number;
            planned_items?: number;
            memo?: string;
            subject: {
              id: string;
              name: string;
              category: {
                name: string;
                color: string;
              };
            };
          };

          const modalEvent: ModalScheduleEvent = {
            id: info.event.id,
            date: info.event.startStr,
            pages: fullData.planned_pages,
            items: fullData.planned_items,
            memo: fullData.memo,
            subject: fullData.subject,
          };

          setSelectedEvent(modalEvent);
          setSubjectId(fullData.subject.id);
          setEditDate(info.event.startStr);
          setIsEditModalOpen(true);
        }}
        selectable={true}
        editable={true}
        eventDrop={handleEventDrop}
      />

      {/* New */}
      <NewEventModal
        selectedDate={selectedDate}
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onAdded={(newEvent) => {
          setEvents([...events, newEvent]);
          setCalendarKey((prev) => prev + 1);
        }}
        subjects={subjects}
        subjectId={subjectId}
        setSubjectId={setSubjectId}
        allSubjects={allSubjects}
        onSubjectRefresh={refreshSubjects}
      />

      {/* Edit */}
      {selectedEvent && (
        <EditEventModal
          isOpen={isEditModalOpen}
          subjects={subjects}
          subjectId={subjectId}
          setSubjectId={setSubjectId}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={async (form) => {
            if (!selectedEvent) return;

            const { subjectId, date, pages, items, memo } = form;

            // schedules テーブルのカラム名が planned_* の場合はこちらに合わせる
            const { error } = await supabase
              .from("schedules")
              .update({
                subject_id: subjectId,
                date,
                planned_pages: pages ?? null,
                planned_items: items ?? null,
                memo,
              })
              .eq("id", selectedEvent.id);

            if (error) {
              alert("更新に失敗しました: " + error.message);
            } else {
              await fetchEvents();
              setCalendarKey((prev) => prev + 1);
              setIsEditModalOpen(false);
            }
          }}
          onDeleteRequest={async () => {
          if (!selectedEvent) return;

            const { error } = await supabase.from("schedules").delete().eq("id", selectedEvent.id);

            if (error) {
              alert("削除に失敗しました: " + error.message);
            } else {
              await fetchEvents();
              setCalendarKey((prev) => prev + 1);
              setIsEditModalOpen(false);
            }
          }}
          selectedEvent={selectedEvent}
        />
      )}
    </div>
  );
}
