import { createCustomerService } from "../application/customer-service.js";
import { createLocalCustomersRepository } from "../infrastructure/local-customers-repository.js";

const service = createCustomerService(createLocalCustomersRepository());

export const customerRoutes = [
  {
    method: "GET",
    path: "/api/customers",
    handler: () => service.listCustomers()
  }
];
