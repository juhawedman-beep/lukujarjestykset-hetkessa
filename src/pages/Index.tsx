// src/pages/Index.tsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GeneratorDialog from '@/components/GeneratorDialog';
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
      await seedDemoDataIfEmpty();           // Lisää demo-data jos tietokanta on tyhjä
      const data = await fetchAllData();
      
      setTeachers(data.teachers);
      setClasses(data.classes);
      setSubjects(data.subjects);
      setRooms(data.rooms);
    } catch (error) {
      console.error('Virhe datan lataamisessa:', error);
      toast({
        title: 'Virhe',
        description: 'Datan lataaminen epäonnistui. Tarkista Supabase-yhteys.',
        variant: 'destructive',
      });
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
      toast({
        title: '✅ Lukujärjestys tallennettu',
        description: `${newEntries.length} tuntia tallennettu Supabaseen.`,
      });
    } else {
      toast({
        title: 'Varoitus',
        description: 'Lukujärjestys generoitiin, mutta tallennus epäonnistui.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Ladataan tietokantaa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Lukujärjestykset hetkessä</h1>
          <p className="text-muted-foreground mt-1">
            Älykäs lukujärjestyksen generointi suomalaisen koulun arkeen
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pääkortti */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Nykyinen lukujärjestys
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timetableEntries.length > 0 ? (
              <div className="space-y-4">
                <p className="text-green-600 font-medium">
                  ✅ {timetableEntries.length} tuntia generoitu onnistuneesti
                </p>
                <pre className="bg-muted p-4 rounded-xl text-xs overflow-auto max-h-96">
                  {JSON.stringify(timetableEntries.slice(0, 20), null, 2)}
                  {timetableEntries.length > 20 && '... (ja lisää)'}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Ei vielä generoitua lukujärjestystä</p>
                <p className="text-sm mt-2">Paina "Generoi lukujärjestys" -nappia yläpuolella</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tilastokortit */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-4xl font-bold text-primary">{teachers.length}</div>
              <div className="text-sm text-muted-foreground">Opettajaa</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-4xl font-bold">{classes.length}</div>
              <div className="text-sm text-muted-foreground">Luokkaa / ryhmää</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-4xl font-bold">{subjects.length}</div>
              <div className="text-sm text-muted-foreground">Ainetta</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-12 text-xs text-muted-foreground text-center">
        Supabase-yhteys aktiivinen • Demo-data käytössä • Kurre-vienti valmiina
      </div>
    </div>
  );
}// src/pages/Index.tsx
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
        <h1 className="text- 
