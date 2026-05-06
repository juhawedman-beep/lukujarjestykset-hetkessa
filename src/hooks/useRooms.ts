import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QK } from '@/hooks/useSchoolData';
import type { Room } from '@/types/timetable';
import { toast } from 'sonner';

export function useSaveRooms() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rooms: Room[]) => {
      if (!user) throw new Error('Ei kirjautunut käyttäjä');

      // Get current rooms in DB to compute deletes
      const { data: existing, error: fetchErr } = await supabase
        .from('rooms')
        .select('id');
      if (fetchErr) throw fetchErr;

      const newIds = new Set(rooms.filter(r => !r.id.startsWith('r_')).map(r => r.id));
      const toDelete = (existing ?? []).filter(e => !newIds.has(e.id)).map(e => e.id);

      if (toDelete.length > 0) {
        const { error } = await supabase.from('rooms').delete().in('id', toDelete);
        if (error) throw error;
      }

      // Upsert / insert. Rooms with temp ids (r_...) are inserted fresh.
      const toInsert = rooms.filter(r => r.id.startsWith('r_')).map(r => ({
        owner_id: user.id,
        name: r.name,
        type: r.type,
        capacity: r.capacity,
        max_concurrent: r.maxConcurrent ?? 1,
      }));
      const toUpdate = rooms.filter(r => !r.id.startsWith('r_'));

      if (toInsert.length > 0) {
        const { error } = await supabase.from('rooms').insert(toInsert);
        if (error) throw error;
      }
      for (const r of toUpdate) {
        const { error } = await supabase.from('rooms').update({
          name: r.name,
          type: r.type,
          capacity: r.capacity,
          max_concurrent: r.maxConcurrent ?? 1,
        }).eq('id', r.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.rooms });
      toast.success('Tilat tallennettu');
    },
    onError: (e: Error) => toast.error('Tallennus epäonnistui', { description: e.message }),
  });
}
