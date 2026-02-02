// src/lib/money.ts
export function parseMoneyToCents(input: unknown): number | null {
  if (input == null) return null;

  let s = String(input).trim();
  if (!s) return null;

  // Supprime espaces, apostrophes suisses, etc.
  // ex: "10'695,50" -> "10695,50"
  s = s.replace(/[\s']/g, "");

  // Convertit virgule en point
  s = s.replace(",", ".");

  // Garde uniquement chiffres et point
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;

  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;

  return Math.round(n * 100);
}

export function parseVatRateToBp(input: unknown, fallbackBp = 810): number {
  if (input == null) return fallbackBp;
  let s = String(input).trim();
  if (!s) return fallbackBp;

  s = s.replace(",", ".").replace("%", "").trim();
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return fallbackBp;

  return Math.round(n * 100); // 8.1 -> 810
}
