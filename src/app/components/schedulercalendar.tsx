'use client'

import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

const events = [
  {
    title: '英語学習',
    start: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000), // 1時間後
  },
]

export function SchedulerCalendar() {
  return (
    <div className="p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
      />
    </div>
  )
}
