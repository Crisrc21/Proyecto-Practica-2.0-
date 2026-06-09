import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/app/components/app-sidebar";
import { PageHeader } from "@/shared/components/page-header";
import { calcularKpisDashboard, enriquecerFactura, generarTimelineFactura } from "@/modules/accounts-receivable/data/cxc-calculations";
import { clientesMock, facturasMock } from "@/modules/accounts-receivable/data/mock-data";
import { DashboardView } from "@/modules/accounts-receivable/components/dashboard-view";
import { DocumentMixSummary } from "@/modules/accounts-receivable/components/document-mix-summary";
import { FacturasTable } from "@/modules/accounts-receivable/components/invoices-table";
import { ClientsView } from "@/modules/customers/components/clients-view";
import { InvoiceForm } from "@/modules/document-intake/components/invoice-form";
import { TraceabilityView } from "@/modules/traceability/components/traceability-view";
import "@/modules/accounts-receivable/accounts-receivable.css";
import "@/modules/customers/customers.css";
import "@/modules/document-intake/document-intake.css";
import "@/modules/traceability/traceability.css";
import "./App.css";

function useBrowserLocation() {
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search
  }));

  useEffect(() => {
    function handleLocationChange() {
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search
      });
    }

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  return location;
}

export function App() {
  const location = useBrowserLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const facturas = useMemo(
    () => facturasMock.map((factura) => enriquecerFactura(factura, clientesMock)),
    []
  );
  const kpis = useMemo(() => calcularKpisDashboard(facturasMock, clientesMock), []);
  const timelines = useMemo(
    () => Object.fromEntries(facturasMock.map((factura) => [factura.id, generarTimelineFactura(factura)])),
    []
  );

  let content = (
    <DashboardView kpis={kpis} facturas={facturas} />
  );

  if (location.pathname === "/facturas") {
    content = (
      <>
        <PageHeader
          title="Facturas"
          description="Consulta de documentos, saldos, estados de pago, vencimiento y trazabilidad documental."
        />
        <DocumentMixSummary facturas={facturas} />
        <FacturasTable
          facturas={facturas}
          initialFiltro={params.get("filtro") ?? undefined}
          initialQuery={params.get("busqueda") ?? ""}
        />
      </>
    );
  }

  if (location.pathname === "/ingreso") {
    content = (
      <>
        <PageHeader
          title="Ingreso documental"
          description="Registro local de facturas afectas, exentas, notas de credito y notas de debito."
        />
        <InvoiceForm clientes={clientesMock} facturas={facturas} />
      </>
    );
  }

  if (location.pathname === "/clientes") {
    content = (
      <>
        <PageHeader
          title="Clientes"
          description="Mantencion local de clientes con nombre, RUT y tipo, sin correo, telefono ni direccion."
        />
        <ClientsView initialClientes={clientesMock} />
      </>
    );
  }

  if (location.pathname === "/trazabilidad") {
    content = (
      <>
        <PageHeader
          title="Trazabilidad"
          description="Detalle cronologico de emision, pagos, abonos, notas de credito, notas de debito y cierres."
        />
        <TraceabilityView
          facturas={facturas}
          timelines={timelines}
          initialFacturaId={params.get("factura") ?? undefined}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <AppSidebar pathname={location.pathname} />
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1500px]">{content}</div>
      </main>
    </div>
  );
}
