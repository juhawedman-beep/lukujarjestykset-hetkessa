export type SubjectCategory = 
  | 'arts'      // Taito- ja taideaineet (musiikki, kuvataide, käsityö)
  | 'sports'    // Liikunta
  | 'theory'    // Teoria-aineet (uskonto, historia, yhteiskuntaoppi)
  | 'languages' // Kielet (äidinkieli, englanti, ruotsi)
  | 'math'      // Matematiikka
  | 'science'   // Luonnontieteet (fysiikka, kemia, biologia, maantieto)
  | 'free';     // Vapaa / ei opetusta

export interface Subject {
  id: string;
  name: string;
  abbreviation: string;
  category: SubjectCategory;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  subjects: string[]; // subject ids
}

export interface SchoolClass {
  id: string;
  name: string;       // e.g. "3A"
  gradeLevel: number;  // 1-9
  studentCount: number;
}

export interface Room {
  id: string;
  name: string;
  type: 'classroom' | 'gym' | 'music' | 'art' | 'workshop' | 'science_lab' | 'it_room';
  capacity: number;
  maxConcurrent?: number; // How many groups can use the room simultaneously (default 1)
}

export interface TimeSlot {
  period: number;     // 1-8
  startTime: string;  // "08:00"
  endTime: string;    // "08:45"
}

export type AdditionalTeacherRole = 'co_teacher' | 'special_education' | 'assistant';

export const ROLE_LABELS_FI: Record<AdditionalTeacherRole, string> = {
  co_teacher: 'Yhteisopettaja',
  special_education: 'Erityisopettaja',
  assistant: 'Kouluavustaja',
};

export interface AdditionalTeacher {
  teacherId: string;
  role: AdditionalTeacherRole;
}

export interface TimetableEntry {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  roomId: string;
  dayOfWeek: number;  // 1=ma, 2=ti, 3=ke, 4=to, 5=pe
  period: number;     // 1-8
  additionalTeachers?: AdditionalTeacher[];
}

export const DAYS_FI = ['Ma', 'Ti', 'Ke', 'To', 'Pe'] as const;
export const DAYS_FULL_FI = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'] as const;
