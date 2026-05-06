// src/lib/timetableData.ts
import { supabase } from '@/integrations/supabase/client';
import type { Teacher, SchoolClass, Subject, Room } from '@/types/timetable';

export interface LessonRequirement {
  classId: string;
  subjectId: string;
  hoursPerWeek: number;
}

export async function fetchAllData() {
  const [teachersRes, classesRes, subjectsRes, roomsRes] = await Promise.all([
    (supabase as any).from('teachers').select('*'),
    (supabase as any).from('school_classes').select('*'),
    (supabase as any).from('subjects').select('*'),
    (supabase as any).from('rooms').select('*'),
  ]);

  return {
    teachers: (teachersRes.data || []) as Teacher[],
    classes: (classesRes.data || []) as SchoolClass[],
    subjects: (subjectsRes.data || []) as Subject[],
    rooms: (roomsRes.data || []) as Room[],
    requirements: [] as LessonRequirement[],
  };
}

export async function saveTimetableEntries(entries: any[]) {
  const { error } = await (supabase as any).from('timetable_entries').insert(entries);
  if (error) {
    console.error('Virhe tallennettaessa:', error);
    return false;
  }
  return true;
}

export async function seedDemoDataIfEmpty() {
  const { count } = await (supabase as any)
    .from('teachers')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) return;

  await (supabase as any).from('teachers').insert([
    { first_name: 'Anna', last_name: 'Virtanen', subjects: ['math', 'physics'], max_hours_per_week: 24 },
    { first_name: 'Matti', last_name: 'Korhonen', subjects: ['finnish', 'history'], max_hours_per_week: 22 },
    { first_name: 'Liisa', last_name: 'Mäkinen', subjects: ['english', 'swedish'], max_hours_per_week: 20 },
  ]);

  await (supabase as any).from('school_classes').insert([
    { name: '7A', level: 7, student_count: 22 },
    { name: '8B', level: 8, student_count: 25 },
  ]);

  console.log('✅ Demo-data seedattu!');
}
