import type { ReactNode } from "react";

import { Card } from "../ui/card";

interface AccountShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AccountShell({ title, description, children }: AccountShellProps) {
  return (
    <main className="min-h-screen bg-[#F4F4F5]">
      <header className="h-[70px] bg-white">
        <div className="flex h-full items-center px-6">
          <span className="text-2xl font-medium tracking-tight text-black">A Villa</span>
        </div>
      </header>

      <div className="flex justify-center px-4 py-[48px]">
        <Card className="w-full max-w-[552px] rounded-[32px] border border-[#A9A9A9] bg-white px-[35px] py-[39px] shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
          <h1 className="text-2xl font-normal text-black">{title}</h1>
          <p className="mt-2 text-sm text-text-secondary">{description}</p>
          <div className="mt-8">{children}</div>
        </Card>
      </div>
    </main>
  );
}
