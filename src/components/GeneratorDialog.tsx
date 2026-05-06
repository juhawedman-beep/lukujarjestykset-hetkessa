// src/components/GeneratorDialog.tsx
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wand2, CheckCircle2, Loader2, Download, Calendar, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Subject, Teacher, SchoolClass, Room, TimetableEntry } from '@/types/timetable';
import {
  generateTimetable,
  type LessonRequirement,
  type TeacherHomeRoom,
  type GeneratorResult,
  type GeneratorInput,
  type GenerationOptions,
} from '@/lib/timetableGenerator';
import { downloadTimetableAsCSV } from '@/lib/timetableExport';
import { generateOPSRequirements } from '@/lib/opsCurriculum';

interface GeneratorDialogProps {
  classes: SchoolClass[];
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  periodsPerDay: number;
  onGenerated: (entries: TimetableEntry[]) => void;
}

const createDefaultHomeRooms = (teachers: Teacher[], rooms: Room[]): TeacherHomeRoom[] =>
  teachers.map(t => ({ teacherId: t.id, roomId: rooms[0]?.id || 'default-room' }));

export default function GeneratorDialog({
  classes,
  teachers,
  subjects,
  rooms,
  periodsPerDay,
  onGenerated,
}: GeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'config' | 'result'>('config');
  const [requirements, setRequirements] = useState<LessonRequirement[]>([]);
  const [homeRooms, setHomeRooms] = useState<TeacherHomeRoom[]>([]);
  const [results, setResults] = useState<GeneratorResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [generating, setGenerating] = useState(false);

  useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setHomeRooms(createDefaultHomeRooms(teachers, rooms));
      setStep('config');
      setResults([]);
      setSelectedResultIndex(0);
    }
    setOpen(isOpen);
  };

  const handleFillOPS = () => {
    const newRequirements: LessonRequirement[] = classes.flatMap(cls =>
      generateOPSRequirements(cls, subjects)
    );
    setRequirements(newRequirements);
    toast({
      title: '✅ OPS-tuntijako täytetty',
      description: 'Tunnit generoitiin OPS 2014 -perusteella luokka-asteittain.',
    });
  };

  const updateReq = (classId: string, subjectId: string, hours: number) => {
    setRequirements(prev => {
      const idx = prev.findIndex(r => r.classId === classId && r.subjectId === subjectId);
      if (hours <= 0) return idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], hoursPerWeek: hours };
        return copy;
      }
      return [...prev, { classId, subjectId, hoursPerWeek: hours }];
    });
  };

  const updateHomeRoom = (teacherId: string, roomId: string) => {
    setHomeRooms(prev => {
      const idx = prev.findIndex(hr => hr.teacherId === teacherId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { teacherId, roomId };
        return copy;
      }
      return [...prev, { teacherId, roomId }];
    });
  };

  const getReqHours = (classId: string, subjectId: string): number =>
    requirements.find(r => r.classId === classId && r.subjectId === subjectId)?.hoursPerWeek ?? 0;

  const totalRequired = requirements.reduce((sum, r) => sum + r.hoursPerWeek, 0);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const input: GeneratorInput = {
        classes,
        teachers,
        subjects,
        rooms,
        requirements,
        teacherHomeRooms: homeRooms,
        periodsPerDay,
        daysPerWeek: 5,
      };
      const options: GenerationOptions = {
        maxAttempts: 30,
        softConstraintWeight: 0.75,
        includeExplanations: true,
      };
      const generatedResults = generateTimetable(input, options);
      setResults(generatedResults);
      setSelectedResultIndex(0);
      setStep('result');
      setGenerating(false);
      if (generatedResults.length === 0) {
        toast({
          title: 'Ei tuloksia',
          description: 'Kokeile muuttaa asetuksia tai lisää tunteja.',
          variant: 'destructive',
        });
      }
    }, 300);
  };

  const selectedResult = results[selectedResultIndex] || null;

  const handleApply = () => {
    if (!selectedResult) return;
    onGenerated(selectedResult.entries);
    setOpen(false);
    toast({
      title: 'Lukujärjestys otettu käyttöön',
      description: `${selectedResult.stats.totalPlaced}/${selectedResult.stats.totalRequired} tuntia sijoitettu onnistuneesti.`,
    });
  };

  const handleExport = () => {
    if (!selectedResult) return;
    downloadTimetableAsCSV(
      selectedResult,
      {
        classes,
        teachers,
        subjects,
        rooms,
        requirements,
        teacherHomeRooms: homeRooms,
        periodsPerDay,
      } as GeneratorInput,
      `lukujarjestys-kurre-vaihtoehto-${selectedResultIndex + 1}.csv`
    );
    toast({ title: 'CSV ladattu!', description: 'Valmis tuontiin Kurre/Primus/Wilmaan' });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-1.5">
          <Wand2 className="w-4 h-4" />
          Generoi lukujärjestys
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {step === 'config' ? 'Luo lukujärjestys hetkessä' : 'Valitse paras vaihtoehto'}
          </DialogTitle>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-8 py-2">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Viikkotunnit per luokka ja aine
                </h3>
                <Button variant="outline" size="sm" onClick={handleFillOPS} className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Täytä OPS 2014:n mukaan
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Luokka</TableHead>
                    <TableHead>Aine</TableHead>
                    <TableHead className="text-right">Tunnit / viikko</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.flatMap(cls =>
                    subjects.map(subj => {
                      const hours = getReqHours(cls.id, subj.id);
                      return (
                        <TableRow key={`${cls.id}-${subj.id}`}>
                          <TableCell>{cls.name}</TableCell>
                          <TableCell>{subj.name}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              value={hours}
                              onChange={e => updateReq(cls.id, subj.id, parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="font-medium mb-3">Opettajien kotiluokat</h3>
              <div className="grid grid-cols-2 gap-3">
                {teachers.map(teacher => (
                  <div key={teacher.id} className="flex items-center gap-3">
                    <span className="font-medium min-w-[120px]">
                      {teacher.firstName} {teacher.lastName}
                    </span>
                    <Select onValueChange={roomId => updateHomeRoom(teacher.id, roomId)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Valitse kotiluokka" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map(room => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Peruuta
              </Button>
              <Button onClick={handleGenerate} disabled={generating || totalRequired === 0}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generoidaan 2–3 vaihtoehtoa...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generoi vaihtoehdot
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && selectedResult && (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {results.map((res, idx) => (
                <Button
                  key={idx}
                  variant={idx === selectedResultIndex ? 'default' : 'outline'}
                  onClick={() => setSelectedResultIndex(idx)}
                  className="flex-1 min-w-[160px]"
                >
                  Vaihtoehto {idx + 1}
                  <Badge variant="secondary" className="ml-2">
                    {res.stats.score} p
                  </Badge>
                </Button>
              ))}
            </div>

            {selectedResult.explanations && (
              <div className="bg-muted/50 p-5 rounded-xl border">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Miksi tämä on hyvä ratkaisu?
                </h4>
                <ul className="space-y-2 text-sm">
                  {selectedResult.explanations.map((exp, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-500">✓</span>
                      {exp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card p-4 rounded-xl text-center border">
                <div className="text-3xl font-bold text-primary">{selectedResult.stats.totalPlaced}</div>
                <div className="text-sm text-muted-foreground">Tuntia sijoitettu</div>
              </div>
              <div className="bg-card p-4 rounded-xl text-center border">
                <div className="text-3xl font-bold">{selectedResult.stats.totalRequired}</div>
                <div className="text-sm text-muted-foreground">Tarvittua tuntia</div>
              </div>
              <div className="bg-card p-4 rounded-xl text-center border">
                <div className="text-3xl font-bold text-orange-500">{selectedResult.stats.conflicts}</div>
                <div className="text-sm text-muted-foreground">Konfliktia</div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleApply} className="flex-1 text-lg h-12">
                <CheckCircle2 className="mr-2" />
                Käytä tätä lukujärjestystä
              </Button>
              <Button variant="outline" onClick={handleExport} className="flex-1 text-lg h-12 gap-2">
                <Download className="w-5 h-5" />
                Vie Kurre/Primus-formaattiin
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
