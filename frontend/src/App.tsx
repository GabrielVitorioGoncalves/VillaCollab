import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/userLayout";

import { Auth } from "./pages/auth";

//users
import { Home } from "./pages/users/home";
import { StorePage} from "./pages/users/storePage"
import { ProductDetail} from "./pages/users/productDetail"
import { CartPage } from "./pages/users/cartPage"
import { PaymentPage} from "./pages/users/paymentPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Autenticação */}
        <Route path="/" element={<Auth />} />

        {/*Layout de usuário */}
        <Route element={<Layout />}>
          <Route path="user/home" element={<Home />} />
          <Route path="user/paginaLoja/:id" element={<StorePage />} />
          <Route path="user/detalhesProduto/:id" element={<ProductDetail />} />
          <Route path="user/carrinho" element={<CartPage />} />
          <Route path="user/pagamento" element={<PaymentPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
