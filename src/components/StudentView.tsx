import { useMemo, useState } from 'react';
import type { TimetableEntry, Subject, SchoolClass, Room, TimeSlot, Teacher } from '@/types/timetable';
import TimetableGrid from '@/components/TimetableGrid';
import SubjectLegend from '@/components/SubjectLegend';
import { useStudents, useDeleteStudent } from '@/hooks/useStudents';
import AddStudentDialog from '@/components/AddStudentDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Search, GraduationCap, Users } from 'lucide-react';

interface StudentViewProps {
  entries: TimetableEntry[];
  subjects: Subject[];
  classes: SchoolClass[];
  rooms: Room[];
  teachers: Teacher[];
  timeSlots: TimeSlot[];
}

export default function StudentView({ entries, subjects, classes, rooms, teachers, timeSlots }: StudentViewProps) {
  const { data: students = [], isLoading } = useStudents();
  const deleteStudent = useDeleteStudent();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      classMap.get(s.classId)?.name.toLowerCase().includes(q)
    );
  }, [students, search, classMap]);

  const selected = useMemo(
    () => students.find(s => s.id === selectedId) ?? students[0] ?? null,
    [students, selectedId]
  );

  const studentClass = selected ? classMap.get(selected.classId) : undefined;

  const studentEntries = useMemo(() => {
    if (!selected) return [];
    return entries.filter(e => e.classId === selected.classId);
  }, [entries, selected]);

  const weeklyHours = studentEntries.length;

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="region" aria-label="Ei oppilaita">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <GraduationCap className="w-8 h-8 text-primary" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Ei oppilaita vielä</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Lisää oppilaita ja näe kunkin viikon lukujärjestys oman luokkansa pohjalta.
        </p>
        <AddStudentDialog />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" role="region" aria-label="Oppilaskohtainen lukujärjestys">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Student list sidebar */}
        <aside className="lg:w-72 shrink-0 space-y-3" aria-label="Oppilaslista">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4" aria-hidden="true" />
              Oppilaat ({students.length})
            </h3>
            <AddStudentDialog />
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Hae nimellä tai luokalla..."
              className="pl-8 h-9 text-sm"
              aria-label="Hae oppilasta"
            />
          </div>
          <div className="bg-card border border-border rounded-lg max-h-[60vh] overflow-y-auto" role="listbox" aria-label="Oppilaat">
            {isLoading && <p className="p-3 text-xs text-muted-foreground">Ladataan…</p>}
            {!isLoading && filtered.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">Ei tuloksia.</p>
            )}
            {filtered.map(s => {
              const cls = classMap.get(s.classId);
              const isActive = selected?.id === s.id;
              return (
                <div
                  key={s.id}
                  className={`group flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0 cursor-pointer transition-colors ${
                    isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
                  }`}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={0}
                  onClick={() => setSelectedId(s.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(s.id); } }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-muted-foreground">{cls?.name ?? 'Ei luokkaa'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    onClick={e => { e.stopPropagation(); deleteStudent.mutate(s.id); }}
                    aria-label={`Poista ${s.firstName} ${s.lastName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Student timetable */}
        <div className="flex-1 min-w-0 space-y-4" role="region" aria-label="Oppilaan viikkonäkymä">
          {selected && studentClass ? (
            <>
              <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selected.firstName} {selected.lastName}</h2>
                  <p className="text-sm text-muted-foreground">
                    Luokka <span className="font-medium text-foreground">{studentClass.name}</span> · {weeklyHours} oppituntia/viikko
                  </p>
                </div>
                {selected.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 max-w-xs truncate" title={selected.notes}>
                    {selected.notes}
                  </p>
                )}
              </div>

              <SubjectLegend />

              <TimetableGrid
                entries={studentEntries}
                subjects={subjects}
                classes={classes}
                rooms={rooms}
                teachers={teachers}
                timeSlots={timeSlots}
                title={`${selected.firstName} ${selected.lastName} – ${studentClass.name}`}
              />
            </>
          ) : selected && !studentClass ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
              Oppilaan luokkaa ei löydy. Tarkista, että luokka on yhä olemassa.
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Valitse oppilas listalta nähdäksesi viikon lukujärjestys.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
