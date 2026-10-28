import { apiRequest } from "../api";
import type {
  AdminAccountInput,
  AdminDashboard,
  AdminMe,
  AdminRoleInput,
  AdminStore,
  AdminStoreInput,
  AdminStoreUpdate,
  AdminUser,
} from "../../types/admin";

export function getAdminMe() {
  return apiRequest<AdminMe>("/admin/me", { auth: true });
}

export function getAdminDashboard() {
  return apiRequest<AdminDashboard>("/admin/painel", { auth: true });
}

export function listAdminStores() {
  return apiRequest<AdminStore[]>("/admin/lojas", { auth: true });
}

export function getAdminStore(id: string) {
  return apiRequest<AdminStore>(`/admin/lojas/${encodeURIComponent(id)}`, { auth: true });
}

export function createAdminStore(data: AdminStoreInput) {
  return apiRequest<AdminStore>("/admin/lojas", { method: "POST", auth: true, body: data });
}

export function updateAdminStore(id: string, data: AdminStoreUpdate) {
  return apiRequest<AdminStore>(`/admin/lojas/${encodeURIComponent(id)}`, { method: "PATCH", auth: true, body: data });
}

export function deleteAdminStore(id: string) {
  return apiRequest<void>(`/admin/lojas/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}

export function uploadAdminStoreImage(id: string, file: File, tipo: "logo" | "banner") {
  return apiRequest<{ url: string }>(`/admin/lojas/${encodeURIComponent(id)}/imagens?tipo=${tipo}`, {
    method: "POST",
    auth: true,
    file,
  });
}

export function listAdminUsers() {
  return apiRequest<AdminUser[]>("/admin/usuarios", { auth: true });
}

export function updateAdminUserRole(id: string, data: AdminRoleInput) {
  return apiRequest<AdminUser>(`/admin/usuarios/${encodeURIComponent(id)}`, { method: "PATCH", auth: true, body: data });
}

export function deleteAdminUser(id: string) {
  return apiRequest<void>(`/admin/usuarios/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}

export function createAdminAccount(data: AdminAccountInput) {
  return apiRequest<AdminUser>("/admin/administradores", { method: "POST", auth: true, body: data });
}
