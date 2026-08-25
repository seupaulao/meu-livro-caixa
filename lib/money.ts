export interface MoneyAmount {
  currency: string;
  cents: number;
}

const DEFAULT_CURRENCY = "$";
const AMOUNT_RE = /^\s*(?:(\$|[A-Za-z]{1,3}\$|[A-Za-z]{2,5})\s*)?([\d.,]+)\s*$/;
const PT_NUMBER_RE = /^(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/;

export function parseAmount(raw: string): MoneyAmount | null {
  const match = raw.match(AMOUNT_RE);
  if (!match) {
    return null;
  }
  const [, currencyRaw, numberRaw] = match;
  if (!PT_NUMBER_RE.test(numberRaw)) {
    return null;
  }
  const normalized = numberRaw.replace(/\./g, "").replace(",", ".");
  const value = parseFloat(normalized);
  if (!Number.isFinite(value)) {
    return null;
  }
  const cents = Math.round(value * 100);
  if (cents <= 0) {
    return null;
  }
  return { currency: currencyRaw ? currencyRaw.toUpperCase() : DEFAULT_CURRENCY, cents };
}

export function formatCents(cents: number, currency: string): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const intPart = Math.floor(abs / 100);
  const decPart = String(abs % 100).padStart(2, "0");
  const grouped = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = negative ? "-" : "";
  return `${sign}${currency} ${grouped},${decPart}`;
}

export interface CurrencyBalance {
  currency: string;
  debitCents: number;
  creditCents: number;
}

export function balanceByCurrency(
  amounts: { currency: string; side: "D" | "C"; cents: number }[]
): CurrencyBalance[] {
  const map = new Map<string, CurrencyBalance>();
  for (const amount of amounts) {
    let entry = map.get(amount.currency);
    if (!entry) {
      entry = { currency: amount.currency, debitCents: 0, creditCents: 0 };
      map.set(amount.currency, entry);
    }
    if (amount.side === "D") {
      entry.debitCents += amount.cents;
    } else {
      entry.creditCents += amount.cents;
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.currency.localeCompare(b.currency)
  );
}

export function isBalanced(balances: CurrencyBalance[]): boolean {
  return balances.every((entry) => entry.debitCents === entry.creditCents);
}
