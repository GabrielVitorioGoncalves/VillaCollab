import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/userLayout";

import { Auth } from "./pages/auth";

//users
import { Home } from "./pages/users/home";
import { StorePage} from "./pages/users/storePage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Autenticação */}
        <Route path="/login" element={<Auth />} />

        {/*Layout de usuário */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/paginaLoja/:id" element={<StorePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
