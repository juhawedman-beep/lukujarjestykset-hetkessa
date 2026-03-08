import type { Subject, Teacher, SchoolClass, Room, TimeSlot, TimetableEntry } from '@/types/timetable';

export const subjects: Subject[] = [
  { id: 'ai', name: 'Äidinkieli', abbreviation: 'ÄI', category: 'languages' },
  { id: 'ma', name: 'Matematiikka', abbreviation: 'MA', category: 'math' },
  { id: 'en', name: 'Englanti', abbreviation: 'EN', category: 'languages' },
  { id: 'ru', name: 'Ruotsi', abbreviation: 'RU', category: 'languages' },
  { id: 'hi', name: 'Historia', abbreviation: 'HI', category: 'theory' },
  { id: 'yh', name: 'Yhteiskuntaoppi', abbreviation: 'YH', category: 'theory' },
  { id: 'ue', name: 'Uskonto/ET', abbreviation: 'UE', category: 'theory' },
  { id: 'bi', name: 'Biologia', abbreviation: 'BI', category: 'science' },
  { id: 'ge', name: 'Maantieto', abbreviation: 'GE', category: 'science' },
  { id: 'fy', name: 'Fysiikka', abbreviation: 'FY', category: 'science' },
  { id: 'ke', name: 'Kemia', abbreviation: 'KE', category: 'science' },
  { id: 'mu', name: 'Musiikki', abbreviation: 'MU', category: 'arts' },
  { id: 'ku', name: 'Kuvataide', abbreviation: 'KU', category: 'arts' },
  { id: 'ks', name: 'Käsityö', abbreviation: 'KS', category: 'arts' },
  { id: 'li', name: 'Liikunta', abbreviation: 'LI', category: 'sports' },
  { id: 'ko', name: 'Kotitalous', abbreviation: 'KO', category: 'arts' },
];

export const teachers: Teacher[] = [
  { id: 't1', firstName: 'Marja', lastName: 'Virtanen', subjects: ['ai'] },
  { id: 't2', firstName: 'Pekka', lastName: 'Korhonen', subjects: ['ma', 'fy'] },
  { id: 't3', firstName: 'Anna', lastName: 'Mäkelä', subjects: ['en', 'ru'] },
  { id: 't4', firstName: 'Jukka', lastName: 'Nieminen', subjects: ['hi', 'yh'] },
  { id: 't5', firstName: 'Liisa', lastName: 'Hämäläinen', subjects: ['bi', 'ge'] },
  { id: 't6', firstName: 'Mikko', lastName: 'Laine', subjects: ['mu'] },
  { id: 't7', firstName: 'Sari', lastName: 'Heikkinen', subjects: ['ku', 'ks'] },
  { id: 't8', firstName: 'Timo', lastName: 'Koskinen', subjects: ['li'] },
  { id: 't9', firstName: 'Elina', lastName: 'Järvinen', subjects: ['ke', 'fy'] },
  { id: 't10', firstName: 'Risto', lastName: 'Lehtonen', subjects: ['ue', 'ko'] },
];

export const schoolClasses: SchoolClass[] = [
  { id: 'c7a', name: '7A', gradeLevel: 7, studentCount: 24 },
  { id: 'c7b', name: '7B', gradeLevel: 7, studentCount: 22 },
  { id: 'c8a', name: '8A', gradeLevel: 8, studentCount: 25 },
  { id: 'c8b', name: '8B', gradeLevel: 8, studentCount: 23 },
  { id: 'c9a', name: '9A', gradeLevel: 9, studentCount: 26 },
  { id: 'c9b', name: '9B', gradeLevel: 9, studentCount: 21 },
];

export const rooms: Room[] = [
  { id: 'r1', name: 'Luokka 101', type: 'classroom', capacity: 30 },
  { id: 'r2', name: 'Luokka 102', type: 'classroom', capacity: 30 },
  { id: 'r3', name: 'Luokka 103', type: 'classroom', capacity: 30 },
  { id: 'r4', name: 'Liikuntasali', type: 'gym', capacity: 60, maxConcurrent: 2 },
  { id: 'r5', name: 'Musiikkiluokka', type: 'music', capacity: 30 },
  { id: 'r6', name: 'Kuvataideluokka', type: 'art', capacity: 25 },
  { id: 'r7', name: 'Tekninen työ', type: 'workshop', capacity: 16 },
  { id: 'r8', name: 'Fysiikan lab', type: 'science_lab', capacity: 24 },
  { id: 'r9', name: 'Kotitalousluokka', type: 'classroom', capacity: 16 },
];

export const timeSlots: TimeSlot[] = [
  { period: 1, startTime: '08:00', endTime: '08:45' },
  { period: 2, startTime: '08:55', endTime: '09:40' },
  { period: 3, startTime: '09:50', endTime: '10:35' },
  { period: 4, startTime: '10:55', endTime: '11:40' },
  { period: 5, startTime: '11:50', endTime: '12:35' },
  { period: 6, startTime: '13:00', endTime: '13:45' },
  { period: 7, startTime: '13:55', endTime: '14:40' },
  { period: 8, startTime: '14:50', endTime: '15:35' },
];

// Generate demo timetable entries for all teachers
function generateEntries(): TimetableEntry[] {
  const entries: TimetableEntry[] = [];
  let id = 0;

  const addEntry = (teacherId: string, subjectId: string, classId: string, roomId: string, day: number, period: number) => {
    entries.push({ id: `e${++id}`, teacherId, subjectId, classId, roomId, dayOfWeek: day, period });
  };

  // t1 Marja - Äidinkieli (AI) - teaches 7A, 7B, 8A
  addEntry('t1', 'ai', 'c7a', 'r1', 1, 1);
  addEntry('t1', 'ai', 'c7a', 'r1', 1, 2);
  addEntry('t1', 'ai', 'c7b', 'r1', 1, 4);
  addEntry('t1', 'ai', 'c7b', 'r1', 1, 5);
  addEntry('t1', 'ai', 'c8a', 'r1', 2, 1);
  addEntry('t1', 'ai', 'c8a', 'r1', 2, 2);
  addEntry('t1', 'ai', 'c7a', 'r1', 3, 3);
  addEntry('t1', 'ai', 'c7b', 'r1', 3, 4);
  addEntry('t1', 'ai', 'c8a', 'r1', 4, 1);
  addEntry('t1', 'ai', 'c7a', 'r1', 5, 2);
  addEntry('t1', 'ai', 'c7b', 'r1', 5, 3);
  addEntry('t1', 'ai', 'c8a', 'r1', 5, 5);

  // t2 Pekka - MA, FY - teaches 7A, 8A, 8B, 9A
  addEntry('t2', 'ma', 'c7a', 'r2', 1, 3);
  addEntry('t2', 'ma', 'c8a', 'r2', 1, 6);
  addEntry('t2', 'fy', 'c9a', 'r8', 2, 3);
  addEntry('t2', 'fy', 'c9a', 'r8', 2, 4);
  addEntry('t2', 'ma', 'c8b', 'r2', 2, 5);
  addEntry('t2', 'ma', 'c7a', 'r2', 3, 1);
  addEntry('t2', 'ma', 'c8a', 'r2', 3, 5);
  addEntry('t2', 'fy', 'c8b', 'r8', 4, 3);
  addEntry('t2', 'ma', 'c8b', 'r2', 4, 4);
  addEntry('t2', 'ma', 'c7a', 'r2', 4, 6);
  addEntry('t2', 'ma', 'c9a', 'r2', 5, 1);
  addEntry('t2', 'ma', 'c8a', 'r2', 5, 4);

  // t3 Anna - EN, RU - teaches 7A, 7B, 8A, 9B
  addEntry('t3', 'en', 'c7a', 'r3', 1, 7);
  addEntry('t3', 'en', 'c7b', 'r3', 2, 1);
  addEntry('t3', 'ru', 'c8a', 'r3', 2, 6);
  addEntry('t3', 'en', 'c9b', 'r3', 3, 2);
  addEntry('t3', 'en', 'c7a', 'r3', 3, 6);
  addEntry('t3', 'ru', 'c8a', 'r3', 4, 2);
  addEntry('t3', 'en', 'c7b', 'r3', 4, 5);
  addEntry('t3', 'en', 'c9b', 'r3', 5, 1);
  addEntry('t3', 'ru', 'c9b', 'r3', 5, 6);

  // t4 Jukka - HI, YH - teaches 8A, 8B, 9A, 9B
  addEntry('t4', 'hi', 'c8a', 'r1', 1, 3);
  // conflict fix - use r3 instead
  addEntry('t4', 'yh', 'c9a', 'r3', 1, 5);
  addEntry('t4', 'hi', 'c8b', 'r1', 2, 4);
  addEntry('t4', 'yh', 'c9b', 'r3', 2, 5);
  addEntry('t4', 'hi', 'c9a', 'r1', 3, 1);
  addEntry('t4', 'hi', 'c9b', 'r1', 4, 4);
  addEntry('t4', 'yh', 'c8a', 'r1', 4, 5);
  addEntry('t4', 'hi', 'c8a', 'r1', 5, 3);

  // t5 Liisa - BI, GE - teaches 7B, 8B, 9A
  addEntry('t5', 'bi', 'c7b', 'r2', 1, 1);
  addEntry('t5', 'ge', 'c9a', 'r2', 1, 4);
  addEntry('t5', 'bi', 'c8b', 'r2', 2, 2);
  addEntry('t5', 'ge', 'c7b', 'r2', 3, 3);
  addEntry('t5', 'bi', 'c9a', 'r2', 3, 4);
  addEntry('t5', 'ge', 'c8b', 'r2', 4, 1);
  addEntry('t5', 'bi', 'c7b', 'r2', 5, 2);

  // t6 Mikko - MU - teaches all classes
  addEntry('t6', 'mu', 'c7a', 'r5', 2, 7);
  addEntry('t6', 'mu', 'c7b', 'r5', 3, 7);
  addEntry('t6', 'mu', 'c8a', 'r5', 4, 7);
  addEntry('t6', 'mu', 'c8b', 'r5', 1, 7);
  addEntry('t6', 'mu', 'c9a', 'r5', 5, 7);

  // t7 Sari - KU, KS - teaches all classes
  addEntry('t7', 'ku', 'c7a', 'r6', 2, 5);
  addEntry('t7', 'ku', 'c7a', 'r6', 2, 6);
  addEntry('t7', 'ks', 'c8a', 'r7', 3, 5);
  addEntry('t7', 'ks', 'c8a', 'r7', 3, 6);
  addEntry('t7', 'ku', 'c9b', 'r6', 4, 5);
  addEntry('t7', 'ku', 'c9b', 'r6', 4, 6);
  addEntry('t7', 'ks', 'c7b', 'r7', 5, 4);
  addEntry('t7', 'ks', 'c7b', 'r7', 5, 5);

  // t8 Timo - LI - teaches all classes (spread across days)
  addEntry('t8', 'li', 'c7a', 'r4', 1, 5);
  addEntry('t8', 'li', 'c7a', 'r4', 1, 6);
  addEntry('t8', 'li', 'c8b', 'r4', 2, 1);
  addEntry('t8', 'li', 'c8b', 'r4', 2, 2);
  addEntry('t8', 'li', 'c9a', 'r4', 3, 1);
  addEntry('t8', 'li', 'c9a', 'r4', 3, 2);
  addEntry('t8', 'li', 'c9b', 'r4', 4, 1);
  addEntry('t8', 'li', 'c9b', 'r4', 4, 2);
  addEntry('t8', 'li', 'c7b', 'r4', 5, 1);
  addEntry('t8', 'li', 'c7b', 'r4', 5, 2);

  // t9 Elina - KE, FY - teaches 7B, 9A, 9B
  addEntry('t9', 'ke', 'c9a', 'r8', 1, 2);
  addEntry('t9', 'fy', 'c7b', 'r8', 1, 3);
  addEntry('t9', 'ke', 'c9b', 'r8', 3, 3);
  addEntry('t9', 'fy', 'c9b', 'r8', 3, 4);
  addEntry('t9', 'ke', 'c7b', 'r8', 4, 3);
  addEntry('t9', 'fy', 'c9a', 'r8', 5, 3);

  // t10 Risto - UE, KO
  addEntry('t10', 'ue', 'c7a', 'r3', 2, 3);
  addEntry('t10', 'ko', 'c8a', 'r9', 2, 7);
  addEntry('t10', 'ko', 'c8a', 'r9', 2, 8);
  addEntry('t10', 'ue', 'c8b', 'r3', 3, 2);
  addEntry('t10', 'ko', 'c7b', 'r9', 4, 7);
  addEntry('t10', 'ko', 'c7b', 'r9', 4, 8);
  addEntry('t10', 'ue', 'c9a', 'r3', 5, 4);

  return entries;
}

export const timetableEntries: TimetableEntry[] = generateEntries();
