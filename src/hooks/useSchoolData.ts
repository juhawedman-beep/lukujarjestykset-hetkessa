import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Subject, Teacher, SchoolClass, Room, SubjectCategory } from '@/types/timetable';

export const QK = {
  subjects: ['subjects'] as const,
  teachers: ['teachers'] as const,
  classes: ['school_classes'] as const,
  rooms: ['rooms'] as const,
  requirements: ['lesson_requirements'] as const,
  homeRooms: ['teacher_home_rooms'] as const,
};

export function useSubjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.subjects,
    enabled: !!user,
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, abbreviation, category')
        .order('abbreviation');
      if (error) throw error;
      return (data ?? []).map(s => ({
        id: s.id,
        name: s.name,
        abbreviation: s.abbreviation,
        category: (s.category as SubjectCategory) ?? 'theory',
      }));
    },
  });
}

export function useTeachers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.teachers,
    enabled: !!user,
    queryFn: async (): Promise<Teacher[]> => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, subject_ids')
        .order('last_name');
      if (error) throw error;
      return (data ?? []).map(t => ({
        id: t.id,
        firstName: t.first_name,
        lastName: t.last_name,
        subjects: t.subject_ids ?? [],
      }));
    },
  });
}

export function useSchoolClasses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.classes,
    enabled: !!user,
    queryFn: async (): Promise<SchoolClass[]> => {
      const { data, error } = await supabase
        .from('school_classes')
        .select('id, name, grade_level, student_count')
        .order('name');
      if (error) throw error;
      return (data ?? []).map(c => ({
        id: c.id,
        name: c.name,
        gradeLevel: c.grade_level,
        studentCount: c.student_count,
      }));
    },
  });
}

export function useRooms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.rooms,
    enabled: !!user,
    queryFn: async (): Promise<Room[]> => {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, type, capacity, max_concurrent')
        .order('name');
      if (error) throw error;
      return (data ?? []).map(r => ({
        id: r.id,
        name: r.name,
        type: r.type as Room['type'],
        capacity: r.capacity,
        maxConcurrent: r.max_concurrent ?? 1,
      }));
    },
  });
}

export interface RequirementRow {
  id: string;
  classId: string;
  subjectId: string;
  hoursPerWeek: number;
}

export function useRequirements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.requirements,
    enabled: !!user,
    queryFn: async (): Promise<RequirementRow[]> => {
      const { data, error } = await supabase
        .from('lesson_requirements')
        .select('id, class_id, subject_id, hours_per_week');
      if (error) throw error;
      return (data ?? []).map(r => ({
        id: r.id,
        classId: r.class_id,
        subjectId: r.subject_id,
        hoursPerWeek: r.hours_per_week,
      }));
    },
  });
}
