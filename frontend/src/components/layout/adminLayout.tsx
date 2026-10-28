import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { useCart } from "../../contexts/cartContext";
import { clearSession, getSession } from "../../lib/session";
import { Sidebar } from "./sideBar";
import { adminSidebarItems } from "./sidebarItems";
import { PageContainer } from "./pageContainer";

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { flush: flushCart } = useCart();
  const session = getSession();
  const isAdmin = session?.usuario?.role === "admin";

  if (!session) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-text">Área exclusiva para administradores</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Sua conta não possui acesso ao painel administrativo.
          </p>
          <Button className="mt-6" onClick={() => navigate("/user/home")}>
            Voltar ao marketplace
          </Button>
        </Card>
      </main>
    );
  }

  async function handleLogout() {
    await flushCart();
    clearSession();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <Sidebar items={adminSidebarItems} label="Área administrativa" />

        <div className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-border bg-white px-5 sm:px-8">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">Painel administrativo</p>
              <p className="truncate text-xs text-text-secondary">Villa Collab</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
            >
              Sair
            </button>
          </header>

          <nav
            aria-label="Área administrativa"
            className="flex gap-1 overflow-x-auto border-b border-border bg-white px-3 py-2 lg:hidden"
          >
            {adminSidebarItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                className={({ isActive }) => `
                  flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors
                  ${isActive ? "bg-background-secondary text-text" : "text-text-secondary hover:bg-background hover:text-text"}
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <main className="py-7 sm:py-8">
            <PageContainer>
              <p
                role="status"
                className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
              >
                Modo demonstração: os dados são fictícios e as ações são apenas visuais. Nada é salvo no servidor.
              </p>

              <Outlet />
            </PageContainer>
          </main>
        </div>
      </div>
    </div>
  );
}
