// src/lib/opsCurriculum.ts
import type { LessonRequirement, SchoolClass, Subject } from '@/types/timetable';

/**
 * OPS 2014 -mukaisten tuntimäärien pohja (yksinkertaistettu, mutta realistinen)
 * Voit muokata näitä myöhemmin paikallisen OPSin mukaan.
 */
const OPS_HOURS: Record<number, Record<string, number>> = {
  // 1-2 lk
  1: { äidinkieli: 7, matematiikka: 4, ympäristöoppi: 2, liikunta: 2, musiikki: 2, kuvataide: 2 },
  2: { äidinkieli: 7, matematiikka: 4, ympäristöoppi: 2, liikunta: 2, musiikki: 2, kuvataide: 2 },
  // 3-6 lk
  3: { äidinkieli: 5, matematiikka: 4, ympäristöoppi: 2, englanti: 2, liikunta: 3, musiikki: 2, kuvataide: 2, kotitalous: 1, käsityö: 2 },
  4: { äidinkieli: 5, matematiikka: 4, ympäristöoppi: 2, englanti: 2, liikunta: 3, musiikki: 2, kuvataide: 2, kotitalous: 1, käsityö: 2 },
  5: { äidinkieli: 4, matematiikka: 4, ympäristöoppi: 3, englanti: 2, liikunta: 3, musiikki: 2, kuvataide: 2, kotitalous: 2, käsityö: 2 },
  6: { äidinkieli: 4, matematiikka: 4, ympäristöoppi: 3, englanti: 2, liikunta: 3, musiikki: 2, kuvataide: 2, kotitalous: 2, käsityö: 2 },
  // 7-9 lk
  7: { äidinkieli: 3, matematiikka: 3, englanti: 2, ruotsi: 2, historia: 2, yhteiskuntaoppi: 2, uskonto: 2, liikunta: 3, kotitalous: 3, käsityö: 3 },
  8: { äidinkieli: 3, matematiikka: 4, englanti: 2, ruotsi: 2, historia: 2, yhteiskuntaoppi: 2, uskonto: 2, liikunta: 3, kotitalous: 3, käsityö: 3 },
  9: { äidinkieli: 4, matematiikka: 4, englanti: 2, ruotsi: 2, historia: 2, yhteiskuntaoppi: 2, uskonto: 2, liikunta: 3, kotitalous: 3, käsityö: 3 },
};

/**
 * Luo automaattisesti tuntivaatimukset OPS 2014 -perusteella luokka-asteelle
 */
export function generateOPSRequirements(
  schoolClass: SchoolClass,
  subjects: Subject[]
): LessonRequirement[] {
  const level = schoolClass.level || 7; // default yläluokka
  const hoursMap = OPS_HOURS[level] || OPS_HOURS[7];

  return subjects
    .map(subject => {
      const hours = hoursMap[subject.name.toLowerCase()] || 
                   hoursMap[subject.abbreviation?.toLowerCase() || ''] || 
                   2; // fallback

      if (hours > 0) {
        return {
          classId: schoolClass.id,
          subjectId: subject.id,
          hoursPerWeek: hours,
        };
      }
      return null;
    })
    .filter(Boolean) as LessonRequirement[];
}

/**
 * Wilma-tuonnin placeholder (myöhemmin CSV/Excel-parsing)
 */
export function importRequirementsFromWilma(csvData: string): LessonRequirement[] {
  // Tässä myöhemmin PapaParse + Wilma-formaatin käsittely
  console.log('Wilma-tuonti tulossa...');
  return [];
}

export { generateOPSRequirements };
