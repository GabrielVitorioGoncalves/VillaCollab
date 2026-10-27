import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/userLayout";
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
            {/* Vitrine e carrinho: abertos, a API de lojas/produtos é pública */}
            <Route path="user/home" element={<Home />} />
            <Route path="user/paginaLoja/:id" element={<StorePage />} />
            <Route path="user/detalhesProduto/:id" element={<ProductDetail />} />
            <Route path="user/carrinho" element={<CartPage />} />

            {/* Precisam de login */}
            <Route element={<RequireAuth />}>
              <Route path="user/pagamento" element={<PaymentPage />} />
              <Route path="user/perfil" element={<ProfilePage />} />
              <Route path="user/pedidos" element={<MyOrders />} />
              <Route path="user/pedidos/:id" element={<OrderDetail />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/user/home" replace />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
