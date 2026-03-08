import { useMemo } from 'react';
import type { TimetableEntry, Subject, SchoolClass, Room, TimeSlot, SubjectCategory } from '@/types/timetable';
import { DAYS_FI } from '@/types/timetable';

interface TimetableGridProps {
  entries: TimetableEntry[];
  subjects: Subject[];
  classes: SchoolClass[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  title: string;
}

const categoryColorMap: Record<SubjectCategory, string> = {
  arts: 'bg-subject-arts/15 text-subject-arts border-subject-arts/30',
  sports: 'bg-subject-sports/15 text-subject-sports border-subject-sports/30',
  theory: 'bg-subject-theory/15 text-subject-theory border-subject-theory/30',
  languages: 'bg-subject-languages/15 text-subject-languages border-subject-languages/30',
  math: 'bg-subject-math/15 text-subject-math border-subject-math/30',
  science: 'bg-subject-science/15 text-subject-science border-subject-science/30',
  free: 'bg-subject-free/15 text-muted-foreground border-subject-free/30',
};

export default function TimetableGrid({ entries, subjects, classes, rooms, timeSlots, title }: TimetableGridProps) {
  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);
  const roomMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);

  const grid = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    entries.forEach(e => map.set(`${e.dayOfWeek}-${e.period}`, e));
    return map;
  }, [entries]);

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-semibold mb-4 text-foreground">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="w-20 p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                Tunti
              </th>
              {DAYS_FI.map((day, i) => (
                <th key={i} className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(slot => (
              <tr key={slot.period} className="group">
                <td className="p-2 text-center border-b border-border bg-muted/30">
                  <div className="text-sm font-medium text-foreground">{slot.period}.</div>
                  <div className="text-xs text-muted-foreground font-mono">{slot.startTime}</div>
                </td>
                {[1, 2, 3, 4, 5].map(day => {
                  const entry = grid.get(`${day}-${slot.period}`);
                  if (!entry) {
                    return (
                      <td key={day} className="p-1.5 border-b border-border">
                        <div className="h-16 rounded-md" />
                      </td>
                    );
                  }
                  const subject = subjectMap.get(entry.subjectId);
                  const cls = classMap.get(entry.classId);
                  const room = roomMap.get(entry.roomId);
                  const colorClasses = subject ? categoryColorMap[subject.category] : categoryColorMap.free;

                  return (
                    <td key={day} className="p-1.5 border-b border-border">
                      <div className={`h-16 rounded-md border p-2 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md cursor-default ${colorClasses}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{subject?.abbreviation}</span>
                          <span className="text-xs font-medium opacity-80">{cls?.name}</span>
                        </div>
                        <div className="text-xs opacity-70 truncate">{room?.name}</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
