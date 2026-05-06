import { GraduationCap, Upload, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <GraduationCap className="w-10 h-10 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Tervetuloa! Aloitetaan tästä</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Sinulla ei ole vielä luokkia tai opettajia. Aloita tuomalla tiedot Wilmasta tai lisäämällä ne käsin.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
        <Card>
          <CardContent className="pt-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-5 h-5 text-primary" aria-hidden="true" />
              <h3 className="font-semibold">Tuo Wilmasta</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Lataa CSV-tiedosto Wilmasta — tunnistaa luokat, opettajat tai tuntijaon automaattisesti.
            </p>
            <p className="text-xs text-muted-foreground">
              Klikkaa <strong>Tuo CSV</strong> yläpalkista.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-5 h-5 text-primary" aria-hidden="true" />
              <h3 className="font-semibold">Lisää käsin</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Lisää tilat <strong>Tilat</strong>-painikkeesta. Luokkien ja opettajien lisäys käsin tulossa.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
