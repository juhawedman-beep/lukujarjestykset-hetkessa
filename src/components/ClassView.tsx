import { useMemo, useState, useCallback } from 'react';
import type { TimetableEntry, Subject, SchoolClass, Room, TimeSlot, Teacher } from '@/types/timetable';
import { DAYS_FI, DAYS_FULL_FI } from '@/types/timetable';
import { validateTimetable } from '@/lib/timetableValidation';
import { AlertTriangle, XCircle, ChevronDown, ChevronUp, Lightbulb, GripVertical, Users, Wand2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ClassViewProps {
  entries: TimetableEntry[];
  subjects: Subject[];
  classes: SchoolClass[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  teachers: Teacher[];
  onMoveEntry?: (entryId: string, newDay: number, newPeriod: number) => void;
  onEntryClick?: (entryId: string) => void;
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

export default function ClassView({ entries, subjects, classes, rooms, timeSlots, teachers, onMoveEntry, onEntryClick }: ClassViewProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? '');
  const [expandedWarnings, setExpandedWarnings] = useState<Set<number>>(new Set());
  const [draggedEntry, setDraggedEntry] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  const roomMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);
  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

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

  const gapCells = useMemo(() => {
    const gaps = new Set<string>();
    for (let day = 1; day <= 5; day++) {
      const dayEntries = classEntries.filter(e => e.dayOfWeek === day);
      if (dayEntries.length === 0) continue;
      const periods = dayEntries.map(e => e.period).sort((a, b) => a - b);
      const first = periods[0];
      const last = periods[periods.length - 1];
      for (let p = first + 1; p < last; p++) {
        if (!periods.includes(p)) gaps.add(`${day}-${p}`);
      }
    }
    return gaps;
  }, [classEntries]);

  const toggleWarning = (idx: number) => {
    setExpandedWarnings(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Drag & drop handlers
  const handleDragStart = useCallback((entryId: string) => {
    setDraggedEntry(entryId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, day: number, period: number) => {
    e.preventDefault();
    setDragOverCell(`${day}-${period}`);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCell(null);
  }, []);

  const handleDrop = useCallback((day: number, period: number) => {
    if (draggedEntry && onMoveEntry) {
      onMoveEntry(draggedEntry, day, period);
    }
    setDraggedEntry(null);
    setDragOverCell(null);
  }, [draggedEntry, onMoveEntry]);

  const handleDragEnd = useCallback(() => {
    setDraggedEntry(null);
    setDragOverCell(null);
  }, []);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="space-y-6 animate-fade-in" role="region" aria-label="Luokkakohtainen lukujärjestys">
      {/* Class selector */}
      <div className="flex items-center gap-3 flex-wrap" role="tablist" aria-label="Valitse luokka">
        <span className="text-sm font-medium text-muted-foreground" id="class-selector-label">Luokka:</span>
        {classes.map(cls => {
          const counts = warningCountByClass.get(cls.id);
          const hasErrors = (counts?.errors ?? 0) > 0;
          const hasWarnings = (counts?.warnings ?? 0) > 0;
          const isSelected = cls.id === selectedClassId;
          const totalWarnings = (counts?.errors ?? 0) + (counts?.warnings ?? 0);
          return (
            <button
              key={cls.id}
              role="tab"
              aria-selected={isSelected}
              aria-label={`Luokka ${cls.name}${totalWarnings > 0 ? `, ${totalWarnings} varoitusta` : ''}`}
              onClick={() => setSelectedClassId(cls.id)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border hover:bg-muted text-foreground'
              }`}
            >
              {cls.name}
              {(hasErrors || hasWarnings) && (
                <span
                  className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    hasErrors ? 'bg-destructive text-destructive-foreground' : 'bg-subject-math text-primary-foreground'
                  }`}
                  aria-hidden="true"
                >
                  {totalWarnings}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Warnings panel */}
      {classWarnings.length > 0 && (
        <div className="space-y-2" role="alert" aria-label={`${classWarnings.length} varoitusta luokalle ${selectedClass?.name}`}>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-subject-math" aria-hidden="true" />
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
                aria-expanded={expandedWarnings.has(idx)}
                aria-label={`${w.severity === 'error' ? 'Virhe' : 'Varoitus'}: ${w.message}`}
                className="w-full flex items-start gap-2 text-left focus:outline-none focus:ring-2 focus:ring-ring rounded"
              >
                {w.severity === 'error' ? (
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-subject-math mt-0.5 shrink-0" aria-hidden="true" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{w.message}</p>
                </div>
                {expandedWarnings.has(idx) ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                )}
              </button>
              {expandedWarnings.has(idx) && (
                <div className="mt-3 ml-6 space-y-2 animate-fade-in">
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 border border-border">
                    <span className="font-semibold">📜 Lainkohta:</span> {w.lawReference}
                  </div>
                  {w.suggestion && (
                    <div className="text-xs bg-accent/10 text-accent-foreground rounded p-2 border border-accent/20 flex items-start gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" aria-hidden="true" />
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
        <div className="rounded-lg border border-subject-sports/30 bg-subject-sports/5 p-3 flex items-center gap-2" role="status">
          <span className="text-subject-sports text-lg" aria-hidden="true">✓</span>
          <span className="text-sm text-foreground">Luokan {selectedClass.name} lukujärjestys täyttää lainsäädännön vaatimukset.</span>
        </div>
      )}

      {/* Drag hint */}
      {onMoveEntry && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
          Raahaa oppitunti toiseen soluun muokataksesi lukujärjestystä. Muutokset validoidaan automaattisesti.
        </p>
      )}

      {/* Timetable grid */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full border-collapse min-w-[700px]" role="grid" aria-label={`Luokan ${selectedClass?.name ?? ''} lukujärjestys`}>
          <thead>
            <tr>
              <th scope="col" className="w-20 p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                Tunti
              </th>
              {DAYS_FI.map((day, i) => (
                <th scope="col" key={i} className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                  <abbr title={DAYS_FULL_FI[i]}>{day}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(slot => (
              <tr key={slot.period}>
                <th scope="row" className="p-2 text-center border-b border-border bg-muted/30">
                  <div className="text-sm font-medium text-foreground">{slot.period}.</div>
                  <div className="text-xs text-muted-foreground font-mono">{slot.startTime}</div>
                </th>
                {[1, 2, 3, 4, 5].map(day => {
                  const key = `${day}-${slot.period}`;
                  const entry = grid.get(key);
                  const isGap = gapCells.has(key);
                  const isDragOver = dragOverCell === key;

                  if (isGap && !entry) {
                    return (
                      <td
                        key={day}
                        className="p-1.5 border-b border-border"
                        onDragOver={(e) => handleDragOver(e, day, slot.period)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(day, slot.period)}
                      >
                        <div
                          className={`h-16 rounded-md border-2 border-dashed border-destructive/40 bg-destructive/5 flex items-center justify-center ${isDragOver ? 'ring-2 ring-primary' : ''}`}
                          role="gridcell"
                          aria-label={`Hyppytunti ${DAYS_FULL_FI[day - 1]} tunti ${slot.period}`}
                        >
                          <span className="text-xs text-destructive font-medium">⚠ Hyppytunti</span>
                        </div>
                      </td>
                    );
                  }

                  if (!entry) {
                    return (
                      <td
                        key={day}
                        className="p-1.5 border-b border-border"
                        onDragOver={(e) => handleDragOver(e, day, slot.period)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(day, slot.period)}
                      >
                        <div
                          className={`h-16 rounded-md transition-all ${isDragOver ? 'bg-primary/10 ring-2 ring-primary ring-dashed' : ''}`}
                          role="gridcell"
                          aria-label={`Tyhjä, ${DAYS_FULL_FI[day - 1]} tunti ${slot.period}`}
                        />
                      </td>
                    );
                  }

                  const subject = subjectMap.get(entry.subjectId);
                  const room = roomMap.get(entry.roomId);
                  const teacher = teacherMap.get(entry.teacherId);
                  const colorClasses = subject ? categoryColorMap[subject.category] : categoryColorMap.free;
                  const isDragging = draggedEntry === entry.id;
                  const hasAdditional = (entry.additionalTeachers?.length ?? 0) > 0;

                  return (
                    <td
                      key={day}
                      className="p-1.5 border-b border-border"
                      onDragOver={(e) => handleDragOver(e, day, slot.period)}
                      onDragLeave={handleDragLeave}
                      onDrop={() => handleDrop(day, slot.period)}
                    >
                      <div
                        draggable={!!onMoveEntry}
                        onDragStart={() => handleDragStart(entry.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onEntryClick?.(entry.id)}
                        className={`h-16 rounded-md border p-2 flex flex-col justify-between transition-all ${
                          onMoveEntry ? 'cursor-grab active:cursor-grabbing' : onEntryClick ? 'cursor-pointer' : 'cursor-default'
                        } hover:scale-[1.02] hover:shadow-md ${colorClasses} ${isDragging ? 'opacity-40 scale-95' : ''} ${isDragOver ? 'ring-2 ring-primary' : ''}`}
                        role="gridcell"
                        aria-label={`${subject?.name ?? 'Tuntematon'}, ${teacher?.lastName ?? ''}, ${room?.name ?? ''}`}
                        tabIndex={0}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{subject?.abbreviation}</span>
                          <div className="flex items-center gap-1">
                            {hasAdditional && <Users className="w-3 h-3 opacity-60" />}
                            <span className="text-xs opacity-60">{teacher?.lastName}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs opacity-70 truncate">{room?.name}</span>
                          {hasAdditional && (
                            <span className="text-[10px] opacity-60">+{entry.additionalTeachers!.length}</span>
                          )}
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
    </div>
  );
}
