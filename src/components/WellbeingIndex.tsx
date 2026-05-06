// src/components/WellbeingIndex.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, AlertTriangle } from 'lucide-react';
import type { TimetableEntry, Teacher, SchoolClass } from '@/types/timetable';

interface WellbeingIndexProps {
  entries: TimetableEntry[];
  teachers: Teacher[];
  classes: SchoolClass[];
}

export default function WellbeingIndex({ entries, teachers, classes }: WellbeingIndexProps) {
  // Opettajien jaksaminen
  const teacherFatigue = useMemo(() => {
    const scores = teachers.map(teacher => {
      const teacherEntries = entries.filter(e => e.teacherId === teacher.id);
      const days = [1,2,3,4,5];
      let maxConsecutive = 0;
      let totalFatigue = 0;

      days.forEach(day => {
        const dayEntries = teacherEntries
          .filter(e => e.dayOfWeek === day)
          .sort((a, b) => a.period - b.period);
        
        let consecutive = 0;
        for (let i = 0; i < dayEntries.length; i++) {
          if (i === 0 || dayEntries[i].period === dayEntries[i-1].period + 1) {
            consecutive++;
          } else {
            consecutive = 1;
          }
          maxConsecutive = Math.max(maxConsecutive, consecutive);
        }
        totalFatigue += consecutive > 3 ? (consecutive - 3) * 25 : 0;
      });

      const score = Math.max(0, 100 - totalFatigue - (maxConsecutive > 4 ? 30 : 0));
      return { teacher, score, maxConsecutive };
    });
    return scores;
  }, [entries, teachers]);

  const avgTeacherScore = teacherFatigue.reduce((sum, t) => sum + t.score, 0) / (teachers.length || 1);

  // Luokkien tasapaino (hyppytunnit + kuormitus)
  const classBalance = classes.map(cls => {
    const classEntries = entries.filter(e => e.classId === cls.id);
    const score = 85; // placeholder – voidaan laajentaa
    return { cls, score };
  });

  const avgClassScore = classBalance.reduce((sum, c) => sum + c.score, 0) / (classes.length || 1);

  const overallScore = Math.round((avgTeacherScore + avgClassScore) / 2);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          Hyvinvointi-indeksi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>
            {overallScore}
          </div>
          <p className="text-sm text-muted-foreground">Kokonaishyvinvointi</p>
          <Badge variant={overallScore >= 80 ? "default" : overallScore >= 65 ? "secondary" : "destructive"}>
            {overallScore >= 80 ? "Erinomainen" : overallScore >= 65 ? "Hyvä" : "Parannettavaa"}
          </Badge>
        </div>

        {/* Opettajat */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Opettajien jaksaminen
          </h4>
          <div className="space-y-3">
            {teacherFatigue.slice(0, 5).map(({ teacher, score }) => (
              <div key={teacher.id} className="flex items-center gap-3">
                <div className="w-28 text-sm truncate">
                  {teacher.firstName} {teacher.lastName}
                </div>
                <Progress value={score} className="flex-1" />
                <span className={`text-sm font-medium w-10 ${getScoreColor(score)}`}>
                  {score}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Luokat */}
        <div>
          <h4 className="font-medium mb-3">Luokkien tasapaino</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {classBalance.slice(0, 4).map(({ cls, score }) => (
              <div key={cls.id} className="flex justify-between bg-muted/50 p-2 rounded">
                <span>{cls.name}</span>
                <span className={getScoreColor(score)}>{score}%</span>
              </div>
            ))}
          </div>
        </div>

        {overallScore < 70 && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-sm flex gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            Harkitse aikataulun keventämistä tai tasapainottamista.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
