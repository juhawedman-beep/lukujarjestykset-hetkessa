import { useState } from 'react';
import type { TimetableSettings, SpecialBreak } from '@/lib/timetableSettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings, Plus, Trash2 } from 'lucide-react';
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

  const updateSpecialBreak = (index: number, field: keyof SpecialBreak, value: string | number) => {
    setDraft(prev => {
      const breaks = [...prev.specialBreaks];
      breaks[index] = { ...breaks[index], [field]: value };
      return { ...prev, specialBreaks: breaks };
    });
  };

  const addSpecialBreak = () => {
    setDraft(prev => ({
      ...prev,
      specialBreaks: [
        ...prev.specialBreaks,
        { afterPeriod: 2, duration: 15, label: 'Pitkä välitunti' },
      ],
    }));
  };

  const removeSpecialBreak = (index: number) => {
    setDraft(prev => ({
      ...prev,
      specialBreaks: prev.specialBreaks.filter((_, i) => i !== index),
    }));
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
              <Label htmlFor="breakDuration" className="text-xs">Normaali välitunti (min)</Label>
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

          {/* Special breaks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Pidennetyt tauot</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addSpecialBreak}>
                <Plus className="w-3 h-3" /> Lisää tauko
              </Button>
            </div>
            {draft.specialBreaks.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Ei pidennettyjä taukoja – kaikki välitunnit ovat {draft.breakDuration} min.</p>
            )}
            {draft.specialBreaks.map((sb, i) => (
              <div key={i} className="flex items-end gap-2 p-2 rounded-md border border-border bg-muted/30">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Nimi</Label>
                  <Input
                    value={sb.label}
                    onChange={e => updateSpecialBreak(i, 'label', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 w-20">
                  <Label className="text-xs">Tunnin jälk.</Label>
                  <Input
                    type="number"
                    min={1}
                    max={draft.periodsPerDay - 1}
                    value={sb.afterPeriod}
                    onChange={e => updateSpecialBreak(i, 'afterPeriod', Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 w-20">
                  <Label className="text-xs">Kesto (min)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={60}
                    value={sb.duration}
                    onChange={e => updateSpecialBreak(i, 'duration', Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => removeSpecialBreak(i)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Esikatselu</p>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {preview.map((slot, idx) => {
                const specialAfter = draft.specialBreaks.find(sb => sb.afterPeriod === slot.period);
                return (
                  <div key={slot.period} className="flex flex-col py-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground w-4">{slot.period}.</span>
                      <span className="text-muted-foreground font-mono">{slot.startTime}–{slot.endTime}</span>
                    </div>
                    {specialAfter && idx < preview.length - 1 && (
                      <span className="text-[10px] text-primary ml-5 mt-0.5">{specialAfter.label} ({specialAfter.duration} min)</span>
                    )}
                  </div>
                );
              })}
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
