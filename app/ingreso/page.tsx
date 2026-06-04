import { InvoiceForm } from "@/components/invoice-form";
import { PageHeader } from "@/components/page-header";
import { enriquecerFactura } from "@/lib/cxc-calculations";
import { clientesMock, facturasMock } from "@/lib/mock-data";

export default function IngresoPage() {
  const facturas = facturasMock.map((factura) => enriquecerFactura(factura, clientesMock));

  return (
    <>
      <PageHeader
        title="Ingreso documental"
        description="Registro local de facturas afectas, exentas, notas de crédito y notas de débito."
      />
      <InvoiceForm clientes={clientesMock} facturas={facturas} />
    </>
  );
}
