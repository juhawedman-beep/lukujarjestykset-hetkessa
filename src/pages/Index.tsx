// src/pages/Index.tsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import GeneratorDialog from '@/components/GeneratorDialog';
import TimetableGrid from '@/components/TimetableGrid';
import {
  useSubjects,
  useTeachers,
  useSchoolClasses,
  useRooms,
} from '@/hooks/useSchoolData';
import {
  useActiveTimetable,
  useTimetableEntries,
  useSaveTimetable,
} from '@/hooks/useTimetable';
import type { TimetableEntry } from '@/types/timetable';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Index() {
  const qc = useQueryClient();

  const subjectsQ = useSubjects();
  const teachersQ = useTeachers();
  const classesQ = useSchoolClasses();
  const roomsQ = useRooms();

  const activeTtQ = useActiveTimetable();
  const entriesQ = useTimetableEntries(activeTtQ.data?.id);
  const saveTimetable = useSaveTimetable();

  // Local working copy for drag-and-drop edits before saving.
  const [workingEntries, setWorkingEntries] = useState<TimetableEntry[]>([]);

  useEffect(() => {
    if (entriesQ.data) setWorkingEntries(entriesQ.data);
  }, [entriesQ.data]);

  const loading =
    subjectsQ.isLoading ||
    teachersQ.isLoading ||
    classesQ.isLoading ||
    roomsQ.isLoading ||
    activeTtQ.isLoading;

  const handleRefresh = () => {
    qc.invalidateQueries();
  };

  const handleGenerated = (newEntries: TimetableEntry[]) => {
    setWorkingEntries(newEntries);
    saveTimetable.mutate({ entries: newEntries });
  };

  const handleGridUpdate = (updatedEntries: TimetableEntry[]) => {
    setWorkingEntries(updatedEntries);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8 p-6 rounded-2xl bg-gradient-hero text-primary-foreground shadow-elegant">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight">
            Lukujärjestykset hetkessä
          </h1>
          <p className="text-primary-foreground/80 mt-1">
            Älykäs generointi + muokattava kalenteri
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Päivitä data
          </Button>
          <GeneratorDialog
            classes={classesQ.data ?? []}
            teachers={teachersQ.data ?? []}
            subjects={subjectsQ.data ?? []}
            rooms={roomsQ.data ?? []}
            periodsPerDay={8}
            onGenerated={handleGenerated}
          />
        </div>
      </div>

      <TimetableGrid
        entries={workingEntries}
        teachers={teachersQ.data ?? []}
        classes={classesQ.data ?? []}
        subjects={subjectsQ.data ?? []}
        rooms={roomsQ.data ?? []}
        periodsPerDay={8}
        onUpdate={handleGridUpdate}
      />

      <div className="mt-8 text-center text-xs text-muted-foreground">
        Lovable Cloud • Drag & Drop • Kurre-vienti • Valmis testaukseen
      </div>
    </div>
  );
}
