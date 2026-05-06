import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  classId: string;
  notes?: string | null;
}

export const STUDENTS_KEY = ['students'] as const;

export function useStudents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: STUDENTS_KEY,
    enabled: !!user,
    queryFn: async (): Promise<Student[]> => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, class_id, notes')
        .order('last_name');
      if (error) throw error;
      return (data ?? []).map(s => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        classId: s.class_id,
        notes: s.notes,
      }));
    },
  });
}

export function useAddStudent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Omit<Student, 'id'>) => {
      if (!user) throw new Error('Ei kirjautunut käyttäjä');
      const { error } = await supabase.from('students').insert({
        owner_id: user.id,
        first_name: s.firstName,
        last_name: s.lastName,
        class_id: s.classId,
        notes: s.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STUDENTS_KEY });
      toast.success('Oppilas lisätty');
    },
    onError: (e: Error) => toast.error('Tallennus epäonnistui', { description: e.message }),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STUDENTS_KEY });
      toast.success('Oppilas poistettu');
    },
    onError: (e: Error) => toast.error('Poisto epäonnistui', { description: e.message }),
  });
}
