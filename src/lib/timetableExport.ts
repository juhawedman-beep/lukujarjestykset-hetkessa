// src/lib/timetableExport.ts
import Papa from 'papaparse';
import type { GeneratorResult, GeneratorInput } from './timetableGenerator';
import type { TimetableEntry } from '@/types/timetable';

const DAY_NAMES = ['Ma', 'Ti', 'Ke', 'To', 'Pe'] as const;

/**
 * Vie lukujärjestys Kurre/Primus/Wilma-yhteensopivaan CSV-muotoon
 */
export function exportTimetableToKurreCSV(
  result: GeneratorResult,
  input: GeneratorInput,
  resultIndex = 0 // jos useita vaihtoehtoja, valitse 0 = paras
): string {
  const timetable = result.entries || [];

  const data = timetable.map((entry: TimetableEntry) => {
    const classObj = input.classes.find(c => c.id === entry.classId);
    const subjectObj = input.subjects.find(s => s.id === entry.subjectId);
    const teacherObj = input.teachers.find(t => t.id === entry.teacherId);
    const roomObj = input.rooms.find(r => r.id === entry.roomId);

    return {
      Luokka: classObj?.name || entry.classId,
      Aine: subjectObj?.name || entry.subjectId,
      'Aine-lyhente': subjectObj?.abbreviation || '',
      Opettaja: `${teacherObj?.firstName || ''} ${teacherObj?.lastName || ''}`.trim() || entry.teacherId,
      Päivä: DAY_NAMES[entry.dayOfWeek - 1] || `P${entry.dayOfWeek}`,
      'Tuntinumero': entry.period,
      Tila: roomObj?.name || entry.roomId,
      'Tuntityyppi': subjectObj?.category || '',
    };
  });

  // Lisää metadata riviksi alkuun (Kurre tykkää)
  const metadata = [
    ['Lukujärjestys-generoitu', new Date().toLocaleDateString('fi-FI')],
    ['Vaihtoehto', `Vaihtoehto ${resultIndex + 1} (pisteet: ${result.stats.score})`],
    ['Yhteensä tunteja', result.stats.totalPlaced],
    ['', ''],
  ];

  const csv = Papa.unparse([...metadata, ...data], {
    header: true,
    delimiter: ';', // suomalainen Excel tykkää puolipisteestä
    quotes: true,
  });

  return csv;
}

/**
 * Lataa CSV-tiedosto suoraan selaimessa
 */
export function downloadTimetableAsCSV(
  result: GeneratorResult,
  input: GeneratorInput,
  filename = 'lukujarjestys-kurre.csv'
) {
  const csv = exportTimetableToKurreCSV(result, input);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


