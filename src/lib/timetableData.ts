// src/lib/timetableData.ts
import { supabase } from './supabaseClient';
import type { Teacher, SchoolClass, Subject, Room, LessonRequirement, TimetableEntry } from '@/types/timetable';

export async function fetchAllData() {
  const [teachersRes, classesRes, subjectsRes, roomsRes, requirementsRes] = await Promise.all([
    supabase.from('teachers').select('*'),
    supabase.from('school_classes').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('rooms').select('*'),
    supabase.from('lesson_requirements').select('*'),
  ]);

  return {
    teachers: (teachersRes.data || []) as Teacher[],
    classes: (classesRes.data || []) as SchoolClass[],
    subjects: (subjectsRes.data || []) as Subject[],
    rooms: (roomsRes.data || []) as Room[],
    requirements: (requirementsRes.data || []) as LessonRequirement[],
  };
}

export async function saveTimetableEntries(entries: TimetableEntry[]) {
  if (entries.length === 0) return true;

  // Poistetaan ensin vanhat merkinnät
  await supabase.from('timetable_entries').delete().neq('id', '0');

  const formatted = entries.map(entry => ({
    teacher_id: entry.teacherId,
    class_id: entry.classId,
    subject_id: entry.subjectId,
    room_id: entry.roomId,
    day_of_week: entry.dayOfWeek,
    period: entry.period,
  }));

  const { error } = await supabase
    .from('timetable_entries')
    .insert(formatted);

  if (error) {
    console.error('Tallennusvirhe Supabaseen:', error);
    return false;
  }

  console.log(`✅ Tallennettu ${entries.length} tuntia Supabaseen`);
  return true;
}

export async function seedDemoDataIfEmpty() {
  const { count } = await supabase
    .from('teachers')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) return;

  await supabase.from('teachers').insert([
    { first_name: 'Anna', last_name: 'Virtanen', subjects: ['math', 'physics'], max_hours_per_week: 24 },
    { first_name: 'Matti', last_name: 'Korhonen', subjects: ['finnish', 'history'], max_hours_per_week: 22 },
    { first_name: 'Liisa', last_name: 'Mäkinen', subjects: ['english', 'swedish'], max_hours_per_week: 20 },
  ]);

  await supabase.from('school_classes').insert([
    { name: '7A', level: 7, student_count: 24 },
    { name: '8B', level: 8, student_count: 26 },
    { name: '9C', level: 9, student_count: 22 },
  ]);

  console.log('✅ Demo-data seedattu Supabaseen');
}
