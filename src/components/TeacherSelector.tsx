import type { Teacher, Subject } from '@/types/timetable';
import { useMemo } from 'react';

interface TeacherSelectorProps {
  teachers: Teacher[];
  subjects: Subject[];
  selectedTeacherId: string | null;
  onSelect: (id: string) => void;
}

export default function TeacherSelector({ teachers, subjects, selectedTeacherId, onSelect }: TeacherSelectorProps) {
  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">Opettajat</h3>
      {teachers.map(t => {
        const isSelected = t.id === selectedTeacherId;
        const subjectNames = t.subjects.map(sid => subjectMap.get(sid)?.abbreviation).filter(Boolean).join(', ');
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-muted text-foreground'
            }`}
          >
            <div className="font-medium">{t.lastName}, {t.firstName}</div>
            <div className={`text-xs mt-0.5 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              {subjectNames}
            </div>
          </button>
        );
      })}
    </div>
  );
}
