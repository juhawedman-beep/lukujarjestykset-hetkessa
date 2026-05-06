import Papa from 'papaparse';
import type { SubjectCategory } from '@/types/timetable';

export type ImportFormat = 'classes' | 'teachers' | 'requirements' | 'unknown';

export interface ParsedClass {
  name: string;
  gradeLevel: number;
  studentCount: number;
}

export interface ParsedTeacher {
  firstName: string;
  lastName: string;
  subjectAbbreviations: string[]; // e.g. ["MA", "FY"]
}

export interface ParsedRequirement {
  className: string;          // e.g. "7A"
  subjectAbbreviation: string; // e.g. "MA"
  hoursPerWeek: number;
}

export interface ParseResult {
  format: ImportFormat;
  classes: ParsedClass[];
  teachers: ParsedTeacher[];
  requirements: ParsedRequirement[];
  warnings: string[];
  rowCount: number;
}

// --- Header normalization ---------------------------------------------------

function norm(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[äå]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES: Record<string, string[]> = {
  className: ['luokka', 'ryhma', 'ryhman nimi', 'opetusryhma', 'opetusryhman nimi', 'class', 'group', 'kurssi', 'ryhmat'],
  gradeLevel: ['vuosiluokka', 'luokkaaste', 'aste', 'grade', 'vuosi'],
  studentCount: ['oppilasmaara', 'oppilaita', 'koko', 'students', 'count', 'maara'],
  firstName: ['etunimi', 'firstname', 'first', 'etunimet'],
  lastName: ['sukunimi', 'lastname', 'last'],
  fullName: ['nimi', 'name', 'opettaja', 'teacher', 'opettajan nimi'],
  subjects: ['aineet', 'oppiaineet', 'opetettavat', 'subjects', 'opetettavat aineet'],
  subject: ['aine', 'oppiaine', 'subject', 'aineen nimi', 'ainelyhenne', 'lyhenne'],
  hours: ['tunnit', 'vvt', 'vkt', 'vkh', 'viikkotunnit', 'tuntimaara', 'tuntia', 'tuntiavk', 'tvk', 'hours', 'hoursperweek', 'vuosiviikkotunnit'],
};

function findHeaderIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(norm);
  for (const alias of aliases) {
    const idx = normalized.indexOf(norm(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

function detectFormat(headers: string[]): ImportFormat {
  const has = (key: string) => findHeaderIndex(headers, HEADER_ALIASES[key]) !== -1;
  // Requirements: has class + subject + hours (most specific)
  if (has('className') && has('subject') && has('hours')) return 'requirements';
  // Teachers: has name + subjects
  if ((has('firstName') || has('fullName')) && has('subjects')) return 'teachers';
  // Classes: has class name + grade or count
  if (has('className') && (has('gradeLevel') || has('studentCount'))) return 'classes';
  return 'unknown';
}

// --- Helpers ----------------------------------------------------------------

function parseInt0(v: unknown): number {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseGradeFromName(name: string): number {
  // "7A", "9C", "1a" → 7, 9, 1
  const m = name.match(/^(\d{1,2})/);
  return m ? parseInt(m[1], 10) : 0;
}

function splitSubjects(raw: string): string[] {
  return String(raw ?? '')
    .split(/[,;\/|]/)
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

// --- Main parser ------------------------------------------------------------

export async function parseWilmaCsv(file: File): Promise<ParseResult> {
  const text = await file.text();

  // Wilma uses ; as separator usually; let papaparse autodetect.
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [';', ',', '\t', '|'],
  });

  const warnings: string[] = [];
  if (parsed.errors.length > 0) {
    warnings.push(`CSV-jäsennysvaroituksia: ${parsed.errors.length}`);
  }

  const rows = parsed.data;
  const headers = parsed.meta.fields ?? [];
  const format = detectFormat(headers);

  const result: ParseResult = {
    format,
    classes: [],
    teachers: [],
    requirements: [],
    warnings,
    rowCount: rows.length,
  };

  if (format === 'unknown') {
    warnings.push(
      'Sarakkeita ei tunnistettu. Tuetut otsikot: Luokka, Vuosiluokka, Oppilasmäärä, Etunimi, Sukunimi, Aineet, Aine, Tunnit.'
    );
    return result;
  }

  const headerKey = (key: string): string | null => {
    const idx = findHeaderIndex(headers, HEADER_ALIASES[key]);
    return idx === -1 ? null : headers[idx];
  };

  if (format === 'classes') {
    const kName = headerKey('className')!;
    const kGrade = headerKey('gradeLevel');
    const kCount = headerKey('studentCount');
    const seen = new Set<string>();
    for (const row of rows) {
      const name = String(row[kName] ?? '').trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const grade = kGrade ? parseInt0(row[kGrade]) : parseGradeFromName(name);
      const count = kCount ? parseInt0(row[kCount]) : 0;
      if (grade < 1 || grade > 12) {
        warnings.push(`Luokka "${name}": vuosiluokkaa ei voitu päätellä, käytetään 0.`);
      }
      result.classes.push({ name, gradeLevel: grade, studentCount: count });
    }
  }

  if (format === 'teachers') {
    const kFirst = headerKey('firstName');
    const kLast = headerKey('lastName');
    const kFull = headerKey('fullName');
    const kSubjects = headerKey('subjects')!;
    for (const row of rows) {
      let firstName = '';
      let lastName = '';
      if (kFirst && kLast) {
        firstName = String(row[kFirst] ?? '').trim();
        lastName = String(row[kLast] ?? '').trim();
      } else if (kFull) {
        ({ firstName, lastName } = splitName(String(row[kFull] ?? '')));
      }
      if (!firstName && !lastName) continue;
      const subjectAbbreviations = splitSubjects(row[kSubjects] ?? '');
      result.teachers.push({ firstName, lastName, subjectAbbreviations });
    }
  }

  if (format === 'requirements') {
    const kClass = headerKey('className')!;
    const kSubject = headerKey('subject')!;
    const kHours = headerKey('hours')!;
    const classNamesSeen = new Set<string>();
    for (const row of rows) {
      const className = String(row[kClass] ?? '').trim();
      const subjectAbbreviation = String(row[kSubject] ?? '').trim().toUpperCase();
      const hoursPerWeek = parseInt0(row[kHours]);
      if (!className || !subjectAbbreviation || hoursPerWeek <= 0) continue;
      result.requirements.push({ className, subjectAbbreviation, hoursPerWeek });
      // Auto-derive class entries so user gets classes too
      if (!classNamesSeen.has(className)) {
        classNamesSeen.add(className);
        result.classes.push({
          name: className,
          gradeLevel: parseGradeFromName(className),
          studentCount: 0,
        });
      }
    }
  }

  return result;
}

// --- Subject category inference (used when creating new subjects) -----------

const CATEGORY_BY_ABBR: Record<string, SubjectCategory> = {
  AI: 'languages', S2: 'languages', EN: 'languages', RU: 'languages',
  SA: 'languages', RA: 'languages', VE: 'languages', EA: 'languages',
  MA: 'math',
  FY: 'science', KE: 'science', BI: 'science', GE: 'science', MB: 'science',
  HI: 'theory', YH: 'theory', UE: 'theory', UO: 'theory', ET: 'theory', FI: 'theory', PS: 'theory',
  MU: 'arts', KU: 'arts', KS: 'arts', KO: 'arts', TE: 'arts', DR: 'arts',
  LI: 'sports',
  OP: 'theory',
};

export function inferCategory(abbr: string): SubjectCategory {
  return CATEGORY_BY_ABBR[abbr.toUpperCase()] ?? 'theory';
}
