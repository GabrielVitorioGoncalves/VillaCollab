import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Auth } from "./pages/auth";

//users
import { Home } from "./pages/users/home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Autenticação */}
        <Route path="/login" element={<Auth />} />

        {/* Home */}
        <Route path="/" element={<Home />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;