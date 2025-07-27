'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { EventDropArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import '@fullcalendar/common/main.css';
import { supabase } from '@/lib/supabase/client';

import NewEventModal from '@/common/neweventmodal';
import EditEventModal from '@/common/editeventmodal';
import interactionPlugin from '@fullcalendar/interaction';
import { CustomTabs } from '@/components/ui/tabs';

interface Subject {
  id: string;
  name: string;
  category: {
    name: string;
    color: string;
  };
}

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

type ModalScheduleEvent = {
  id: string;
  date: string;
  pages?: number;
  items?: number;
  memo?: string;
  start_time?: string | null;
  end_time?: string | null;
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

export default function Page() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [calendarKey, setCalendarKey] = useState(0);
  const [editDate, setEditDate] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string | undefined>();
  const [selectedEndTime, setSelectedEndTime] = useState<string | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<ModalScheduleEvent | null>(null);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tab, setTab] = useState<'todo' | '24h'>('24h');
  const is24HMode = true;
  const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

  const fetchSubjects = async (): Promise<Subject[]> => {
    const { data, error } = await supabase.from('subject_with_category').select('*');
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

  const fetchEvents = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('schedule_with_subject')
      .select('*')
      .eq('user_id', userId);

    if (!error && data) {
      const formatted = (data as RawScheduleFromView[]).map((item) => {
        const hasTime = item.start_time !== null;

        return {
          id: item.id,
          title: item.subject_name ?? 'Unspecified',
          start: hasTime ? `${item.date}T${item.start_time}` : item.date,
          end: hasTime && item.end_time ? `${item.date}T${item.end_time}` : undefined,
          allDay: !hasTime,
          backgroundColor: item.category_color ?? '#999',
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
        };
      });
      setEvents(formatted);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchSubjects().then(setSubjects);
  }, [fetchEvents]);

  const handleDateClick = (arg: any) => {
    const clickedDate = new Date(arg.date);
    const hours = String(clickedDate.getHours()).padStart(2, '0');
    const minutes = String(clickedDate.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    setSelectedDate(arg.dateStr);
    setSelectedStartTime(timeStr);
    setSelectedEndTime(undefined);
    setIsNewModalOpen(true);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const { event } = info;
    const id = event.id;
    const newStart = event.start;
    const newEnd = event.end;

    if (!newStart) {
      alert('Could not get start time.');
      info.revert();
      return;
    }

    const newDate = newStart.toLocaleDateString('sv-SE');

    let updateData: {
      date: string;
      start_time: string | null;
      end_time: string | null;
    };

    if (event.allDay) {
      updateData = {
        date: newDate,
        start_time: null,
        end_time: null,
      };
    } else {
      const newStartTime = newStart.toTimeString().slice(0, 5);
      const newEndTime = newEnd ? newEnd.toTimeString().slice(0, 5) : null;
      updateData = {
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      };
    }

    const { error } = await supabase.from('schedules').update(updateData).eq('id', id);

    if (error) {
      alert('Failed to update event.');
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

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Scheduler</h2>
        <CustomTabs tab={tab} setTab={setTab} />
      </div>

      <FullCalendar
        key={calendarKey}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={tab === '24h' ? 'timeGridWeek' : 'dayGridMonth'}
        allDaySlot={true}
        events={events}
        slotMinTime="06:00:00"
        slotMaxTime="30:00:00"
        dateClick={handleDateClick}
        editable={true}
        selectable={true}
        timeZone="local"
        eventDrop={handleEventDrop}
        eventClick={(info) => {
          const fullData = info.event.extendedProps.raw;
          const modalEvent: ModalScheduleEvent = {
            id: info.event.id,
            date: fullData.date,
            pages: fullData.planned_pages,
            items: fullData.planned_items,
            memo: fullData.memo,
            subject: fullData.subject,
            start_time: fullData.start_time,
            end_time: fullData.end_time,
          };

          setSelectedEvent(modalEvent);
          setSubjectId(fullData.subject.id);
          setEditDate(fullData.date);
          setIsEditModalOpen(true);
        }}
      />

      <NewEventModal
        selectedDate={selectedDate}
        selectedStartTime={selectedStartTime}
        selectedEndTime={selectedEndTime}
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onAdded={(newEvent) => {
          const hasTime = newEvent.start_time !== null;
          const matchedSubject = subjects.find((s) => s.id === newEvent.subject_id);

          const formattedEvent = {
            id: newEvent.id,
            title: matchedSubject?.name ?? 'Unspecified',
            start: hasTime ? `${newEvent.date}T${newEvent.start_time}` : newEvent.date,
            end: hasTime && newEvent.end_time ? `${newEvent.date}T${newEvent.end_time}` : undefined,
            allDay: !hasTime,
            backgroundColor: matchedSubject?.category.color ?? '#999',
            raw: {
              id: newEvent.id,
              date: newEvent.date,
              start_time: newEvent.start_time,
              end_time: newEvent.end_time,
              planned_pages: newEvent.planned_pages ?? undefined,
              planned_items: newEvent.planned_items ?? undefined,
              memo: newEvent.memo ?? undefined,
              subject: {
                id: newEvent.subject_id,
                name: matchedSubject?.name ?? '',
                category: {
                  name: matchedSubject?.category.name ?? '',
                  color: matchedSubject?.category.color ?? '#999',
                },
              },
            },
          };

          setEvents((prev) => [...prev, formattedEvent]);
          setCalendarKey((prev) => prev + 1);
        }}
        subjects={subjects}
        subjectId={subjectId}
        setSubjectId={setSubjectId}
        is24HMode={is24HMode}
        onSubjectRefresh={refreshSubjects}
      />

      {selectedEvent && (
        <EditEventModal
          isOpen={isEditModalOpen}
          subjects={subjects}
          subjectId={subjectId}
          setSubjectId={setSubjectId}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={async (form) => {
            if (!selectedEvent) return;
            const { subjectId, date, pages, items, memo, startTime, endTime } = form;

            const updatePayload: any = {
              subject_id: subjectId,
              date,
              planned_pages: pages ?? null,
              planned_items: items ?? null,
              memo,
              start_time: startTime !== '' ? startTime : null,
              end_time: endTime !== '' ? endTime : null,
            };

            const { error } = await supabase
              .from('schedules')
              .update(updatePayload)
              .eq('id', selectedEvent.id);

            if (error) {
              alert('Failed to update: ' + error.message);
            } else {
              await fetchEvents();
              setCalendarKey((prev) => prev + 1);
              setIsEditModalOpen(false);
            }
          }}
          onDeleteRequest={async () => {
            if (!selectedEvent) return;
            const { error } = await supabase
              .from('schedules')
              .delete()
              .eq('id', selectedEvent.id);
            if (error) {
              alert('Failed to delete: ' + error.message);
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
