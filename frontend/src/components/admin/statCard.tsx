import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
}

export function StatCard({
  title,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-text-secondary">
            {title}
          </p>

          <p className="text-2xl font-semibold text-text">
            {value}
          </p>

          {description && (
            <p className="text-xs text-text-secondary">
              {description}
            </p>
          )}
        </div>

        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary text-text">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}