import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Cog,
  Dumbbell,
  Flag,
  LayoutGrid,
  ListTodo,
  LogOut,
  PawPrint,
  Search,
  Sun,
  Moon,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const NAV = [
  { to: "/hoje", label: "Hoje", icon: LayoutGrid },
  { to: "/habitos", label: "Hábitos", icon: CheckCircle2 },
  { to: "/treino", label: "Treino", icon: Dumbbell },
  { to: "/financas", label: "Finanças", icon: Wallet },
  { to: "/pets", label: "Pets", icon: PawPrint },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/tarefas", label: "Tarefas", icon: ListTodo },
  { to: "/metas", label: "Metas", icon: Flag },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Cog },
] as const;

const MOBILE_NAV = NAV.filter((n) =>
  ["/hoje", "/habitos", "/treino", "/calendario"].includes(n.to),
);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar px-3 py-6 lg:flex">
        <div className="px-3">
          <p className="text-base font-semibold tracking-tight">Life Hub</p>
          <p className="truncate text-xs text-muted-foreground">{profile?.name || "..."}</p>
        </div>

        <button
          onClick={() => setSearchOpen(true)}
          className="mt-6 flex items-center gap-2 rounded-lg border border-sidebar-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent"
        >
          <Search className="size-4" /> Buscar
        </button>

        <nav className="mt-4 flex-1 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(item.to)
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-between px-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alternar tema"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Sair" onClick={signOut}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-5 py-3 backdrop-blur lg:hidden">
        <p className="text-sm font-semibold tracking-tight">Life Hub</p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Buscar" onClick={() => setSearchOpen(true)}>
            <Search className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alternar tema"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </header>

      <main className="pb-24 lg:pb-10 lg:pl-60">
        <div className="mx-auto w-full max-w-4xl px-5 py-6 lg:px-10 lg:py-10">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px]",
              isActive(item.to) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground">
            <LayoutGrid className="size-5" />
            Mais
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Módulos</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-2 px-4 pb-8">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="surface flex flex-col items-center gap-2 px-2 py-4 text-xs"
                >
                  <item.icon className="size-5 text-primary" />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={signOut}
                className="surface flex flex-col items-center gap-2 px-2 py-4 text-xs text-destructive"
              >
                <LogOut className="size-5" />
                Sair
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
