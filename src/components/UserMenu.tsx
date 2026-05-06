import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function UserMenu() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const initials = (user.user_metadata?.display_name || user.email || '?')
    .split(/[\s@]/)[0]
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    toast.success('Kirjauduit ulos');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </span>
          <span className="hidden sm:inline">{user.user_metadata?.display_name || user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.user_metadata?.display_name || 'Käyttäjä'}</span>
            <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Kirjaudu ulos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
