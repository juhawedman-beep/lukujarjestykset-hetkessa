// src/components/TimetableGrid.tsx
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, GripVertical } from 'lucide-react';
import type { TimetableEntry, Teacher, SchoolClass, Subject, Room } from '@/types/timetable';

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

  // Konfliktien tunnistus (hyppytunnit + päällekkäisyydet)
  const conflicts = useMemo(() => {
    const classSchedule = new Map<string, number[]>();
    const teacherSchedule = new Map<string, number[]>();

    entries.forEach(entry => {
      const slotKey = entry.dayOfWeek * 10 + entry.period;

      // Luokan aikataulu
      if (!classSchedule.has(entry.classId)) classSchedule.set(entry.classId, []);
      classSchedule.get(entry.classId)!.push(slotKey);

      // Opettajan aikataulu
      if (!teacherSchedule.has(entry.teacherId)) teacherSchedule.set(entry.teacherId, []);
      teacherSchedule.get(entry.teacherId)!.push(slotKey);
    });

    const conflictSlots = new Set<string>();

    // Tarkista hyppytunnit luokalle
    for (const [classId, slots] of classSchedule) {
      slots.sort((a, b) => a - b);
      for (let i = 1; i < slots.length; i++) {
        const prevDay = Math.floor(slots[i-1] / 10);
        const currDay = Math.floor(slots[i] / 10);
        const prevPeriod = slots[i-1] % 10;
        const currPeriod = slots[i] % 10;

        if (prevDay === currDay && currPeriod > prevPeriod + 1) {
          conflictSlots.add(`${classId}-${slots[i]}`);
        }
      }
    }

    return conflictSlots;
  }, [entries]);

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

  const isConflict = (entry: TimetableEntry) => {
    const slotKey = `${entry.classId}-${entry.dayOfWeek * 10 + entry.period}`;
    return conflicts.has(slotKey);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Viikkokalenteri – raahaa tunteja
          <Badge variant="outline">{entries.length} tuntia</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[850px]">
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

                  return (
                    <td
                      key={day}
                      className="p-2 border min-h-[120px] align-top hover:bg-muted/30 transition-colors"
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, day, p + 1)}
                    >
                      {slotEntries.map(entry => {
                        const conflict = isConflict(entry);
                        return (
                          <div
                            key={entry.id}
                            draggable
                            onDragStart={e => handleDragStart(e, entry)}
                            className={`border-2 rounded-xl p-3 mb-2 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative ${
                              conflict 
                                ? 'border-red-500 bg-red-50 dark:bg-red-950/30' 
                                : 'border-border bg-card'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
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
                              </div>

                              {conflict && (
                                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                              )}

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
