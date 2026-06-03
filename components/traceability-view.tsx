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
} from "@/components/status-badges";
import { DocumentFolio, nombreCortoDocumento } from "@/components/document-folio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { formatearFolioDocumento, limpiarNumeroSii, obtenerPrefijoDocumento } from "@/lib/document-ids";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { EventoTimeline, FacturaCalculada } from "@/lib/types";

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
  timelines
}: {
  facturas: FacturaCalculada[];
  timelines: Record<string, EventoTimeline[]>;
}) {
  const [facturaId, setFacturaId] = useState(facturas[0]?.id ?? "");

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
        <Card className="overflow-hidden">
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

            <div className="overflow-hidden rounded-lg border border-stone-200 bg-white text-stone-950 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
              <div className="h-1 bg-gradient-to-r from-orange-500 to-amber-300" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Folio documental</p>
                    <DocumentFolio
                      tipoDocumento={factura.tipoDocumento}
                      numero={factura.numero}
                      size="lg"
                      showLabel={false}
                      className="mt-3"
                    />
                  </div>
                  <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                    {nombreCortoDocumento(factura.tipoDocumento)}
                  </span>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-stone-500">Monto ajustado</span>
                    <span className="number-tabular font-semibold">
                      {formatCurrency(factura.montoAjustado)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-stone-500">Saldo pendiente</span>
                    <span className="number-tabular font-semibold">
                      {formatCurrency(factura.saldoPendiente)}
                    </span>
                  </div>
                  <Progress value={factura.progresoPago} />
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

        <Card>
          <CardHeader>
            <CardTitle>Pagos y abonos</CardTitle>
            <CardDescription>Monto cobrado contra monto ajustado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {factura.pagos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
            ) : (
              factura.pagos.map((pago) => (
                <div key={pago.id} className="rounded-md border bg-white p-3 text-sm shadow-sm">
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

        <Card>
          <CardHeader>
            <CardTitle>Notas y relacionados</CardTitle>
            <CardDescription>NC, ND y facturas de reemplazo vinculadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {relatedDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin documentos relacionados.</p>
            ) : (
              relatedDocuments.map((documento) => (
                <div key={documento.id} className="rounded-md border bg-white p-3 text-sm shadow-sm">
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
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-white/75">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
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
            <div className="relative space-y-5 pl-8 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
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
                    <span className="absolute -left-[31px] top-1 flex size-7 items-center justify-center rounded-full border bg-white text-primary shadow-sm">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="rounded-md border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
