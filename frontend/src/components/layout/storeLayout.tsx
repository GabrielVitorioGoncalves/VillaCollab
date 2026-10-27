import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "./sideBar";
import { storeSidebarItems } from "./sidebarItems";
import { PageContainer } from "./pageContainer";
import type { StoreContextValue } from "./storeContext";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { RequestStatus } from "../ui/requestStatus";
import { useCart } from "../../contexts/cartContext";
import { useRequest } from "../../hooks/useRequest";
import { getMyStore } from "../../lib/services";
import { clearSession, getSession } from "../../lib/session";
import type { MinhaLoja } from "../../types/api";

export function StoreLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { flush: flushCart } = useCart();
  const session = getSession();
  const isSeller = session?.usuario?.role === "lojista";

  const store = useRequest(isSeller ? "minha-loja" : null, getMyStore);
  const [edited, setEdited] = useState<MinhaLoja | null>(null);
  const loja = edited && edited.id === store.data?.id ? edited : store.data;

  if (!session) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  async function handleLogout() {
    await flushCart();
    clearSession();
    navigate("/", { replace: true });
  }

  if (!isSeller) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-text">Área exclusiva para lojistas</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Sua conta não está vinculada a uma loja. Se você vende na Villa, peça ao
            administrador para vincular sua conta.
          </p>
          <Button className="mt-6" onClick={() => navigate("/user/home")}>
            Voltar ao marketplace
          </Button>
        </Card>
      </main>
    );
  }

  const context: StoreContextValue | null = loja ? { loja, setLoja: setEdited } : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <Sidebar
          items={storeSidebarItems}
          collapsed={sidebarCollapsed}
          onCollapseChange={setSidebarCollapsed}
        />

        <div className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-border bg-white px-5 sm:px-8">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">
                A Villa
              </p>
              <p className="truncate text-xs text-text-secondary">
                Painel do vendedor{loja ? ` · ${loja.nome}` : ""}
              </p>
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
            aria-label="Área do vendedor"
            className="flex gap-1 overflow-x-auto border-b border-border bg-white px-3 py-2 lg:hidden"
          >
            {storeSidebarItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/store/dashboard"}
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
              {context ? (
                <Outlet context={context} />
              ) : (
                <RequestStatus
                  loading={store.loading}
                  error={store.error}
                  onRetry={store.reload}
                  loadingText="Carregando sua loja..."
                />
              )}
            </PageContainer>
          </main>
        </div>
      </div>
    </div>
  );
}
