// src/components/GeneratorDialog.tsx
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { generateOPSRequirements } from '@/lib/opsCurriculum';   // ← UUSI

// ... (createDefaultRequirements ja createDefaultHomeRooms säilyvät ennallaan)

export default function GeneratorDialog({
  classes,
  teachers,
  subjects,
  rooms,
  periodsPerDay,
  onGenerated,
}: GeneratorDialogProps) {
  // ... (kaikki vanhat state-muuttujat säilyvät)

  // UUSI: OPS-tuntijako automaattisesti
  const handleFillOPS = () => {
    let newRequirements: LessonRequirement[] = [];
    classes.forEach(cls => {
      const opsReqs = generateOPSRequirements(cls, subjects);
      newRequirements = [...newRequirements, ...opsReqs];
    });
    setRequirements(newRequirements);
    toast({
      title: '✅ OPS-tuntijako täytetty',
      description: 'Tunnit generoitiin OPS 2014 -perusteella luokka-asteittain.',
    });
  };

  // ... (muut funktiot kuten updateReq, handleGenerate jne. säilyvät ennallaan)

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
            {/* UUSI NAPPI */}
            <div className="flex justify-end">
              <Button onClick={handleFillOPS} variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Täytä OPS-tuntijako automaattisesti
              </Button>
            </div>

            {/* Viikkotunnit-taulukko (sama kuin ennen) */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Viikkotunnit per luokka ja aine
              </h3>
              <Table>
                {/* ... sama taulukko kuin edellisessä versiossa ... */}
              </Table>
            </div>

            {/* Kotiluokat-osio säilyy ennallaan */}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Peruuta
              </Button>
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

        {/* TULOS-VAIHE */}
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
                      <span className="text-emerald-500">✓</span>
                      {exp}
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
