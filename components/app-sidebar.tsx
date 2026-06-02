"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  FilePlus2,
  Files,
  GitBranch,
  LayoutDashboard,
  Moon,
  Search,
  Sparkles,
  Sun,
  UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems: { href: Route; label: string; icon: typeof LayoutDashboard; accent: string }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, accent: "text-orange-500" },
  { href: "/facturas", label: "Facturas", icon: Files, accent: "text-rose-500" },
  { href: "/ingreso", label: "Ingreso", icon: FilePlus2, accent: "text-amber-500" },
  { href: "/clientes", label: "Clientes", icon: UsersRound, accent: "text-emerald-500" },
  { href: "/trazabilidad", label: "Trazabilidad", icon: GitBranch, accent: "text-violet-500" }
];

export function AppSidebar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("cxc-pho-theme");
    const initialTheme = savedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  function updateTheme(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    window.localStorage.setItem("cxc-pho-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/88 shadow-sm backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/88">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-white shadow-lg shadow-orange-500/25">
              CX
            </div>
            <div>
              <p className="text-lg font-semibold leading-6 text-stone-950 dark:text-white">CxC PHO</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">Receivables command center</p>
            </div>
          </div>

          <label className="relative flex min-h-11 flex-1 items-center xl:max-w-2xl">
            <Search className="pointer-events-none absolute left-3 size-4 text-stone-400" aria-hidden="true" />
            <input
              className="h-11 w-full rounded-lg border border-stone-200 bg-white px-10 text-sm shadow-sm outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-500/20 dark:border-stone-800 dark:bg-stone-900 dark:text-white"
              placeholder="Buscar factura, cliente o documento"
            />
          </label>

          <div className="flex items-center gap-2">
            <div className="flex h-11 items-center rounded-lg border border-stone-200 bg-white p-1 text-xs font-semibold shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <button
                type="button"
                onClick={() => updateTheme("light")}
                className={`inline-flex h-9 items-center gap-1 rounded-md px-3 transition ${
                  theme === "light"
                    ? "bg-orange-500 text-white"
                    : "text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
                }`}
              >
                <Sun className="size-3.5" aria-hidden="true" />
                Claro
              </button>
              <button
                type="button"
                onClick={() => updateTheme("dark")}
                className={`inline-flex h-9 items-center gap-1 rounded-md px-3 transition ${
                  theme === "dark"
                    ? "bg-orange-500 text-white"
                    : "text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
                }`}
              >
                <Moon className="size-3.5" aria-hidden="true" />
                Oscuro
              </button>
            </div>
            <button className="flex size-11 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:text-orange-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
              <Bell className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex min-w-max items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition",
                  isActive
                    ? "border-orange-200 bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                    : "border-transparent bg-stone-100/70 text-stone-600 hover:border-stone-200 hover:bg-white hover:text-stone-950 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-700 dark:hover:bg-stone-800 dark:hover:text-white"
                )}
              >
                <Icon
                  className={cn("size-4", isActive ? "text-white" : item.accent)}
                  aria-hidden="true"
                />
                {item.label}
                {isActive && <Sparkles className="size-3.5 text-white/80" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
