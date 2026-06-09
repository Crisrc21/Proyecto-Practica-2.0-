"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CircleCheck,
  CreditCard,
  FilePenLine,
  GitBranch,
  ReceiptText
} from "lucide-react";
import {
  EstadoDocumentalBadge,
  EstadoPagoBadge,
  EstadoVencimientoBadge
} from "@/modules/accounts-receivable/components/status-badges";
import { DocumentFolio, nombreCortoDocumento } from "@/modules/accounts-receivable/components/document-folio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label, Select } from "@/shared/components/ui/form";
import { Progress } from "@/shared/components/ui/progress";
import { formatearFolioDocumento, limpiarNumeroSii, obtenerPrefijoDocumento } from "@/modules/accounts-receivable/data/document-ids";
import { formatCurrency, formatDate } from "@/shared/lib/formatters";
import { EventoTimeline, FacturaCalculada } from "@/modules/accounts-receivable/types";

function iconForEvent(tipo: EventoTimeline["tipo"]) {
  if (tipo === "Pago" || tipo === "Abono") return CreditCard;
  if (tipo === "Nota de Crédito" || tipo === "Nota de Débito" || tipo === "Anulación") {
    return FilePenLine;
  }
  if (tipo === "Cierre") return CircleCheck;
  return ReceiptText;
}

export function TraceabilityView({
  facturas,
  timelines,
  initialFacturaId
}: {
  facturas: FacturaCalculada[];
  timelines: Record<string, EventoTimeline[]>;
  initialFacturaId?: string;
}) {
  const [facturaId, setFacturaId] = useState(initialFacturaId ?? facturas[0]?.id ?? "");

  const factura = useMemo(
    () => facturas.find((item) => item.id === facturaId) ?? facturas[0],
    [facturaId, facturas]
  );
  const timeline = factura ? timelines[factura.id] : [];
  const relatedDocuments = useMemo(() => {
    if (!factura) return [];

    return [
      ...factura.notasCredito.map((nota) => ({
        id: nota.id,
        titulo: formatearFolioDocumento("Nota de Crédito Electrónica 61", nota.numero),
        fecha: nota.fecha,
        monto: nota.monto,
        detalle: nota.motivo
      })),
      ...factura.notasDebito.map((nota) => ({
        id: nota.id,
        titulo: formatearFolioDocumento("Nota de Débito Electrónica 56", nota.numero),
        fecha: nota.fecha,
        monto: nota.monto,
        detalle: nota.motivo
      })),
      ...(factura.documentosRelacionados ?? []).map((documento) => ({
        id: documento.id,
        titulo: formatearFolioDocumento(documento.tipo, documento.numero),
        fecha: documento.fecha,
        monto: undefined,
        detalle: documento.tipo
      }))
    ];
  }, [factura]);

  if (!factura) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <Card className="overflow-hidden dark:border-stone-700 dark:bg-stone-950/85">
          <CardHeader className="border-b bg-slate-950 text-white">
            <CardTitle>Documento</CardTitle>
            <CardDescription className="text-white/65">
              Selecciona una factura para revisar su historia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="factura">Factura</Label>
              <Select
                id="factura"
                value={facturaId}
                onChange={(event) => setFacturaId(event.target.value)}
              >
                {facturas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {obtenerPrefijoDocumento(item.tipoDocumento)} {limpiarNumeroSii(item.numero)} · {item.cliente.nombre}
                  </option>
                ))}
              </Select>
            </div>

            <div className="overflow-hidden rounded-lg border border-stone-200 bg-white text-stone-950 shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:border-stone-700 dark:bg-stone-900/85 dark:text-white">
              <div className="h-1 bg-gradient-to-r from-orange-500 to-amber-300" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">Folio documental</p>
                    <DocumentFolio
                      tipoDocumento={factura.tipoDocumento}
                      numero={factura.numero}
                      size="lg"
                      showLabel={false}
                      className="mt-3"
                    />
                  </div>
                  <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300">
                    {nombreCortoDocumento(factura.tipoDocumento)}
                  </span>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-stone-500 dark:text-stone-400">Monto ajustado</span>
                    <span className="number-tabular font-semibold">
                      {formatCurrency(factura.montoAjustado)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-stone-500 dark:text-stone-400">Saldo pendiente</span>
                    <span className="number-tabular font-semibold">
                      {formatCurrency(factura.saldoPendiente)}
                    </span>
                  </div>
                  <Progress
                    value={
                      factura.montoAjustado === 0
                        ? 0
                        : (factura.saldoPendiente / factura.montoAjustado) * 100
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <EstadoVencimientoBadge estado={factura.estadoVencimiento} />
              <EstadoPagoBadge estado={factura.estadoPago} />
              <EstadoDocumentalBadge estado={factura.estadoDocumental} />
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Cliente:{" "}
                <span className="font-medium text-foreground">{factura.cliente.nombre}</span>
              </p>
              <p>Emisión: {formatDate(factura.fechaEmision)}</p>
              <p>Vencimiento: {formatDate(factura.fechaVencimiento)}</p>
              <p>Condición: {factura.condicionPago}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:border-stone-700 dark:bg-stone-950/85">
          <CardHeader>
            <CardTitle>Pagos y abonos</CardTitle>
            <CardDescription>Monto cobrado contra monto ajustado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {factura.pagos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
            ) : (
              factura.pagos.map((pago) => (
                <div key={pago.id} className="rounded-md border border-stone-200 bg-white p-3 text-sm shadow-sm dark:border-stone-700 dark:bg-stone-900">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{pago.tipo}</span>
                    <span className="number-tabular">{formatCurrency(pago.monto)}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {formatDate(pago.fechaPago)} · {pago.observacion ?? "Sin observación"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="dark:border-stone-700 dark:bg-stone-950/85">
          <CardHeader>
            <CardTitle>Notas y relacionados</CardTitle>
            <CardDescription>NC, ND y facturas de reemplazo vinculadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {relatedDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin documentos relacionados.</p>
            ) : (
              relatedDocuments.map((documento) => (
                <div key={documento.id} className="rounded-md border border-stone-200 bg-white p-3 text-sm shadow-sm dark:border-stone-700 dark:bg-stone-900">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{documento.titulo}</span>
                    {documento.monto !== undefined && (
                      <span className="number-tabular">{formatCurrency(documento.monto)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {formatDate(documento.fecha)} · {documento.detalle}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden dark:border-stone-700 dark:bg-stone-950/85">
          <CardHeader className="border-b bg-gradient-to-r from-orange-50 via-white to-white dark:border-stone-700 dark:bg-[linear-gradient(90deg,rgba(249,115,22,0.18),rgba(28,25,23,0.92)_34%,rgba(28,25,23,0.78))]">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary dark:bg-orange-500/10 dark:text-orange-300">
                <GitBranch className="size-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Trazabilidad documental</CardTitle>
                <CardDescription>
                  Timeline cronológica de emisión, pagos, notas y cierre.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-5 pl-8 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border dark:before:bg-stone-700">
              {timeline.map((evento, index) => {
                const Icon = iconForEvent(evento.tipo);

                return (
                  <motion.div
                    key={evento.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="relative"
                  >
                    <span className="absolute -left-[31px] top-1 flex size-7 items-center justify-center rounded-full border border-stone-200 bg-white text-primary shadow-sm dark:border-orange-500/25 dark:bg-stone-900 dark:text-orange-300">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-stone-700 dark:bg-stone-900">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold">{evento.titulo}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{evento.descripcion}</p>
                        </div>
                        <div className="text-sm text-muted-foreground sm:text-right">
                          <p>{formatDate(evento.fecha)}</p>
                          {evento.monto !== undefined && (
                            <p className="number-tabular font-medium text-foreground">
                              {formatCurrency(evento.monto)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
