import { useState } from 'react';
import type { Teacher, TimetableEntry, AdditionalTeacher, AdditionalTeacherRole } from '@/types/timetable';
import { ROLE_LABELS_FI } from '@/types/timetable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, X, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AdditionalTeachersDialogProps {
  entry: TimetableEntry;
  teachers: Teacher[];
  allEntries: TimetableEntry[];
  open: boolean;
  onClose: () => void;
  onSave: (entryId: string, additionalTeachers: AdditionalTeacher[]) => void;
}

const ROLES: AdditionalTeacherRole[] = ['co_teacher', 'special_education', 'assistant'];

const roleBadgeColors: Record<AdditionalTeacherRole, string> = {
  co_teacher: 'bg-primary/15 text-primary border-primary/30',
  special_education: 'bg-accent/15 text-accent-foreground border-accent/30',
  assistant: 'bg-muted text-muted-foreground border-border',
};

export default function AdditionalTeachersDialog({
  entry,
  teachers,
  allEntries,
  open,
  onClose,
  onSave,
}: AdditionalTeachersDialogProps) {
  const [list, setList] = useState<AdditionalTeacher[]>(entry.additionalTeachers ?? []);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AdditionalTeacherRole>('co_teacher');

  // Teachers already assigned (primary + additional)
  const assignedIds = new Set([entry.teacherId, ...list.map(a => a.teacherId)]);

  // Check if a teacher is busy at this time slot (same day + period, different entry)
  const busyTeacherIds = new Set(
    allEntries
      .filter(e => e.id !== entry.id && e.dayOfWeek === entry.dayOfWeek && e.period === entry.period)
      .flatMap(e => [e.teacherId, ...(e.additionalTeachers ?? []).map(a => a.teacherId)])
  );

  const availableTeachers = teachers.filter(t => !assignedIds.has(t.id));

  const handleAdd = () => {
    if (!selectedTeacherId) return;
    setList(prev => [...prev, { teacherId: selectedTeacherId, role: selectedRole }]);
    setSelectedTeacherId('');
  };

  const handleRemove = (teacherId: string) => {
    setList(prev => prev.filter(a => a.teacherId !== teacherId));
  };

  const handleSave = () => {
    onSave(entry.id, list);
    onClose();
  };

  const getTeacherName = (id: string) => {
    const t = teachers.find(t => t.id === id);
    return t ? `${t.firstName} ${t.lastName}` : id;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Tunnin lisähenkilöt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Primary teacher */}
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground mb-1">Vastuuopettaja</div>
            <div className="text-sm font-medium text-foreground">{getTeacherName(entry.teacherId)}</div>
          </div>

          {/* Current additional teachers */}
          {list.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Lisähenkilöt</div>
              {list.map(at => (
                <div
                  key={at.teacherId}
                  className="flex items-center justify-between p-2 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{getTeacherName(at.teacherId)}</span>
                    <Badge variant="outline" className={`text-[10px] ${roleBadgeColors[at.role]}`}>
                      {ROLE_LABELS_FI[at.role]}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleRemove(at.teacherId)}
                    aria-label={`Poista ${getTeacherName(at.teacherId)}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new */}
          {availableTeachers.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Lisää henkilö</div>
              <div className="flex gap-2">
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Valitse henkilö..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeachers.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className={busyTeacherIds.has(t.id) ? 'text-destructive' : ''}>
                          {t.firstName} {t.lastName}
                          {busyTeacherIds.has(t.id) && ' ⚠'}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AdditionalTeacherRole)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role} value={role}>{ROLE_LABELS_FI[role]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTeacherId && busyTeacherIds.has(selectedTeacherId) && (
                <p className="text-xs text-destructive">⚠ Tällä henkilöllä on jo tunti samaan aikaan.</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleAdd}
                disabled={!selectedTeacherId}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Lisää
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Peruuta</Button>
          <Button onClick={handleSave}>Tallenna</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
