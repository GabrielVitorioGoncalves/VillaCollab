import { Navigate, Outlet } from "react-router-dom";
import { Header } from "./userHeader";
import { CartProvider } from "../../contexts/CartProvider";

export function Layout() {
  if (!sessionStorage.getItem("villacollab_token")) return <Navigate to="/" replace />;
  return (
    <CartProvider>
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-[70px]">
        <Outlet />
      </div>
    </div>
    </CartProvider>
  );
}
