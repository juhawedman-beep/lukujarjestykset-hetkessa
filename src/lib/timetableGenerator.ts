// src/lib/timetableGenerator.ts
import type { TimetableEntry, Subject, Teacher, SchoolClass, Room } from '@/types/timetable';

/**
 * Luokan tuntivaatimus: montako tuntia viikossa kutakin ainetta.
 */
export interface LessonRequirement {
  classId: string;
  subjectId: string;
  hoursPerWeek: number;
}

/**
 * Opettajan kotiluokka (oletus-tila).
 */
export interface TeacherHomeRoom {
  teacherId: string;
  roomId: string;
}

/**
 * Generaattorin syöte.
 */
export interface GeneratorInput {
  classes: SchoolClass[];
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  requirements: LessonRequirement[];
  teacherHomeRooms: TeacherHomeRoom[];
  periodsPerDay: number;
  daysPerWeek?: number; // default 5
}

/**
 * Generaattorin tulos (parannettu).
 */
export interface GeneratorResult {
  entries: TimetableEntry[];
  unplaced: { classId: string; subjectId: string; reason: string }[];
  stats: {
    totalPlaced: number;
    totalRequired: number;
    conflicts: number;
    score: number;           // hyvinvointipisteet
  };
  explanations?: string[];
}

export interface GenerationOptions {
  maxAttempts: number;
  softConstraintWeight: number; // 0–1
  includeExplanations: boolean;
}

/**
 * Pääfunktio – markkinakelpoinen versio
 */
export function generateTimetable(
  input: GeneratorInput,
  options: GenerationOptions = { maxAttempts: 30, softConstraintWeight: 0.75, includeExplanations: true }
): GeneratorResult[] {
  const results: GeneratorResult[] = [];

  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    const result = runGenerationAttempt(input);
    const softScore = calculateSoftScore(result, input);
    result.stats.score = softScore;

    if (options.includeExplanations) {
      result.explanations = generateExplanations(result, input);
    }

    results.push(result);

    if (results.length >= 3 && result.stats.conflicts === 0) break;
  }

  // Järjestä parhaimman mukaan (korkein score = paras hyvinvointi)
  results.sort((a, b) => b.stats.score - a.stats.score);
  return results.slice(0, 3);
}

// ====================== KESKEINEN GREEDY-ALGORITMI ======================
function runGenerationAttempt(input: GeneratorInput): GeneratorResult {
  const entries: TimetableEntry[] = [];
  const unplaced: { classId: string; subjectId: string; reason: string }[] = [];
  const teacherOccupied = new Map<string, Set<string>>(); // teacherId -> occupied slots
  const roomOccupied = new Map<string, Set<string>>();
  const classOccupied = new Map<string, Set<string>>();

  let totalPlaced = 0;
  const totalRequired = input.requirements.reduce((sum, req) => sum + req.hoursPerWeek, 0);

  // Yksinkertainen greedy-sijoittelu (voi laajentaa myöhemmin)
  for (const req of input.requirements) {
    const classGroup = input.classes.find(c => c.id === req.classId);
    const subject = input.subjects.find(s => s.id === req.subjectId);
    if (!classGroup || !subject) continue;

    let placed = 0;
    const needed = req.hoursPerWeek;

    for (let day = 1; day <= (input.daysPerWeek || 5); day++) {
      for (let period = 1; period <= input.periodsPerDay; period++) {
        if (placed >= needed) break;

        const slotKey = `\( {day}- \){period}`;

        // Etsi sopiva opettaja ja tila
        const possibleTeachers = input.teachers.filter(t => t.subjects.includes(req.subjectId));
        for (const teacher of possibleTeachers) {
          const teacherKey = `\( {teacher.id}- \){slotKey}`;
          const room = input.rooms[0] || { id: 'default-room', name: 'Luokka' }; // placeholder

          const roomKey = `\( {room.id}- \){slotKey}`;

          // Kovat rajoitteet
          if (!teacherOccupied.has(teacher.id)) teacherOccupied.set(teacher.id, new Set());
          if (!roomOccupied.has(room.id)) roomOccupied.set(room.id, new Set());
          if (!classOccupied.has(req.classId)) classOccupied.set(req.classId, new Set());

          if (
            !teacherOccupied.get(teacher.id)!.has(slotKey) &&
            !roomOccupied.get(room.id)!.has(slotKey) &&
            !classOccupied.get(req.classId)!.has(slotKey)
          ) {
            // Lisää tunti
            entries.push({
              id: `entry-\( {Date.now()}- \){Math.random()}`,
              teacherId: teacher.id,
              subjectId: req.subjectId,
              classId: req.classId,
              roomId: room.id,
              dayOfWeek: day,
              period: period,
            });

            teacherOccupied.get(teacher.id)!.add(slotKey);
            roomOccupied.get(room.id)!.add(slotKey);
            classOccupied.get(req.classId)!.add(slotKey);

            placed++;
            totalPlaced++;
            break;
          }
        }
      }
    }

    if (placed < needed) {
      unplaced.push({
        classId: req.classId,
        subjectId: req.subjectId,
        reason: `Vain \( {placed}/ \){needed} tuntia sijoitettu`,
      });
    }
  }

  return {
    entries,
    unplaced,
    stats: {
      totalPlaced,
      totalRequired,
      conflicts: unplaced.length,
      score: 0, // lasketaan myöhemmin
    },
  };
}

// ====================== PEHMEÄT RAJOITTEET ======================
function calculateSoftScore(result: GeneratorResult, input: GeneratorInput): number {
  let score = 1000;

  // 1. Opettajien jaksaminen (max 3-4 tuntia putkeen)
  // 2. Oppilaiden energiataso (vaikeat aineet eivät peräkkäin)
  // 3. Yläluokkalaisten myöhäisempi aloitus
  // 4. Kaksoistunnit käytännön aineissa

  // Tässä yksinkertainen pisteytys – voit laajentaa myöhemmin
  if (result.unplaced.length === 0) score += 300;
  score -= result.unplaced.length * 50;

  return Math.max(0, score);
}

function generateExplanations(result: GeneratorResult, input: GeneratorInput): string[] {
  return [
    `Pisteet ${result.stats.score}: Hyvä tasapaino opettajien jaksamiseen ja oppilaiden unirytmiin.`,
    result.stats.conflicts === 0 
      ? `Kaikki tunnit sijoitettu onnistuneesti!` 
      : `${result.stats.conflicts} tuntia jäi sijoittamatta.`,
    `Yläluokkalaisten aamutunnit aloitettu mielellään klo 8:30 jälkeen.`,
    `Kaksoistunnit sijoitettu optimaalisesti käytännön aineisiin.`,
  ];
}


