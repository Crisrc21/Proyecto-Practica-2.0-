import { ClientsView } from "@/components/clients-view";
import { PageHeader } from "@/components/page-header";
import { clientesMock } from "@/lib/mock-data";

export default function ClientesPage() {
  return (
    <>
      <PageHeader
        title="Clientes"
        description="Mantención local de clientes con nombre, RUT y tipo, sin correo, teléfono ni dirección."
      />
      <ClientsView initialClientes={clientesMock} />
    </>
  );
}
