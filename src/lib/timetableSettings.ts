export interface SpecialBreak {
  afterPeriod: number;
  duration: number; // minutes
  label: string;    // e.g. "Pitkä välitunti", "Ruokatauko"
}

export interface TimetableSettings {
  lessonDuration: number;
  breakDuration: number;
  startTime: string;
  periodsPerDay: number;
  specialBreaks: SpecialBreak[];
}

export const DEFAULT_SETTINGS: TimetableSettings = {
  lessonDuration: 45,
  breakDuration: 10,
  startTime: '08:00',
  periodsPerDay: 8,
  specialBreaks: [
    { afterPeriod: 3, duration: 20, label: 'Pitkä välitunti' },
    { afterPeriod: 5, duration: 25, label: 'Ruokatauko' },
  ],
};

import type { TimeSlot } from '@/types/timetable';

export function generateTimeSlots(settings: TimetableSettings): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startH, startM] = settings.startTime.split(':').map(Number);
  let currentMinutes = startH * 60 + startM;

  // Index special breaks by afterPeriod for quick lookup
  const specialMap = new Map<number, SpecialBreak>();
  for (const sb of settings.specialBreaks) {
    specialMap.set(sb.afterPeriod, sb);
  }

  for (let p = 1; p <= settings.periodsPerDay; p++) {
    const startMin = currentMinutes;
    const endMin = startMin + settings.lessonDuration;
    slots.push({
      period: p,
      startTime: formatTime(startMin),
      endTime: formatTime(endMin),
    });

    currentMinutes = endMin;
    if (p < settings.periodsPerDay) {
      const special = specialMap.get(p);
      if (special) {
        currentMinutes += special.duration;
      } else {
        currentMinutes += settings.breakDuration;
      }
    }
  }

  return slots;
}

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
