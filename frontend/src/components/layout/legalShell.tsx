import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface LegalShellProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

export function LegalShell({ title, updatedAt, children }: LegalShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <header className="h-[70px] border-b border-border bg-white">
        <div className="mx-auto flex h-full max-w-3xl items-center justify-between px-5">
          <Link to="/user/home" className="text-xl font-extrabold text-text hover:opacity-60">
            A Villa
          </Link>
          <nav className="flex gap-4 text-sm text-text-secondary">
            <Link to="/termos" className="hover:text-text">Termos</Link>
            <Link to="/privacidade" className="hover:text-text">Privacidade</Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10 text-[15px] leading-7 text-text">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-text-secondary">Atualizado em {updatedAt}</p>
        <div className="mt-8 space-y-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </article>
    </main>
  );
}
