# CxC PHO

Aplicación web para gestión de cuentas por cobrar, creada con Next.js App Router, TypeScript, Tailwind CSS, componentes estilo shadcn/ui, Framer Motion y TanStack Table.

## Qué incluye

- Dashboard con cartera total, cobrado, pendiente vigente, pendiente vencido, facturas vigentes, vencidas y pagadas.
- Gráficos simples de distribución de cartera y aging vencido.
- Tabla de facturas con filtros de negocio, estados visuales y barra de avance de pago.
- Ingreso local de factura 33 o 34 con cálculo automático de vencimiento.
- Carga local de PDF del documento en el formulario de ingreso.
- Identificación documental con prefijos: `F` para factura, `FE` para factura exenta, `NC` para nota de crédito y `ND` para nota de débito.
- Creación local de clientes B2B y B2C.
- Trazabilidad documental con pagos, abonos, notas de crédito, notas de débito, anulaciones, reemplazos y cierre.
- Datos mock/locales en `lib/mock-data.ts`.
- Reglas de negocio reutilizables en `lib/cxc-calculations.ts`.

## Comandos

```bash
npm install
npm run dev
```

Luego abrir `http://localhost:3000`.

## Validación

```bash
npm run typecheck
npm run build
```

## Preparación para base de datos

La lógica de saldo, vencimiento, estados, timeline y KPIs está separada de la interfaz. Para conectar SQL más adelante, el reemplazo principal debería estar en la capa de datos que hoy usa `clientesMock` y `facturasMock`.

## Folios documentales

Los datos guardan el número SII limpio en `numero`. La interfaz muestra el folio con prefijo mediante `formatearFolioDocumento()` en `lib/document-ids.ts`.
