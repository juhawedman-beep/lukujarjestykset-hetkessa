import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { parseWilmaCsv, inferCategory, type ParseResult } from '@/lib/wilmaImport';
import { QK } from '@/hooks/useSchoolData';

const FORMAT_LABELS: Record<ParseResult['format'], string> = {
  classes: 'Luokat',
  teachers: 'Opettajat',
  requirements: 'Tuntijako (luokat + tuntivaatimukset)',
  unknown: 'Tuntematon',
};

interface Props {
  onImported?: () => void;
}

export default function WilmaImportDialog({ onImported }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParsing(true);
    try {
      const r = await parseWilmaCsv(f);
      setResult(r);
    } catch (e) {
      toast.error('Tiedoston lukeminen epäonnistui');
      console.error(e);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleImport = async () => {
    if (!result || !user) return;
    setImporting(true);
    try {
      // 1) Ensure subjects exist for any abbreviation we encountered
      const allAbbrs = new Set<string>();
      result.teachers.forEach(t => t.subjectAbbreviations.forEach(s => allAbbrs.add(s)));
      result.requirements.forEach(r => allAbbrs.add(r.subjectAbbreviation));

      const { data: existingSubjects } = await supabase
        .from('subjects')
        .select('id, abbreviation')
        .eq('owner_id', user.id);
      const subjectMap = new Map<string, string>(
        (existingSubjects ?? []).map(s => [s.abbreviation.toUpperCase(), s.id])
      );

      const newSubjects = Array.from(allAbbrs)
        .filter(a => !subjectMap.has(a))
        .map(a => ({
          owner_id: user.id,
          name: a,
          abbreviation: a,
          category: inferCategory(a),
        }));
      if (newSubjects.length > 0) {
        const { data: inserted, error } = await supabase
          .from('subjects')
          .insert(newSubjects)
          .select('id, abbreviation');
        if (error) throw error;
        inserted?.forEach(s => subjectMap.set(s.abbreviation.toUpperCase(), s.id));
      }

      // 2) Classes
      let classCount = 0;
      const classMap = new Map<string, string>();
      if (result.classes.length > 0) {
        const { data: existingClasses } = await supabase
          .from('school_classes')
          .select('id, name')
          .eq('owner_id', user.id);
        existingClasses?.forEach(c => classMap.set(c.name, c.id));

        const newClasses = result.classes
          .filter(c => !classMap.has(c.name))
          .map(c => ({
            owner_id: user.id,
            name: c.name,
            grade_level: c.gradeLevel,
            student_count: c.studentCount,
          }));
        if (newClasses.length > 0) {
          const { data: inserted, error } = await supabase
            .from('school_classes')
            .insert(newClasses)
            .select('id, name');
          if (error) throw error;
          inserted?.forEach(c => classMap.set(c.name, c.id));
          classCount = inserted?.length ?? 0;
        }
      }

      // 3) Teachers
      let teacherCount = 0;
      if (result.teachers.length > 0) {
        const newTeachers = result.teachers.map(t => ({
          owner_id: user.id,
          first_name: t.firstName,
          last_name: t.lastName,
          subject_ids: t.subjectAbbreviations
            .map(a => subjectMap.get(a))
            .filter((id): id is string => !!id),
        }));
        const { data, error } = await supabase
          .from('teachers')
          .insert(newTeachers)
          .select('id');
        if (error) throw error;
        teacherCount = data?.length ?? 0;
      }

      // 4) Requirements
      let reqCount = 0;
      if (result.requirements.length > 0) {
        const newReqs = result.requirements
          .map(r => {
            const classId = classMap.get(r.className);
            const subjectId = subjectMap.get(r.subjectAbbreviation);
            if (!classId || !subjectId) return null;
            return {
              owner_id: user.id,
              class_id: classId,
              subject_id: subjectId,
              hours_per_week: r.hoursPerWeek,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (newReqs.length > 0) {
          const { data, error } = await supabase
            .from('lesson_requirements')
            .upsert(newReqs, { onConflict: 'class_id,subject_id' })
            .select('id');
          if (error) throw error;
          reqCount = data?.length ?? 0;
        }
      }

      toast.success(
        `Tuonti valmis: ${classCount} luokkaa, ${teacherCount} opettajaa, ${reqCount} tuntivaatimusta.`
      );
      onImported?.();
      setOpen(false);
      reset();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Tuonti epäonnistui');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Tuo CSV</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tuo Wilma-CSV</DialogTitle>
          <DialogDescription>
            Lataa Wilmasta viety CSV-tiedosto. Tunnistetaan automaattisesti luokat, opettajat tai tuntijako otsikoiden perusteella.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV-tiedosto</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              disabled={parsing || importing}
            />
            <p className="text-xs text-muted-foreground">
              Tuetut formaatit: <strong>Luokat</strong> (Luokka, Vuosiluokka, Oppilasmäärä) · <strong>Opettajat</strong> (Etunimi, Sukunimi, Aineet) · <strong>Tuntijako</strong> (Luokka, Aine, Tunnit)
            </p>
          </div>

          {parsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Luetaan tiedostoa…
            </div>
          )}

          {result && (
            <Alert variant={result.format === 'unknown' ? 'destructive' : 'default'}>
              {result.format === 'unknown' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Tunnistettu: {FORMAT_LABELS[result.format]}
                <Badge variant="secondary">{result.rowCount} riviä</Badge>
              </AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  {result.classes.length > 0 && <Badge>{result.classes.length} luokkaa</Badge>}
                  {result.teachers.length > 0 && <Badge>{result.teachers.length} opettajaa</Badge>}
                  {result.requirements.length > 0 && <Badge>{result.requirements.length} tuntivaatimusta</Badge>}
                </div>
                {result.warnings.length > 0 && (
                  <ScrollArea className="max-h-24 mt-2">
                    <ul className="text-xs space-y-0.5 list-disc list-inside">
                      {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </ScrollArea>
                )}
              </AlertDescription>
            </Alert>
          )}

          {result && result.format !== 'unknown' && (
            <ScrollArea className="max-h-64 rounded border">
              <div className="p-3 space-y-3 text-sm">
                {result.classes.slice(0, 5).map((c, i) => (
                  <div key={`c${i}`} className="flex justify-between text-xs">
                    <span><strong>{c.name}</strong> · vuosiluokka {c.gradeLevel}</span>
                    <span className="text-muted-foreground">{c.studentCount} oppilasta</span>
                  </div>
                ))}
                {result.teachers.slice(0, 5).map((t, i) => (
                  <div key={`t${i}`} className="flex justify-between text-xs">
                    <span><strong>{t.firstName} {t.lastName}</strong></span>
                    <span className="text-muted-foreground">{t.subjectAbbreviations.join(', ')}</span>
                  </div>
                ))}
                {result.requirements.slice(0, 8).map((r, i) => (
                  <div key={`r${i}`} className="flex justify-between text-xs">
                    <span><strong>{r.className}</strong> – {r.subjectAbbreviation}</span>
                    <span className="text-muted-foreground">{r.hoursPerWeek} h/vk</span>
                  </div>
                ))}
                {(result.classes.length + result.teachers.length + result.requirements.length) > 8 && (
                  <p className="text-xs text-muted-foreground italic">…ja lisää.</p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setOpen(false); reset(); }} disabled={importing}>
            Peruuta
          </Button>
          <Button
            onClick={handleImport}
            disabled={!result || result.format === 'unknown' || importing || !user}
          >
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Tuo {result?.format === 'requirements' ? 'tuntijako' : result?.format === 'teachers' ? 'opettajat' : 'luokat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
