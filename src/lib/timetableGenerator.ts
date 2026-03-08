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
  };
}

// Room type affinity: which subject categories prefer which room types
const CATEGORY_ROOM_PREFERENCE: Record<string, string[]> = {
  sports: ['gym'],
  arts: ['art', 'music', 'workshop'],
  science: ['science_lab'],
};

/**
 * Automaattinen lukujärjestysgeneraattori.
 * 
 * Käyttää greedy-algoritmia rajoitteineen:
 * 1. Järjestää vaatimukset rajoittavimmasta alkaen (vähiten sopivia slotteja)
 * 2. Jokaiselle tunnille etsii parhaan vapaan slotin
 * 3. Huomioi: opettajapäällekkäisyydet, tilapäällekkäisyydet, hyppytuntikielto, päivittäiset enimmäistunnit
 */
export function generateTimetable(input: GeneratorInput): GeneratorResult {
  const {
    classes,
    teachers,
    subjects,
    rooms,
    requirements,
    teacherHomeRooms,
    periodsPerDay,
    daysPerWeek = 5,
  } = input;

  const entries: TimetableEntry[] = [];
  const unplaced: GeneratorResult['unplaced'] = [];
  let entryId = 0;

  // Build lookup maps
  const teacherBySubject = new Map<string, Teacher[]>();
  for (const t of teachers) {
    for (const sid of t.subjects) {
      if (!teacherBySubject.has(sid)) teacherBySubject.set(sid, []);
      teacherBySubject.get(sid)!.push(t);
    }
  }

  const homeRoomMap = new Map<string, string>();
  for (const hr of teacherHomeRooms) {
    homeRoomMap.set(hr.teacherId, hr.roomId);
  }

  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const roomMap = new Map(rooms.map(r => [r.id, r]));

  // Occupancy tracking: who is busy when
  const teacherOccupied = new Set<string>(); // "teacherId-day-period"
  const roomOccupied = new Map<string, number>(); // "roomId-day-period" → count
  const classSchedule = new Map<string, Set<number>[]>(); // classId → [day1periods, day2periods, ...]

  const classMaxDaily = new Map<string, number>();
  for (const cls of classes) {
    classMaxDaily.set(cls.id, cls.gradeLevel <= 2 ? 5 : 7);
    const days: Set<number>[] = [];
    for (let d = 0; d <= daysPerWeek; d++) days.push(new Set());
    classSchedule.set(cls.id, days);
  }

  function isTeacherFree(teacherId: string, day: number, period: number): boolean {
    return !teacherOccupied.has(`${teacherId}-${day}-${period}`);
  }

  function isRoomAvailable(roomId: string, day: number, period: number): boolean {
    const key = `${roomId}-${day}-${period}`;
    const count = roomOccupied.get(key) ?? 0;
    const room = roomMap.get(roomId);
    const max = room?.maxConcurrent ?? 1;
    return count < max;
  }

  function markOccupied(teacherId: string, roomId: string, classId: string, day: number, period: number) {
    teacherOccupied.add(`${teacherId}-${day}-${period}`);
    const rKey = `${roomId}-${day}-${period}`;
    roomOccupied.set(rKey, (roomOccupied.get(rKey) ?? 0) + 1);
    classSchedule.get(classId)![day].add(period);
  }

  function getClassDayPeriods(classId: string, day: number): number[] {
    const set = classSchedule.get(classId)?.[day];
    return set ? Array.from(set).sort((a, b) => a - b) : [];
  }

  function wouldCreateGap(classId: string, day: number, period: number): boolean {
    const existing = getClassDayPeriods(classId, day);
    if (existing.length === 0) return false;
    const all = [...existing, period].sort((a, b) => a - b);
    for (let i = 1; i < all.length; i++) {
      if (all[i] - all[i - 1] > 1) return true;
    }
    return false;
  }

  function classDayCount(classId: string, day: number): number {
    return classSchedule.get(classId)?.[day]?.size ?? 0;
  }

  // Expand requirements into individual lesson slots to place
  interface LessonToPlace {
    classId: string;
    subjectId: string;
    priority: number; // lower = place first (more constrained)
  }

  const lessonsToPlace: LessonToPlace[] = [];
  for (const req of requirements) {
    const availableTeachers = teacherBySubject.get(req.subjectId) ?? [];
    // Priority: fewer available teachers + subject category constraints → more constrained
    const priority = availableTeachers.length;
    for (let h = 0; h < req.hoursPerWeek; h++) {
      lessonsToPlace.push({ classId: req.classId, subjectId: req.subjectId, priority });
    }
  }

  // Sort: most constrained first
  lessonsToPlace.sort((a, b) => a.priority - b.priority);

  // Try to spread same-subject lessons across different days
  const classSubjectDays = new Map<string, Set<number>>(); // "classId-subjectId" → placed days

  function getKey(classId: string, subjectId: string) {
    return `${classId}-${subjectId}`;
  }

  // Find best room for a subject+teacher combo
  function findBestRoom(subjectId: string, teacherId: string, day: number, period: number, studentCount: number): string | null {
    const subject = subjectMap.get(subjectId);
    const category = subject?.category ?? '';
    const preferredTypes = CATEGORY_ROOM_PREFERENCE[category] ?? [];
    const homeRoom = homeRoomMap.get(teacherId);

    // Candidate rooms sorted by preference
    const candidates = rooms
      .filter(r => r.capacity >= studentCount && isRoomAvailable(r.id, day, period))
      .sort((a, b) => {
        // Home room first
        if (a.id === homeRoom) return -1;
        if (b.id === homeRoom) return 1;
        // Preferred type
        const aPreferred = preferredTypes.includes(a.type) ? 0 : 1;
        const bPreferred = preferredTypes.includes(b.type) ? 0 : 1;
        if (aPreferred !== bPreferred) return aPreferred - bPreferred;
        // Smaller room preferred (less waste)
        return a.capacity - b.capacity;
      });

    return candidates[0]?.id ?? null;
  }

  // Place each lesson
  for (const lesson of lessonsToPlace) {
    const cls = classes.find(c => c.id === lesson.classId)!;
    const availableTeachers = teacherBySubject.get(lesson.subjectId) ?? [];
    const maxDaily = classMaxDaily.get(lesson.classId) ?? 7;
    const key = getKey(lesson.classId, lesson.subjectId);

    if (!classSubjectDays.has(key)) classSubjectDays.set(key, new Set());
    const usedDays = classSubjectDays.get(key)!;

    let placed = false;

    // Score each possible (day, period, teacher) combination
    interface Candidate {
      day: number;
      period: number;
      teacherId: string;
      roomId: string;
      score: number;
    }

    const candidates: Candidate[] = [];

    for (let day = 1; day <= daysPerWeek; day++) {
      if (classDayCount(lesson.classId, day) >= maxDaily) continue;

      for (let period = 1; period <= periodsPerDay; period++) {
        // Class slot must be free
        if (classSchedule.get(lesson.classId)?.[day]?.has(period)) continue;

        // Check gap creation
        const createsGap = wouldCreateGap(lesson.classId, day, period);

        for (const teacher of availableTeachers) {
          if (!isTeacherFree(teacher.id, day, period)) continue;

          const roomId = findBestRoom(lesson.subjectId, teacher.id, day, period, cls.studentCount);
          if (!roomId) continue;

          // Score: higher is worse
          let score = 0;
          if (createsGap) score += 100; // heavily penalize gaps
          if (usedDays.has(day)) score += 20; // prefer spreading across days
          // Prefer earlier periods to fill days from start
          score += period * 0.5;
          // Prefer balanced days - penalize days that already have many lessons
          score += classDayCount(lesson.classId, day) * 3;

          candidates.push({ day, period, teacherId: teacher.id, roomId, score });
        }
      }
    }

    // Pick best candidate
    candidates.sort((a, b) => a.score - b.score);

    if (candidates.length > 0) {
      const best = candidates[0];
      entries.push({
        id: `gen_${++entryId}`,
        teacherId: best.teacherId,
        subjectId: lesson.subjectId,
        classId: lesson.classId,
        roomId: best.roomId,
        dayOfWeek: best.day,
        period: best.period,
      });
      markOccupied(best.teacherId, best.roomId, lesson.classId, best.day, best.period);
      usedDays.add(best.day);
      placed = true;
    }

    if (!placed) {
      const subjectName = subjectMap.get(lesson.subjectId)?.name ?? lesson.subjectId;
      const className = cls.name;
      unplaced.push({
        classId: lesson.classId,
        subjectId: lesson.subjectId,
        reason: `Ei löydy vapaata slotia aineelle ${subjectName} luokalle ${className}. Tarkista opettaja- ja tilaresurssit.`,
      });
    }
  }

  return {
    entries,
    unplaced,
    stats: {
      totalPlaced: entries.length,
      totalRequired: lessonsToPlace.length,
      conflicts: unplaced.length,
    },
  };
}

/**
 * Luo oletusvaatimukset demodata-pohjalta peruskoulun tuntijaon mukaan.
 */
export function createDefaultRequirements(
  classes: SchoolClass[],
  subjects: Subject[]
): LessonRequirement[] {
  // Perusopetuksen suuntaa-antava tuntijako vuosiluokille 7-9
  const defaultHours: Record<string, Record<string, number>> = {
    '7': { ai: 3, ma: 3, en: 2, ru: 2, hi: 2, bi: 2, ge: 1, fy: 1, ke: 1, mu: 1, ku: 2, ks: 0, li: 2, ue: 1, ko: 0 },
    '8': { ai: 3, ma: 3, en: 2, ru: 2, hi: 2, bi: 1, ge: 1, fy: 2, ke: 1, mu: 1, ku: 0, ks: 2, li: 2, ue: 1, ko: 3 },
    '9': { ai: 2, ma: 3, en: 2, ru: 2, hi: 2, yh: 2, bi: 1, ge: 1, fy: 2, ke: 1, mu: 0, ku: 0, li: 2, ue: 1, ko: 0 },
  };

  const requirements: LessonRequirement[] = [];

  for (const cls of classes) {
    const level = String(cls.gradeLevel);
    const hours = defaultHours[level];
    if (!hours) continue;

    for (const [subjectId, hoursPerWeek] of Object.entries(hours)) {
      if (hoursPerWeek <= 0) continue;
      if (!subjects.find(s => s.id === subjectId)) continue;
      requirements.push({ classId: cls.id, subjectId, hoursPerWeek });
    }
  }

  return requirements;
}

/**
 * Luo oletuskotiluokat opettajille (ensimmäinen vapaa classroom).
 */
export function createDefaultHomeRooms(
  teachers: Teacher[],
  rooms: Room[]
): TeacherHomeRoom[] {
  const classrooms = rooms.filter(r => r.type === 'classroom');
  return teachers.map((t, i) => ({
    teacherId: t.id,
    roomId: classrooms[i % classrooms.length]?.id ?? rooms[0]?.id ?? '',
  }));
}
