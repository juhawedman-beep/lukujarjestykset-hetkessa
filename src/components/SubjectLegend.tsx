import type { SubjectCategory } from '@/types/timetable';

const legend: { category: SubjectCategory; label: string; dotClass: string }[] = [
  { category: 'languages', label: 'Kielet', dotClass: 'bg-subject-languages' },
  { category: 'math', label: 'Matematiikka', dotClass: 'bg-subject-math' },
  { category: 'science', label: 'Luonnontieteet', dotClass: 'bg-subject-science' },
  { category: 'theory', label: 'Teoria-aineet', dotClass: 'bg-subject-theory' },
  { category: 'arts', label: 'Taito & taide', dotClass: 'bg-subject-arts' },
  { category: 'sports', label: 'Liikunta', dotClass: 'bg-subject-sports' },
];

export default function SubjectLegend() {
  return (
    <div className="flex flex-wrap gap-3">
      {legend.map(l => (
        <div key={l.category} className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${l.dotClass}`} />
          <span className="text-xs text-muted-foreground">{l.label}</span>
        </div>
      ))}
    </div>
  );
}
