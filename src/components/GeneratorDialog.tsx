import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Wand2, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Subject, Teacher, SchoolClass, Room, TimetableEntry } from '@/types/timetable';
import {
  generateTimetable,
  createDefaultRequirements,
  createDefaultHomeRooms,
  type LessonRequirement,
  type TeacherHomeRoom,
  type GeneratorResult,
} from '@/lib/timetableGenerator';

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
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [generating, setGenerating] = useState(false);

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);
  const classrooms = useMemo(() => rooms.filter(r => r.type === 'classroom'), [rooms]);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setRequirements(createDefaultRequirements(classes, subjects));
      setHomeRooms(createDefaultHomeRooms(teachers, rooms));
      setStep('config');
      setResult(null);
    }
    setOpen(isOpen);
  };

  const updateReq = (classId: string, subjectId: string, hours: number) => {
    setRequirements(prev => {
      const idx = prev.findIndex(r => r.classId === classId && r.subjectId === subjectId);
      if (hours <= 0) {
        return idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
      }
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

  const getReqHours = (classId: string, subjectId: string): number => {
    return requirements.find(r => r.classId === classId && r.subjectId === subjectId)?.hoursPerWeek ?? 0;
  };

  const totalRequired = requirements.reduce((sum, r) => sum + r.hoursPerWeek, 0);

  const handleGenerate = () => {
    setGenerating(true);
    // Use setTimeout to let UI update
    setTimeout(() => {
      const res = generateTimetable({
        classes,
        teachers,
        subjects,
        rooms,
        requirements,
        teacherHomeRooms: homeRooms,
        periodsPerDay,
      });
      setResult(res);
      setStep('result');
      setGenerating(false);
    }, 100);
  };

  const handleApply = () => {
    if (!result) return;
    onGenerated(result.entries);
    setOpen(false);
    toast({
      title: 'Lukujärjestys luotu',
      description: `${result.stats.totalPlaced}/${result.stats.totalRequired} tuntia sijoitettu onnistuneesti.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-1.5">
          <Wand2 className="w-4 h-4" />
          <span className="hidden sm:inline">Generoi lukujärjestys</span>
          <span className="sm:hidden">Generoi</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {step === 'config' ? 'Lukujärjestyksen generointi' : 'Generoinnin tulos'}
          </DialogTitle>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-6">
            {/* Section 1: Weekly hours per class */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Viikkotunnit luokittain
                <Badge variant="secondary" className="ml-2">{totalRequired} tuntia yhteensä</Badge>
              </h3>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-1.5 pl-2 font-medium text-muted-foreground sticky left-0 bg-muted/50">Aine</th>
                      {classes.map(cls => (
                        <th key={cls.id} className="p-1.5 text-center font-medium text-muted-foreground min-w-[50px]">
                          {cls.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map(subj => (
                      <tr key={subj.id} className="border-t border-border/50">
                        <td className="p-1.5 pl-2 font-medium text-foreground sticky left-0 bg-card">
                          {subj.abbreviation}
                        </td>
                        {classes.map(cls => (
                          <td key={cls.id} className="p-0.5 text-center">
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              value={getReqHours(cls.id, subj.id)}
                              onChange={e => updateReq(cls.id, subj.id, Number(e.target.value))}
                              className="h-7 w-12 mx-auto text-center text-xs p-0"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Teacher home rooms */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Opettajien kotiluokat</h3>
              <div className="grid grid-cols-2 gap-2">
                {teachers.map(t => {
                  const current = homeRooms.find(hr => hr.teacherId === t.id)?.roomId ?? '';
                  return (
                    <div key={t.id} className="flex items-center gap-2">
                      <Label className="text-xs w-32 truncate">{t.firstName} {t.lastName}</Label>
                      <Select value={current} onValueChange={v => updateHomeRoom(t.id, v)}>
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map(r => (
                            <SelectItem key={r.id} value={r.id} className="text-xs">
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Peruuta</Button>
              <Button onClick={handleGenerate} disabled={generating} className="gap-1.5">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {generating ? 'Generoidaan...' : 'Generoi'}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center border border-border">
                <p className="text-2xl font-bold text-foreground">{result.stats.totalPlaced}</p>
                <p className="text-xs text-muted-foreground">Sijoitettu</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center border border-border">
                <p className="text-2xl font-bold text-foreground">{result.stats.totalRequired}</p>
                <p className="text-xs text-muted-foreground">Vaadittu</p>
              </div>
              <div className={`rounded-lg p-3 text-center border ${result.unplaced.length > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/10 border-primary/30'}`}>
                <p className={`text-2xl font-bold ${result.unplaced.length > 0 ? 'text-destructive' : 'text-primary'}`}>
                  {result.unplaced.length}
                </p>
                <p className="text-xs text-muted-foreground">Sijoittamatta</p>
              </div>
            </div>

            {result.stats.totalPlaced === result.stats.totalRequired && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/30">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <p className="text-sm text-foreground">Kaikki tunnit sijoitettu onnistuneesti!</p>
              </div>
            )}

            {result.unplaced.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Sijoittamattomat tunnit
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.unplaced.map((u, i) => (
                    <p key={i} className="text-xs text-muted-foreground bg-muted/50 p-1.5 rounded">
                      <span className="font-medium">{classMap.get(u.classId)?.name}</span> – {subjectMap.get(u.subjectId)?.name}: {u.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('config')}>Muokkaa asetuksia</Button>
              <Button onClick={handleApply} className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Hyväksy ja ota käyttöön
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
