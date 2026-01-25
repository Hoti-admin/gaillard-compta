import { differenceInCalendarDays, format } from "date-fns";

export function chf(cents: number) {
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format((cents || 0) / 100);
}

export function parseCHFToCents(input: string) {
  const cleaned = (input || "")
    .trim()
    .replaceAll("’", "'")
    .replaceAll("'", "")
    .replaceAll(" ", "")
    .replaceAll(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function isoDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function daysLate(dueDate: Date, outstandingCents: number, now = new Date()) {
  if (outstandingCents <= 0) return 0;
  if (dueDate >= now) return 0;
  return differenceInCalendarDays(now, dueDate);
}

export function sumPaidCents(payments: { amountCents: number }[]) {
  return payments.reduce((a, p) => a + (p.amountCents || 0), 0);
}
