import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/userLayout";
import { StoreLayout } from "./components/layout/storeLayout";
import { AdminLayout } from "./components/layout/adminLayout";
import { RequireAuth } from "./components/routing/requireAuth";
import { SessionWatcher } from "./components/routing/sessionWatcher";
import { CartProvider } from "./contexts/CartProvider";

import { Auth } from "./pages/auth";

//users
import { Home } from "./pages/users/home";
import { StorePage} from "./pages/users/storePage"
import { ProductDetail} from "./pages/users/productDetail"
import { CartPage } from "./pages/users/cartPage"
import { PaymentPage} from "./pages/users/paymentPage"
import { ProfilePage} from "./pages/users/profilePage"
import { MyOrders } from "./pages/users/myOrders"
import { OrderDetail } from "./pages/users/orderDetail";

//store
import { Dashboard } from "./pages/store/storeDashboard";
import { Products } from "./pages/store/storeProducts";
import { ProductFormPage } from "./pages/store/storeProductForm";
import { Orders } from "./pages/store/storeOrders";
import { OrderDetailPage } from "./pages/store/storeOrderDetail";
import { StoreProfile } from "./pages/store/storeProfile";
import { StoreSettings } from "./pages/store/storeSettings";
import { StoreCatalogSettings } from "./pages/store/storeCatalogSettings"

//admin
import { AdminDashboardPage } from "./pages/admin/adminDashboard";
import { AdminStoresPage } from "./pages/admin/adminStores";
import { AdminStoreFormPage } from "./pages/admin/adminStoreForm";
import { AdminUsersPage } from "./pages/admin/adminUsers";
import { AdminAccountFormPage } from "./pages/admin/adminAccountForm";

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <SessionWatcher />
        <Routes>
          {/* Autenticação */}
          <Route path="/" element={<Auth />} />

          {/*Layout de usuário */}
          <Route element={<Layout />}>
            <Route path="user/home" element={<Home />} />
            <Route path="user/paginaLoja/:id" element={<StorePage />} />
            <Route path="user/detalhesProduto/:id" element={<ProductDetail />} />
            <Route path="user/carrinho" element={<CartPage />} />

            <Route element={<RequireAuth />}>
              <Route path="user/pagamento" element={<PaymentPage />} />
              <Route path="user/perfil" element={<ProfilePage />} />
              <Route path="user/pedidos" element={<MyOrders />} />
              <Route path="user/pedidos/:id" element={<OrderDetail />} />
            </Route>
          </Route>

          <Route element={<StoreLayout />}>
            <Route path="/store/dashboard" element={<Dashboard />} />
            <Route path="/store/produtos" element={<Products />} />
            <Route path="/store/produtos/novo" element={<ProductFormPage />} />
            <Route
              path="/store/produtos/:id/editar"
              element={<ProductFormPage />}
            />
            <Route path="/store/pedidos" element={<Orders />} />
            <Route path="/store/pedidos/:id" element={<OrderDetailPage />} />
            <Route path="/store/minha-loja" element={<StoreProfile />} />
            <Route path="/store/configuracoes" element={<StoreSettings />} />
            <Route path="/store/catalogo" element={<StoreCatalogSettings />} />
          </Route>

          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/lojas" element={<AdminStoresPage />} />
            <Route path="/admin/lojas/nova" element={<AdminStoreFormPage />} />
            <Route path="/admin/lojas/:id/editar" element={<AdminStoreFormPage />} />
            <Route path="/admin/usuarios" element={<AdminUsersPage />} />
            <Route path="/admin/administradores/novo" element={<AdminAccountFormPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/user/home" replace />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
