"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { ArrowUpDown, Search } from "lucide-react";
import { DocumentFolio } from "@/components/document-folio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { formatearFolioDocumento } from "@/lib/document-ids";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { EstadoDocumental, EstadoPago, EstadoVencimiento, FacturaCalculada } from "@/lib/types";
import { cn } from "@/lib/utils";

export type FiltroFactura =
  | "Todas"
  | "Pendientes"
  | "Vigentes"
  | "Por vencer"
  | "Vencidas"
  | "No pagadas"
  | "Pagadas parcialmente"
  | "Pagadas completamente"
  | "Anuladas"
  | "Con NC"
  | "Con ND";

const filtros: FiltroFactura[] = [
  "Todas",
  "Pendientes",
  "Vigentes",
  "Por vencer",
  "Vencidas",
  "No pagadas",
  "Pagadas parcialmente",
  "Pagadas completamente",
  "Anuladas",
  "Con NC",
  "Con ND"
];

function aplicaFiltro(factura: FacturaCalculada, filtro: FiltroFactura) {
  if (filtro === "Todas") return true;
  if (filtro === "Pendientes") return factura.saldoPendiente > 0;
  if (filtro === "Vigentes") return factura.estadoVencimiento === "Factura Vigente";
  if (filtro === "Por vencer") return factura.estadoVencimiento === "Factura Vigente" && factura.saldoPendiente > 0;
  if (filtro === "Vencidas") return factura.estadoVencimiento === "Factura Vencida";
  if (filtro === "No pagadas") return factura.estadoPago === "No Pagado";
  if (filtro === "Pagadas parcialmente") return factura.estadoPago === "Pagado Parcialmente";
  if (filtro === "Pagadas completamente") return factura.estadoPago === "Pagado Completamente";
  if (filtro === "Anuladas") return factura.estadoDocumental === "Anulada";
  if (filtro === "Con NC") return factura.notasCredito.length > 0;
  return factura.notasDebito.length > 0;
}

export function normalizarFiltroFactura(value: string | null): FiltroFactura {
  const decoded = value ? decodeURIComponent(value).toLowerCase() : "";
  return filtros.find((item) => item.toLowerCase() === decoded) ?? "Todas";
}

function EstadoVencimientoCompacto({ estado }: { estado: EstadoVencimiento }) {
  return (
    <Badge tone={estado === "Factura Vencida" ? "danger" : "success"}>
      {estado === "Factura Vencida" ? "Vencida" : "Vigente"}
    </Badge>
  );
}

function EstadoPagoCompacto({ estado }: { estado: EstadoPago }) {
  const tone =
    estado === "Pagado Completamente"
      ? "success"
      : estado === "Pagado Parcialmente"
        ? "warning"
        : "muted";
  const label =
    estado === "Pagado Completamente"
      ? "Pagada"
      : estado === "Pagado Parcialmente"
        ? "Parcial"
        : "No pagada";

  return <Badge tone={tone}>{label}</Badge>;
}

function EstadoDocumentalCompacto({ estado }: { estado: EstadoDocumental }) {
  return <Badge tone={estado === "Anulada" ? "danger" : "default"}>{estado}</Badge>;
}

export function FacturasTable({
  facturas,
  initialFiltro = "Todas",
  initialQuery = ""
}: {
  facturas: FacturaCalculada[];
  initialFiltro?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroFactura>(() => normalizarFiltroFactura(initialFiltro));
  const [query, setQuery] = useState(initialQuery);
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    setFiltro(normalizarFiltroFactura(initialFiltro));
    setQuery(initialQuery);
  }, [initialFiltro, initialQuery]);

  function updateFiltro(item: FiltroFactura) {
    setFiltro(item);
    const params = new URLSearchParams();

    if (item === "Todas") {
      params.delete("filtro");
    } else {
      params.set("filtro", item);
    }

    if (query.trim()) {
      params.set("busqueda", query.trim());
    }

    const queryString = params.toString();
    router.replace(queryString ? `/facturas?${queryString}` : "/facturas", { scroll: false });
  }

  const data = useMemo(() => {
    const term = query.trim().toLowerCase();

    return facturas.filter((factura) => {
      const folio = formatearFolioDocumento(factura.tipoDocumento, factura.numero);
      const matchesFiltro = aplicaFiltro(factura, filtro);
      const matchesQuery =
        term.length === 0 ||
        factura.numero.toLowerCase().includes(term) ||
        folio.toLowerCase().includes(term) ||
        factura.cliente.nombre.toLowerCase().includes(term) ||
        factura.cliente.rut.toLowerCase().includes(term);

      return matchesFiltro && matchesQuery;
    });
  }, [facturas, filtro, query]);

  const columns = useMemo<ColumnDef<FacturaCalculada>[]>(
    () => [
      {
        accessorKey: "numero",
        header: "Documento",
        cell: ({ row }) => (
          <DocumentFolio
            tipoDocumento={row.original.tipoDocumento}
            numero={row.original.numero}
            size="sm"
          />
        )
      },
      {
        accessorFn: (row) => row.cliente.nombre,
        id: "cliente",
        header: "Cliente",
        cell: ({ row }) => (
          <span className="block truncate font-medium" title={row.original.cliente.nombre}>
            {row.original.cliente.nombre}
          </span>
        )
      },
      {
        accessorKey: "fechaEmision",
        header: "Emisión",
        cell: ({ row }) => formatDate(row.original.fechaEmision)
      },
      {
        accessorKey: "fechaVencimiento",
        header: "Vencimiento",
        cell: ({ row }) => formatDate(row.original.fechaVencimiento)
      },
      {
        accessorKey: "condicionPago",
        header: "Condición"
      },
      {
        accessorKey: "monto",
        header: "Monto",
        cell: ({ row }) => formatCurrency(row.original.monto)
      },
      {
        accessorKey: "saldoPendiente",
        header: "Saldo",
        cell: ({ row }) => (
          <div className="space-y-2">
            <span className="number-tabular font-medium">
              {formatCurrency(row.original.saldoPendiente)}
            </span>
            <Progress value={row.original.progresoPago} />
          </div>
        )
      },
      {
        accessorKey: "estadoVencimiento",
        header: "Mora",
        cell: ({ row }) => <EstadoVencimientoCompacto estado={row.original.estadoVencimiento} />
      },
      {
        accessorKey: "estadoPago",
        header: "Pago",
        cell: ({ row }) => <EstadoPagoCompacto estado={row.original.estadoPago} />
      },
      {
        accessorKey: "estadoDocumental",
        header: "Doc.",
        cell: ({ row }) => <EstadoDocumentalCompacto estado={row.original.estadoDocumental} />
      }
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filtros.map((item) => (
            <Button
              key={item}
              type="button"
              variant={item === filtro ? "default" : "outline"}
              size="sm"
              onClick={() => updateFiltro(item)}
              className="shadow-sm"
            >
              {item}
            </Button>
          ))}
        </div>
        <label className="relative block w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar documento, cliente o RUT"
            className="bg-white/90 pl-9 dark:bg-stone-900/90 dark:text-white"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white/90 text-stone-950 shadow-sm backdrop-blur dark:border-stone-700 dark:bg-stone-950/85 dark:text-stone-100">
        <div className="overflow-hidden">
          <table className="w-full table-fixed border-collapse text-[12px]">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="bg-slate-950 text-left text-xs uppercase text-white/70 dark:bg-black">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-2.5 py-3 font-semibold"
                    >
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1",
                          header.column.getCanSort() && "cursor-pointer"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="size-3" />
                      </button>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition hover:bg-primary/5 dark:hover:bg-orange-500/10">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-2.5 py-3 align-middle text-stone-700 dark:text-stone-200"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No hay facturas para el filtro seleccionado.
          </div>
        )}
      </div>
    </motion.div>
  );
}
