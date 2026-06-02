import { DashboardView } from "@/components/dashboard-view";
import { calcularKpisDashboard, enriquecerFactura } from "@/lib/cxc-calculations";
import { clientesMock, facturasMock } from "@/lib/mock-data";

export default function DashboardPage() {
  const kpis = calcularKpisDashboard(facturasMock, clientesMock);
  const facturas = facturasMock.map((factura) => enriquecerFactura(factura, clientesMock));

  return (
    <div>
      <DashboardView kpis={kpis} facturas={facturas} />
    </div>
  );
}
