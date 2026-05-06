import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@/hooks/useSchoolData';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().trim().min(1, 'Pakollinen').max(20),
  gradeLevel: z.coerce.number().int().min(1).max(12),
  studentCount: z.coerce.number().int().min(0).max(40),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  variant?: 'default' | 'ghost' | 'outline';
}

export default function AddClassDialog({ variant = 'ghost' }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', gradeLevel: 1, studentCount: 20 },
  });

  const onSubmit = async (v: FormValues) => {
    if (!user) return;
    const { error } = await supabase.from('school_classes').insert({
      owner_id: user.id,
      name: v.name,
      grade_level: v.gradeLevel,
      student_count: v.studentCount,
    });
    if (error) {
      toast.error('Tallennus epäonnistui', { description: error.message });
      return;
    }
    toast.success(`Luokka ${v.name} lisätty`);
    qc.invalidateQueries({ queryKey: QK.classes });
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Luokka</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lisää luokka</DialogTitle>
          <DialogDescription>Esim. 3A, 7B tai LU1.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="cls-name">Luokan nimi</Label>
            <Input id="cls-name" {...form.register('name')} placeholder="3A" />
            {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cls-grade">Vuosiluokka</Label>
              <Input id="cls-grade" type="number" min={1} max={12} {...form.register('gradeLevel')} />
            </div>
            <div>
              <Label htmlFor="cls-count">Oppilaita</Label>
              <Input id="cls-count" type="number" min={0} max={40} {...form.register('studentCount')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Peruuta</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>Lisää</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
