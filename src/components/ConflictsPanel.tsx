import { useMemo } from 'react';
import type { TimetableEntry, Teacher, Room } from '@/types/timetable';
import { detectConflicts, type ConflictWarning } from '@/lib/timetableValidation';
import { AlertTriangle, XCircle } from 'lucide-react';
import { DAYS_FI } from '@/types/timetable';

interface ConflictsPanelProps {
  entries: TimetableEntry[];
  teachers: Teacher[];
  rooms: Room[];
}

export default function ConflictsPanel({ entries, teachers, rooms }: ConflictsPanelProps) {
  const conflicts = useMemo(
    () => detectConflicts(entries, teachers, rooms),
    [entries, teachers, rooms]
  );

  const teacherConflicts = conflicts.filter(c => c.type === 'teacher_conflict');
  const roomConflicts = conflicts.filter(c => c.type === 'room_conflict');

  if (conflicts.length === 0) {
    return (
      <div className="rounded-lg border border-subject-sports/30 bg-subject-sports/5 p-3 flex items-center gap-2">
        <span className="text-subject-sports text-lg" aria-hidden="true">✓</span>
        <span className="text-sm text-foreground">Ei päällekkäisyyksiä – kaikki opettajat ja tilat ovat vapaita merkityillä tunneilla.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="alert" aria-label="Päällekkäisyydet havaittu">
      {teacherConflicts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" aria-hidden="true" />
            Opettajapäällekkäisyydet ({teacherConflicts.length})
          </h3>
          {teacherConflicts.map((c, i) => (
            <ConflictCard key={`t-${i}`} conflict={c} />
          ))}
        </div>
      )}
      {roomConflicts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-subject-math" aria-hidden="true" />
            Tilapäällekkäisyydet ({roomConflicts.length})
          </h3>
          {roomConflicts.map((c, i) => (
            <ConflictCard key={`r-${i}`} conflict={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConflictCard({ conflict }: { conflict: ConflictWarning }) {
  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5"
      role="listitem"
    >
      <p className="text-sm font-medium text-foreground">{conflict.message}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold">📜 Peruste:</span> {conflict.lawReference}
      </p>
    </div>
  );
}
