import {
  ChevronDown,
  LogOut,
  ShoppingCart,
  User,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { SearchBar } from "../search/searchBar";

const SCROLL_THRESHOLD = 20;

export function Header() {
  const [visible, setVisible] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const lastScrollY = useRef(0);
  const accumulatedScroll = useRef(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const difference = currentScrollY - lastScrollY.current;

      // Sempre visível no topo
      if (currentScrollY <= 0) {
        setVisible(true);
        accumulatedScroll.current = 0;
        lastScrollY.current = currentScrollY;
        return;
      }

      // Descendo
      if (difference > 0) {
        accumulatedScroll.current += difference;

        if (accumulatedScroll.current >= SCROLL_THRESHOLD) {
          setVisible(false);
          setUserMenuOpen(false);
          accumulatedScroll.current = 0;
        }
      }

      // Subindo
      else if (difference < 0) {
        accumulatedScroll.current += Math.abs(difference);

        if (accumulatedScroll.current >= SCROLL_THRESHOLD) {
          setVisible(true);
          accumulatedScroll.current = 0;
        }
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = () => {
    const search = searchValue.trim();

    if (!search) {
      return;
    }

    console.log("Pesquisar lojas:", search);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);

    // Futuramente: logout do Supabase Auth.
    navigate("/");
  };

  return (
    <header
      className={`
        fixed
        left-0
        top-0
        z-50
        h-[70px]
        w-full
        bg-white
        transition-transform
        duration-300
        ease-in-out
        ${visible ? "translate-y-0" : "-translate-y-full"}
      `}
    >
      <div className="flex h-full items-center px-6">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate("/user/home")}
          className="
            shrink-0
            text-xl
            font-extrabold
            text-text
            transition-opacity
            hover:opacity-60
          "
        >
          A Villa
        </button>

        {/* Busca de lojas */}
        <div className="absolute left-1/2 w-full max-w-sm -translate-x-1/2">
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            onSearch={handleSearch}
            placeholder="Buscar lojas..."
          />
        </div>

        {/* Ações */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Carrinho */}
          <button
            type="button"
            aria-label="Carrinho"
            onClick={() => navigate("/user/carrinho")}
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-lg
              text-text
              transition-colors
              hover:bg-background-secondary
            "
          >
            <ShoppingCart size={22} />
          </button>

          {/* Usuário */}
          <div
            ref={userMenuRef}
            className="relative"
          >
            <button
              type="button"
              aria-label="Menu do usuário"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((open) => !open)}
              className="
                flex
                h-10
                items-center
                gap-2
                rounded-lg
                px-3
                text-text
                transition-colors
                hover:bg-background-secondary
              "
            >
              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-full
                  bg-background-secondary
                  text-sm
                  font-semibold
                "
              >
                L
              </div>

              <span className="hidden text-sm font-medium md:block">
                Lucas
              </span>

              <ChevronDown
                size={16}
                className={`
                  transition-transform
                  ${userMenuOpen ? "rotate-180" : ""}
                `}
              />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div
                className="
                  absolute
                  right-0
                  top-12
                  w-52
                  overflow-hidden
                  rounded-xl
                  border
                  border-border
                  bg-white
                  shadow-lg
                "
              >
                {/* Informações do usuário */}
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-text">
                    Teste
                  </p>

                  <p className="mt-0.5 text-xs text-text-secondary">
                    Teste@email.com
                  </p>
                </div>

                <div className="p-1.5">
                  {/* Meu perfil */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/user/perfil");
                    }}
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-lg
                      px-3
                      py-2.5
                      text-sm
                      text-text
                      transition-colors
                      hover:bg-background-secondary
                    "
                  >
                    <User size={18} />

                    <span>Meu perfil</span>
                  </button>

                  {/* Meus pedidos */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/user/pedidos");
                    }}
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-lg
                      px-3
                      py-2.5
                      text-sm
                      text-text
                      transition-colors
                      hover:bg-background-secondary
                    "
                  >
                    <ShoppingCart size={18} />

                    <span>Meus pedidos</span>
                  </button>

                  {/* Separador */}
                  <div className="my-1 border-t border-border" />

                  {/* Sair */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-lg
                      px-3
                      py-2.5
                      text-sm
                      text-danger
                      transition-colors
                      hover:bg-background-secondary
                    "
                  >
                    <LogOut size={18} />

                    <span>Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}