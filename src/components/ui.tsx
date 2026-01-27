import Link from "next/link";
import { ReactNode } from "react";

export function Container({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">{children}</div>;
}

/**
 * ✅ PageTitle
 * - supporte <PageTitle title="..." />
 * - supporte aussi <PageTitle>...</PageTitle>
 */
export function PageTitle({
  title,
  subtitle,
  right,
  children,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const finalTitle =
    title ??
    (typeof children === "string" ? children : Array.isArray(children) ? "" : (children as any) ? "" : "");

  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="text-3xl font-extrabold tracking-tight text-slate-900">{finalTitle}</div>
        {subtitle ? <div className="mt-2 text-sm text-slate-600">{subtitle}</div> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

/**
 * ✅ Card
 * - accepte title, subtitle, className
 */
export function Card({
  title,
  subtitle,
  className,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={"rounded-3xl border border-slate-200 bg-white p-6 shadow-sm " + (className || "")}>
      {title || subtitle ? (
        <div className="mb-5">
          <div className="flex items-center justify-between">
            {title ? <div className="text-sm font-semibold text-slate-800">{title}</div> : <div />}
            <div className="ml-4 h-px flex-1 bg-slate-100" />
          </div>
          {subtitle ? <div className="mt-2 text-xs text-slate-600">{subtitle}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-slate-900">{value}</div>
      {sub ? <div className="mt-2 text-xs text-slate-600">{sub}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "warning"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : tone === "danger"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : tone === "info"
      ? "bg-blue-50 text-blue-800 ring-blue-200"
      : "bg-slate-50 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {children}
    </span>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "inline-flex items-center justify-center rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 " +
        (props.className || "")
      }
    />
  );
}

export function ButtonGhost(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 " +
        (props.className || "")
      }
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 " +
        (props.className || "")
      }
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={
        "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 " +
        (props.className || "")
      }
    />
  );
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-semibold text-slate-900 hover:underline">
      {children}
    </Link>
  );
}

export function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr className="text-xs font-semibold text-slate-600">
            {headers.map((h) => (
              <th key={h} className="px-5 py-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-t border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
              {r.map((c, j) => (
                <td key={j} className="px-5 py-4 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
