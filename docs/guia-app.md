# Guia de la app

## Navegacion por pantallas

- Dashboard: `frontend/src/modules/accounts-receivable/components/dashboard-view.tsx`.
- Facturas: `frontend/src/modules/accounts-receivable/components/invoices-table.tsx`.
- Ingreso documental: `frontend/src/modules/document-intake/components/invoice-form.tsx`.
- Clientes: `frontend/src/modules/customers/components/clients-view.tsx`.
- Trazabilidad: `frontend/src/modules/traceability/components/traceability-view.tsx`.

## Donde tocar reglas

- Reglas de negocio backend: `backend/src/modules/<dominio>/application`.
- Modelos puros de negocio: `backend/src/modules/<dominio>/domain`.
- Integraciones, archivos y repositorios: `backend/src/modules/<dominio>/infrastructure`.
- Rutas HTTP y adaptacion request/response: `backend/src/modules/<dominio>/presentation`.
- Lenguaje visual global: `frontend/src/index.css` y `frontend/src/app/App.css`.

## Reglas importantes

- El frontend consume solo la API local; no debe leer secretos ni archivos privados.
- Los datos sensibles viven en `data/private/` y quedan fuera de Git.
- Las integraciones externas se centralizan en backend.
- Lo reutilizable vive en `shared`; cada dominio mantiene su propia superficie.
