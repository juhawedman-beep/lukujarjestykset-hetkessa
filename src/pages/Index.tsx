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
import { Wand2, RefreshCw, Save, Menu } from 'lucide-react';

export default function Index() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

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

  const autoSave = useCallback(async (entries: TimetableEntry[]) => {
    if (entries.length === 0) return;
    setSaving(true);
    await saveTimetableEntries(entries);
    setSaving(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobiili Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-950 border-b px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-navy-700">Lukujärjestykset</h1>
          <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-navy-700">Lukujärjestykset hetkessä</h1>
            <p className="text-muted-foreground">Automaattinen tallennus aktiivinen</p>
          </div>
          <GeneratorDialog
            classes={classes}
            teachers={teachers}
            subjects={subjects}
            rooms={rooms}
            periodsPerDay={8}
            onGenerated={handleGenerated}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Pääkalenteri - vie enemmän tilaa mobiilissa */}
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

          {/* Sivupaneeli */}
          <div className={`xl:col-span-4 space-y-6 ${showSidebar ? 'block' : 'hidden md:block'}`}>
            <WellbeingIndex
              entries={timetableEntries}
              teachers={teachers}
              classes={classes}
            />

            {saving && (
              <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2 py-3">
                <Save className="w-4 h-4 animate-pulse" />
                Tallennetaan muutoksia...
              </div>
            )}

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
      </div>
    </div>
  );
}
