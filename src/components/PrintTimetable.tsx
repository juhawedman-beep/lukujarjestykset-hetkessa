import type { TimetableEntry, Subject, SchoolClass, Room, TimeSlot, Teacher } from '@/types/timetable';
import { DAYS_FI, DAYS_FULL_FI } from '@/types/timetable';

interface PrintTimetableProps {
  entries: TimetableEntry[];
  subjects: Subject[];
  classes: SchoolClass[];
  rooms: Room[];
  teachers: Teacher[];
  timeSlots: TimeSlot[];
  mode: 'teacher' | 'class';
  entityId: string;
  entityName: string;
}

export default function PrintTimetable({
  entries, subjects, classes, rooms, teachers, timeSlots, mode, entityId, entityName
}: PrintTimetableProps) {
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const classMap = new Map(classes.map(c => [c.id, c]));
  const roomMap = new Map(rooms.map(r => [r.id, r]));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  const filteredEntries = mode === 'teacher'
    ? entries.filter(e => e.teacherId === entityId)
    : entries.filter(e => e.classId === entityId);

  const grid = new Map<string, TimetableEntry>();
  filteredEntries.forEach(e => grid.set(`${e.dayOfWeek}-${e.period}`, e));

  return (
    <div className="print-timetable p-8 bg-white text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-timetable, .print-timetable * { visibility: visible; }
          .print-timetable { position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: landscape; margin: 1cm; }
          .no-print { display: none !important; }
        }
        .print-timetable table { border-collapse: collapse; width: 100%; }
        .print-timetable th, .print-timetable td { 
          border: 1px solid #d1d5db; padding: 6px 8px; text-align: center; font-size: 12px;
        }
        .print-timetable th { background: #f3f4f6; font-weight: 600; }
        .print-timetable .cell-content { min-height: 40px; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
      `}</style>

      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
          {mode === 'teacher' ? 'Opettajan lukujärjestys' : 'Luokan lukujärjestys'}: {entityName}
        </h1>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
          Tulostettu {new Date().toLocaleDateString('fi-FI')}
        </p>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: '80px' }}>Tunti</th>
            {DAYS_FULL_FI.map((day, i) => (
              <th key={i}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(slot => (
            <tr key={slot.period}>
              <td>
                <div style={{ fontWeight: 600 }}>{slot.period}.</div>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>{slot.startTime}–{slot.endTime}</div>
              </td>
              {[1, 2, 3, 4, 5].map(day => {
                const entry = grid.get(`${day}-${slot.period}`);
                if (!entry) return <td key={day}><div className="cell-content" /></td>;

                const subject = subjectMap.get(entry.subjectId);
                const cls = classMap.get(entry.classId);
                const room = roomMap.get(entry.roomId);
                const teacher = teacherMap.get(entry.teacherId);

                return (
                  <td key={day}>
                    <div className="cell-content">
                      <div style={{ fontWeight: 600 }}>{subject?.abbreviation}</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>
                        {mode === 'teacher' ? cls?.name : `${teacher?.lastName}`} · {room?.name}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function triggerPrint() {
  window.print();
}
