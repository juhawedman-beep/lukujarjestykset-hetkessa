export interface TimetableSettings {
  lessonDuration: number;   // minutes (e.g. 45)
  breakDuration: number;    // minutes (e.g. 10)
  longBreakDuration: number; // minutes (e.g. 20), after period 3
  longBreakAfterPeriod: number; // e.g. 3
  lunchBreakDuration: number; // minutes (e.g. 25)
  lunchBreakAfterPeriod: number; // e.g. 5
  startTime: string;        // "08:00"
  periodsPerDay: number;    // e.g. 8
}

export const DEFAULT_SETTINGS: TimetableSettings = {
  lessonDuration: 45,
  breakDuration: 10,
  longBreakDuration: 20,
  longBreakAfterPeriod: 3,
  lunchBreakDuration: 25,
  lunchBreakAfterPeriod: 5,
  startTime: '08:00',
  periodsPerDay: 8,
};

import type { TimeSlot } from '@/types/timetable';

export function generateTimeSlots(settings: TimetableSettings): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startH, startM] = settings.startTime.split(':').map(Number);
  let currentMinutes = startH * 60 + startM;

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
      if (p === settings.lunchBreakAfterPeriod) {
        currentMinutes += settings.lunchBreakDuration;
      } else if (p === settings.longBreakAfterPeriod) {
        currentMinutes += settings.longBreakDuration;
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
