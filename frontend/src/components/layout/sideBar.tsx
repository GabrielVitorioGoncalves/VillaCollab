import type { ReactNode } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  Settings,
  Store,
  Users,
} from "lucide-react";
import { useState } from "react";

interface SidebarItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface SidebarProps {
  items?: SidebarItem[];
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
  collapsed: controlledCollapsed,
  onCollapseChange,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] =
    useState(false);

  const collapsed =
    controlledCollapsed ?? internalCollapsed;

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
        hidden
        min-h-screen
        shrink-0
        border-r
        border-border
        bg-white
        transition-all
        duration-200
        lg:block
        ${collapsed ? "w-20" : "w-64"}
      `}
    >
      {/* Logo */}
      <div
        className={`
          flex
          h-16
          items-center
          border-b
          border-border
          ${collapsed ? "justify-center" : "px-5"}
        `}
      >
        <a
          href="/"
          className="text-lg font-bold tracking-tight text-text"
        >
          {collapsed ? "V" : "VILLA COLLAB"}
        </a>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`
              flex
              items-center
              gap-3
              rounded-md
              px-3
              py-2.5
              text-sm
              font-medium
              text-text-secondary
              transition-colors
              hover:bg-background
              hover:text-text
              ${collapsed ? "justify-center" : ""}
            `}
          >
            {item.icon}

            {!collapsed && (
              <span>
                {item.label}
              </span>
            )}
          </a>
        ))}
      </nav>

      {/* Bottom */}
      <div className="absolute bottom-0 p-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="
            flex
            w-full
            items-center
            justify-center
            rounded-md
            p-2.5
            text-text-secondary
            transition-colors
            hover:bg-background
            hover:text-text
          "
          aria-label={
            collapsed
              ? "Expandir menu"
              : "Recolher menu"
          }
        >
          {collapsed ? (
            <ChevronRight size={19} />
          ) : (
            <ChevronLeft size={19} />
          )}
        </button>
      </div>
    </aside>
  );
}