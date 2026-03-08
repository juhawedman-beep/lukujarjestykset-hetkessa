import { useMemo, useState } from 'react';
import type { TimetableEntry, Subject, SchoolClass, Room, TimeSlot, Teacher } from '@/types/timetable';
import { DAYS_FI, DAYS_FULL_FI } from '@/types/timetable';

interface RoomViewProps {
  entries: TimetableEntry[];
  subjects: Subject[];
  classes: SchoolClass[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  teachers: Teacher[];
}

const roomTypeLabels: Record<string, string> = {
  classroom: 'Luokkahuone',
  gym: 'Liikuntasali',
  music: 'Musiikkiluokka',
  art: 'Kuvataideluokka',
  workshop: 'Tekninen työ',
  science_lab: 'Luonnontieteiden lab',
  it_room: 'ATK-luokka',
};

export default function RoomView({ entries, subjects, classes, rooms, timeSlots, teachers }: RoomViewProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id ?? '');

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);
  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

  const roomEntries = useMemo(
    () => entries.filter(e => e.roomId === selectedRoomId),
    [entries, selectedRoomId]
  );

  const grid = useMemo(() => {
    const map = new Map<string, TimetableEntry[]>();
    roomEntries.forEach(e => {
      const key = `${e.dayOfWeek}-${e.period}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [roomEntries]);

  // Calculate usage stats
  const usageStats = useMemo(() => {
    const totalSlots = timeSlots.length * 5;
    const usedSlots = new Set(roomEntries.map(e => `${e.dayOfWeek}-${e.period}`)).size;
    const usagePercent = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;
    return { totalSlots, usedSlots, usagePercent };
  }, [roomEntries, timeSlots.length]);

  // Stats by room type
  const roomUsageByType = useMemo(() => {
    const stats = new Map<string, { room: Room; usedSlots: number; totalSlots: number }>();
    const totalSlots = timeSlots.length * 5;
    
    for (const room of rooms) {
      const re = entries.filter(e => e.roomId === room.id);
      const usedSlots = new Set(re.map(e => `${e.dayOfWeek}-${e.period}`)).size;
      stats.set(room.id, { room, usedSlots, totalSlots });
    }
    return stats;
  }, [entries, rooms, timeSlots.length]);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  return (
    <div className="space-y-6 animate-fade-in" role="region" aria-label="Tilakotainen näkymä">
      {/* Room selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap" role="tablist" aria-label="Valitse tila">
          <span className="text-sm font-medium text-muted-foreground">Tila:</span>
          {rooms.map(room => {
            const stats = roomUsageByType.get(room.id);
            const usagePercent = stats ? Math.round((stats.usedSlots / stats.totalSlots) * 100) : 0;
            const isSelected = room.id === selectedRoomId;
            return (
              <button
                key={room.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedRoomId(room.id)}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border hover:bg-muted text-foreground'
                }`}
              >
                <div>{room.name}</div>
                <div className={`text-xs ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {usagePercent}% käytössä
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Room info */}
      {selectedRoom && (
        <div className="flex items-center gap-6 p-4 bg-card border border-border rounded-lg">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{selectedRoom.name}</h3>
            <p className="text-sm text-muted-foreground">{roomTypeLabels[selectedRoom.type] ?? selectedRoom.type}</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{selectedRoom.capacity}</div>
            <div className="text-xs text-muted-foreground">Kapasiteetti</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="text-center">
            <div className={`text-2xl font-bold ${usageStats.usagePercent >= 80 ? 'text-subject-sports' : usageStats.usagePercent >= 50 ? 'text-subject-math' : 'text-muted-foreground'}`}>
              {usageStats.usagePercent}%
            </div>
            <div className="text-xs text-muted-foreground">Käyttöaste</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{usageStats.usedSlots}</div>
            <div className="text-xs text-muted-foreground">/{usageStats.totalSlots} slottia</div>
          </div>
        </div>
      )}

      {/* Timetable grid */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full border-collapse min-w-[700px]" role="grid" aria-label={`Tilan ${selectedRoom?.name ?? ''} varauskalenteri`}>
          <thead>
            <tr>
              <th scope="col" className="w-20 p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                Tunti
              </th>
              {DAYS_FI.map((day, i) => (
                <th scope="col" key={i} className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                  <abbr title={DAYS_FULL_FI[i]}>{day}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(slot => (
              <tr key={slot.period}>
                <th scope="row" className="p-2 text-center border-b border-border bg-muted/30">
                  <div className="text-sm font-medium text-foreground">{slot.period}.</div>
                  <div className="text-xs text-muted-foreground font-mono">{slot.startTime}</div>
                </th>
                {[1, 2, 3, 4, 5].map(day => {
                  const key = `${day}-${slot.period}`;
                  const cellEntries = grid.get(key) ?? [];
                  const maxConcurrent = selectedRoom?.maxConcurrent ?? 1;
                  const hasConflict = cellEntries.length > maxConcurrent;

                  if (cellEntries.length === 0) {
                    return (
                      <td key={day} className="p-1.5 border-b border-border">
                        <div
                          className="h-16 rounded-md bg-subject-sports/5 border border-dashed border-subject-sports/20 flex items-center justify-center"
                          role="gridcell"
                          aria-label={`Vapaa, ${DAYS_FULL_FI[day - 1]} tunti ${slot.period}`}
                        >
                          <span className="text-xs text-subject-sports/60">Vapaa</span>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={day} className="p-1.5 border-b border-border">
                      <div
                        className={`h-16 rounded-md border p-2 flex flex-col justify-between ${
                          hasConflict
                            ? 'bg-destructive/10 border-destructive/40'
                            : 'bg-primary/10 border-primary/30'
                        }`}
                        role="gridcell"
                        aria-label={hasConflict ? `Konflikti: ${cellEntries.length} varausta` : `Varattu: ${classMap.get(cellEntries[0].classId)?.name}`}
                      >
                        {hasConflict ? (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-xs font-medium text-destructive">⚠ {cellEntries.length} ryhmää!</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-foreground">
                                {classMap.get(cellEntries[0].classId)?.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {subjectMap.get(cellEntries[0].subjectId)?.abbreviation}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {teacherMap.get(cellEntries[0].teacherId)?.lastName}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
