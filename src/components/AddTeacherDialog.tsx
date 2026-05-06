import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { QK, useSubjects } from '@/hooks/useSchoolData';
import { toast } from 'sonner';

const schema = z.object({
  firstName: z.string().trim().min(1, 'Pakollinen').max(50),
  lastName: z.string().trim().min(1, 'Pakollinen').max(50),
  maxHours: z.coerce.number().int().min(0).max(40).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function AddTeacherDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: subjects = [] } = useSubjects();
  const [open, setOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', maxHours: 24 },
  });

  const toggle = (id: string) => {
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const onSubmit = async (v: FormValues) => {
    if (!user) return;
    const { error } = await supabase.from('teachers').insert({
      owner_id: user.id,
      first_name: v.firstName,
      last_name: v.lastName,
      subject_ids: selectedSubjects,
      max_hours_per_week: v.maxHours ?? null,
    });
    if (error) {
      toast.error('Tallennus epäonnistui', { description: error.message });
      return;
    }
    toast.success(`${v.firstName} ${v.lastName} lisätty`);
    qc.invalidateQueries({ queryKey: QK.teachers });
    form.reset();
    setSelectedSubjects([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Opettaja</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lisää opettaja</DialogTitle>
          <DialogDescription>Valitse opettajan opetettavat aineet.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-fn">Etunimi</Label>
              <Input id="t-fn" {...form.register('firstName')} />
              {form.formState.errors.firstName && <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="t-ln">Sukunimi</Label>
              <Input id="t-ln" {...form.register('lastName')} />
              {form.formState.errors.lastName && <p className="text-xs text-destructive mt-1">{form.formState.errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="t-mh">Max tuntia/viikko</Label>
            <Input id="t-mh" type="number" min={0} max={40} {...form.register('maxHours')} />
          </div>
          <div>
            <Label>Aineet ({selectedSubjects.length} valittu)</Label>
            {subjects.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">Ei aineita vielä. Tuo CSV tai lisää tuntijako.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {subjects.map(s => (
                  <Badge
                    key={s.id}
                    variant={selectedSubjects.includes(s.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggle(s.id)}
                  >
                    {s.abbreviation}
                  </Badge>
                ))}
              </div>
            )}
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
