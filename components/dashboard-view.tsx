"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  FileClock,
  Gauge,
  HandCoins,
  Layers3,
  LineChart,
  ShieldAlert,
  Sparkles,
  Target,
  WalletCards
} from "lucide-react";
import { formatearFolioDocumento } from "@/lib/document-ids";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { FacturaCalculada, KpisDashboard } from "@/lib/types";

function darkPanelClass(extra = "") {
  return `rounded-xl border border-stone-200 bg-white text-stone-950 shadow-[0_14px_34px_rgba(15,23,42,0.08)] dark:border-stone-700/80 dark:bg-[#151515] dark:text-white dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)] ${extra}`;
}

function progressWidth(value: number) {
  return `${Math.max(4, Math.min(100, value))}%`;
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 0
  }).format(value);
}

export function DashboardView({
  kpis,
  facturas
}: {
  kpis: KpisDashboard;
  facturas: FacturaCalculada[];
}) {
  const [focus, setFocus] = useState<"flujo" | "estado" | "historico" | "aging">("flujo");
  const [activeChartKey, setActiveChartKey] = useState<string | null>(null);
  const [activeCashKey, setActiveCashKey] = useState<"cobrado" | "pendiente">("cobrado");
  const [activePaymentKey, setActivePaymentKey] = useState<"vigente" | "vencida" | "pagada">("vencida");
  const [activeTrendKey, setActiveTrendKey] = useState<string | null>(null);
  const [activeAgingKey, setActiveAgingKey] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState("Todo");
  const recovery = Math.round((kpis.montoCobrado / Math.max(kpis.carteraTotal, 1)) * 100);
  const mora = Math.round((kpis.pendienteVencido / Math.max(kpis.montoPendiente, 1)) * 100);
  const partialCount = facturas.filter((factura) => factura.estadoPago === "Pagado Parcialmente").length;
  const upcomingCount = facturas.filter(
    (factura) => factura.estadoVencimiento === "Factura Vigente" && factura.saldoPendiente > 0
  ).length;

  const kpiGroups = [
    {
      title: "Cartera",
      cards: [
        {
          key: "cartera-total",
          label: "Cartera Total",
          icon: WalletCards,
          accent: "from-orange-500 to-amber-400",
          tone: "border-stone-200 bg-white text-orange-600 shadow-sm dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300",
          chip: "+12.4%",
          caption: "Base activa",
          positive: true,
          value: kpis.carteraTotal,
          isMoney: true
        },
        {
          key: "monto-cobrado",
          label: "Monto Cobrado",
          icon: Banknote,
          accent: "from-emerald-500 to-emerald-300",
          tone: "border-stone-200 bg-white text-emerald-600 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
          chip: "+18.7%",
          caption: "Cash-in",
          positive: true,
          value: kpis.montoCobrado,
          isMoney: true
        },
        {
          key: "monto-pendiente",
          label: "Monto Pendiente",
          icon: CalendarClock,
          accent: "from-orange-500 to-amber-300",
          tone: "border-stone-200 bg-white text-orange-600 shadow-sm dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300",
          chip: "-4.2%",
          caption: "Por gestionar",
          positive: false,
          value: kpis.montoPendiente,
          isMoney: true
        }
      ]
    },
    {
      title: "Facturas",
      cards: [
        {
          key: "facturas-pagadas",
          label: "Facturas Pagadas",
          icon: CheckCircle2,
          accent: "from-emerald-500 to-emerald-300",
          tone: "border-stone-200 bg-white text-emerald-600 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
          chip: "+8.1%",
          caption: "Liquidadas",
          positive: true,
          value: kpis.facturasPagadasCompletamente,
          isMoney: false
        },
        {
          key: "facturas-parciales",
          label: "Facturas con Pagos Parciales",
          icon: HandCoins,
          accent: "from-amber-400 to-orange-300",
          tone: "border-stone-200 bg-white text-amber-700 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
          chip: `${partialCount} docs`,
          caption: "Con abonos",
          positive: true,
          value: partialCount,
          isMoney: false
        },
        {
          key: "facturas-por-vencer",
          label: "Facturas Por Vencer",
          icon: FileClock,
          accent: "from-violet-500 to-violet-300",
          tone: "border-stone-200 bg-white text-violet-600 shadow-sm dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
          chip: `${upcomingCount} docs`,
          caption: "Próximos cobros",
          positive: true,
          value: upcomingCount,
          isMoney: false
        }
      ]
    }
  ];

  const cashBars = [
    {
      key: "cobrado" as const,
      label: "Monto cobrado",
      value: kpis.montoCobrado,
      caption: "Efectivo recuperado",
      bar: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400"
    },
    {
      key: "pendiente" as const,
      label: "Monto pendiente",
      value: kpis.montoPendiente,
      caption: "Saldo por gestionar",
      bar: "bg-orange-500",
      text: "text-orange-600 dark:text-orange-400"
    }
  ];
  const maxCashBarValue = Math.max(...cashBars.map((item) => item.value), 1);
  const activeCashBar = cashBars.find((item) => item.key === activeCashKey) ?? cashBars[0];
  const cashTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(maxCashBarValue * ratio));
  const cashStory =
    kpis.montoCobrado >= kpis.montoPendiente
      ? "La cartera muestra mayor recuperación que saldo pendiente."
      : "El saldo pendiente supera lo cobrado y requiere foco de gestión.";

  const paymentStates = useMemo(
    () => [
      {
        key: "vigente" as const,
        label: "Vigente",
        value: facturas
          .filter((factura) => factura.estadoVencimiento === "Factura Vigente" && factura.saldoPendiente > 0)
          .reduce((total, factura) => total + factura.saldoPendiente, 0),
        count: facturas.filter((factura) => factura.estadoVencimiento === "Factura Vigente" && factura.saldoPendiente > 0).length,
        color: "#f97316",
        caption: "seguimiento"
      },
      {
        key: "vencida" as const,
        label: "Vencida",
        value: facturas
          .filter((factura) => factura.estadoVencimiento === "Factura Vencida" && factura.saldoPendiente > 0)
          .reduce((total, factura) => total + factura.saldoPendiente, 0),
        count: facturas.filter((factura) => factura.estadoVencimiento === "Factura Vencida" && factura.saldoPendiente > 0).length,
        color: "#e11d48",
        caption: "acción prioritaria"
      },
      {
        key: "pagada" as const,
        label: "Pagada",
        value: facturas
          .filter((factura) => factura.estadoPago === "Pagado Completamente")
          .reduce((total, factura) => total + factura.montoCobrado, 0),
        count: facturas.filter((factura) => factura.estadoPago === "Pagado Completamente").length,
        color: "#10b981",
        caption: "recuperado"
      }
    ],
    [facturas]
  );
  const pieBackground = useMemo(() => {
    let cursor = 0;
    const segments = paymentStates.map((state) => {
      const start = cursor;
      const size = (state.value / Math.max(kpis.carteraTotal, 1)) * 100;
      cursor += size;
      return `${state.color} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${segments.join(", ")}, #e7e5e4 ${cursor}% 100%)`;
  }, [kpis.carteraTotal, paymentStates]);
  const activePaymentState = paymentStates.find((state) => state.key === activePaymentKey) ?? paymentStates[0];
  const dominantPaymentState = [...paymentStates].sort((a, b) => b.value - a.value)[0];

  const paymentTimeline = useMemo(() => {
    let acumulado = 0;
    return facturas
      .flatMap((factura) =>
        factura.pagos.map((pago) => ({
          id: pago.id,
          fecha: pago.fechaPago,
          monto: pago.monto,
          tipo: pago.tipo,
          cliente: factura.cliente.nombre,
          documento: formatearFolioDocumento(factura.tipoDocumento, factura.numero)
        }))
      )
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((pago) => {
        acumulado += pago.monto;
        return { ...pago, acumulado };
      });
  }, [facturas]);
  const maxTimelineAmount = Math.max(...paymentTimeline.map((item) => item.monto), 1);
  const maxTimelineAccumulated = Math.max(...paymentTimeline.map((item) => item.acumulado), 1);
  const timelinePoints = paymentTimeline
    .map((item, index) => {
      const x =
        paymentTimeline.length === 1 ? 180 : 42 + (index / Math.max(paymentTimeline.length - 1, 1)) * 294;
      const y = 154 - (item.acumulado / maxTimelineAccumulated) * 118;
      return `${x},${y}`;
    })
    .join(" ");
  const timelineAreaPoints = timelinePoints ? `42,164 ${timelinePoints} 336,164` : "";
  const latestPayment = paymentTimeline.at(-1);
  const previousPayment = paymentTimeline.at(-2);
  const timelineDelta = latestPayment && previousPayment ? latestPayment.acumulado - previousPayment.acumulado : latestPayment?.acumulado ?? 0;
  const trendData = useMemo(() => {
    const grouped = new Map<string, { label: string; facturado: number; ingresado: number }>();
    const ensureMonth = (dateValue: string) => {
      const date = new Date(`${dateValue}T00:00:00`);
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("es-CL", { month: "short" }).format(date).replace(".", "");
      const current = grouped.get(key) ?? { label, facturado: 0, ingresado: 0 };
      grouped.set(key, current);
      return current;
    };

    facturas.forEach((factura) => {
      ensureMonth(factura.fechaEmision).facturado += factura.montoAjustado;
      factura.pagos.forEach((pago) => {
        ensureMonth(pago.fechaPago).ingresado += pago.monto;
      });
    });

    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => ({ key, ...item }));
  }, [facturas]);
  const maxTrendValue = Math.max(...trendData.flatMap((item) => [item.facturado, item.ingresado]), 1);
  const trendPoint = (value: number, index: number) => {
    const x = trendData.length === 1 ? 210 : 54 + (index / Math.max(trendData.length - 1, 1)) * 336;
    const y = 178 - (value / maxTrendValue) * 132;
    return { x, y };
  };
  const billedTrendPoints = trendData.map((item, index) => trendPoint(item.facturado, index));
  const paidTrendPoints = trendData.map((item, index) => trendPoint(item.ingresado, index));
  const billedPolyline = billedTrendPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const paidPolyline = paidTrendPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const activeTrend = trendData.find((item) => item.key === activeTrendKey) ?? trendData.at(-1);
  const activeTrendGap = activeTrend ? activeTrend.facturado - activeTrend.ingresado : 0;

  const renderKpiGroup = (group: (typeof kpiGroups)[number], groupIndex: number) => (
    <div key={group.title} className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
          {group.title}
        </h2>
        <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {group.cards.map((card, index) => {
          const Icon = card.icon;

          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              transition={{ delay: (groupIndex * 3 + index) * 0.04 }}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-950 shadow-[0_12px_28px_rgba(15,23,42,0.07)] transition-shadow hover:shadow-[0_18px_38px_rgba(15,23,42,0.1)] dark:border-stone-700 dark:bg-[#151515] dark:text-white"
            >
              <div className={`h-1 bg-gradient-to-r ${card.accent}`} />
              <div className="relative p-6">
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-stone-50/80 to-transparent dark:from-white/[0.025]" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg text-stone-500 dark:text-stone-400">{card.label}</p>
                    <p className="mt-3 text-3xl font-semibold">
                      {card.isMoney ? formatCurrency(card.value) : card.value}
                    </p>
                  </div>
                  <div className={`flex size-12 items-center justify-center rounded-lg border ${card.tone}`}>
                    <Icon className="size-6" aria-hidden="true" />
                  </div>
                </div>
                <div className="relative mt-7 flex items-center gap-3 text-sm">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${
                      card.positive
                        ? "border-emerald-500/25 text-emerald-500 dark:text-emerald-400"
                        : "border-rose-500/25 text-rose-500"
                    }`}
                  >
                    {card.positive ? (
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="size-3" aria-hidden="true" />
                    )}
                    {card.chip}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400">{card.caption}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const documentMix = useMemo(
    () => [
      {
        label: "33 Factura",
        count: facturas.filter((factura) => factura.tipoDocumento === "Factura Electrónica 33").length
      },
      {
        label: "34 Factura Exenta",
        count: facturas.filter((factura) => factura.tipoDocumento === "Factura Exenta Electrónica 34").length
      },
      {
        label: "56 Nota de Débito",
        count: facturas.reduce((total, factura) => total + factura.notasDebito.length, 0)
      },
      {
        label: "61 Nota de Crédito",
        count: facturas.reduce((total, factura) => total + factura.notasCredito.length, 0)
      }
    ],
    [facturas]
  );

  const clientStats = useMemo(() => {
    const grouped = new Map<
      string,
      {
        cliente: string;
        total: number;
        vencidas: number;
        saldoVencido: number;
        dias: number;
        pagadas: number;
      }
    >();

    facturas.forEach((factura) => {
      const current =
        grouped.get(factura.cliente.id) ??
        {
          cliente: factura.cliente.nombre,
          total: 0,
          vencidas: 0,
          saldoVencido: 0,
          dias: 0,
          pagadas: 0
        };

      current.total += 1;
      current.pagadas += factura.estadoPago === "Pagado Completamente" ? 1 : 0;
      current.vencidas += factura.estadoVencimiento === "Factura Vencida" && factura.saldoPendiente > 0 ? 1 : 0;
      current.saldoVencido += factura.estadoVencimiento === "Factura Vencida" ? factura.saldoPendiente : 0;
      current.dias += factura.diasVencidos;
      grouped.set(factura.cliente.id, current);
    });

    const values = [...grouped.values()].map((item) => ({
      ...item,
      puntualidad: Math.round((item.pagadas / Math.max(item.total, 1)) * 100),
      promedioDias: Math.round(item.dias / Math.max(item.total, 1))
    }));

    return {
      cumplidores: [...values].sort((a, b) => b.puntualidad - a.puntualidad).slice(0, 4),
      morosos: [...values].sort((a, b) => b.saldoVencido - a.saldoVencido).slice(0, 4)
    };
  }, [facturas]);

  const agingBuckets = useMemo(() => {
    const buckets = [
      {
        label: "0 a 30 días",
        min: 0,
        max: 30,
        color: "from-white to-stone-50 dark:from-emerald-950/75 dark:to-stone-900",
        text: "text-stone-950 dark:text-white",
        border: "border-stone-200 dark:border-stone-700",
        bar: "bg-emerald-500"
      },
      {
        label: "31 a 60 días",
        min: 31,
        max: 60,
        color: "from-white to-stone-50 dark:from-amber-950/70 dark:to-stone-900",
        text: "text-stone-950 dark:text-white",
        border: "border-stone-200 dark:border-stone-700",
        bar: "bg-amber-500"
      },
      {
        label: "61 a 90 días",
        min: 61,
        max: 90,
        color: "from-white to-stone-50 dark:from-orange-950/75 dark:to-stone-900",
        text: "text-stone-950 dark:text-white",
        border: "border-stone-200 dark:border-stone-700",
        bar: "bg-orange-500"
      },
      {
        label: "Más de 90 días",
        min: 91,
        max: Infinity,
        color: "from-white to-stone-50 dark:from-rose-950/80 dark:to-stone-900",
        text: "text-stone-950 dark:text-white",
        border: "border-stone-200 dark:border-stone-700",
        bar: "bg-rose-500"
      }
    ];

    return buckets.map((bucket) => {
      const bucketFacturas = facturas.filter(
        (factura) =>
          factura.saldoPendiente > 0 &&
          factura.estadoVencimiento === "Factura Vencida" &&
          factura.diasVencidos >= bucket.min &&
          factura.diasVencidos <= bucket.max
      );
      return {
        ...bucket,
        count: bucketFacturas.length,
        monto: bucketFacturas.reduce((total, factura) => total + factura.saldoPendiente, 0)
      };
    });
  }, [facturas]);

  const acciones = useMemo(
    () =>
      [...facturas]
        .filter((factura) => factura.saldoPendiente > 0)
        .sort((a, b) => b.diasVencidos - a.diasVencidos || b.saldoPendiente - a.saldoPendiente)
        .slice(0, 5),
    [facturas]
  );

  const maxBucket = Math.max(...agingBuckets.map((bucket) => bucket.monto), 1);
  const activeAgingBucket =
    agingBuckets.find((bucket) => bucket.label === activeAgingKey) ??
    agingBuckets.reduce((selected, bucket) => (bucket.monto > selected.monto ? bucket : selected), agingBuckets[0]);
  const chartData = useMemo(() => {
    if (focus === "estado") {
      return [
        {
          key: "pagado",
          label: "Pagado",
          subLabel: "Completamente",
          value: facturas
            .filter((factura) => factura.estadoPago === "Pagado Completamente")
            .reduce((total, factura) => total + factura.montoAjustado, 0),
          count: facturas.filter((factura) => factura.estadoPago === "Pagado Completamente").length,
          level: "Saludable",
          color: "from-emerald-300 to-emerald-500 dark:from-emerald-700 dark:to-emerald-500"
        },
        {
          key: "parcial",
          label: "Parcial",
          subLabel: "En avance",
          value: facturas
            .filter((factura) => factura.estadoPago === "Pagado Parcialmente")
            .reduce((total, factura) => total + factura.montoAjustado, 0),
          count: facturas.filter((factura) => factura.estadoPago === "Pagado Parcialmente").length,
          level: "Gestionable",
          color: "from-amber-300 to-orange-500 dark:from-amber-700 dark:to-orange-500"
        },
        {
          key: "nopagado",
          label: "No pagado",
          subLabel: "Sin avance",
          value: facturas
            .filter((factura) => factura.estadoPago === "No Pagado")
            .reduce((total, factura) => total + factura.montoAjustado, 0),
          count: facturas.filter((factura) => factura.estadoPago === "No Pagado").length,
          level: "Prioritario",
          color: "from-rose-300 to-red-500 dark:from-rose-800 dark:to-red-600"
        }
      ];
    }

    if (focus === "flujo") {
      return [
        {
          key: "cobrado",
          label: "Cobrado",
          subLabel: "Cash-in",
          value: kpis.montoCobrado,
          count: facturas.filter((factura) => factura.montoCobrado > 0).length,
          level: "Entrada",
          color: "from-emerald-300 to-emerald-500 dark:from-emerald-700 dark:to-emerald-500"
        },
        {
          key: "vigente",
          label: "Pendiente",
          subLabel: "Vigente",
          value: kpis.pendienteVigente,
          count: facturas.filter(
            (factura) =>
              factura.estadoVencimiento === "Factura Vigente" && factura.saldoPendiente > 0
          ).length,
          level: "Por cobrar",
          color: "from-amber-200 to-orange-400 dark:from-amber-700 dark:to-orange-500"
        },
        {
          key: "vencido",
          label: "Pendiente",
          subLabel: "Vencido",
          value: kpis.pendienteVencido,
          count: facturas.filter(
            (factura) =>
              factura.estadoVencimiento === "Factura Vencida" && factura.saldoPendiente > 0
          ).length,
          level: "Riesgo",
          color: "from-rose-300 to-red-500 dark:from-rose-800 dark:to-red-600"
        }
      ];
    }

    if (focus === "historico") {
      const grouped = new Map<string, { label: string; value: number; count: number }>();

      facturas.forEach((factura) => {
        const date = new Date(`${factura.fechaEmision}T00:00:00`);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const label = new Intl.DateTimeFormat("es-CL", {
          month: "short",
          year: "2-digit"
        }).format(date);
        const current = grouped.get(key) ?? { label, value: 0, count: 0 };
        current.value += factura.montoAjustado;
        current.count += 1;
        grouped.set(key, current);
      });

      return [...grouped.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item], index) => ({
          key,
          label: item.label,
          subLabel: "Emisión",
          value: item.value,
          count: item.count,
          level: index === grouped.size - 1 ? "Actual" : "Histórico",
          color:
            index === grouped.size - 1
              ? "from-orange-300 to-orange-500 dark:from-orange-700 dark:to-orange-500"
              : "from-stone-200 to-stone-400 dark:from-stone-700 dark:to-stone-500"
        }));
    }

    return agingBuckets.map((bucket, index) => ({
      key: bucket.label,
      label: bucket.label,
      subLabel: ["Bajo", "Medio", "Alto", "Crítico"][index],
      value: bucket.monto,
      count: bucket.count,
      level: ["Saludable", "Atención", "Gestión", "Urgente"][index],
      color:
        [
          "from-emerald-200 to-emerald-400 dark:from-emerald-800 dark:to-emerald-500",
          "from-amber-200 to-amber-400 dark:from-amber-800 dark:to-amber-500",
          "from-orange-200 to-orange-500 dark:from-orange-800 dark:to-orange-500",
          "from-rose-300 to-red-500 dark:from-rose-900 dark:to-red-600"
        ][index] ?? bucket.color
    }));
  }, [agingBuckets, facturas, focus, kpis.montoCobrado, kpis.pendienteVencido, kpis.pendienteVigente]);
  const maxChartValue = Math.max(...chartData.map((item) => item.value), 1);
  const activeChartItem = chartData.find((item) => item.key === activeChartKey) ?? chartData[0];
  const focusDescription = {
    aging: "Agrupa saldos vencidos por tramo de mora con semáforo de urgencia.",
    estado: "Compara cartera pagada, parcial y sin pago para medir salud de cobro.",
    flujo: "Separa efectivo cobrado, pendiente vigente y pendiente vencido.",
    historico: "Ordena la cartera por periodo de emisión para leer evolución."
  }[focus];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-6 text-stone-950 shadow-[0_18px_44px_rgba(15,23,42,0.09)] dark:border-stone-700 dark:bg-[#171717] dark:text-white"
      >
        <div className="pho-hero-texture absolute inset-0 opacity-70" />
        <div className="absolute inset-y-0 left-0 w-1.5 bg-orange-500" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_420px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white/80 px-4 py-2 text-sm font-semibold text-orange-600 shadow-sm dark:border-stone-700 dark:bg-black/30 dark:text-orange-400">
              <Sparkles className="size-4" aria-hidden="true" />
              CxC PHO command center
            </div>
            <h1 className="mt-7 max-w-4xl text-4xl font-semibold tracking-tight sm:text-[2.85rem] sm:leading-tight">
              Cartera, cobranza y trazabilidad en una sola lectura.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600 dark:text-stone-300">
              Un tablero vivo para entender qué cobrar, cuándo actuar y qué documentos explican cada movimiento.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {[
                { label: "Cartera", icon: Gauge },
                { label: "Cobranza", icon: Target },
                { label: "Riesgo", icon: ShieldAlert }
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      index === 0
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-stone-200 bg-white/70 text-stone-600 hover:border-orange-300 hover:text-stone-950 dark:border-stone-700 dark:bg-black/20 dark:text-stone-300 dark:hover:border-orange-500/60 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-stone-700 dark:bg-black/24">
            <div className="flex items-start gap-4">
              <div className="flex size-14 items-center justify-center rounded-lg border border-stone-200 bg-white text-orange-600 shadow-sm dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
                <Gauge className="size-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-stone-500 dark:text-stone-400">Foco activo</p>
                <h2 className="text-xl font-semibold">Visión de salud financiera</h2>
              </div>
            </div>
            <p className="mt-6 leading-7 text-stone-600 dark:text-stone-300">
              Cruza saldo, documentos y velocidad de cobro para priorizar la cartera completa.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-[#151515]">
                <p className="text-sm text-stone-500 dark:text-stone-400">Cobrado</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">{recovery}%</p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-[#151515]">
                <p className="text-sm text-stone-500 dark:text-stone-400">Presión mora</p>
                <p className="mt-2 text-3xl font-semibold text-rose-600 dark:text-rose-400">{mora}%</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white py-3 text-stone-600 shadow-[0_12px_26px_rgba(15,23,42,0.07)] dark:border-stone-700 dark:bg-[#111111] dark:text-stone-300">
        <motion.div
          className="flex min-w-max gap-10 px-4 text-sm"
          animate={{ x: ["0%", "-35%"] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        >
          {[
            "Factura 2976 vence en 3 días",
            "Cliente Clínica Andes SpA posee 105 días de atraso",
            "Cliente María Fernanda Ruiz posee 95% de pagos puntuales",
            "Factura 3010 fue pagada en fecha"
          ].map((message) => (
            <span key={message} className="flex items-center gap-5">
              <span>{message}</span>
              <span className="size-2 rounded-full bg-amber-400" />
            </span>
          ))}
        </motion.div>
      </div>

      <section className="space-y-5">{renderKpiGroup(kpiGroups[0], 0)}</section>

      <section className="space-y-5">{renderKpiGroup(kpiGroups[1], 1)}</section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.55fr]">
        <div className={darkPanelClass("p-6")}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold">Mapa financiero interactivo</h2>
              <p className="mt-1 text-stone-500 dark:text-stone-400">
                Cambia el lente para leer flujo, estado, histórico o riesgo de cartera.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1 sm:grid-cols-4 dark:border-stone-700 dark:bg-black/45">
              {[
                { key: "aging", label: "Aging", icon: Layers3 },
                { key: "estado", label: "Estado", icon: Activity },
                { key: "flujo", label: "Flujo", icon: BarChart3 },
                { key: "historico", label: "Histórico", icon: LineChart }
              ].map((item) => {
                const Icon = item.icon;

                return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFocus(item.key as typeof focus)}
                  className={`inline-flex min-w-28 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition ${
                    focus === item.key
                      ? "bg-orange-500 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-black/35">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {["Todo", "30 días", "60 días", "90 días", "Manual"].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActivePeriod(label)}
                    className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold ${
                      activePeriod === label || (index === 0 && activePeriod === "Todo")
                        ? "border-orange-300 bg-white text-orange-600 shadow-sm dark:bg-stone-950"
                        : "border-stone-200 bg-white text-stone-500 transition hover:border-orange-200 hover:text-orange-600 dark:border-stone-800 dark:bg-stone-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 text-sm text-stone-500 sm:grid-cols-2 dark:text-stone-400">
                <span className="inline-flex items-center justify-between gap-3 whitespace-nowrap rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900">
                  Desde <strong className="text-stone-950 dark:text-white">01-01-2026</strong>
                  <CalendarClock className="size-4 text-stone-500" aria-hidden="true" />
                </span>
                <span className="inline-flex items-center justify-between gap-3 whitespace-nowrap rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900">
                  Hasta <strong className="text-stone-950 dark:text-white">30-06-2026</strong>
                  <CalendarClock className="size-4 text-stone-500" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {focus === "flujo" && (
            <motion.div
              key="flujo-chart"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-black/35"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-semibold">Monto cobrado vs pendiente</h3>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    {cashStory}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm dark:border-stone-800 dark:bg-stone-950">
                  <p className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                    Lectura activa
                  </p>
                  <p className={`mt-1 number-tabular text-lg font-semibold ${activeCashBar.text}`}>
                    {formatCurrency(activeCashBar.value)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_240px]">
                <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                  <div className="grid h-72 grid-cols-[76px_1fr] gap-4">
                    <div className="flex flex-col justify-between py-3 text-right text-xs text-stone-500 dark:text-stone-400">
                      {cashTicks.map((tick) => (
                        <span key={tick}>{compactCurrency(tick)}</span>
                      ))}
                    </div>
                    <div className="relative border-b border-l border-stone-300 px-6 pb-8 pt-3 dark:border-stone-800">
                      <div className="absolute inset-x-6 top-3 grid h-[calc(100%-44px)] grid-rows-4">
                        {[0, 1, 2, 3].map((line) => (
                          <span key={line} className="border-t border-dashed border-stone-200 dark:border-stone-800" />
                        ))}
                      </div>
                      <div className="relative flex h-full items-end justify-center gap-10">
                        {cashBars.map((item) => {
                          const isActive = activeCashKey === item.key;
                          const ratio = Math.round((item.value / Math.max(kpis.carteraTotal, 1)) * 100);

                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setActiveCashKey(item.key)}
                              onMouseEnter={() => setActiveCashKey(item.key)}
                              className="group flex h-full flex-1 flex-col items-center justify-end gap-3 outline-none"
                            >
                              <span
                                className={`rounded-md px-2 py-1 text-xs font-semibold shadow-sm ${
                                  isActive ? "bg-orange-500 text-white" : "bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-300"
                                }`}
                              >
                                {ratio}% cartera
                              </span>
                              <motion.div
                                className={`w-full max-w-24 rounded-t-xl ${item.bar} shadow-[0_-14px_28px_rgba(15,23,42,0.12)] transition ${
                                  isActive ? "ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-black" : "opacity-80 group-hover:opacity-100"
                                }`}
                                initial={{ height: 0 }}
                                animate={{ height: progressWidth((item.value / maxCashBarValue) * 100) }}
                                transition={{ duration: 0.75 }}
                              />
                              <div className="min-h-12 text-center">
                                <p className="number-tabular text-sm font-semibold">{compactCurrency(item.value)}</p>
                                <p className="text-xs text-stone-500 dark:text-stone-400">{item.label}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {cashBars.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveCashKey(item.key)}
                      className={`rounded-lg border p-4 text-left transition ${
                        activeCashKey === item.key
                          ? "border-orange-300 bg-white shadow-md dark:border-orange-500/40 dark:bg-stone-950"
                          : "border-stone-200 bg-white/70 hover:bg-white dark:border-stone-800 dark:bg-stone-950/70"
                      }`}
                    >
                      <p className="text-sm text-stone-500 dark:text-stone-400">{item.caption}</p>
                      <p className={`mt-2 number-tabular text-xl font-semibold ${item.text}`}>{formatCurrency(item.value)}</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                        <motion.div
                          className={`h-full rounded-full ${item.bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: progressWidth((item.value / Math.max(kpis.carteraTotal, 1)) * 100) }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
            )}

            {focus === "estado" && (
            <motion.div
              key="estado-chart"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-black/35"
            >
              <h3 className="font-semibold">Estado de vencimiento de la cartera</h3>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Estado dominante: {dominantPaymentState.label} concentra{" "}
                {Math.round((dominantPaymentState.value / Math.max(kpis.carteraTotal, 1)) * 100)}% de la cartera.
              </p>
              <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr] lg:items-center">
                <button
                  type="button"
                  className="relative mx-auto flex size-60 items-center justify-center rounded-full shadow-[0_18px_38px_rgba(15,23,42,0.12)] outline-none"
                  style={{ background: pieBackground }}
                  aria-label="Gráfico de torta de estados de pago"
                >
                  <span className="flex size-36 flex-col items-center justify-center rounded-full bg-white text-center shadow-sm dark:bg-stone-950">
                    <span className="text-3xl font-semibold">
                      {Math.round((activePaymentState.value / Math.max(kpis.carteraTotal, 1)) * 100)}%
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">{activePaymentState.label}</span>
                    <span className="mt-1 number-tabular text-xs font-semibold text-stone-600 dark:text-stone-300">
                      {compactCurrency(activePaymentState.value)}
                    </span>
                  </span>
                </button>

                <div className="space-y-3">
                  {paymentStates.map((state) => (
                    <button
                      key={state.key}
                      type="button"
                      onClick={() => setActivePaymentKey(state.key)}
                      onMouseEnter={() => setActivePaymentKey(state.key)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        activePaymentKey === state.key
                          ? "border-orange-300 bg-stone-50 shadow-sm dark:border-orange-500/40 dark:bg-stone-900"
                          : "border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: state.color }} />
                          {state.label}
                        </span>
                        <span className="number-tabular text-sm font-semibold">
                          {Math.round((state.value / Math.max(kpis.carteraTotal, 1)) * 100)}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                        <span className="number-tabular text-stone-500 dark:text-stone-400">{formatCurrency(state.value)}</span>
                        <span style={{ color: state.color }}>{state.caption}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: state.color }}
                          initial={{ width: 0 }}
                          animate={{ width: progressWidth((state.value / Math.max(kpis.carteraTotal, 1)) * 100) }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
            )}

          {focus === "historico" && (
          <motion.div
            key="historico-chart"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-black/35"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Tendencia financiera mensual</h3>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Facturado por emisión versus ingresado por fecha de pago.
                </p>
              </div>
              <div className="grid gap-2 text-right">
                <p className="number-tabular text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {activeTrend ? formatCurrency(activeTrend.ingresado) : formatCurrency(kpis.montoCobrado)}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {activeTrend ? `Brecha ${activeTrend.label}: ${compactCurrency(activeTrendGap)}` : "Sin movimiento activo"}
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
                    <span className="size-2.5 rounded-full bg-orange-500" />
                    Histórico facturado
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
                    <span className="size-2.5 rounded-full bg-emerald-500" />
                    Histórico ingresado
                  </span>
                </div>
                <span className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900">
                  {activeTrend
                    ? `${activeTrend.label}: facturado ${compactCurrency(activeTrend.facturado)} · ingresado ${compactCurrency(activeTrend.ingresado)}`
                    : "Facturado por emisión · ingresado por fecha de pago"}
                </span>
              </div>
              <svg viewBox="0 0 420 230" className="h-80 w-full overflow-visible">
                {[46, 79, 112, 145, 178].map((y) => (
                  <line
                    key={y}
                    x1="54"
                    x2="390"
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-stone-200 dark:text-stone-800"
                    strokeDasharray="4 5"
                  />
                ))}
                {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                  <text
                    key={ratio}
                    x="46"
                    y={178 - ratio * 132 + 4}
                    textAnchor="end"
                    className="fill-stone-500 text-[10px]"
                  >
                    {compactCurrency(maxTrendValue * ratio)}
                  </text>
                ))}
                <motion.polyline
                  points={billedPolyline}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9 }}
                />
                <motion.polyline
                  points={paidPolyline}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, delay: 0.12 }}
                />
                {trendData.map((item, index) => {
                  const billedPoint = billedTrendPoints[index];
                  const paidPoint = paidTrendPoints[index];
                  const isActive = activeTrend?.key === item.key;

                  return (
                    <g
                      key={item.key}
                      className="cursor-pointer"
                      onClick={() => setActiveTrendKey(item.key)}
                      onMouseEnter={() => setActiveTrendKey(item.key)}
                    >
                      {isActive && (
                        <line
                          x1={billedPoint.x}
                          x2={billedPoint.x}
                          y1="42"
                          y2="184"
                          stroke="#f97316"
                          strokeOpacity="0.22"
                          strokeDasharray="4 4"
                        />
                      )}
                      <circle cx={billedPoint.x} cy={billedPoint.y} r={isActive ? "6.5" : "4.5"} fill="#f97316" stroke="white" strokeWidth="2.5" />
                      <circle cx={paidPoint.x} cy={paidPoint.y} r={isActive ? "6.5" : "4.5"} fill="#10b981" stroke="white" strokeWidth="2.5" />
                      <text
                        x={billedPoint.x}
                        y="206"
                        textAnchor="middle"
                        className={`${isActive ? "fill-orange-600" : "fill-stone-600"} text-[10px] font-semibold`}
                      >
                        {item.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {trendData.slice(-3).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTrendKey(item.key)}
                    onMouseEnter={() => setActiveTrendKey(item.key)}
                    className={`rounded-lg border p-3 text-left transition ${
                      activeTrend?.key === item.key
                        ? "border-orange-300 bg-orange-50 shadow-sm dark:border-orange-500/40 dark:bg-orange-500/10"
                        : "border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">{item.label}</p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-orange-600">Fact. {compactCurrency(item.facturado)}</span>
                      <span className="text-emerald-600">Ing. {compactCurrency(item.ingresado)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden">
              <svg viewBox="0 0 360 180" className="h-72 w-full overflow-visible">
                <defs>
                  <linearGradient id="timelineFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {[36, 75, 114, 153].map((y) => (
                  <line
                    key={y}
                    x1="42"
                    x2="336"
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-stone-200 dark:text-stone-800"
                    strokeDasharray="4 5"
                  />
                ))}
                {[1, 0.75, 0.5, 0.25].map((ratio) => (
                  <text
                    key={ratio}
                    x="34"
                    y={154 - ratio * 118 + 4}
                    textAnchor="end"
                    className="fill-stone-500 text-[10px]"
                  >
                    {compactCurrency(maxTimelineAccumulated * ratio)}
                  </text>
                ))}
                {timelineAreaPoints && <polygon points={timelineAreaPoints} fill="url(#timelineFill)" />}
                {timelinePoints && (
                  <motion.polyline
                    points={timelinePoints}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9 }}
                  />
                )}
                {paymentTimeline.map((item, index) => {
                  const x =
                    paymentTimeline.length === 1 ? 180 : 42 + (index / Math.max(paymentTimeline.length - 1, 1)) * 294;
                  const y = 154 - (item.acumulado / maxTimelineAccumulated) * 118;

                  return (
                    <g key={item.id}>
                      <circle cx={x} cy={y} r="5" fill="#10b981" stroke="white" strokeWidth="3" />
                      <text x={x} y="174" textAnchor="middle" className="fill-stone-500 text-[10px]">
                        {new Intl.DateTimeFormat("es-CL", { month: "short" }).format(new Date(`${item.fecha}T00:00:00`))}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {paymentTimeline.slice(-3).map((item) => (
                  <div key={item.id} className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                    <p className="text-xs text-stone-500 dark:text-stone-400">{formatDate(item.fecha)}</p>
                    <p className="mt-1 number-tabular font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.acumulado)}
                    </p>
                    <p className="mt-1 truncate text-xs text-stone-500 dark:text-stone-400">{item.documento}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          )}

          {focus === "aging" && (
          <motion.div
            key="aging-chart"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-black/35"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Aging de mora</h3>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Barras por días vencidos para priorizar la gestión.
                </p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-right shadow-sm dark:border-stone-800 dark:bg-stone-950">
                <p className="number-tabular text-lg font-semibold text-rose-600 dark:text-rose-400">
                  {formatCurrency(activeAgingBucket?.monto ?? kpis.pendienteVencido)}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {activeAgingBucket ? `${activeAgingBucket.label} · ${activeAgingBucket.count} docs` : "Foco de mora"}
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
              <div className="grid h-80 grid-cols-[84px_1fr] gap-4">
                <div className="flex flex-col justify-between py-4 text-right text-xs text-stone-500 dark:text-stone-400">
                  {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                    <span key={ratio}>{compactCurrency(maxBucket * ratio)}</span>
                  ))}
                </div>
                <div className="relative border-b border-l border-stone-300 px-5 pb-8 pt-4 dark:border-stone-800">
                  <div className="absolute inset-x-5 top-4 grid h-[calc(100%-48px)] grid-rows-4">
                    {[0, 1, 2, 3].map((line) => (
                      <span key={line} className="border-t border-dashed border-stone-200 dark:border-stone-800" />
                    ))}
                  </div>
                  <div className="relative grid h-full items-end gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                    {agingBuckets.map((bucket, index) => {
                      const riskLabel = ["Bajo", "Medio", "Alto", "Crítico"][index];
                      const isActive = activeAgingBucket?.label === bucket.label;

                      return (
                        <button
                          key={bucket.label}
                          type="button"
                          onClick={() => setActiveAgingKey(bucket.label)}
                          onMouseEnter={() => setActiveAgingKey(bucket.label)}
                          className="group flex h-full flex-col items-center justify-end gap-3 text-center outline-none"
                        >
                          <span
                            className={`rounded-md px-3 py-1 text-xs font-semibold shadow-sm transition ${
                              isActive
                                ? "bg-orange-500 text-white"
                                : "bg-white text-orange-600 group-hover:bg-orange-50 dark:bg-stone-900"
                            }`}
                          >
                            {riskLabel}
                          </span>
                          <motion.div
                            className={`w-full max-w-28 rounded-t-xl ${bucket.bar} shadow-[0_-12px_26px_rgba(15,23,42,0.12)] transition ${
                              isActive ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-white dark:ring-offset-stone-950" : "opacity-80 group-hover:opacity-100"
                            }`}
                            initial={{ height: 0 }}
                            animate={{ height: progressWidth((bucket.monto / maxBucket) * 100) }}
                            transition={{ duration: 0.7, delay: index * 0.08 }}
                          />
                          <div className="min-h-14">
                            <p className="number-tabular text-sm font-semibold">{compactCurrency(bucket.monto)}</p>
                            <p className="text-xs text-stone-500 dark:text-stone-400">{bucket.label}</p>
                            <p className="text-xs text-stone-500 dark:text-stone-400">{bucket.count} docs</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          )}
        </div>
        </div>

        <div className={darkPanelClass("relative overflow-hidden p-6")}>
          <div className="absolute inset-y-0 left-0 w-1 bg-orange-500" />
          <div className="relative">
            <h2 className="text-xl font-semibold">Pulso de cobranza</h2>
            <div className="mx-auto mt-8 flex size-56 flex-col items-center justify-center rounded-xl border border-stone-200 bg-white shadow-inner dark:border-stone-700 dark:bg-black/45">
              <div className="flex size-36 flex-col items-center justify-center rounded-xl border border-orange-500/45">
                <p className="text-stone-500 dark:text-stone-400">recuperación</p>
                <p className="mt-2 text-5xl font-semibold">{recovery}%</p>
                <div className="mt-5 h-2 w-24 overflow-hidden rounded-full bg-stone-800">
                  <motion.div
                    className="h-full rounded-full bg-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: progressWidth(recovery) }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-7 space-y-4">
              {[
                ["Eficiencia de cobro", `${recovery}%`, `${formatCurrency(kpis.montoCobrado)} recuperados sobre cartera activa.`, "text-emerald-400"],
                ["Mora sobre pendiente", `${mora}%`, "Indica cuánto del saldo requiere gestión prioritaria.", "text-rose-500"],
                ["Pagos parciales", `${partialCount}`, "Documentos con avance de pago que pueden cerrarse pronto.", "text-orange-500"],
                ["Reemplazos documentales", `${facturas.filter((factura) => factura.documentosRelacionados?.length).length}`, "Facturas relacionadas por corrección y reemplazo.", "text-violet-400"]
              ].map(([label, value, detail, color]) => (
                <div key={label} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-black/45">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{label}</p>
                    <p className={`text-lg ${color}`}>{value}</p>
                  </div>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_0.65fr_0.75fr]">
        <div className={darkPanelClass("p-6")}>
          <h2 className="text-xl font-semibold">Mix documental</h2>
          <div className="mt-7 space-y-5">
            {documentMix.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-lg">
                <span>{item.label}</span>
                <span className="font-semibold">{item.count} docs</span>
              </div>
            ))}
          </div>
        </div>

        <div className={darkPanelClass("overflow-hidden")}>
          <div className="border-b border-t-4 border-b-stone-200 border-t-emerald-500 bg-white px-6 py-5 text-stone-950 dark:border-b-stone-700 dark:bg-[#151515] dark:text-white">
            <h2 className="text-xl font-semibold">Top clientes cumplidores</h2>
          </div>
          <div className="space-y-4 p-5">
            {clientStats.cumplidores.map((client) => (
              <div key={client.cliente} className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-black/45">
                <p className="font-semibold">{client.cliente}</p>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  {client.promedioDias} días atraso promedio · {client.vencidas} eventos
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-emerald-400" aria-hidden="true" />
                  <span className="font-semibold">{client.puntualidad}% pago puntual</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                  <motion.div
                    className="h-full rounded-full bg-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: progressWidth(client.puntualidad) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={darkPanelClass("overflow-hidden")}>
          <div className="border-b border-t-4 border-b-stone-200 border-t-rose-500 bg-white px-6 py-5 text-stone-950 dark:border-b-stone-700 dark:bg-[#151515] dark:text-white">
            <h2 className="text-xl font-semibold">Top clientes morosos</h2>
          </div>
          <div className="space-y-4 p-5">
            {clientStats.morosos.map((client) => (
              <div key={client.cliente} className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-black/45">
                <p className="font-semibold">{client.cliente}</p>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  {client.promedioDias} días atraso promedio · {client.vencidas} eventos
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <AlertTriangle className="size-4 text-rose-500" aria-hidden="true" />
                  <span className="font-semibold">{formatCurrency(client.saldoVencido)}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                  <motion.div
                    className="h-full rounded-full bg-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: progressWidth((client.saldoVencido / Math.max(kpis.pendienteVencido, 1)) * 100) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1fr]">
        <div className={darkPanelClass("p-6")}>
          <h2 className="text-xl font-semibold">Heatmap de mora</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {agingBuckets.map((bucket) => {
              const isActive = activeAgingBucket?.label === bucket.label;

              return (
              <button
                key={bucket.label}
                type="button"
                onClick={() => setActiveAgingKey(bucket.label)}
                onMouseEnter={() => setActiveAgingKey(bucket.label)}
                className={`rounded-lg border bg-gradient-to-br ${bucket.color} ${bucket.text} ${bucket.border} p-5 text-left shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition ${
                  isActive ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-white dark:ring-offset-stone-950" : "hover:-translate-y-0.5 hover:shadow-lg"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold">{bucket.label}</p>
                  <span className="rounded-md bg-white/80 px-3 py-1 text-sm font-semibold text-stone-950 shadow-sm dark:bg-black/55 dark:text-white">
                    {bucket.count} docs
                  </span>
                </div>
                <p className="mt-5 text-2xl font-semibold">{formatCurrency(bucket.monto)}</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/75 dark:bg-black/45">
                  <motion.div
                    className={`h-full rounded-full ${bucket.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: progressWidth((bucket.monto / maxBucket) * 100) }}
                  />
                </div>
              </button>
              );
            })}
          </div>
        </div>

        <div className={darkPanelClass("p-6")}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Acciones sugeridas</h2>
            <button className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 dark:border-stone-700 dark:bg-black/30 dark:text-stone-300">
              <Target className="size-4" aria-hidden="true" />
              Prioridad por vencimiento
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {acciones.map((factura) => (
              <div key={factura.id} className="grid gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-[1fr_auto] dark:border-stone-700 dark:bg-black/45">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">
                      {formatearFolioDocumento(factura.tipoDocumento, factura.numero)}
                    </p>
                    <span className="rounded-md bg-stone-200 px-2 py-1 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      {factura.estadoVencimiento === "Factura Vencida" ? "Vencida" : "Próxima a vencer"}
                    </span>
                  </div>
                  <p className="mt-2 text-stone-500 dark:text-stone-400">
                    {factura.cliente.nombre} · vence {formatDate(factura.fechaVencimiento)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-lg font-semibold">{formatCurrency(factura.saldoPendiente)}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{Math.round(factura.progresoPago)}% pagado</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
