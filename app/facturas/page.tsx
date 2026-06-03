import { FacturasTable } from "@/components/facturas-table";
import { PageHeader } from "@/components/page-header";
import { enriquecerFactura } from "@/lib/cxc-calculations";
import { clientesMock, facturasMock } from "@/lib/mock-data";

export default async function FacturasPage({
  searchParams
}: {
  searchParams?: Promise<{ filtro?: string; busqueda?: string }>;
}) {
  const params = await searchParams;
  const facturas = facturasMock.map((factura) => enriquecerFactura(factura, clientesMock));

  return (
    <>
      <PageHeader
        title="Facturas"
        description="Consulta de documentos, saldos, estados de pago, vencimiento y trazabilidad documental."
      />
      <FacturasTable facturas={facturas} initialFiltro={params?.filtro} initialQuery={params?.busqueda ?? ""} />
    </>
  );
}
