import type { TimetableEntry, SchoolClass } from '@/types/timetable';

export interface ValidationWarning {
  severity: 'error' | 'warning';
  classId: string;
  dayOfWeek?: number;
  message: string;
  lawReference: string;
  suggestion?: string;
}

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

    // 1. Hyppytuntitarkistus (OPS 2014, perusopetuslaki 24 §)
    warnings.push(...checkGapHours(classEntries, cls));

    // 2. Päivittäinen enimmäistuntimäärä (perusopetusasetus 852/1998 § 4)
    warnings.push(...checkDailyMaxHours(classEntries, cls));

    // 3. Viikottainen vähimmäistuntimäärä (perusopetusasetus 852/1998 § 3)
    warnings.push(...checkWeeklyMinHours(classEntries, cls));
  }

  return warnings;
}

/**
 * Sääntö 1: Hyppytuntitarkistus
 * Perusopetuksessa (luokat 1–9) oppilaalla ei saa olla hyppytunteja koulupäivän aikana.
 * Peruste: Perusopetuslaki 628/1998 § 24 – oppilaan työmäärä, OPS 2014 luku 4.
 */
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
      if (!periods.includes(p)) {
        gaps.push(p);
      }
    }

    if (gaps.length > 0) {
      const dayNames = ['', 'maanantaina', 'tiistaina', 'keskiviikkona', 'torstaina', 'perjantaina'];
      warnings.push({
        severity: 'error',
        classId: cls.id,
        dayOfWeek: day,
        message: `Luokalla ${cls.name} on hyppytunti ${dayNames[day]} (tunti${gaps.length > 1 ? 't' : ''} ${gaps.join(', ')}).`,
        lawReference: 'Perusopetuslaki 628/1998 § 24; OPS 2014 luku 4 – Oppilaalla ei saa olla tyhjää tuntia koulupäivän sisällä.',
        suggestion: generateGapFixSuggestion(entries, cls, day, gaps),
      });
    }
  }

  return warnings;
}

/**
 * Sääntö 2: Päivittäinen enimmäistuntimäärä
 * Perusopetusasetus 852/1998 § 4:
 * - Luokat 1–2: enintään 5 oppituntia/päivä
 * - Luokat 3–9: enintään 7 oppituntia/päivä
 * - Luokat 7–9: voi väliaikaisesti ylittää 7 tuntia perustellusti
 */
function checkDailyMaxHours(entries: TimetableEntry[], cls: SchoolClass): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const maxHours = cls.gradeLevel <= 2 ? 5 : 7;

  for (let day = 1; day <= 5; day++) {
    const dayCount = entries.filter(e => e.dayOfWeek === day).length;
    if (dayCount > maxHours) {
      const dayNames = ['', 'maanantaina', 'tiistaina', 'keskiviikkona', 'torstaina', 'perjantaina'];
      warnings.push({
        severity: dayCount > maxHours + 1 ? 'error' : 'warning',
        classId: cls.id,
        dayOfWeek: day,
        message: `Luokalla ${cls.name} on ${dayCount} oppituntia ${dayNames[day]} (enimmäismäärä: ${maxHours}).`,
        lawReference: `Perusopetusasetus 852/1998 § 4 – ${cls.gradeLevel <= 2 ? 'Luokkien 1–2' : 'Luokkien 3–9'} päivittäinen enimmäistuntimäärä on ${maxHours}${cls.gradeLevel >= 7 ? ' (väliaikainen ylitys mahdollinen 7–9-luokilla)' : ''}.`,
        suggestion: `Siirrä ${dayCount - maxHours} oppituntia toiselle päivälle tasaisemman kuormituksen saavuttamiseksi.`,
      });
    }
  }

  return warnings;
}

/**
 * Sääntö 3: Viikottainen vähimmäistuntimäärä
 * Perusopetusasetus 852/1998 § 3
 */
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

/**
 * Generoi optimointiehdotus hyppytunnin korjaamiseksi.
 */
function generateGapFixSuggestion(
  allEntries: TimetableEntry[],
  cls: SchoolClass,
  day: number,
  gaps: number[]
): string {
  const classEntries = allEntries.filter(e => e.classId === cls.id && e.dayOfWeek === day);
  const periods = classEntries.map(e => e.period).sort((a, b) => a - b);
  const lastPeriod = periods[periods.length - 1];

  // Strategy 1: Move lessons after the gap earlier
  const lessonsAfterGap = classEntries.filter(e => e.period > gaps[0]).length;
  if (lessonsAfterGap > 0) {
    const targetStart = gaps[0];
    return `Ehdotus: Siirrä tunnit ${gaps[gaps.length - 1] + 1}–${lastPeriod} aikaisemmiksi (→ tunnit ${targetStart}–${targetStart + lessonsAfterGap - 1}), jolloin hyppytunti poistuu ja koulupäivä lyhenee.`;
  }

  return 'Täytä tyhjä tunti siirtämällä opetusta toiselta päivältä tai lisäämällä oppiaine tälle tunnille.';
}
