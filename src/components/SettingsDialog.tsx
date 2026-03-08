import { useState } from 'react';
import type { TimetableSettings } from '@/lib/timetableSettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { generateTimeSlots } from '@/lib/timetableSettings';

interface SettingsDialogProps {
  settings: TimetableSettings;
  onSave: (settings: TimetableSettings) => void;
}

export default function SettingsDialog({ settings, onSave }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TimetableSettings>(settings);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setDraft(settings);
    setOpen(isOpen);
  };

  const update = <K extends keyof TimetableSettings>(key: K, value: TimetableSettings[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const preview = generateTimeSlots(draft);

  const handleSave = () => {
    onSave(draft);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Asetukset</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aikarakenne</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {/* Row 1: Start time + lesson duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startTime" className="text-xs">Päivän alkamisaika</Label>
              <Input
                id="startTime"
                type="time"
                value={draft.startTime}
                onChange={e => update('startTime', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lessonDuration" className="text-xs">Oppitunnin pituus (min)</Label>
              <Input
                id="lessonDuration"
                type="number"
                min={20}
                max={120}
                value={draft.lessonDuration}
                onChange={e => update('lessonDuration', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Row 2: Break + periods */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="breakDuration" className="text-xs">Välitunti (min)</Label>
              <Input
                id="breakDuration"
                type="number"
                min={5}
                max={30}
                value={draft.breakDuration}
                onChange={e => update('breakDuration', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodsPerDay" className="text-xs">Oppitunteja / päivä</Label>
              <Input
                id="periodsPerDay"
                type="number"
                min={4}
                max={10}
                value={draft.periodsPerDay}
                onChange={e => update('periodsPerDay', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Row 3: Long break */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="longBreakDuration" className="text-xs">Pitkä välitunti (min)</Label>
              <Input
                id="longBreakDuration"
                type="number"
                min={10}
                max={45}
                value={draft.longBreakDuration}
                onChange={e => update('longBreakDuration', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="longBreakAfterPeriod" className="text-xs">Pitkä tauko tunnin jälkeen</Label>
              <Input
                id="longBreakAfterPeriod"
                type="number"
                min={1}
                max={draft.periodsPerDay - 1}
                value={draft.longBreakAfterPeriod}
                onChange={e => update('longBreakAfterPeriod', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Row 4: Lunch break */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lunchBreakDuration" className="text-xs">Ruokatauko (min)</Label>
              <Input
                id="lunchBreakDuration"
                type="number"
                min={15}
                max={60}
                value={draft.lunchBreakDuration}
                onChange={e => update('lunchBreakDuration', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lunchBreakAfterPeriod" className="text-xs">Ruokatauko tunnin jälkeen</Label>
              <Input
                id="lunchBreakAfterPeriod"
                type="number"
                min={1}
                max={draft.periodsPerDay - 1}
                value={draft.lunchBreakAfterPeriod}
                onChange={e => update('lunchBreakAfterPeriod', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Esikatselu</p>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {preview.map(slot => (
                <div key={slot.period} className="flex items-center gap-1.5 py-0.5">
                  <span className="font-medium text-foreground w-4">{slot.period}.</span>
                  <span className="text-muted-foreground font-mono">{slot.startTime}–{slot.endTime}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Peruuta</Button>
          <Button onClick={handleSave}>Tallenna</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
