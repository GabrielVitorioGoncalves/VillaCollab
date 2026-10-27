import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "./sideBar";
import { storeSidebarItems } from "./sidebarItems";
import { PageContainer } from "./pageContainer";

export function StoreLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  if (!sessionStorage.getItem("villacollab_token")) {
    return <Navigate to="/" replace />;
  }

  function handleLogout() {
    sessionStorage.removeItem("villacollab_token");
    sessionStorage.removeItem("villacollab_user_name");
    navigate("/", { replace: true });
  }

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
            <div>
              <p className="text-sm font-semibold text-text">
                A Villa
              </p>
              <p className="text-xs text-text-secondary">
                Painel do vendedor
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

          <main className="py-7 sm:py-8">
            <PageContainer>
              <Outlet />
            </PageContainer>
          </main>
        </div>
      </div>
    </div>
  );
}