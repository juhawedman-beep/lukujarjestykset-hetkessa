import type { TimetableEntry, SchoolClass, Teacher, Room } from '@/types/timetable';

export interface ValidationWarning {
  severity: 'error' | 'warning';
  classId: string;
  dayOfWeek?: number;
  message: string;
  lawReference: string;
  suggestion?: string;
}

export interface ConflictWarning {
  severity: 'error' | 'warning';
  type: 'teacher_conflict' | 'room_conflict';
  dayOfWeek: number;
  period: number;
  message: string;
  lawReference: string;
  entryIds: string[];
}

const DAY_NAMES = ['', 'maanantaina', 'tiistaina', 'keskiviikkona', 'torstaina', 'perjantaina'];

/**
 * Validoi lukujärjestyksen Suomen perusopetuslain (628/1998) 
 * ja perusopetusasetuksen (852/1998) mukaisesti.
 */
export function validateTimetable(
  entries: TimetableEntry[],
  classes: SchoolClass[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (const cls of classes) {
    const classEntries = entries.filter(e => e.classId === cls.id);
    warnings.push(...checkGapHours(classEntries, cls));
    warnings.push(...checkDailyMaxHours(classEntries, cls));
    warnings.push(...checkWeeklyMinHours(classEntries, cls));
  }

  return warnings;
}

/**
 * Tarkista opettaja- ja tilapäällekkäisyydet.
 * Hallintolaki 434/2003 § 6 – tasapuolisuusperiaate.
 * Yhdenvertaisuuslaki 1325/2014 – tilankäytön tasapuolisuus.
 */
export function detectConflicts(
  entries: TimetableEntry[],
  teachers: Teacher[],
  rooms: Room[]
): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const roomMap = new Map(rooms.map(r => [r.id, r]));

  // Group entries by (day, period)
  const slotMap = new Map<string, TimetableEntry[]>();
  for (const e of entries) {
    const key = `${e.dayOfWeek}-${e.period}`;
    if (!slotMap.has(key)) slotMap.set(key, []);
    slotMap.get(key)!.push(e);
  }

  for (const [, slotEntries] of slotMap) {
    if (slotEntries.length < 2) continue;
    const day = slotEntries[0].dayOfWeek;
    const period = slotEntries[0].period;

    // Teacher conflicts
    const teacherGroups = new Map<string, TimetableEntry[]>();
    for (const e of slotEntries) {
      if (!teacherGroups.has(e.teacherId)) teacherGroups.set(e.teacherId, []);
      teacherGroups.get(e.teacherId)!.push(e);
    }
    for (const [teacherId, group] of teacherGroups) {
      if (group.length > 1) {
        const teacher = teacherMap.get(teacherId);
        const name = teacher ? `${teacher.firstName} ${teacher.lastName}` : teacherId;
        const classIds = group.map(e => e.classId).join(', ');
        warnings.push({
          severity: 'error',
          type: 'teacher_conflict',
          dayOfWeek: day,
          period,
          message: `Opettaja ${name} on merkitty kahdelle ryhmälle samaan aikaan ${DAY_NAMES[day]} tunnilla ${period} (ryhmät: ${classIds}).`,
          lawReference: 'Hallintolaki 434/2003 § 6 – Hallinnon oikeusperiaatteet edellyttävät, ettei lukujärjestyksessä ole toteutumiskelvottomia merkintöjä.',
          entryIds: group.map(e => e.id),
        });
      }
    }

    // Room conflicts
    const roomGroups = new Map<string, TimetableEntry[]>();
    for (const e of slotEntries) {
      if (!roomGroups.has(e.roomId)) roomGroups.set(e.roomId, []);
      roomGroups.get(e.roomId)!.push(e);
    }
    for (const [roomId, group] of roomGroups) {
      if (group.length > 1) {
        const room = roomMap.get(roomId);
        const roomName = room ? room.name : roomId;
        const classIds = group.map(e => e.classId).join(', ');
        warnings.push({
          severity: 'error',
          type: 'room_conflict',
          dayOfWeek: day,
          period,
          message: `Tila "${roomName}" on varattu kahdelle ryhmälle ${DAY_NAMES[day]} tunnilla ${period} (ryhmät: ${classIds}).`,
          lawReference: 'Yhdenvertaisuuslaki 1325/2014 – Oppilaiden yhdenvertainen pääsy opetustiloihin tulee varmistaa.',
          entryIds: group.map(e => e.id),
        });
      }
    }
  }

  return warnings;
}

// --- Existing class-level validations ---

function checkGapHours(entries: TimetableEntry[], cls: SchoolClass): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (let day = 1; day <= 5; day++) {
    const dayEntries = entries.filter(e => e.dayOfWeek === day);
    if (dayEntries.length === 0) continue;

    const periods = dayEntries.map(e => e.period).sort((a, b) => a - b);
    const firstPeriod = periods[0];
    const lastPeriod = periods[periods.length - 1];

    const gaps: number[] = [];
    for (let p = firstPeriod + 1; p < lastPeriod; p++) {
      if (!periods.includes(p)) gaps.push(p);
    }

    if (gaps.length > 0) {
      warnings.push({
        severity: 'error',
        classId: cls.id,
        dayOfWeek: day,
        message: `Luokalla ${cls.name} on hyppytunti ${DAY_NAMES[day]} (tunti${gaps.length > 1 ? 't' : ''} ${gaps.join(', ')}).`,
        lawReference: 'Perusopetuslaki 628/1998 § 24; OPS 2014 luku 4 – Oppilaalla ei saa olla tyhjää tuntia koulupäivän sisällä.',
        suggestion: generateGapFixSuggestion(entries, cls, day, gaps),
      });
    }
  }

  return warnings;
}

function checkDailyMaxHours(entries: TimetableEntry[], cls: SchoolClass): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const maxHours = cls.gradeLevel <= 2 ? 5 : 7;

  for (let day = 1; day <= 5; day++) {
    const dayCount = entries.filter(e => e.dayOfWeek === day).length;
    if (dayCount > maxHours) {
      warnings.push({
        severity: dayCount > maxHours + 1 ? 'error' : 'warning',
        classId: cls.id,
        dayOfWeek: day,
        message: `Luokalla ${cls.name} on ${dayCount} oppituntia ${DAY_NAMES[day]} (enimmäismäärä: ${maxHours}).`,
        lawReference: `Perusopetusasetus 852/1998 § 4 – ${cls.gradeLevel <= 2 ? 'Luokkien 1–2' : 'Luokkien 3–9'} päivittäinen enimmäistuntimäärä on ${maxHours}${cls.gradeLevel >= 7 ? ' (väliaikainen ylitys mahdollinen 7–9-luokilla)' : ''}.`,
        suggestion: `Siirrä ${dayCount - maxHours} oppituntia toiselle päivälle tasaisemman kuormituksen saavuttamiseksi.`,
      });
    }
  }

  return warnings;
}

function checkWeeklyMinHours(entries: TimetableEntry[], cls: SchoolClass): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const minHoursMap: Record<number, number> = {
    1: 21, 2: 21, 3: 23, 4: 24, 5: 25, 6: 25, 7: 30, 8: 29, 9: 30,
  };
  const minHours = minHoursMap[cls.gradeLevel];
  if (!minHours) return warnings;

  const totalHours = entries.length;
  if (totalHours < minHours) {
    warnings.push({
      severity: 'warning',
      classId: cls.id,
      message: `Luokalla ${cls.name} on vain ${totalHours} oppituntia viikossa (vähimmäismäärä ${cls.gradeLevel}. luokalla: ${minHours}).`,
      lawReference: `Perusopetusasetus 852/1998 § 3 – ${cls.gradeLevel}. vuosiluokalla perusopetusta annetaan keskimäärin vähintään ${minHours} tuntia työviikossa.`,
      suggestion: `Lisää ${minHours - totalHours} oppituntia viikko-ohjelmaan.`,
    });
  }

  return warnings;
}

function generateGapFixSuggestion(
  allEntries: TimetableEntry[],
  cls: SchoolClass,
  day: number,
  gaps: number[]
): string {
  const classEntries = allEntries.filter(e => e.classId === cls.id && e.dayOfWeek === day);
  const periods = classEntries.map(e => e.period).sort((a, b) => a - b);
  const lastPeriod = periods[periods.length - 1];

  const lessonsAfterGap = classEntries.filter(e => e.period > gaps[0]).length;
  if (lessonsAfterGap > 0) {
    const targetStart = gaps[0];
    return `Ehdotus: Siirrä tunnit ${gaps[gaps.length - 1] + 1}–${lastPeriod} aikaisemmiksi (→ tunnit ${targetStart}–${targetStart + lessonsAfterGap - 1}), jolloin hyppytunti poistuu ja koulupäivä lyhenee.`;
  }

  return 'Täytä tyhjä tunti siirtämällä opetusta toiselta päivältä tai lisäämällä oppiaine tälle tunnille.';
}
