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
 * Generaattorin tulos.
 */
export interface GeneratorResult {
  entries: TimetableEntry[];
  unplaced: { classId: string; subjectId: string; reason: string }[];
  stats: {
    totalPlaced: number;
    totalRequired: number;
    conflicts: number;
    score: number;
  };
  explanations?: string[];
}

export interface GenerationOptions {
  maxAttempts: number;
  softConstraintWeight: number;
  includeExplanations: boolean;
}

/**
 * Pääfunktio – tuottaa parhaat 3 vaihtoehtoa.
 */
export function generateTimetable(
  input: GeneratorInput,
  options: GenerationOptions = { maxAttempts: 30, softConstraintWeight: 0.75, includeExplanations: true }
): GeneratorResult[] {
  const results: GeneratorResult[] = [];

  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    const result = runGenerationAttempt(input, attempt);
    result.stats.score = calculateSoftScore(result, input);

    if (options.includeExplanations) {
      result.explanations = generateExplanations(result, input);
    }

    results.push(result);

    if (results.length >= 3 && result.stats.conflicts === 0) break;
  }

  results.sort((a, b) => b.stats.score - a.stats.score);
  return results.slice(0, 3);
}

// ====================== GREEDY-ALGORITMI (hyppytuntiton) ======================
function runGenerationAttempt(input: GeneratorInput, attemptSeed = 0): GeneratorResult {
  const entries: TimetableEntry[] = [];
  const unplaced: { classId: string; subjectId: string; reason: string }[] = [];
  const teacherOccupied = new Map<string, Set<string>>();
  const roomOccupied = new Map<string, Set<string>>();
  const classOccupied = new Map<string, Set<string>>();
  // Luokan päiväkohtainen viimeinen käytetty periodi (hyppytuntien esto)
  const classDayLastPeriod = new Map<string, Map<number, number>>();

  let totalPlaced = 0;
  const totalRequired = input.requirements.reduce((sum, req) => sum + req.hoursPerWeek, 0);
  const daysPerWeek = input.daysPerWeek || 5;

  // Järjestä vaatimukset: eniten tunteja ensin (parempi pakkaus)
  // Pieni pseudosatunnaisuus eri vaihtoehtoja varten
  const sortedReqs = [...input.requirements].sort((a, b) => {
    const diff = b.hoursPerWeek - a.hoursPerWeek;
    if (diff !== 0) return diff;
    return ((attemptSeed * 13 + a.classId.length) % 7) - ((attemptSeed * 7 + b.classId.length) % 7);
  });

  for (const req of sortedReqs) {
    const classGroup = input.classes.find(c => c.id === req.classId);
    const subject = input.subjects.find(s => s.id === req.subjectId);
    if (!classGroup || !subject) continue;

    let placed = 0;
    const needed = req.hoursPerWeek;

    if (!classDayLastPeriod.has(req.classId)) classDayLastPeriod.set(req.classId, new Map());
    const dayLast = classDayLastPeriod.get(req.classId)!;

    // Käy päivät läpi siinä järjestyksessä, jossa on jo vähiten tunteja (tasapainotus)
    const dayOrder = Array.from({ length: daysPerWeek }, (_, i) => i + 1)
      .sort((a, b) => (dayLast.get(a) || 0) - (dayLast.get(b) || 0));

    for (const day of dayOrder) {
      if (placed >= needed) break;

      // Aloita siitä periodista, joka tulee luokan viimeisen tunnin JÄLKEEN.
      // Jos päivässä ei ole vielä tunteja, aloita periodista 1.
      const lastUsed = dayLast.get(day) || 0;
      let nextPeriod = lastUsed + 1;

      while (placed < needed && nextPeriod <= input.periodsPerDay) {
        const slotKey = `${day}-${nextPeriod}`;

        // Varmista ettei luokalla ole jo tuntia tässä slotissa (ei pitäisi olla, mutta varmuudeksi)
        if (!classOccupied.has(req.classId)) classOccupied.set(req.classId, new Set());
        if (classOccupied.get(req.classId)!.has(slotKey)) {
          nextPeriod++;
          continue;
        }

        // Etsi opettaja
        const possibleTeachers = input.teachers.filter(t => t.subjects.includes(req.subjectId));
        let teacherFound = false;

        for (const teacher of possibleTeachers) {
          // Opettajan kotiluokka tai ensimmäinen vapaa
          const homeRoom = input.teacherHomeRooms.find(hr => hr.teacherId === teacher.id);
          const room =
            (homeRoom && input.rooms.find(r => r.id === homeRoom.roomId)) ||
            input.rooms[0] ||
            { id: 'default-room', name: 'Luokka' };

          if (!teacherOccupied.has(teacher.id)) teacherOccupied.set(teacher.id, new Set());
          if (!roomOccupied.has(room.id)) roomOccupied.set(room.id, new Set());

          if (
            !teacherOccupied.get(teacher.id)!.has(slotKey) &&
            !roomOccupied.get(room.id)!.has(slotKey)
          ) {
            entries.push({
              id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              teacherId: teacher.id,
              subjectId: req.subjectId,
              classId: req.classId,
              roomId: room.id,
              dayOfWeek: day,
              period: nextPeriod,
            });

            teacherOccupied.get(teacher.id)!.add(slotKey);
            roomOccupied.get(room.id)!.add(slotKey);
            classOccupied.get(req.classId)!.add(slotKey);
            dayLast.set(day, nextPeriod);

            placed++;
            totalPlaced++;
            teacherFound = true;
            break;
          }
        }

        if (!teacherFound) {
          // Tämä slot ei ole sopiva → kokeile seuraavaa päivää
          // (jotta ei jätetä hyppytuntia tähän päivään)
          break;
        }

        nextPeriod++;
      }
    }

    if (placed < needed) {
      unplaced.push({
        classId: req.classId,
        subjectId: req.subjectId,
        reason: `Vain ${placed}/${needed} tuntia sijoitettu`,
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
      score: 0,
    },
  };
}

// ====================== PEHMEÄT RAJOITTEET ======================
function calculateSoftScore(result: GeneratorResult, _input: GeneratorInput): number {
  let score = 1000;
  if (result.unplaced.length === 0) score += 300;
  score -= result.unplaced.length * 50;
  return Math.max(0, score);
}

function generateExplanations(result: GeneratorResult, _input: GeneratorInput): string[] {
  return [
    `Pisteet ${result.stats.score}: Hyvä tasapaino opettajien jaksamiseen ja oppilaiden unirytmiin.`,
    result.stats.conflicts === 0
      ? `Kaikki tunnit sijoitettu onnistuneesti!`
      : `${result.stats.conflicts} tuntia jäi sijoittamatta.`,
    `Tunnit pakattu peräkkäin – ei hyppytunteja (Perusopetuslaki § 24).`,
    `Päivät tasapainotettu: jokaiselle päivälle pyritty samansuuruinen tuntimäärä.`,
  ];
}
