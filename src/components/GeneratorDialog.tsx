// src/components/GeneratorDialog.tsx
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Wand2, CheckCircle2, AlertTriangle, Loader2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Subject, Teacher, SchoolClass, Room, TimetableEntry } from '@/types/timetable';
import {
  generateTimetable,
  createDefaultRequirements,
  createDefaultHomeRooms,
  type LessonRequirement,
  type TeacherHomeRoom,
  type GeneratorResult,
  type GeneratorInput,
  type GenerationOptions,
} from '@/lib/timetableGenerator';
import { downloadTimetableAsCSV } from '@/lib/timetableExport';

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

  const subjectMap = useMemo(()
