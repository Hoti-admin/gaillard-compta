export function rateBpFromPercentString(v: string) {
  const n = Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return 810; // défaut 8.1%
  return Math.round(n * 100);
}

export function splitGrossToNetVat(grossCents: number, vatRateBp: number) {
  const bp = Number.isFinite(vatRateBp) ? vatRateBp : 810;
  const rate = bp / 10000; // 810 -> 0.081
  const net = Math.round(grossCents / (1 + rate));
  const vat = grossCents - net;
  return { netCents: net, vatCents: vat };
}
