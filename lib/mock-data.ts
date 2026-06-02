import { calcularFechaVencimiento } from "@/lib/cxc-calculations";
import { Cliente, Factura } from "@/lib/types";

export const clientesMock: Cliente[] = [
  {
    id: "cli-001",
    nombre: "Constructora Andes SpA",
    rut: "76.245.891-4",
    tipo: "B2B"
  },
  {
    id: "cli-002",
    nombre: "Inversiones Costa Sur Ltda.",
    rut: "77.018.334-8",
    tipo: "B2B"
  },
  {
    id: "cli-003",
    nombre: "María Fernanda Rojas",
    rut: "15.338.452-1",
    tipo: "B2C"
  },
  {
    id: "cli-004",
    nombre: "Servicios Logísticos Norte S.A.",
    rut: "96.831.440-2",
    tipo: "B2B"
  }
];

export const facturasMock: Factura[] = [
  {
    id: "fac-001",
    numero: "000145",
    tipoDocumento: "Factura Electrónica 33",
    clienteId: "cli-001",
    fechaEmision: "2026-05-10",
    fechaVencimiento: calcularFechaVencimiento("2026-05-10", "30 días"),
    condicionPago: "30 días",
    monto: 14200000,
    observacion: "Estados de pago obra Los Maitenes",
    pagos: [],
    notasCredito: [],
    notasDebito: []
  },
  {
    id: "fac-002",
    numero: "000132",
    tipoDocumento: "Factura Electrónica 33",
    clienteId: "cli-002",
    fechaEmision: "2026-03-18",
    fechaVencimiento: calcularFechaVencimiento("2026-03-18", "45 días"),
    condicionPago: "45 días",
    monto: 8650000,
    pagos: [
      {
        id: "pag-001",
        fechaPago: "2026-04-20",
        monto: 4000000,
        observacion: "Primer abono según compromiso de pago",
        tipo: "Abono"
      }
    ],
    notasCredito: [],
    notasDebito: [
      {
        id: "nd-001",
        numero: "000018",
        fecha: "2026-04-02",
        monto: 520000,
        motivo: "Servicio adicional",
        observacion: "Horas adicionales de cuadrilla"
      }
    ]
  },
  {
    id: "fac-003",
    numero: "000087",
    tipoDocumento: "Factura Exenta Electrónica 34",
    clienteId: "cli-003",
    fechaEmision: "2026-01-15",
    fechaVencimiento: calcularFechaVencimiento("2026-01-15", "15 días"),
    condicionPago: "15 días",
    monto: 1250000,
    pagos: [
      {
        id: "pag-002",
        fechaPago: "2026-02-04",
        monto: 1250000,
        observacion: "Pago final por transferencia",
        tipo: "Pago"
      }
    ],
    notasCredito: [],
    notasDebito: []
  },
  {
    id: "fac-004",
    numero: "000118",
    tipoDocumento: "Factura Electrónica 33",
    clienteId: "cli-004",
    fechaEmision: "2026-02-03",
    fechaVencimiento: calcularFechaVencimiento("2026-02-03", "60 días"),
    condicionPago: "60 días",
    monto: 19850000,
    pagos: [
      {
        id: "pag-003",
        fechaPago: "2026-03-12",
        monto: 6000000,
        observacion: "Abono inicial",
        tipo: "Abono"
      },
      {
        id: "pag-004",
        fechaPago: "2026-04-28",
        monto: 4500000,
        observacion: "Segundo abono",
        tipo: "Abono"
      }
    ],
    notasCredito: [
      {
        id: "nc-001",
        numero: "000041",
        fecha: "2026-04-05",
        monto: 850000,
        motivo: "Ajuste comercial",
        observacion: "Descuento aprobado por gerencia"
      }
    ],
    notasDebito: []
  },
  {
    id: "fac-005",
    numero: "000099",
    tipoDocumento: "Factura Electrónica 33",
    clienteId: "cli-001",
    fechaEmision: "2025-12-15",
    fechaVencimiento: calcularFechaVencimiento("2025-12-15", "30 días"),
    condicionPago: "30 días",
    monto: 7200000,
    pagos: [],
    notasCredito: [
      {
        id: "nc-002",
        numero: "000035",
        fecha: "2026-01-08",
        monto: 7200000,
        motivo: "Anulación total",
        observacion: "Documento reemplazado por error en datos de cliente"
      }
    ],
    notasDebito: [],
    documentosRelacionados: [
      {
        id: "rel-001",
        tipo: "Factura Reemplazo",
        numero: "000101",
        fecha: "2026-01-09",
        observacion: "Factura emitida nuevamente con datos corregidos"
      }
    ]
  },
  {
    id: "fac-006",
    numero: "000150",
    tipoDocumento: "Factura Electrónica 33",
    clienteId: "cli-004",
    fechaEmision: "2026-05-28",
    fechaVencimiento: calcularFechaVencimiento("2026-05-28", "Contado"),
    condicionPago: "Contado",
    monto: 3450000,
    pagos: [],
    notasCredito: [],
    notasDebito: []
  }
];
