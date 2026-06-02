import { InvoiceForm } from "@/components/invoice-form";
import { PageHeader } from "@/components/page-header";
import { clientesMock } from "@/lib/mock-data";

export default function IngresoPage() {
  return (
    <>
      <PageHeader
        title="Ingreso de Factura"
        description="Registro local de facturas 33 y 34 con cálculo automático de fecha de vencimiento."
      />
      <InvoiceForm clientes={clientesMock} />
    </>
  );
}
