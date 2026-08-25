export function todayISO(): string {
  const now = new Date();
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function toISO(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function isoToBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) {
    return iso;
  }
  return `${d}/${m}/${y}`;
}

export function brToIso(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  const [, ds, ms, ys] = match;
  const day = Number(ds);
  const month = Number(ms);
  const year = Number(ys);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${ys}-${ms}-${ds}`;
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  const month = Number(match[1]);
  if (month < 1 || month > 12) {
    return null;
  }
  return `${match[2]}-${match[1]}`;
}

export interface MonthRange {
  startISO: string;
  endInclusiveISO: string;
}

export function monthRange(monthKey: string): MonthRange {
  const [ys, ms] = monthKey.split("-");
  const year = Number(ys);
  const month = Number(ms);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startISO: toISO(year, month, 1),
    endInclusiveISO: toISO(year, month, lastDay),
  };
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatMonthKey(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const index = Number(ms) - 1;
  const name = MONTH_NAMES[index];
  return name ? `${name} de ${ys}` : monthKey;
}
