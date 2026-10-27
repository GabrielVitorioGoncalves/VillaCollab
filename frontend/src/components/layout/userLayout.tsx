import { Outlet } from "react-router-dom";
import { Header } from "./userHeader";
import { CartToast } from "../cart/cartToast";

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-[70px]">
        <Outlet />
      </div>
      <CartToast />
    </div>
  );
}
