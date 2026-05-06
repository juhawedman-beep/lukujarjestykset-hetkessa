// src/pages/Index.tsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import GeneratorDialog from '@/components/GeneratorDialog';
import { fetchAllData, seedDemoDataIfEmpty } from '@/lib/timetableData';
import type { Teacher, SchoolClass, Subject, Room, TimetableEntry } from '@/types/timetable';
import { toast } from '@/hooks/use-toast';

export default function Index() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    await seedDemoDataIfEmpty(); // Seedaa demo-data jos tyhjä
    const data = await fetchAllData();
    setTeachers(data.teachers);
    setClasses(data.classes);
    setSubjects(data.subjects);
    setRooms(data.rooms);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerated = async (newEntries: TimetableEntry[]) => {
    setTimetableEntries(newEntries);
    const success = await saveTimetableEntries(newEntries); // tallenna Supabaseen
    if (success) {
      toast({ title: 'Lukujärjestys tallennettu', description: 'Data on nyt Supabasessa.' });
    }
  };

  if (loading) {
    return <div className="p-8">Ladataan tietokantaa...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Lukujärjestykset hetkessä</h1>
        <div className="flex gap-3">
          <Button onClick={loadData} variant="outline">
            Päivitä data
          </Button>
          <GeneratorDialog
            classes={classes}
            teachers={teachers}
            subjects={subjects}
            rooms={rooms}
            periodsPerDay={8} // muokkaa tarpeen mukaan
            onGenerated={handleGenerated}
          />
        </div>
      </div>

      {/* Tässä voit lisätä kalenterinäkymän myöhemmin */}
      <div className="bg-card p-6 rounded-2xl border">
        <h2 className="text-2xl font-semibold mb-4">Nykyinen lukujärjestys</h2>
        <p className="text-muted-foreground">
          Generoitu lukujärjestys näkyy täällä. (Drag & drop tulee seuraavaksi)
        </p>
        <pre className="mt-4 text-xs bg-muted p-4 rounded-xl overflow-auto">
          {timetableEntries.length} tuntia generoitu
        </pre>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        Opettajia: {teachers.length} | Luokkia: {classes.length} | Aineita: {subjects.length}
      </div>
    </div>
  );
}
