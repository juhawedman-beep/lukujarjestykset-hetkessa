import { useMemo } from 'react';
import type { TimetableEntry, Teacher, Subject } from '@/types/timetable';
import { DAYS_FI, DAYS_FULL_FI } from '@/types/timetable';

interface WorkloadAnalysisProps {
  entries: TimetableEntry[];
  teachers: Teacher[];
  subjects: Subject[];
  periodsPerDay: number;
}

interface TeacherWorkload {
  teacher: Teacher;
  totalLessons: number;
  gapHours: number;
  maxConsecutive: number;
  dailyDistribution: number[]; // lessons per day [Ma, Ti, Ke, To, Pe]
  busyDays: number;
  loadScore: number; // 0-100, higher = more stressed
}

export default function WorkloadAnalysis({ entries, teachers, subjects, periodsPerDay }: WorkloadAnalysisProps) {
  const workloads = useMemo(() => {
    const result: TeacherWorkload[] = [];

    for (const teacher of teachers) {
      const te = entries.filter(e => e.teacherId === teacher.id);
      const dailyDistribution = [0, 0, 0, 0, 0];
      let totalGaps = 0;
      let maxConsecutive = 0;

      for (let day = 1; day <= 5; day++) {
        const dayEntries = te.filter(e => e.dayOfWeek === day);
        dailyDistribution[day - 1] = dayEntries.length;

        if (dayEntries.length === 0) continue;

        const periods = dayEntries.map(e => e.period).sort((a, b) => a - b);
        const firstPeriod = periods[0];
        const lastPeriod = periods[periods.length - 1];

        // Count gaps
        for (let p = firstPeriod + 1; p < lastPeriod; p++) {
          if (!periods.includes(p)) totalGaps++;
        }

        // Count max consecutive
        let consecutive = 1;
        let maxDayConsecutive = 1;
        for (let i = 1; i < periods.length; i++) {
          if (periods[i] === periods[i - 1] + 1) {
            consecutive++;
            maxDayConsecutive = Math.max(maxDayConsecutive, consecutive);
          } else {
            consecutive = 1;
          }
        }
        maxConsecutive = Math.max(maxConsecutive, maxDayConsecutive);
      }

      const busyDays = dailyDistribution.filter(d => d > 0).length;
      const avgLoad = te.length / Math.max(busyDays, 1);

      // Load score: penalize gaps, long consecutive stretches, uneven distribution
      const gapPenalty = totalGaps * 10;
      const consecutivePenalty = maxConsecutive > 4 ? (maxConsecutive - 4) * 15 : 0;
      const maxDaily = Math.max(...dailyDistribution);
      const minDaily = Math.min(...dailyDistribution.filter(d => d > 0));
      const unevenPenalty = (maxDaily - minDaily) > 3 ? (maxDaily - minDaily) * 5 : 0;
      const loadScore = Math.min(100, gapPenalty + consecutivePenalty + unevenPenalty);

      result.push({
        teacher,
        totalLessons: te.length,
        gapHours: totalGaps,
        maxConsecutive,
        dailyDistribution,
        busyDays,
        loadScore,
      });
    }

    return result.sort((a, b) => b.loadScore - a.loadScore);
  }, [entries, teachers]);

  const getLoadColor = (score: number) => {
    if (score >= 50) return 'text-destructive';
    if (score >= 25) return 'text-subject-math';
    return 'text-subject-sports';
  };

  const getLoadBgColor = (score: number) => {
    if (score >= 50) return 'bg-destructive/10';
    if (score >= 25) return 'bg-subject-math/10';
    return 'bg-subject-sports/10';
  };

  const getLoadLabel = (score: number) => {
    if (score >= 50) return 'Korkea kuormitus';
    if (score >= 25) return 'Kohtalainen';
    return 'Hyvä';
  };

  return (
    <div className="space-y-6 animate-fade-in" role="region" aria-label="Opettajien kuormitusanalyysi">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Opettajien kuormitusanalyysi</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Työturvallisuuslaki 738/2002 – opettajien työkuormituksen tasapuolinen jakautuminen
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{workloads.filter(w => w.loadScore >= 50).length}</div>
          <div className="text-xs text-muted-foreground mt-1">Korkea kuormitus</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{workloads.reduce((sum, w) => sum + w.gapHours, 0)}</div>
          <div className="text-xs text-muted-foreground mt-1">Hyppytunteja yhteensä</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{Math.max(...workloads.map(w => w.maxConsecutive))}</div>
          <div className="text-xs text-muted-foreground mt-1">Max peräkkäiset tunnit</div>
        </div>
      </div>

      {/* Teacher table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                Opettaja
              </th>
              <th className="p-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                Tunnit/vko
              </th>
              <th className="p-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                Hyppytunnit
              </th>
              <th className="p-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                Max peräkkäin
              </th>
              {DAYS_FI.map((day, i) => (
                <th key={i} className="p-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border w-12">
                  <abbr title={DAYS_FULL_FI[i]}>{day}</abbr>
                </th>
              ))}
              <th className="p-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                Tila
              </th>
            </tr>
          </thead>
          <tbody>
            {workloads.map(w => (
              <tr key={w.teacher.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3 border-b border-border">
                  <div className="font-medium text-foreground">{w.teacher.lastName}, {w.teacher.firstName}</div>
                </td>
                <td className="p-3 text-center border-b border-border text-foreground font-medium">{w.totalLessons}</td>
                <td className="p-3 text-center border-b border-border">
                  <span className={`font-medium ${w.gapHours > 0 ? 'text-subject-math' : 'text-muted-foreground'}`}>
                    {w.gapHours}
                  </span>
                </td>
                <td className="p-3 text-center border-b border-border">
                  <span className={`font-medium ${w.maxConsecutive > 4 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {w.maxConsecutive}
                  </span>
                </td>
                {w.dailyDistribution.map((count, i) => (
                  <td key={i} className="p-3 text-center border-b border-border">
                    {count > 0 ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                        count >= 6 ? 'bg-destructive/20 text-destructive' : 
                        count >= 4 ? 'bg-subject-math/20 text-subject-math' : 
                        'bg-primary/20 text-primary'
                      }`}>
                        {count}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">-</span>
                    )}
                  </td>
                ))}
                <td className="p-3 text-center border-b border-border">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getLoadBgColor(w.loadScore)} ${getLoadColor(w.loadScore)}`}>
                    {getLoadLabel(w.loadScore)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-destructive/20" />
          <span>Korkea kuormitus</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-subject-math/20" />
          <span>Kohtalainen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-subject-sports/20" />
          <span>Hyvä</span>
        </div>
      </div>
    </div>
  );
}
