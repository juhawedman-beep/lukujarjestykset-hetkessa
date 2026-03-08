import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { teachers, subjects, schoolClasses, rooms as initialRooms, timetableEntries as initialEntries } from '@/data/demoData';
import { DEFAULT_SETTINGS, generateTimeSlots } from '@/lib/timetableSettings';
import type { TimetableSettings } from '@/lib/timetableSettings';
import type { TimetableEntry, AdditionalTeacher } from '@/types/timetable';
import AdditionalTeachersDialog from '@/components/AdditionalTeachersDialog';
import TimetableGrid from '@/components/TimetableGrid';
import TeacherSelector from '@/components/TeacherSelector';
import StatsBar from '@/components/StatsBar';
import SubjectLegend from '@/components/SubjectLegend';
import SettingsDialog from '@/components/SettingsDialog';
import ClassView from '@/components/ClassView';
import ConflictsPanel from '@/components/ConflictsPanel';
import RoomManagementDialog from '@/components/RoomManagementDialog';
import RoomView from '@/components/RoomView';
import WorkloadAnalysis from '@/components/WorkloadAnalysis';
import PrintTimetable, { triggerPrint } from '@/components/PrintTimetable';
import { GraduationCap, Calendar, User, Users, AlertTriangle, Printer, DoorOpen, BarChart3, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type ViewMode = 'teacher' | 'class' | 'rooms' | 'workload' | 'conflicts';

const VIEW_TABS: { mode: ViewMode; icon: typeof User; label: string }[] = [
  { mode: 'teacher', icon: User, label: 'Opettajat' },
  { mode: 'class', icon: Users, label: 'Luokat' },
  { mode: 'rooms', icon: DoorOpen, label: 'Tilat' },
  { mode: 'workload', icon: BarChart3, label: 'Kuormitus' },
  { mode: 'conflicts', icon: AlertTriangle, label: 'Tarkistukset' },
];

export default function Index() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(teachers[0]?.id ?? null);
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_SETTINGS);
  const [viewMode, setViewMode] = useState<ViewMode>('teacher');
  const [rooms, setRooms] = useState(initialRooms);
  const [entries, setEntries] = useState<TimetableEntry[]>(initialEntries);
  const [isPrinting, setIsPrinting] = useState(false);
  const undoStack = useRef<TimetableEntry[][]>([]);
  const redoStack = useRef<TimetableEntry[][]>([]);

  const pushUndo = useCallback((snapshot: TimetableEntry[]) => {
    undoStack.current = [...undoStack.current, snapshot];
    redoStack.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    setEntries(current => {
      redoStack.current = [...redoStack.current, current];
      return prev;
    });
    toast({ title: 'Kumottu', description: 'Edellinen muutos peruttu.' });
  }, []);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current[redoStack.current.length - 1];
    redoStack.current = redoStack.current.slice(0, -1);
    setEntries(current => {
      undoStack.current = [...undoStack.current, current];
      return next;
    });
    toast({ title: 'Palautettu', description: 'Muutos palautettu.' });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

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

  const handleMoveEntry = useCallback((entryId: string, newDay: number, newPeriod: number) => {
    setEntries(prev => {
      const entry = prev.find(e => e.id === entryId);
      if (!entry) return prev;
      pushUndo(prev);
      const targetEntry = prev.find(
        e => e.classId === entry.classId && e.dayOfWeek === newDay && e.period === newPeriod
      );
      if (targetEntry) {
        return prev.map(e => {
          if (e.id === entryId) return { ...e, dayOfWeek: newDay, period: newPeriod };
          if (e.id === targetEntry.id) return { ...e, dayOfWeek: entry.dayOfWeek, period: entry.period };
          return e;
        });
      }
      return prev.map(e => e.id === entryId ? { ...e, dayOfWeek: newDay, period: newPeriod } : e);
    });
  }, [pushUndo]);

  // Additional teachers dialog state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const editingEntry = useMemo(
    () => editingEntryId ? entries.find(e => e.id === editingEntryId) : null,
    [entries, editingEntryId]
  );

  const handleSaveAdditionalTeachers = useCallback((entryId: string, additionalTeachers: AdditionalTeacher[]) => {
    pushUndo(entries);
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, additionalTeachers } : e));
  }, [entries, pushUndo]);

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
          <div className="flex items-center gap-2 text-primary shrink-0">
            <GraduationCap className="w-6 h-6" aria-hidden="true" />
            <h1 className="font-bold text-lg text-foreground hidden sm:block">Lukujärjestys</h1>
          </div>

          <nav className="flex items-center bg-muted rounded-lg p-0.5 ml-2 overflow-x-auto" role="tablist" aria-label="Näkymän valinta">
            {VIEW_TABS.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                role="tab"
                aria-selected={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-ring ${
                  viewMode === mode
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleUndo} aria-label="Kumoa (Ctrl+Z)" title="Kumoa (Ctrl+Z)">
              <Undo2 className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRedo} aria-label="Tee uudelleen (Ctrl+Y)" title="Tee uudelleen (Ctrl+Y)">
              <Redo2 className="w-4 h-4" aria-hidden="true" />
            </Button>
            {viewMode === 'teacher' && selectedTeacher && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint} aria-label="Tulosta lukujärjestys">
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Tulosta</span>
              </Button>
            )}
            <SettingsDialog settings={settings} onSave={setSettings} />
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span>Kevät 2026</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 no-print">
        {viewMode === 'teacher' && (
          <div className="flex gap-6">
            <aside className="w-64 shrink-0" aria-label="Opettajalista">
              <div className="sticky top-20 bg-card border border-border rounded-lg p-3 max-h-[calc(100vh-6rem)] overflow-y-auto">
                <TeacherSelector teachers={teachers} subjects={subjects} selectedTeacherId={selectedTeacherId} onSelect={setSelectedTeacherId} />
              </div>
            </aside>
            <div className="flex-1 min-w-0 space-y-6" role="tabpanel" aria-label="Opettajan lukujärjestys">
              {selectedTeacher && (
                <>
                  <StatsBar entries={teacherEntries} subjects={subjects} />
                  <SubjectLegend />
                  <TimetableGrid entries={teacherEntries} subjects={subjects} classes={schoolClasses} rooms={rooms} timeSlots={timeSlots} title={title} teachers={teachers} onEntryClick={setEditingEntryId} />
                </>
              )}
            </div>
          </div>
        )}

        {viewMode === 'class' && (
          <div className="space-y-6" role="tabpanel" aria-label="Luokkien lukujärjestykset">
            <SubjectLegend />
            <ClassView entries={filteredEntries} subjects={subjects} classes={schoolClasses} rooms={rooms} timeSlots={timeSlots} teachers={teachers} onMoveEntry={handleMoveEntry} onEntryClick={setEditingEntryId} />
          </div>
        )}

        {viewMode === 'rooms' && (
          <div className="space-y-6" role="tabpanel" aria-label="Tilojen varauskalenteri">
            <RoomView entries={filteredEntries} subjects={subjects} classes={schoolClasses} rooms={rooms} timeSlots={timeSlots} teachers={teachers} />
          </div>
        )}

        {viewMode === 'workload' && (
          <div className="space-y-6" role="tabpanel" aria-label="Opettajien kuormitusanalyysi">
            <WorkloadAnalysis entries={filteredEntries} teachers={teachers} subjects={subjects} periodsPerDay={settings.periodsPerDay} />
          </div>
        )}

        {viewMode === 'conflicts' && (
          <div className="space-y-6" role="tabpanel" aria-label="Päällekkäisyyksien tarkistus">
            <h2 className="text-xl font-semibold text-foreground">Päällekkäisyyksien tarkistus</h2>
            <p className="text-sm text-muted-foreground">Tarkistaa automaattisesti opettaja- ja tilapäällekkäisyydet.</p>
            <ConflictsPanel entries={filteredEntries} teachers={teachers} rooms={rooms} />
          </div>
        )}
      </main>

      {editingEntry && (
        <AdditionalTeachersDialog
          entry={editingEntry}
          teachers={teachers}
          allEntries={entries}
          open={!!editingEntry}
          onClose={() => setEditingEntryId(null)}
          onSave={handleSaveAdditionalTeachers}
        />
      )}
    </div>
  );
}
