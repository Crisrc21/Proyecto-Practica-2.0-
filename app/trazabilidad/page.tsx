import { PageHeader } from "@/components/page-header";
import { TraceabilityView } from "@/components/traceability-view";
import { enriquecerFactura, generarTimelineFactura } from "@/lib/cxc-calculations";
import { clientesMock, facturasMock } from "@/lib/mock-data";

export default function TrazabilidadPage() {
  const facturas = facturasMock.map((factura) => enriquecerFactura(factura, clientesMock));
  const timelines = Object.fromEntries(
    facturasMock.map((factura) => [factura.id, generarTimelineFactura(factura)])
  );

  return (
    <>
      <PageHeader
        title="Trazabilidad"
        description="Detalle cronológico de emisión, pagos, abonos, notas de crédito, notas de débito y cierres."
      />
      <TraceabilityView facturas={facturas} timelines={timelines} />
    </>
  );
}
