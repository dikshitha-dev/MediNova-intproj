import React from "react";
import { Link, useLocation } from "wouter";
import { Pill, Home, MessageSquare, Settings, Activity, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const links = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/reminders", label: "Reminders", icon: Pill },
    { href: "/chat", label: "Assistant", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card flex flex-col shrink-0 sticky top-0 md:h-screen">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Activity className="h-6 w-6 text-primary mr-2" />
          <span className="font-bold text-lg tracking-tight">MediNova</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location === link.href;
            return (
              <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 mt-auto border-t border-border space-y-2">
          <Link href="/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${location === '/settings' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
            <Settings className="h-5 w-5" />
            Settings
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 px-3 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-h-0 bg-background max-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
