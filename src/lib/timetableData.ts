// src/lib/timetableData.ts
// Ohut rajapinta Supabaseen. Useimmissa paikoissa kannattaa käyttää
// `useSchoolData` / `useTimetable` hookkeja, mutta nämä funktiot ovat
// käytettävissä yksinkertaisia skriptejä varten.
import { supabase } from '@/integrations/supabase/client';
import type { Teacher, SchoolClass, Subject, Room, TimetableEntry } from '@/types/timetable';
import type { LessonRequirement } from './timetableGenerator';

export async function fetchAllData() {
  const [teachersRes, classesRes, subjectsRes, roomsRes, requirementsRes] = await Promise.all([
    supabase.from('teachers').select('*'),
    supabase.from('school_classes').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('rooms').select('*'),
    supabase.from('lesson_requirements').select('*'),
  ]);

  const teachers: Teacher[] = (teachersRes.data || []).map((t: any) => ({
    id: t.id,
    firstName: t.first_name,
    lastName: t.last_name,
    subjects: t.subject_ids || [],
    maxHours: t.max_hours_per_week,
  }));

  const classes: SchoolClass[] = (classesRes.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    gradeLevel: c.grade_level,
    studentCount: c.student_count,
  }));

  const subjects: Subject[] = (subjectsRes.data || []) as Subject[];
  const rooms: Room[] = (roomsRes.data || []) as Room[];

  const requirements: LessonRequirement[] = (requirementsRes.data || []).map((r: any) => ({
    classId: r.class_id,
    subjectId: r.subject_id,
    hoursPerWeek: r.hours_per_week,
  }));

  return { teachers, classes, subjects, rooms, requirements };
}

export async function saveTimetableEntries(entries: TimetableEntry[]) {
  // HUOM: Käytä mieluummin useSaveTimetable-hookkia (vaatii owner_id + timetable_id).
  console.warn('saveTimetableEntries: käytä mieluummin useSaveTimetable-hookkia.');
  return entries.length > 0;
}

export async function seedDemoDataIfEmpty() {
  // Demoseed siirretty backendille / hookeille. No-op tässä.
  return;
}
