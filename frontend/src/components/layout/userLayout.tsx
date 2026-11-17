import { Link, Outlet } from "react-router-dom";
import { Header } from "./userHeader";
import { CartToast } from "../cart/cartToast";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="flex-1 pt-[70px]">
        <Outlet />
      </div>
      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-[1353px] flex-col gap-2 px-5 py-6 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>Villa Collab · lojas locais, pedido direto no WhatsApp</span>
          <nav className="flex gap-4">
            <Link to="/termos" className="hover:text-text">Termos de uso</Link>
            <Link to="/privacidade" className="hover:text-text">Privacidade</Link>
          </nav>
        </div>
      </footer>
      <CartToast />
    </div>
  );
}
