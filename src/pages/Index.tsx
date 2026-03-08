import { useState, useMemo, useCallback, useRef } from 'react';
import { teachers, subjects, schoolClasses, rooms, timetableEntries as initialEntries } from '@/data/demoData';
import { DEFAULT_SETTINGS, generateTimeSlots } from '@/lib/timetableSettings';
import type { TimetableSettings } from '@/lib/timetableSettings';
import type { TimetableEntry } from '@/types/timetable';
import TimetableGrid from '@/components/TimetableGrid';
import TeacherSelector from '@/components/TeacherSelector';
import StatsBar from '@/components/StatsBar';
import SubjectLegend from '@/components/SubjectLegend';
import SettingsDialog from '@/components/SettingsDialog';
import ClassView from '@/components/ClassView';
import ConflictsPanel from '@/components/ConflictsPanel';
import PrintTimetable, { triggerPrint } from '@/components/PrintTimetable';
import { GraduationCap, Calendar, User, Users, AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewMode = 'teacher' | 'class' | 'conflicts';

export default function Index() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(teachers[0]?.id ?? null);
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_SETTINGS);
  const [viewMode, setViewMode] = useState<ViewMode>('teacher');
  const [entries, setEntries] = useState<TimetableEntry[]>(initialEntries);
  const [isPrinting, setIsPrinting] = useState(false);

  const timeSlots = useMemo(() => generateTimeSlots(settings), [settings]);

  const selectedTeacher = useMemo(
    () => teachers.find(t => t.id === selectedTeacherId),
    [selectedTeacherId]
  );

  const teacherEntries = useMemo(
    () => entries.filter(e => e.teacherId === selectedTeacherId && e.period <= settings.periodsPerDay),
    [entries, selectedTeacherId, settings.periodsPerDay]
  );

  const filteredEntries = useMemo(
    () => entries.filter(e => e.period <= settings.periodsPerDay),
    [entries, settings.periodsPerDay]
  );

  const title = selectedTeacher
    ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}`
    : 'Valitse opettaja';

  // Drag & drop: move an entry to a new day/period
  const handleMoveEntry = useCallback((entryId: string, newDay: number, newPeriod: number) => {
    setEntries(prev => {
      const entry = prev.find(e => e.id === entryId);
      if (!entry) return prev;
      // Check if target cell already has an entry for this class
      const targetEntry = prev.find(
        e => e.classId === entry.classId && e.dayOfWeek === newDay && e.period === newPeriod
      );
      if (targetEntry) {
        // Swap: move target entry to dragged entry's original position
        return prev.map(e => {
          if (e.id === entryId) return { ...e, dayOfWeek: newDay, period: newPeriod };
          if (e.id === targetEntry.id) return { ...e, dayOfWeek: entry.dayOfWeek, period: entry.period };
          return e;
        });
      }
      return prev.map(e => e.id === entryId ? { ...e, dayOfWeek: newDay, period: newPeriod } : e);
    });
  }, []);

  const handlePrint = useCallback(() => {
    setIsPrinting(true);
    setTimeout(() => {
      triggerPrint();
      setTimeout(() => setIsPrinting(false), 500);
    }, 100);
  }, []);

  const printEntityId = viewMode === 'teacher' ? (selectedTeacherId ?? '') : '';
  const printEntityName = viewMode === 'teacher' ? title : '';

  return (
    <div className="min-h-screen bg-background">
      {/* Print-only overlay */}
      {isPrinting && (
        <PrintTimetable
          entries={filteredEntries}
          subjects={subjects}
          classes={schoolClasses}
          rooms={rooms}
          teachers={teachers}
          timeSlots={timeSlots}
          mode={viewMode === 'teacher' ? 'teacher' : 'class'}
          entityId={printEntityId}
          entityName={printEntityName}
        />
      )}

      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 text-primary">
            <GraduationCap className="w-6 h-6" aria-hidden="true" />
            <h1 className="font-bold text-lg text-foreground">Lukujärjestys</h1>
          </div>

          {/* View tabs */}
          <nav className="flex items-center bg-muted rounded-lg p-0.5 ml-4" role="tablist" aria-label="Näkymän valinta">
            {([
              { mode: 'teacher' as ViewMode, icon: User, label: 'Opettajat' },
              { mode: 'class' as ViewMode, icon: Users, label: 'Luokat' },
              { mode: 'conflicts' as ViewMode, icon: AlertTriangle, label: 'Päällekkäisyydet' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                role="tab"
                aria-selected={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
                  viewMode === mode
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {(viewMode === 'teacher' && selectedTeacher) && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handlePrint}
                aria-label="Tulosta lukujärjestys"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Tulosta</span>
              </Button>
            )}
            <SettingsDialog settings={settings} onSave={setSettings} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Kevät 2026 — Viikko 11</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 no-print">
        {viewMode === 'teacher' && (
          <div className="flex gap-6">
            <aside className="w-64 shrink-0" aria-label="Opettajalista">
              <div className="sticky top-20 bg-card border border-border rounded-lg p-3 max-h-[calc(100vh-6rem)] overflow-y-auto">
                <TeacherSelector
                  teachers={teachers}
                  subjects={subjects}
                  selectedTeacherId={selectedTeacherId}
                  onSelect={setSelectedTeacherId}
                />
              </div>
            </aside>
            <div className="flex-1 min-w-0 space-y-6" role="tabpanel" aria-label="Opettajan lukujärjestys">
              {selectedTeacher && (
                <>
                  <StatsBar entries={teacherEntries} subjects={subjects} />
                  <SubjectLegend />
                  <TimetableGrid
                    entries={teacherEntries}
                    subjects={subjects}
                    classes={schoolClasses}
                    rooms={rooms}
                    timeSlots={timeSlots}
                    title={title}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {viewMode === 'class' && (
          <div className="space-y-6" role="tabpanel" aria-label="Luokkien lukujärjestykset">
            <SubjectLegend />
            <ClassView
              entries={filteredEntries}
              subjects={subjects}
              classes={schoolClasses}
              rooms={rooms}
              timeSlots={timeSlots}
              teachers={teachers}
              onMoveEntry={handleMoveEntry}
            />
          </div>
        )}

        {viewMode === 'conflicts' && (
          <div className="space-y-6" role="tabpanel" aria-label="Päällekkäisyyksien tarkistus">
            <h2 className="text-xl font-semibold text-foreground">Päällekkäisyyksien tarkistus</h2>
            <p className="text-sm text-muted-foreground">
              Tarkistaa automaattisesti onko sama opettaja tai tila merkitty kahdelle ryhmälle samaan aikaan.
            </p>
            <ConflictsPanel
              entries={filteredEntries}
              teachers={teachers}
              rooms={rooms}
            />
          </div>
        )}
      </main>
    </div>
  );
}
