// src/components/GeneratorDialog.tsx
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wand2, CheckCircle2, Loader2, Download, Calendar, BookOpen, Upload } from 'lucide-react';
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
import { parseWilmaCSV, downloadWilmaImportTemplate } from '@/lib/wilmaImport';

interface GeneratorDialogProps {
  classes: SchoolClass[];
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  periodsPerDay: number;
  onGenerated: (entries: TimetableEntry[]) => void;
}

const createDefaultHomeRooms = (teachers: Teacher[], rooms: Room[]): TeacherHomeRoom[] => {
  return teachers.map(t => ({
    teacherId: t.id,
    roomId: rooms[0]?.id || 'default-room',
  }));
};

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

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setRequirements([]);
      setHomeRooms(createDefaultHomeRooms(teachers, rooms));
      setStep('config');
      setResults([]);
      setSelectedResultIndex(0);
    }
    setOpen(isOpen);
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

  const getReqHours = (classId: string, subjectId: string): number => {
    return requirements.find(r => r.classId === classId && r.subjectId === subjectId)?.hoursPerWeek ?? 0;
  };

  const totalRequired = requirements.reduce((sum, r) => sum + r.hoursPerWeek, 0);

  // OPS-tuntijako
  const handleFillOPS = () => {
    let newRequirements: LessonRequirement[] = [];
    classes.forEach(cls => {
      const opsReqs = generateOPSRequirements(cls, subjects);
      newRequirements = [...newRequirements, ...opsReqs];
    });
    setRequirements(newRequirements);
    toast({ title: '✅ OPS-tuntijako täytetty', description: 'Tunnit generoitiin OPS 2014 -perusteella.' });
  };

  // Wilma-tuonti
  const handleWilmaImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const imported = parseWilmaCSV(csvText, classes, subjects);
      
      if (imported.length > 0) {
        setRequirements(imported);
        toast({
          title: '✅ Wilma-tuonti onnistui',
          description: `${imported.length} tuntivaatimusta tuotu.`,
        });
      } else {
        toast({ title: 'Tuonti epäonnistui', description: 'Ei kelvollisia rivejä.', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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

      const options: GenerationOptions = { maxAttempts: 40, softConstraintWeight: 0.8, includeExplanations: true };
      const generatedResults = generateTimetable(input, options);

      setResults(generatedResults);
      setSelectedResultIndex(0);
      setStep('result');
      setGenerating(false);

      if (generatedResults.length === 0) {
        toast({ title: 'Ei tuloksia', description: 'Kokeile lisätä tuntivaatimuksia.', variant: 'destructive' });
      }
    }, 400);
  };

  const selectedResult = results[selectedResultIndex] || null;

  const handleApply = () => {
    if (!selectedResult) return;
    onGenerated(selectedResult.entries);
    setOpen(false);
    toast({ title: 'Lukujärjestys otettu käyttöön' });
  };

  const handleExport = () => {
    if (!selectedResult) return;
    downloadTimetableAsCSV(selectedResult, {
      classes, teachers, subjects, rooms, requirements, teacherHomeRooms: homeRooms, periodsPerDay
    } as any);
    toast({ title: 'CSV ladattu', description: 'Valmis Kurre/Primus-tuontiin' });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-1.5">
          <Wand2 className="w-4 h-4" />
          Generoi lukujärjestys
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {step === 'config' ? 'Luo lukujärjestys hetkessä' : 'Valitse paras vaihtoehto'}
          </DialogTitle>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-8 py-4">
            {/* Tuontinapit */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleFillOPS} variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Täytä OPS-tuntijako automaattisesti
              </Button>

              <Button onClick={downloadWilmaImportTemplate} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Lataa esimerkki CSV
              </Button>

              <label className="cursor-pointer">
                <Button variant="outline" className="gap-2" asChild>
                  <span>
                    <Upload className="w-4 h-4" />
                    Tuo Wilmasta (CSV)
                  </span>
                </Button>
                <input type="file" accept=".csv" onChange={handleWilmaImport} className="hidden" />
              </label>
            </div>

            {/* Viikkotunnit-taulukko */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Viikkotunnit per luokka ja aine
              </h3>
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
                              className="w-20 text-center mx-auto"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>Peruuta</Button>
              <Button onClick={handleGenerate} disabled={generating || totalRequired === 0}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generoidaan...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generoi 2–3 vaihtoehtoa
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && selectedResult && (
          <div className="space-y-6">
            {/* Vaihtoehdot */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {results.map((res, idx) => (
                <Button
                  key={idx}
                  variant={idx === selectedResultIndex ? 'default' : 'outline'}
                  onClick={() => setSelectedResultIndex(idx)}
                  className="flex-1 min-w-[160px]"
                >
                  Vaihtoehto {idx + 1}
                  <Badge variant="secondary" className="ml-2">{res.stats.score} p</Badge>
                </Button>
              ))}
            </div>

            {/* Selitykset */}
            {selectedResult.explanations && (
              <div className="bg-muted/50 p-5 rounded-xl border">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Miksi tämä on hyvä ratkaisu?
                </h4>
                <ul className="space-y-2 text-sm">
                  {selectedResult.explanations.map((exp, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-500">✓</span> {exp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tilastot */}
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
