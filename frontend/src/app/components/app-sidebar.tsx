import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  FilePlus2,
  Files,
  GitBranch,
  LayoutDashboard,
  Moon,
  ReceiptText,
  Search,
  Sparkles,
  Sun,
  UsersRound,
  X
} from "lucide-react";
import { navigateTo } from "@/app/navigation";
import { AppLink } from "@/shared/components/app-link";
import { enriquecerFactura } from "@/modules/accounts-receivable/data/cxc-calculations";
import { limpiarNumeroSii, obtenerPrefijoDocumento } from "@/modules/accounts-receivable/data/document-ids";
import { formatCurrency } from "@/shared/lib/formatters";
import { clientesMock, facturasMock } from "@/modules/accounts-receivable/data/mock-data";
import { cn } from "@/shared/lib/classnames";

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; accent: string }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, accent: "text-orange-500" },
  { href: "/facturas", label: "Facturas", icon: Files, accent: "text-rose-500" },
  { href: "/ingreso", label: "Ingreso", icon: FilePlus2, accent: "text-amber-500" },
  { href: "/clientes", label: "Clientes", icon: UsersRound, accent: "text-emerald-500" },
  { href: "/trazabilidad", label: "Trazabilidad", icon: GitBranch, accent: "text-violet-500" }
];

const facturasGlobales = facturasMock.map((factura) => enriquecerFactura(factura, clientesMock));

type GlobalSearchResult = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Search;
  tone: string;
  keywords: string;
};

const quickResults: GlobalSearchResult[] = [
  {
    id: "nav-dashboard",
    title: "Dashboard",
    description: "Ver KPIs, cobranza, mora y priorización.",
    href: "/",
    icon: LayoutDashboard,
    tone: "text-orange-500",
    keywords: "dashboard inicio kpi cobranza cartera mora priorizacion"
  },
  {
    id: "nav-facturas",
    title: "Facturas",
    description: "Tabla documental con filtros y búsqueda contextual.",
    href: "/facturas",
    icon: Files,
    tone: "text-rose-500",
    keywords: "facturas documentos tabla sii folio"
  },
  {
    id: "nav-ingreso",
    title: "Ingreso documental",
    description: "Crear facturas, exentas, NC y ND.",
    href: "/ingreso",
    icon: FilePlus2,
    tone: "text-amber-500",
    keywords: "ingreso crear factura exenta nota credito nota debito nc nd subir pdf"
  },
  {
    id: "filter-vencidas",
    title: "Facturas vencidas",
    description: "Filtrar cartera con mora activa.",
    href: "/facturas?filtro=Vencidas",
    icon: AlertTriangle,
    tone: "text-rose-500",
    keywords: "vencidas mora atraso atrasadas rojo riesgo"
  },
  {
    id: "filter-pendientes",
    title: "Facturas pendientes",
    description: "Ver documentos con saldo por gestionar.",
    href: "/facturas?filtro=Pendientes",
    icon: CircleDollarSign,
    tone: "text-orange-500",
    keywords: "pendientes saldo cobrar cartera"
  },
  {
    id: "filter-pagadas-parcial",
    title: "Pagadas parcial",
    description: "Ver facturas con abonos parciales.",
    href: "/facturas?filtro=Pagadas%20parcial",
    icon: CircleDollarSign,
    tone: "text-amber-500",
    keywords: "pagadas parcial abono parcialmente"
  },
  {
    id: "filter-pagadas-total",
    title: "Pagadas total",
    description: "Ver documentos completamente recuperados.",
    href: "/facturas?filtro=Pagadas%20total",
    icon: CheckCircle2,
    tone: "text-emerald-500",
    keywords: "pagadas total completo cobradas recuperadas"
  },
  {
    id: "filter-nc",
    title: "Documentos con NC",
    description: "Facturas relacionadas con notas de crédito.",
    href: "/facturas?filtro=Con%20NC",
    icon: ReceiptText,
    tone: "text-violet-500",
    keywords: "nc nota credito credito notas"
  },
  {
    id: "filter-nd",
    title: "Documentos con ND",
    description: "Facturas relacionadas con notas de débito.",
    href: "/facturas?filtro=Con%20ND",
    icon: ReceiptText,
    tone: "text-violet-500",
    keywords: "nd nota debito debito notas"
  }
];

export function AppSidebar({ pathname }: { pathname: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [globalQuery, setGlobalQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  const globalResults = useMemo(() => {
    const term = globalQuery.trim().toLowerCase();

    if (!term) return quickResults.slice(0, 5);

    const documentResults: GlobalSearchResult[] = facturasGlobales.map((factura) => {
      const prefix = obtenerPrefijoDocumento(factura.tipoDocumento);
      const folio = `${prefix} ${limpiarNumeroSii(factura.numero)}`;

      return {
        id: `doc-${factura.id}`,
        title: `${folio} · ${factura.cliente.nombre}`,
        description: `${factura.estadoVencimiento.replace("Factura ", "")} · saldo ${formatCurrency(factura.saldoPendiente)}`,
        href: `/trazabilidad?factura=${factura.id}`,
        icon: ReceiptText,
        tone: factura.estadoVencimiento === "Factura Vencida" ? "text-rose-500" : "text-orange-500",
        keywords: [
          folio,
          factura.numero,
          limpiarNumeroSii(factura.numero),
          factura.tipoDocumento,
          factura.cliente.nombre,
          factura.cliente.rut,
          factura.estadoPago,
          factura.estadoVencimiento,
          factura.estadoDocumental
        ].join(" ").toLowerCase()
      };
    });

    const clientResults: GlobalSearchResult[] = clientesMock.map((cliente) => {
      const clientFacturas = facturasGlobales.filter((factura) => factura.cliente.id === cliente.id);
      const saldo = clientFacturas.reduce((total, factura) => total + factura.saldoPendiente, 0);

      return {
        id: `client-${cliente.id}`,
        title: cliente.nombre,
        description: `${cliente.rut} · saldo ${formatCurrency(saldo)}`,
        href: `/facturas?busqueda=${encodeURIComponent(cliente.nombre)}`,
        icon: UsersRound,
        tone: cliente.tipo === "B2B" ? "text-orange-500" : "text-emerald-500",
        keywords: `${cliente.nombre} ${cliente.rut} ${cliente.tipo}`.toLowerCase()
      };
    });

    return [...documentResults, ...clientResults, ...quickResults]
      .filter((result) => result.keywords.includes(term) || result.title.toLowerCase().includes(term))
      .slice(0, 8);
  }, [globalQuery]);

  function navigateGlobalResult(href: string) {
    navigateTo(href);
    setGlobalQuery("");
    setIsSearchOpen(false);
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

          <div className="relative flex min-h-11 flex-1 items-center xl:max-w-2xl">
            <Search className="pointer-events-none absolute left-3 size-4 text-stone-400" aria-hidden="true" />
            <input
              value={globalQuery}
              onChange={(event) => {
                setGlobalQuery(event.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && globalResults[0]) {
                  event.preventDefault();
                  navigateGlobalResult(globalResults[0].href);
                }

                if (event.key === "Escape") {
                  setIsSearchOpen(false);
                  setGlobalQuery("");
                }
              }}
              className="h-11 w-full rounded-lg border border-stone-200 bg-white px-10 text-sm shadow-sm outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-500/20 dark:border-stone-800 dark:bg-stone-900 dark:text-white"
              placeholder="Buscar documento, cliente, estado o acción"
            />
            {globalQuery && (
              <button
                type="button"
                onClick={() => {
                  setGlobalQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-3 rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-white"
                aria-label="Limpiar búsqueda global"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
            {isSearchOpen && (
              <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-950 shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:border-stone-700 dark:bg-stone-950 dark:text-white">
                <div className="border-b border-stone-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  Búsqueda global
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {globalResults.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      Sin resultados para esta búsqueda.
                    </p>
                  ) : (
                    globalResults.map((result) => {
                      const Icon = result.icon;

                      return (
                        <button
                          key={result.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => navigateGlobalResult(result.href)}
                          className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-orange-50 dark:hover:bg-orange-500/10"
                        >
                          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-900">
                            <Icon className={cn("size-4", result.tone)} aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{result.title}</span>
                            <span className="mt-0.5 block truncate text-xs text-stone-500 dark:text-stone-400">
                              {result.description}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="border-t border-stone-200 px-3 py-2 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  Enter abre el primer resultado · Esc limpia la búsqueda
                </div>
              </div>
            )}
          </div>

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
              <AppLink
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
              </AppLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
