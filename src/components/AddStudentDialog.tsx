import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAddStudent } from '@/hooks/useStudents';
import { useSchoolClasses } from '@/hooks/useSchoolData';

const schema = z.object({
  firstName: z.string().trim().min(1, 'Pakollinen').max(50),
  lastName: z.string().trim().min(1, 'Pakollinen').max(50),
  classId: z.string().uuid('Valitse luokka'),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function AddStudentDialog() {
  const { data: classes = [] } = useSchoolClasses();
  const addStudent = useAddStudent();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', classId: '', notes: '' },
  });

  const onSubmit = async (v: FormValues) => {
    await addStudent.mutateAsync({
      firstName: v.firstName,
      lastName: v.lastName,
      classId: v.classId,
      notes: v.notes,
    });
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" disabled={classes.length === 0}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Oppilas</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lisää oppilas</DialogTitle>
          <DialogDescription>Oppilas liitetään luokkaan, jonka lukujärjestystä hän seuraa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="s-fn">Etunimi</Label>
              <Input id="s-fn" {...form.register('firstName')} />
              {form.formState.errors.firstName && <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="s-ln">Sukunimi</Label>
              <Input id="s-ln" {...form.register('lastName')} />
              {form.formState.errors.lastName && <p className="text-xs text-destructive mt-1">{form.formState.errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="s-cls">Luokka</Label>
            <Controller
              control={form.control}
              name="classId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="s-cls"><SelectValue placeholder="Valitse luokka" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.classId && <p className="text-xs text-destructive mt-1">{form.formState.errors.classId.message}</p>}
          </div>
          <div>
            <Label htmlFor="s-notes">Muistiinpanot (valinnainen)</Label>
            <Input id="s-notes" {...form.register('notes')} placeholder="Esim. tukiopetus, allergiat..." />
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
