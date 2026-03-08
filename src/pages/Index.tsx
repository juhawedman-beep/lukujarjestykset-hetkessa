import { useState, useMemo } from 'react';
import { teachers, subjects, schoolClasses, rooms, timetableEntries } from '@/data/demoData';
import { DEFAULT_SETTINGS, generateTimeSlots } from '@/lib/timetableSettings';
import type { TimetableSettings } from '@/lib/timetableSettings';
import TimetableGrid from '@/components/TimetableGrid';
import TeacherSelector from '@/components/TeacherSelector';
import StatsBar from '@/components/StatsBar';
import SubjectLegend from '@/components/SubjectLegend';
import SettingsDialog from '@/components/SettingsDialog';
import ClassView from '@/components/ClassView';
import { GraduationCap, Calendar, User, Users } from 'lucide-react';

type ViewMode = 'teacher' | 'class';

export default function Index() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(teachers[0]?.id ?? null);
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_SETTINGS);
  const [viewMode, setViewMode] = useState<ViewMode>('teacher');

  const timeSlots = useMemo(() => generateTimeSlots(settings), [settings]);

  const selectedTeacher = useMemo(
    () => teachers.find(t => t.id === selectedTeacherId),
    [selectedTeacherId]
  );

  const teacherEntries = useMemo(
    () => timetableEntries.filter(e => e.teacherId === selectedTeacherId && e.period <= settings.periodsPerDay),
    [selectedTeacherId, settings.periodsPerDay]
  );

  const filteredEntries = useMemo(
    () => timetableEntries.filter(e => e.period <= settings.periodsPerDay),
    [settings.periodsPerDay]
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

          {/* View tabs */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 ml-4">
            <button
              onClick={() => setViewMode('teacher')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'teacher'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Opettajat
            </button>
            <button
              onClick={() => setViewMode('class')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'class'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Luokat
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <SettingsDialog settings={settings} onSave={setSettings} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Kevät 2026 — Viikko 11</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'teacher' ? (
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
        ) : (
          <div className="space-y-6">
            <SubjectLegend />
            <ClassView
              entries={filteredEntries}
              subjects={subjects}
              classes={schoolClasses}
              rooms={rooms}
              timeSlots={timeSlots}
            />
          </div>
        )}
      </div>
    </div>
  );
}
