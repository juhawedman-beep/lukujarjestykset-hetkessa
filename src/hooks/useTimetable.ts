import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { TimetableEntry, AdditionalTeacher } from '@/types/timetable';
import { toast } from 'sonner';

const TT_KEY = ['active_timetable'] as const;
const TT_ENTRIES_KEY = ['timetable_entries'] as const;

export function useActiveTimetable() {
  const { user } = useAuth();
  return useQuery({
    queryKey: TT_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timetables')
        .select('id, name, settings')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTimetableEntries(timetableId: string | undefined) {
  return useQuery({
    queryKey: [...TT_ENTRIES_KEY, timetableId ?? 'none'],
    enabled: !!timetableId,
    queryFn: async (): Promise<TimetableEntry[]> => {
      const { data, error } = await supabase
        .from('timetable_entries')
        .select('id, class_id, teacher_id, subject_id, room_id, day_of_week, period, additional_teachers')
        .eq('timetable_id', timetableId!);
      if (error) throw error;
      return (data ?? []).map(e => ({
        id: e.id,
        classId: e.class_id,
        teacherId: e.teacher_id,
        subjectId: e.subject_id,
        roomId: e.room_id,
        dayOfWeek: e.day_of_week,
        period: e.period,
        additionalTeachers: (e.additional_teachers as AdditionalTeacher[] | null) ?? undefined,
      }));
    },
  });
}

export function useSaveTimetable() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entries, name }: { entries: TimetableEntry[]; name?: string }) => {
      if (!user) throw new Error('Ei kirjautunut käyttäjä');

      // Find or create active timetable
      const { data: existing, error: fetchErr } = await supabase
        .from('timetables')
        .select('id')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      let timetableId = existing?.id;
      if (!timetableId) {
        const { data, error } = await supabase
          .from('timetables')
          .insert({ owner_id: user.id, name: name ?? 'Lukujärjestys', is_active: true })
          .select('id')
          .single();
        if (error) throw error;
        timetableId = data.id;
      } else {
        await supabase.from('timetables').update({ updated_at: new Date().toISOString() }).eq('id', timetableId);
      }

      // Replace entries
      const { error: delErr } = await supabase
        .from('timetable_entries')
        .delete()
        .eq('timetable_id', timetableId);
      if (delErr) throw delErr;

      if (entries.length > 0) {
        const rows = entries.map(e => ({
          owner_id: user.id,
          timetable_id: timetableId!,
          class_id: e.classId,
          teacher_id: e.teacherId,
          subject_id: e.subjectId,
          room_id: e.roomId,
          day_of_week: e.dayOfWeek,
          period: e.period,
          additional_teachers: (e.additionalTeachers ?? []) as unknown as object,
        }));
        const { error } = await supabase.from('timetable_entries').insert(rows);
        if (error) throw error;
      }
      return timetableId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TT_KEY });
      qc.invalidateQueries({ queryKey: TT_ENTRIES_KEY });
      toast.success('Lukujärjestys tallennettu');
    },
    onError: (e: Error) => toast.error('Tallennus epäonnistui', { description: e.message }),
  });
}
