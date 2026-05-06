// src/components/GeneratorDialog.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wand2, CheckCircle2, Loader2, Download, BookOpen, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import type { Subject, Teacher, SchoolClass, Room, TimetableEntry } from '@/types/timetable';
import {
  generateTimetable,
  type LessonRequirement,
  type TeacherHomeRoom,
  type GeneratorResult,
  type GeneratorInput,
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

  const totalRequired = requirements.reduce((sum, r) => sum + r.hoursPerWeek, 0);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setRequirements([]);
      setHomeRooms(teachers.map(t => ({ teacherId: t.id, roomId: rooms[0]?.id || 'default-room' })));
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
        copy[idx].hoursPerWeek = hours;
        return copy;
      }
      return [...prev, { classId, subjectId, hoursPerWeek: hours }];
    });
  };

  const getReqHours = (classId: string, subjectId: string) =>
    requirements.find(r => r.classId === classId && r.subjectId === subjectId)?.hoursPerWeek ?? 0;

  const handleFillOPS = () => {
    let newReqs: LessonRequirement[] = [];
    classes.forEach(cls => {
      newReqs = [...newReqs, ...generateOPSRequirements(cls, subjects)];
    });
    setRequirements(newReqs);
    toast({
      title: '✅ OPS-tuntijako täytetty',
      description: `Täytettiin ${newReqs.length} tuntirivin pohja.`,
    });
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const input: GeneratorInput = {
        classes, teachers, subjects, rooms,
        requirements, teacherHomeRooms: homeRooms,
        periodsPerDay, daysPerWeek: 5,
      };

      const generated = generateTimetable(input, {
        maxAttempts: 40,
        softConstraintWeight: 0.8,
        includeExplanations: true,
      });

      setResults(generated);
      setSelectedResultIndex(0);
      setStep('result');
      setGenerating(false);
    }, 400);
  };

  const selectedResult = results[selectedResultIndex];

  const handleApply = () => {
    if (!selectedResult) return;
    onGenerated(selectedResult.entries);
    setOpen(false);
    toast({ title: '✅ Lukujärjestys otettu käyttöön' });
  };

  const handleExport = () => {
    if (!selectedResult) return;
    downloadTimetableAsCSV(selectedResult, {
      classes, teachers, subjects, rooms, requirements,
      teacherHomeRooms: homeRooms, periodsPerDay,
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
          <div className="space-y-6 py-2">
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleFillOPS} variant="default" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Täytä OPS-tuntijako automaattisesti
              </Button>
              <div className="text-sm text-muted-foreground self-center">
                Yhteensä: <span className="font-semibold text-foreground">{totalRequired}</span> tuntia / viikko
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3">Viikkotunnit per luokka ja aine</h3>
              <div className="border rounded-md max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Luokka</TableHead>
                      <TableHead>Aine</TableHead>
                      <TableHead className="text-right">Tunnit / viikko</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.flatMap(cls =>
                      subjects.map(subj => (
                        <TableRow key={`${cls.id}-${subj.id}`}>
                          <TableCell className="font-medium">{cls.name}</TableCell>
                          <TableCell>{subj.name}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              value={getReqHours(cls.id, subj.id)}
                              onChange={e => updateReq(cls.id, subj.id, parseInt(e.target.value) || 0)}
                              className="w-20 text-center ml-auto"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>Peruuta</Button>
              <Button onClick={handleGenerate} disabled={generating || totalRequired === 0}>
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generoi 2–3 vaihtoehtoa
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && selectedResult && (
          <div className="space-y-6 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {results.map((res, idx) => {
                const active = idx === selectedResultIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedResultIndex(idx)}
                    className={`text-left rounded-lg border p-4 transition ${
                      active ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Vaihtoehto {idx + 1}</span>
                      {active && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Laatupisteet: <span className="font-semibold text-foreground">{Math.round(res.score)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {res.entries.length} tuntia · {res.unplaced?.length || 0} sijoittamatta
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Valittu vaihtoehto {selectedResultIndex + 1}</h4>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {selectedResult.entries.length} tuntia
                  </Badge>
                  <Badge variant={selectedResult.unplaced?.length ? 'destructive' : 'default'}>
                    {selectedResult.unplaced?.length || 0} sijoittamatta
                  </Badge>
                </div>
              </div>

              {selectedResult.explanations && selectedResult.explanations.length > 0 && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {selectedResult.explanations.slice(0, 5).map((exp, i) => (
                    <div key={i}>• {exp}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep('config')}>
                ← Muokkaa pohjaa
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleExport} className="gap-2">
                  <Download className="w-4 h-4" />
                  Vie CSV (Kurre/Primus)
                </Button>
                <Button onClick={handleApply} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Ota käyttöön
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
