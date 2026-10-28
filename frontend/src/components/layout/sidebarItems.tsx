
import {
  LayoutDashboard,
  Package,
  Settings,
  Store,
  ShoppingBag,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export interface SidebarItem {
  label: string;
  href: string;
  icon: ReactNode;
  end?: boolean;
}

export const adminSidebarItems: SidebarItem[] = [
  {
    label: "Dashboard global",
    href: "/admin",
    icon: <LayoutDashboard size={19} />,
    end: true,
  },
  {
    label: "Gestão de lojas",
    href: "/admin/lojas",
    icon: <Store size={19} />,
  },
  {
    label: "Gestão de usuários",
    href: "/admin/usuarios",
    icon: <Users size={19} />,
  },
];

export const storeSidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/store/dashboard",
    icon: <LayoutDashboard size={19} />,
  },
  {
    label: "Produtos",
    href: "/store/produtos",
    icon: <Package size={19} />,
  },
  {
    label: "Pedidos",
    href: "/store/pedidos",
    icon: <ShoppingBag size={19} />,
  },
  {
    label: "Catálogo e filtros",
    href: "/store/catalogo",
    icon: <SlidersHorizontal size={19} />,
  },
  {
    label: "Minha loja",
    href: "/store/minha-loja",
    icon: <Store size={19} />,
  },
  {
    label: "Configurações",
    href: "/store/configuracoes",
    icon: <Settings size={19} />,
  },
];
