import { useState } from 'react';
import type { Room } from '@/types/timetable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DoorOpen, Plus, Trash2 } from 'lucide-react';

interface RoomManagementDialogProps {
  rooms: Room[];
  onSave: (rooms: Room[]) => void;
}

const ROOM_TYPES: { value: Room['type']; label: string }[] = [
  { value: 'classroom', label: 'Luokkahuone' },
  { value: 'gym', label: 'Liikuntasali' },
  { value: 'music', label: 'Musiikkiluokka' },
  { value: 'art', label: 'Kuvataideluokka' },
  { value: 'workshop', label: 'Tekninen työ' },
  { value: 'science_lab', label: 'Luonnontieteiden lab' },
  { value: 'it_room', label: 'ATK-luokka' },
];

export default function RoomManagementDialog({ rooms, onSave }: RoomManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Room[]>(rooms);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setDraft(rooms.map(r => ({ ...r })));
    setOpen(isOpen);
  };

  const updateRoom = (id: string, field: keyof Room, value: string | number) => {
    setDraft(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRoom = () => {
    const newId = `r_${Date.now()}`;
    setDraft(prev => [...prev, { id: newId, name: '', type: 'classroom', capacity: 30 }]);
  };

  const removeRoom = (id: string) => {
    setDraft(prev => prev.filter(r => r.id !== id));
  };

  const handleSave = () => {
    onSave(draft.filter(r => r.name.trim() !== ''));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <DoorOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Tilat</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tilojen hallinta</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_140px_70px_70px_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Nimi</span>
            <span>Tyyppi</span>
            <span>Kap.</span>
            <span>Max ryh.</span>
            <span />
          </div>

          {draft.map(room => (
            <div key={room.id} className="grid grid-cols-[1fr_140px_70px_70px_36px] gap-2 items-center">
              <Input
                value={room.name}
                onChange={e => updateRoom(room.id, 'name', e.target.value)}
                placeholder="Tilan nimi..."
                className="h-9 text-sm"
              />
              <Select value={room.type} onValueChange={v => updateRoom(room.id, 'type', v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                max={500}
                value={room.capacity}
                onChange={e => updateRoom(room.id, 'capacity', Number(e.target.value))}
                className="h-9 text-sm"
              />
              <Input
                type="number"
                min={1}
                max={10}
                value={room.maxConcurrent ?? 1}
                onChange={e => updateRoom(room.id, 'maxConcurrent', Number(e.target.value))}
                className="h-9 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => removeRoom(room.id)}
                aria-label={`Poista ${room.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" className="gap-1.5" onClick={addRoom}>
            <Plus className="w-3.5 h-3.5" />
            Lisää tila
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Peruuta</Button>
          <Button onClick={handleSave}>Tallenna</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
