import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  Settings,
  Store,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import type { SidebarItem } from "./sidebarItems";

interface SidebarProps {
  items?: SidebarItem[];
  label?: string;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

const defaultItems: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: <LayoutDashboard size={19} />,
  },
  {
    label: "Lojas",
    href: "/admin/lojas",
    icon: <Store size={19} />,
  },
  {
    label: "Produtos",
    href: "/admin/produtos",
    icon: <Package size={19} />,
  },
  {
    label: "Usuários",
    href: "/admin/usuarios",
    icon: <Users size={19} />,
  },
  {
    label: "Relatórios",
    href: "/admin/relatorios",
    icon: <BarChart3 size={19} />,
  },
  {
    label: "Configurações",
    href: "/admin/configuracoes",
    icon: <Settings size={19} />,
  },
];

export function Sidebar({
  items = defaultItems,
  label = "Área do vendedor",
  collapsed: controlledCollapsed,
  onCollapseChange,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const navigate = useNavigate();

  function toggleCollapsed() {
    const newValue = !collapsed;

    if (onCollapseChange) {
      onCollapseChange(newValue);
    } else {
      setInternalCollapsed(newValue);
    }
  }

  return (
    <aside
      className={`
        relative hidden min-h-screen shrink-0 border-r border-border
        bg-white transition-all duration-200 lg:flex lg:flex-col
        ${collapsed ? "w-20" : "w-64"}
      `}
    >
      <div
        className={`
          flex h-16 shrink-0 items-center border-b border-border
          ${collapsed ? "justify-center" : "px-5"}
        `}
      >
        <button
          type="button"
          onClick={() => navigate("/user/home")}
          title="Voltar ao marketplace"
          className="text-lg font-bold tracking-tight text-text transition-opacity hover:opacity-60"
        >
          {collapsed ? "V" : "A Villa"}
        </button>
      </div>

      {!collapsed && (
        <div className="px-5 pb-2 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {label}
          </p>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end ?? item.href === "/store/dashboard"}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => `
              flex items-center gap-3 rounded-md px-3 py-2.5
              text-sm font-medium transition-colors
              ${
                isActive
                  ? "bg-background-secondary text-text"
                  : "text-text-secondary hover:bg-background hover:text-text"
              }
              ${collapsed ? "justify-center" : ""}
            `}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-border p-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center rounded-md p-2.5 text-text-secondary transition-colors hover:bg-background hover:text-text"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <ChevronRight size={19} />
          ) : (
            <ChevronLeft size={19} />
          )}
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={() => navigate("/user/home")}
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-background hover:text-text"
          >
            <ArrowLeft size={19} />
            Voltar ao marketplace
          </button>
        )}
      </div>
    </aside>
  );
}