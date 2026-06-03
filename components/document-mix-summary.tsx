import { FileText, ReceiptText } from "lucide-react";
import { FacturaCalculada } from "@/lib/types";

export function DocumentMixSummary({ facturas }: { facturas: FacturaCalculada[] }) {
  const mix = [
    {
      label: "Factura",
      code: "33",
      count: facturas.filter((factura) => factura.tipoDocumento === "Factura Electrónica 33").length
    },
    {
      label: "Factura exenta",
      code: "34",
      count: facturas.filter((factura) => factura.tipoDocumento === "Factura Exenta Electrónica 34").length
    },
    {
      label: "Nota débito",
      code: "56",
      count: facturas.reduce((total, factura) => total + factura.notasDebito.length, 0)
    },
    {
      label: "Nota crédito",
      code: "61",
      count: facturas.reduce((total, factura) => total + factura.notasCredito.length, 0)
    }
  ];

  return (
    <section className="mb-4 rounded-xl border border-stone-200 bg-white/90 p-4 text-stone-950 shadow-sm dark:border-stone-700 dark:bg-stone-950/85 dark:text-white">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mix documental</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Distribución de documentos antes de revisar el detalle de facturas.
          </p>
        </div>
        <ReceiptText className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {mix.map((item) => (
          <div key={item.code} className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/70">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200">
                <FileText className="size-4 text-primary" aria-hidden="true" />
                {item.label}
              </span>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-primary ring-1 ring-primary/15 dark:bg-orange-500/10 dark:ring-orange-500/25">
                {item.code}
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold">{item.count}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">documentos</p>
          </div>
        ))}
      </div>
    </section>
  );
}
