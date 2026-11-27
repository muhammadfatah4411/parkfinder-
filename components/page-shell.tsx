import type { ReactNode } from "react";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#071A2F] sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-base leading-7 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </main>
  );
}
