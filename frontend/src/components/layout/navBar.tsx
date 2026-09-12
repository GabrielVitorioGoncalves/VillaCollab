import { Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { PageContainer } from "./pageContainer";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <PageContainer className="relative">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <a
            href="/"
            className="shrink-0 text-lg font-bold tracking-tight text-text"
          >
            VILLA<span className="text-text-secondary">COLLAB</span>
          </a>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-6 lg:flex">
            <a
              href="/"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
            >
              Início
            </a>

            <a
              href="/produtos"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
            >
              Produtos
            </a>

            <a
              href="/lojas"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
            >
              Lojas
            </a>
          </nav>

          {/* Search */}
          <div className="hidden flex-1 lg:flex lg:max-w-md">
            <div className="relative w-full">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />

              <input
                type="search"
                placeholder="Buscar produtos ou lojas..."
                className="
                  h-10
                  w-full
                  rounded-md
                  border
                  border-border
                  bg-background
                  pl-10
                  pr-4
                  text-sm
                  text-text
                  outline-none
                  transition
                  focus:border-primary
                  focus:ring-1
                  focus:ring-primary
                "
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">

            {/* Cart */}
            <Button
              variant="ghost"
              className="relative h-10 w-10 p-0"
              aria-label="Carrinho"
            >
              <ShoppingCart size={20} />

              <span
                className="
                  absolute
                  -right-0.5
                  -top-0.5
                  flex
                  h-4
                  min-w-4
                  items-center
                  justify-center
                  rounded-full
                  bg-primary
                  px-1
                  text-[10px]
                  font-medium
                  text-white
                "
              >
                0
              </span>
            </Button>

            {/* User */}
            <Button
              variant="ghost"
              className="h-10 w-10 p-0"
              aria-label="Perfil"
            >
              <User size={20} />
            </Button>

            {/* Mobile menu */}
            <Button
              variant="ghost"
              className="h-10 w-10 p-0 lg:hidden"
              aria-label={
                mobileMenuOpen
                  ? "Fechar menu"
                  : "Abrir menu"
              }
              onClick={() =>
                setMobileMenuOpen((current) => !current)
              }
            >
              {mobileMenuOpen ? (
                <X size={21} />
              ) : (
                <Menu size={21} />
              )}
            </Button>

          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border py-4 lg:hidden">

            <div className="mb-4">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  type="search"
                  placeholder="Buscar produtos ou lojas..."
                  className="
                    h-10
                    w-full
                    rounded-md
                    border
                    border-border
                    bg-background
                    pl-10
                    pr-4
                    text-sm
                    outline-none
                    focus:border-primary
                    focus:ring-1
                    focus:ring-primary
                  "
                />
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              <a
                href="/"
                className="rounded-md px-3 py-2 text-sm font-medium text-text hover:bg-background"
              >
                Início
              </a>

              <a
                href="/produtos"
                className="rounded-md px-3 py-2 text-sm font-medium text-text hover:bg-background"
              >
                Produtos
              </a>

              <a
                href="/lojas"
                className="rounded-md px-3 py-2 text-sm font-medium text-text hover:bg-background"
              >
                Lojas
              </a>
            </nav>

          </div>
        )}
      </PageContainer>
    </header>
  );
}