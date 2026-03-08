import { useState, useMemo } from 'react';
import { teachers, subjects, schoolClasses, rooms, timetableEntries } from '@/data/demoData';
import { DEFAULT_SETTINGS, generateTimeSlots } from '@/lib/timetableSettings';
import type { TimetableSettings } from '@/lib/timetableSettings';
import TimetableGrid from '@/components/TimetableGrid';
import TeacherSelector from '@/components/TeacherSelector';
import StatsBar from '@/components/StatsBar';
import SubjectLegend from '@/components/SubjectLegend';
import SettingsDialog from '@/components/SettingsDialog';
import { GraduationCap, Calendar } from 'lucide-react';

export default function Index() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(teachers[0]?.id ?? null);
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_SETTINGS);

  const timeSlots = useMemo(() => generateTimeSlots(settings), [settings]);

  const selectedTeacher = useMemo(
    () => teachers.find(t => t.id === selectedTeacherId),
    [selectedTeacherId]
  );

  const teacherEntries = useMemo(
    () => timetableEntries.filter(e => e.teacherId === selectedTeacherId && e.period <= settings.periodsPerDay),
    [selectedTeacherId, settings.periodsPerDay]
  );

  const title = selectedTeacher
    ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}`
    : 'Valitse opettaja';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 text-primary">
            <GraduationCap className="w-6 h-6" />
            <span className="font-bold text-lg text-foreground">Lukujärjestys</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <SettingsDialog settings={settings} onSave={setSettings} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Kevät 2026 — Viikko 11</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="w-64 shrink-0">
            <div className="sticky top-20 bg-card border border-border rounded-lg p-3 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <TeacherSelector
                teachers={teachers}
                subjects={subjects}
                selectedTeacherId={selectedTeacherId}
                onSelect={setSelectedTeacherId}
              />
            </div>
          </aside>

          <main className="flex-1 min-w-0 space-y-6">
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
          </main>
        </div>
      </div>
    </div>
  );
}
