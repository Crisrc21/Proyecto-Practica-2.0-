import { createAccountsReceivableService } from "../application/accounts-receivable-service.js";
import { createLocalReceivablesRepository } from "../infrastructure/local-receivables-repository.js";

const service = createAccountsReceivableService(createLocalReceivablesRepository());

export const accountsReceivableRoutes = [
  {
    method: "GET",
    path: "/api/accounts-receivable/dashboard",
    handler: () => service.getDashboard()
  },
  {
    method: "GET",
    path: "/api/accounts-receivable/invoices",
    handler: () => service.listInvoices()
  },
  {
    method: "GET",
    path: "/api/accounts-receivable/timelines",
    handler: () => service.getTimelines()
  }
];
