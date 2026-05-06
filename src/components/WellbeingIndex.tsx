// src/components/WellbeingIndex.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, AlertTriangle, Clock } from 'lucide-react';
import type { TimetableEntry, Teacher, SchoolClass } from '@/types/timetable';

interface WellbeingIndexProps {
  entries: TimetableEntry[];
  teachers: Teacher[];
  classes: SchoolClass[];
}

export default function WellbeingIndex({ entries, teachers, classes }: WellbeingIndexProps) {
  // Opettajien jaksaminen (tarkempi laskenta)
  const teacherScores = teachers.map(teacher => {
    const teacherEntries = entries.filter(e => e.teacherId === teacher.id);
    let totalFatigue = 0;
    let maxConsecutive = 0;

    // Ryhmitellään päivittäin
    for (let day = 1; day <= 5; day++) {
      const dayEntries = teacherEntries
        .filter(e => e.dayOfWeek === day)
        .sort((a, b) => a.period - b.period);

      let consecutive = 0;
      for (let i = 0; i < dayEntries.length; i++) {
        if (i === 0 || dayEntries[i].period === dayEntries[i - 1].period + 1) {
          consecutive++;
        } else {
          consecutive = 1;
        }
        maxConsecutive = Math.max(maxConsecutive, consecutive);
      }
      if (consecutive > 3) totalFatigue += (consecutive - 3) * 20;
    }

    const score = Math.max(20, 100 - totalFatigue - (maxConsecutive > 4 ? 25 : 0));
    return { teacher, score, maxConsecutive };
  });

  const avgTeacherScore = teacherScores.length 
    ? Math.round(teacherScores.reduce((sum, t) => sum + t.score, 0) / teacherScores.length) 
    : 75;

  // Luokkien tasapaino (hyppytunnit + kuormitus)
  const classScores = classes.map(cls => {
    const classEntries = entries.filter(e => e.classId === cls.id);
    const dayCount = new Set(classEntries.map(e => e.dayOfWeek)).size;
    const loadScore = Math.max(40, 100 - (classEntries.length > 35 ? (classEntries.length - 35) * 3 : 0));
    return { cls, score: loadScore };
  });

  const avgClassScore = classScores.length 
    ? Math.round(classScores.reduce((sum, c) => sum + c.score, 0) / classScores.length) 
    : 75;

  const overallScore = Math.round((avgTeacherScore + avgClassScore) / 2);

  const getScoreLabel = (score: number) => {
    if (score >= 85) return { label: "Erinomainen", color: "emerald" };
    if (score >= 70) return { label: "Hyvä", color: "amber" };
    return { label: "Parannettavaa", color: "red" };
  };

  const overall = getScoreLabel(overallScore);

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
          <div className={`text-6xl font-bold ${overall.color === 'emerald' ? 'text-emerald-600' : overall.color === 'amber' ? 'text-amber-600' : 'text-red-600'}`}>
            {overallScore}
          </div>
          <Badge variant={overall.color === 'emerald' ? "default" : overall.color === 'amber' ? "secondary" : "destructive"} className="mt-2">
            {overall.label}
          </Badge>
        </div>

        {/* Opettajat */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Opettajien jaksaminen
          </h4>
          <div className="space-y-3">
            {teacherScores.slice(0, 6).map(({ teacher, score }) => (
              <div key={teacher.id} className="flex items-center gap-3">
                <div className="w-28 text-sm truncate font-medium">
                  {teacher.firstName} {teacher.lastName}
                </div>
                <Progress value={score} className="flex-1" />
                <span className="text-sm font-medium w-10">{score}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Luokat */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Luokkien kuormitus
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {classScores.slice(0, 6).map(({ cls, score }) => (
              <div key={cls.id} className="flex justify-between bg-muted/50 p-3 rounded-lg">
                <span className="font-medium">{cls.name}</span>
                <span className={`font-medium ${score >= 80 ? 'text-emerald-600' : score >= 65 ? 'text-amber-600' : 'text-red-600'}`}>
                  {score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
