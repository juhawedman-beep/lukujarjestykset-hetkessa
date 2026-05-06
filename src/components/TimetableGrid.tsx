 // src/components/TimetableGrid.tsx
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import type { TimetableEntry, Teacher, SchoolClass, Subject, Room } from '@/types/timetable';
import { detectConflicts, type ConflictWarning } from '@/lib/timetableValidation';
import { cn } from '@/lib/utils';

interface TimetableGridProps {
  entries: TimetableEntry[];
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: Subject[];
  rooms: Room[];
  periodsPerDay: number;
  onUpdate: (newEntries: TimetableEntry[]) => void;
}

const DAYS = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'];

export default function TimetableGrid({
  entries,
  teachers,
  classes,
  subjects,
  rooms,
  periodsPerDay,
  onUpdate,
}: TimetableGridProps) {
  const [draggedEntry, setDraggedEntry] = useState<TimetableEntry | null>(null);

  // Calculate conflicts for current entries (memoized)
  const conflicts = useMemo<ConflictWarning[]>(
    () => detectConflicts(entries, teachers, rooms),
    [entries, teachers, rooms]
  );

  // Map entryId -> conflicts (for cell highlighting + tooltip)
  const conflictsByEntry = useMemo(() => {
    const map = new Map<string, ConflictWarning[]>();
    for (const c of conflicts) {
      for (const id of c.entryIds) {
        if (!map.has(id)) map.set(id, []);
        map.get(id)!.push(c);
      }
    }
    return map;
  }, [conflicts]);

  const errorCount = conflicts.filter(c => c.severity === 'error').length;

  const getTeacherName = (id: string) => {
    const t = teachers.find(t => t.id === id);
    return t ? `${t.firstName} ${t.lastName}` : id;
  };
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || id;
  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || id;
  const getRoomName = (id: string) => rooms.find(r => r.id === id)?.name || id;

  const handleDragStart = (e: React.DragEvent, entry: TimetableEntry) => {
    setDraggedEntry(entry);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = useCallback((e: React.DragEvent, day: number, period: number) => {
    e.preventDefault();
    if (!draggedEntry) return;

    const newEntries = entries.filter(e => e.id !== draggedEntry.id);
    const updatedEntry: TimetableEntry = { ...draggedEntry, dayOfWeek: day, period };
    newEntries.push(updatedEntry);

    onUpdate(newEntries);
    setDraggedEntry(null);
  }, [draggedEntry, entries, onUpdate]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const removeEntry = (id: string) => {
    onUpdate(entries.filter(e => e.id !== id));
  };

  return (
    <Card className="w-full shadow-card border-border/60">
      <CardHeader className="bg-gradient-subtle rounded-t-lg">
        <CardTitle className="flex items-center justify-between font-display">
          <span>Viikkokalenteri – raahaa tunteja vapaasti</span>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errorCount} konflikti{errorCount === 1 ? '' : 'a'}
              </Badge>
            )}
            <Badge variant="outline">{entries.length} tuntia</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-muted">
              <th className="p-3 border text-left w-32">Tunti / Päivä</th>
              {DAYS.map((day, i) => (
                <th key={i} className="p-3 border text-center font-medium">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: periodsPerDay }, (_, p) => (
              <tr key={p}>
                <td className="p-3 border font-medium text-center bg-muted/50">
                  {p + 1}. tunti
                </td>
                {DAYS.map((_, dayIndex) => {
                  const day = dayIndex + 1;
                  const slotEntries = entries.filter(e => e.dayOfWeek === day && e.period === p + 1);
                  const slotHasConflict = slotEntries.some(e => conflictsByEntry.has(e.id));

                  return (
                    <td
                      key={day}
                      className={cn(
                        "p-2 border min-h-[110px] align-top transition-colors",
                        slotHasConflict
                          ? "bg-conflict-soft hover:bg-conflict-soft"
                          : "hover:bg-muted/30"
                      )}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, day, p + 1)}
                    >
                      {slotEntries.map(entry => {
                        const entryConflicts = conflictsByEntry.get(entry.id);
                        const hasConflict = !!entryConflicts?.length;
                        return (
                        <div
                          key={entry.id}
                          draggable
                          onDragStart={e => handleDragStart(e, entry)}
                          title={entryConflicts?.map(c => c.message).join('\n')}
                          className={cn(
                            "border rounded-xl p-3 mb-2 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative",
                            hasConflict
                              ? "bg-conflict-soft border-conflict ring-2 ring-conflict/50 animate-pulse"
                              : "bg-card border-border"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {hasConflict ? (
                              <AlertTriangle className="w-4 h-4 text-conflict mt-0.5 flex-shrink-0" />
                            ) : (
                              <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">
                                {getClassName(entry.classId)} – {getSubjectName(entry.subjectId)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getTeacherName(entry.teacherId)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getRoomName(entry.roomId)}
                              </div>
                              {hasConflict && (
                                <div className="mt-1 text-xs text-conflict font-medium">
                                  {entryConflicts![0].type === 'teacher_conflict'
                                    ? 'Opettajan päällekkäisyys'
                                    : 'Tilan päällekkäisyys'}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 absolute top-2 right-2"
                              onClick={() => removeEntry(entry.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        );
                      })}

                      {slotEntries.length === 0 && (
                        <div className="h-20 flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-xl">
                          Tyhjä paikka – raahaa tähän
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
