import type { AdminDashboard, AdminStore, AdminUser } from "../../types/admin";
import { mockAdminDashboard, mockAdminStores, mockAdminUsers } from "./adminMocks";

/*
Camada de dados do Admin, ainda simulada.

Não há endpoints de Admin no back-end. Estas funções devolvem cópias dos mocks
com um atraso artificial, para que as telas já tratem carregamento e erro.
Quando a API existir, troque o corpo de cada função por `apiRequest` (lib/api.ts),
por exemplo: `apiRequest<AdminStore[]>("/admin/lojas", { auth: true })`.
*/

const SIMULATED_DELAY_MS = 400;

function simulate<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(structuredClone(data)), SIMULATED_DELAY_MS);
  });
}

export function getAdminDashboard(): Promise<AdminDashboard> {
  return simulate(mockAdminDashboard);
}

export function listAdminStores(): Promise<AdminStore[]> {
  return simulate(mockAdminStores);
}

export function listAdminUsers(): Promise<AdminUser[]> {
  return simulate(mockAdminUsers);
}
