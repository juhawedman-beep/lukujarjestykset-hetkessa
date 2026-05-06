// src/pages/Index.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GeneratorDialog from '@/components/GeneratorDialog';
import TimetableGrid from '@/components/TimetableGrid';
import WellbeingIndex from '@/components/WellbeingIndex';
import StatsBar from '@/components/StatsBar';
import ConflictsPanel from '@/components/ConflictsPanel';
import SubjectLegend from '@/components/SubjectLegend';
import WorkloadAnalysis from '@/components/WorkloadAnalysis';
import AddClassDialog from '@/components/AddClassDialog';
import AddTeacherDialog from '@/components/AddTeacherDialog';
import AddStudentDialog from '@/components/AddStudentDialog';
import SettingsDialog from '@/components/SettingsDialog';
import RoomManagementDialog from '@/components/RoomManagementDialog';
import WilmaImportDialog from '@/components/WilmaImportDialog';
import UserMenu from '@/components/UserMenu';
import ClassView from '@/components/ClassView';
import RoomView from '@/components/RoomView';
import StudentView from '@/components/StudentView';

import { useTeachers, useSchoolClasses, useSubjects, useRooms, QK } from '@/hooks/useSchoolData';
import { useActiveTimetable, useTimetableEntries, useSaveTimetable } from '@/hooks/useTimetable';
import { DEFAULT_SETTINGS, generateTimeSlots, type TimetableSettings } from '@/lib/timetableSettings';
import type { TimetableEntry } from '@/types/timetable';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Save, CalendarDays } from 'lucide-react';

export default function Index() {
  const qc = useQueryClient();
  const { data: teachers = [], isLoading: lT } = useTeachers();
  const { data: classes = [], isLoading: lC } = useSchoolClasses();
  const { data: subjects = [], isLoading: lS } = useSubjects();
  const { data: rooms = [], isLoading: lR } = useRooms();
  const { data: activeTimetable } = useActiveTimetable();
  const { data: persistedEntries = [] } = useTimetableEntries(activeTimetable?.id);
  const saveMutation = useSaveTimetable();

  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState('grid');

  const loading = lT || lC || lS || lR;
  const periodsPerDay = settings.periodsPerDay ?? 8;
  const timeSlots = useMemo(() => generateTimeSlots(settings), [settings]);

  // Lue tallennetut tunnit kun ne ladataan
  useEffect(() => {
    if (persistedEntries.length > 0 && timetableEntries.length === 0) {
      setTimetableEntries(persistedEntries);
    }
  }, [persistedEntries]);

  // Lue asetukset aktiivisesta lukujärjestyksestä
  useEffect(() => {
    if (activeTimetable?.settings) {
      try {
        const s = typeof activeTimetable.settings === 'string'
          ? JSON.parse(activeTimetable.settings)
          : activeTimetable.settings;
        setSettings({ ...DEFAULT_SETTINGS, ...s });
      } catch { /* ignore */ }
    }
  }, [activeTimetable]);

  // Auto-save (debounced)
  const autoSave = useCallback((entries: TimetableEntry[]) => {
    if (entries.length === 0) return;
    saveMutation.mutate({ entries });
  }, [saveMutation]);

  useEffect(() => {
    const t = setTimeout(() => autoSave(timetableEntries), 1000);
    return () => clearTimeout(t);
  }, [timetableEntries]); // eslint-disable-line

  const handleGenerated = (newEntries: TimetableEntry[]) => {
    setTimetableEntries(newEntries);
    toast({ title: '✅ Lukujärjestys generoitu' });
  };

  const handleGridUpdate = (updatedEntries: TimetableEntry[]) => {
    setTimetableEntries(updatedEntries);
  };

  const handleSaveSettings = (s: TimetableSettings) => {
    setSettings(s);
    toast({ title: 'Asetukset tallennettu' });
  };

  const handleSaveRooms = () => {
    qc.invalidateQueries({ queryKey: QK.rooms });
    toast({ title: 'Tilat päivitetty' });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight">Lukujärjestykset hetkessä</h1>
              <p className="text-xs text-muted-foreground hidden md:block">
                Automaattinen tallennus aktiivinen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveMutation.isPending && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Save className="w-3 h-3 animate-pulse" /> Tallennetaan…
              </span>
            )}
            <UserMenu />
          </div>
        </div>

        {/* Toolbar */}
        <div className="max-w-7xl mx-auto px-4 pb-3 flex flex-wrap items-center gap-2">
          <GeneratorDialog
            classes={classes}
            teachers={teachers}
            subjects={subjects}
            rooms={rooms}
            periodsPerDay={periodsPerDay}
            onGenerated={handleGenerated}
          />
          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
          <AddClassDialog variant="outline" />
          <AddTeacherDialog />
          <AddStudentDialog />
          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
          <RoomManagementDialog rooms={rooms} onSave={handleSaveRooms} />
          <SettingsDialog settings={settings} onSave={handleSaveSettings} />
          <WilmaImportDialog onImported={() => {
            qc.invalidateQueries({ queryKey: QK.classes });
            qc.invalidateQueries({ queryKey: QK.teachers });
            qc.invalidateQueries({ queryKey: QK.requirements });
          }} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <StatsBar entries={timetableEntries} subjects={subjects} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto">
            <TabsTrigger value="grid">Lukujärjestys</TabsTrigger>
            <TabsTrigger value="classes">Luokat</TabsTrigger>
            <TabsTrigger value="rooms">Tilat</TabsTrigger>
            <TabsTrigger value="students">Oppilaat</TabsTrigger>
            <TabsTrigger value="workload">Työkuorma</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="mt-4">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-9 space-y-4">
                <ConflictsPanel entries={timetableEntries} teachers={teachers} rooms={rooms} />
                <TimetableGrid
                  entries={timetableEntries}
                  teachers={teachers}
                  classes={classes}
                  subjects={subjects}
                  rooms={rooms}
                  periodsPerDay={periodsPerDay}
                  onUpdate={handleGridUpdate}
                />
              </div>
              <aside className="xl:col-span-3 space-y-4">
                <SubjectLegend />
                <WellbeingIndex entries={timetableEntries} teachers={teachers} classes={classes} />
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="classes" className="mt-4">
            <ClassView
              entries={timetableEntries}
              subjects={subjects}
              classes={classes}
              rooms={rooms}
              timeSlots={timeSlots}
              teachers={teachers}
              onMoveEntry={() => { /* read-only here */ }}
              onEntryClick={() => { /* noop */ }}
            />
          </TabsContent>

          <TabsContent value="rooms" className="mt-4">
            <RoomView
              entries={timetableEntries}
              subjects={subjects}
              classes={classes}
              rooms={rooms}
              timeSlots={timeSlots}
              teachers={teachers}
            />
          </TabsContent>

          <TabsContent value="students" className="mt-4">
            <StudentView
              entries={timetableEntries}
              subjects={subjects}
              classes={classes}
              rooms={rooms}
              teachers={teachers}
              timeSlots={timeSlots}
            />
          </TabsContent>

          <TabsContent value="workload" className="mt-4">
            <WorkloadAnalysis
              entries={timetableEntries}
              teachers={teachers}
              subjects={subjects}
              periodsPerDay={periodsPerDay}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
