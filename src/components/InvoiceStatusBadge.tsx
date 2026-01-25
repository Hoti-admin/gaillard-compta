export default function InvoiceStatusBadge({
  status,
}: {
  status: "OPEN" | "PARTIAL" | "PAID" | string;
}) {
  const s = String(status || "OPEN").toUpperCase();

  const styles =
    s === "PAID"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : s === "PARTIAL"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-rose-50 text-rose-800 border-rose-200";

  const label =
    s === "PAID" ? "PAYÉ" : s === "PARTIAL" ? "PARTIEL" : "OUVERT";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1",
        "text-[11px] font-extrabold tracking-wide",
        styles,
      ].join(" ")}
      title={s}
    >
      {label}
    </span>
  );
}
