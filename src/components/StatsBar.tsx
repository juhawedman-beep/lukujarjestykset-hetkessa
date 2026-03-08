import type { TimetableEntry, Subject } from '@/types/timetable';
import { useMemo } from 'react';

interface StatsBarProps {
  entries: TimetableEntry[];
  subjects: Subject[];
}

export default function StatsBar({ entries, subjects }: StatsBarProps) {
  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);

  const stats = useMemo(() => {
    const totalLessons = entries.length;
    const daysActive = new Set(entries.map(e => e.dayOfWeek)).size;
    const uniqueClasses = new Set(entries.map(e => e.classId)).size;
    const subjectBreakdown = new Map<string, number>();
    entries.forEach(e => {
      const name = subjectMap.get(e.subjectId)?.abbreviation || '?';
      subjectBreakdown.set(name, (subjectBreakdown.get(name) || 0) + 1);
    });
    return { totalLessons, daysActive, uniqueClasses, subjectBreakdown };
  }, [entries, subjectMap]);

  return (
    <div className="grid grid-cols-3 gap-3 animate-fade-in">
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-2xl font-bold text-foreground">{stats.totalLessons}</div>
        <div className="text-xs text-muted-foreground mt-1">Oppituntia / vko</div>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-2xl font-bold text-foreground">{stats.daysActive}</div>
        <div className="text-xs text-muted-foreground mt-1">Opetuspäivää</div>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-2xl font-bold text-foreground">{stats.uniqueClasses}</div>
        <div className="text-xs text-muted-foreground mt-1">Ryhmää</div>
      </div>
    </div>
  );
}
