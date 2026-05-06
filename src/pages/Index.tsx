// src/pages/Index.tsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GeneratorDialog from '@/components/GeneratorDialog';
import TimetableGrid from '@/components/TimetableGrid';
import { fetchAllData, seedDemoDataIfEmpty, saveTimetableEntries } from '@/lib/timetableData';
import type { Teacher, SchoolClass, Subject, Room, TimetableEntry } from '@/types/timetable';
import { toast } from '@/hooks/use-toast';
import { Wand2, RefreshCw } from 'lucide-react';

export default function Index() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerated = async (newEntries: TimetableEntry[]) => {
    setTimetableEntries(newEntries);
    const success = await saveTimetableEntries(newEntries);
    if (success) {
      toast({ title: '✅ Lukujärjestys tallennettu Supabaseen' });
    }
  };

  const handleGridUpdate = (updatedEntries: TimetableEntry[]) => {
    setTimetableEntries(updatedEntries);
    // Voit tallentaa automaattisesti tai lisätä "Tallenna muutokset" -napin
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
          <h1 className="text-4xl font-display font-bold tracking-tight">Lukujärjestykset hetkessä</h1>
          <p className="text-primary-foreground/80 mt-1">Älykäs generointi + muokattava kalenteri</p>
        </div>
        <div className="flex gap-3">
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

      <TimetableGrid
        entries={timetableEntries}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        rooms={rooms}
        periodsPerDay={8}
        onUpdate={handleGridUpdate}
      />

      <div className="mt-8 text-center text-xs text-muted-foreground">
        Supabase • Drag & Drop • Kurre-vienti • Valmis testaukseen
      </div>
    </div>
  );
}
