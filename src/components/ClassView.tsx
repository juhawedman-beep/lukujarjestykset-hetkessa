import { useMemo, useState } from 'react';
import type { TimetableEntry, Subject, SchoolClass, Room, TimeSlot } from '@/types/timetable';
import { DAYS_FI } from '@/types/timetable';
import { validateTimetable, type ValidationWarning } from '@/lib/timetableValidation';
import { AlertTriangle, XCircle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface ClassViewProps {
  entries: TimetableEntry[];
  subjects: Subject[];
  classes: SchoolClass[];
  rooms: Room[];
  timeSlots: TimeSlot[];
}

const categoryColorMap: Record<string, string> = {
  arts: 'bg-subject-arts/15 text-subject-arts border-subject-arts/30',
  sports: 'bg-subject-sports/15 text-subject-sports border-subject-sports/30',
  theory: 'bg-subject-theory/15 text-subject-theory border-subject-theory/30',
  languages: 'bg-subject-languages/15 text-subject-languages border-subject-languages/30',
  math: 'bg-subject-math/15 text-subject-math border-subject-math/30',
  science: 'bg-subject-science/15 text-subject-science border-subject-science/30',
  free: 'bg-subject-free/15 text-muted-foreground border-subject-free/30',
};

export default function ClassView({ entries, subjects, classes, rooms, timeSlots }: ClassViewProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? '');
  const [expandedWarnings, setExpandedWarnings] = useState<Set<number>>(new Set());

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  const roomMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);

  const classEntries = useMemo(
    () => entries.filter(e => e.classId === selectedClassId),
    [entries, selectedClassId]
  );

  const allWarnings = useMemo(
    () => validateTimetable(entries, classes),
    [entries, classes]
  );

  const classWarnings = useMemo(
    () => allWarnings.filter(w => w.classId === selectedClassId),
    [allWarnings, selectedClassId]
  );

  // Count warnings per class for badge display
  const warningCountByClass = useMemo(() => {
    const map = new Map<string, { errors: number; warnings: number }>();
    for (const cls of classes) {
      const cw = allWarnings.filter(w => w.classId === cls.id);
      map.set(cls.id, {
        errors: cw.filter(w => w.severity === 'error').length,
        warnings: cw.filter(w => w.severity === 'warning').length,
      });
    }
    return map;
  }, [allWarnings, classes]);

  const grid = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    classEntries.forEach(e => map.set(`${e.dayOfWeek}-${e.period}`, e));
    return map;
  }, [classEntries]);

  // Detect gap cells for highlighting
  const gapCells = useMemo(() => {
    const gaps = new Set<string>();
    for (let day = 1; day <= 5; day++) {
      const dayEntries = classEntries.filter(e => e.dayOfWeek === day);
      if (dayEntries.length === 0) continue;
      const periods = dayEntries.map(e => e.period).sort((a, b) => a - b);
      const first = periods[0];
      const last = periods[periods.length - 1];
      for (let p = first + 1; p < last; p++) {
        if (!periods.includes(p)) {
          gaps.add(`${day}-${p}`);
        }
      }
    }
    return gaps;
  }, [classEntries]);

  const toggleWarning = (idx: number) => {
    setExpandedWarnings(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Class selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Luokka:</span>
        {classes.map(cls => {
          const counts = warningCountByClass.get(cls.id);
          const hasErrors = (counts?.errors ?? 0) > 0;
          const hasWarnings = (counts?.warnings ?? 0) > 0;
          const isSelected = cls.id === selectedClassId;
          return (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border hover:bg-muted text-foreground'
              }`}
            >
              {cls.name}
              {(hasErrors || hasWarnings) && (
                <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  hasErrors ? 'bg-destructive text-destructive-foreground' : 'bg-subject-math text-primary-foreground'
                }`}>
                  {(counts?.errors ?? 0) + (counts?.warnings ?? 0)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Warnings panel */}
      {classWarnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-subject-math" />
            Lainsäädännön tarkistukset – {selectedClass?.name}
          </h3>
          {classWarnings.map((w, idx) => (
            <div
              key={idx}
              className={`rounded-lg border p-3 ${
                w.severity === 'error'
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-subject-math/30 bg-subject-math/5'
              }`}
            >
              <button
                onClick={() => toggleWarning(idx)}
                className="w-full flex items-start gap-2 text-left"
              >
                {w.severity === 'error' ? (
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-subject-math mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{w.message}</p>
                </div>
                {expandedWarnings.has(idx) ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {expandedWarnings.has(idx) && (
                <div className="mt-3 ml-6 space-y-2 animate-fade-in">
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 border border-border">
                    <span className="font-semibold">📜 Lainkohta:</span> {w.lawReference}
                  </div>
                  {w.suggestion && (
                    <div className="text-xs bg-accent/10 text-accent-foreground rounded p-2 border border-accent/20 flex items-start gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                      <span><span className="font-semibold">Optimointiehdotus:</span> {w.suggestion}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {classWarnings.length === 0 && selectedClass && (
        <div className="rounded-lg border border-subject-sports/30 bg-subject-sports/5 p-3 flex items-center gap-2">
          <span className="text-subject-sports text-lg">✓</span>
          <span className="text-sm text-foreground">Luokan {selectedClass.name} lukujärjestys täyttää lainsäädännön vaatimukset.</span>
        </div>
      )}

      {/* Timetable grid */}
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
              <tr key={slot.period}>
                <td className="p-2 text-center border-b border-border bg-muted/30">
                  <div className="text-sm font-medium text-foreground">{slot.period}.</div>
                  <div className="text-xs text-muted-foreground font-mono">{slot.startTime}</div>
                </td>
                {[1, 2, 3, 4, 5].map(day => {
                  const key = `${day}-${slot.period}`;
                  const entry = grid.get(key);
                  const isGap = gapCells.has(key);

                  if (isGap && !entry) {
                    return (
                      <td key={day} className="p-1.5 border-b border-border">
                        <div className="h-16 rounded-md border-2 border-dashed border-destructive/40 bg-destructive/5 flex items-center justify-center">
                          <span className="text-xs text-destructive font-medium">⚠ Hyppytunti</span>
                        </div>
                      </td>
                    );
                  }

                  if (!entry) {
                    return (
                      <td key={day} className="p-1.5 border-b border-border">
                        <div className="h-16 rounded-md" />
                      </td>
                    );
                  }

                  const subject = subjectMap.get(entry.subjectId);
                  const room = roomMap.get(entry.roomId);
                  const colorClasses = subject ? categoryColorMap[subject.category] : categoryColorMap.free;

                  return (
                    <td key={day} className="p-1.5 border-b border-border">
                      <div className={`h-16 rounded-md border p-2 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md cursor-default ${colorClasses}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{subject?.abbreviation}</span>
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
