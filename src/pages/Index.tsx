// src/pages/Index.tsx
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GeneratorDialog from '@/components/GeneratorDialog';
import TimetableGrid from '@/components/TimetableGrid';
import WellbeingIndex from '@/components/WellbeingIndex';
import { fetchAllData, seedDemoDataIfEmpty, saveTimetableEntries } from '@/lib/timetableData';
import type { Teacher, SchoolClass, Subject, Room, TimetableEntry } from '@/types/timetable';
import { toast } from '@/hooks/use-toast';
import { Wand2, RefreshCw, Save } from 'lucide-react';

export default function Index() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      await seedDemoDataIfEmpty();
      const data = await fetchAllData();
      setTeachers(data.teachers);
      setClasses(data.classes);
      setSubjects(data.subjects);
      setRooms(data.rooms);
    } catch (error) {
      console.error(error);
      toast({ title: 'Virhe', description: 'Datan lataus epäonnistui', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Automaattinen tallennus kun aikataulu muuttuu
  const autoSave = useCallback(async (entries: TimetableEntry[]) => {
    if (entries.length === 0) return;
    setSaving(true);
    const success = await saveTimetableEntries(entries);
    setSaving(false);
    if (!success) {
      toast({ title: 'Tallennusvirhe', description: 'Muutoksia ei pystytty tallentamaan', variant: 'destructive' });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // Tallennus debounce 800ms
  useEffect(() => {
    const timeout = setTimeout(() => autoSave(timetableEntries), 800);
    return () => clearTimeout(timeout);
  }, [timetableEntries, autoSave]);

  const handleGenerated = (newEntries: TimetableEntry[]) => {
    setTimetableEntries(newEntries);
    toast({ title: '✅ Lukujärjestys generoitu ja tallennettu' });
  };

  const handleGridUpdate = (updatedEntries: TimetableEntry[]) => {
    setTimetableEntries(updatedEntries);
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Lukujärjestykset hetkessä</h1>
          <p className="text-muted-foreground">Automaattinen tallennus Supabaseen aktiivinen</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Päivitä data
          </Button>
          <GeneratorDialog
            classes={classes}
            teachers={teachers}
            subjects={subjects}
            rooms={rooms}
            periodsPerDay={8}
            onGenerated={handleGenerated}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8">
          <TimetableGrid
            entries={timetableEntries}
            teachers={teachers}
            classes={classes}
            subjects={subjects}
            rooms={rooms}
            periodsPerDay={8}
            onUpdate={handleGridUpdate}
          />
        </div>

        <div className="xl:col-span-4 space-y-6">
          <WellbeingIndex
            entries={timetableEntries}
            teachers={teachers}
            classes={classes}
          />

          {saving && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Save className="w-4 h-4 animate-pulse" />
              Tallennetaan muutoksia...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
