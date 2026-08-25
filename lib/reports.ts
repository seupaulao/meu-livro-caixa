import type { SQLiteDatabase } from "expo-sqlite";
import { monthRange } from "@/lib/dates";

export interface AggregateRow {
  account: string;
  currency: string;
  debitCents: number;
  creditCents: number;
}

export interface CurrencyTotal {
  currency: string;
  cents: number;
}

export interface ReportAccountRow {
  account: string;
  currency: string;
  debitCents: number;
  creditCents: number;
  balanceCents: number;
}

export interface BalanceteReport {
  monthKey: string;
  rows: ReportAccountRow[];
  totals: AggregateRow[];
}

export interface BalanceSheetSection {
  title: string;
  rows: ReportAccountRow[];
  totals: CurrencyTotal[];
}

export interface BalanceSheetCheck {
  currency: string;
  ativoCents: number;
  passivoPlusPlCents: number;
  ok: boolean;
}

export interface BalanceSheetReport {
  monthKey: string;
  ativo: BalanceSheetSection;
  passivo: BalanceSheetSection;
  patrimonioLiquido: BalanceSheetSection;
  resultado: CurrencyTotal[];
  checks: BalanceSheetCheck[];
}

export interface DreSide {
  title: string;
  rows: ReportAccountRow[];
  total: CurrencyTotal[];
}

export interface DreCurrencyTotal {
  currency: string;
  receitasCents: number;
  despesasCents: number;
  resultadoCents: number;
}

export interface DreReport {
  monthKey: string;
  receitas: DreSide;
  despesas: DreSide;
  totals: DreCurrencyTotal[];
}

async function fetchAggregate(
  db: SQLiteDatabase,
  startISO: string | null,
  endInclusiveISO: string
): Promise<AggregateRow[]> {
  const params: string[] = [];
  let where = "t.date <= ?";
  params.push(endInclusiveISO);
  if (startISO !== null) {
    where = "t.date >= ? AND t.date <= ?";
    params[0] = startISO;
  }
  return db.getAllAsync<AggregateRow>(
    `SELECT
       p.account AS account,
       p.currency AS currency,
       SUM(CASE WHEN p.side = 'D' THEN p.amount_cents ELSE 0 END) AS debitCents,
       SUM(CASE WHEN p.side = 'C' THEN p.amount_cents ELSE 0 END) AS creditCents
     FROM postings p
     JOIN transactions t ON t.id = p.transaction_id
     WHERE ${where}
     GROUP BY p.account, p.currency`,
    params
  );
}

function toReportRows(
  aggregates: AggregateRow[],
  balanceSign: "debit" | "credit",
  stripTopLevel: boolean
): ReportAccountRow[] {
  return aggregates.map((row) => {
    const natural =
      balanceSign === "debit"
        ? row.debitCents - row.creditCents
        : row.creditCents - row.debitCents;
    return {
      account: stripTopLevel ? stripFirstSegment(row.account) : row.account,
      currency: row.currency,
      debitCents: row.debitCents,
      creditCents: row.creditCents,
      balanceCents: natural,
    };
  });
}

function stripFirstSegment(account: string): string {
  const index = account.indexOf(":");
  return index === -1 ? account : account.slice(index + 1);
}

function sumTotals(rows: ReportAccountRow[]): CurrencyTotal[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.balanceCents === 0) {
      continue;
    }
    map.set(row.currency, (map.get(row.currency) ?? 0) + row.balanceCents);
  }
  return Array.from(map.entries())
    .map(([currency, cents]) => ({ currency, cents }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function mergeTotals(totals: AggregateRow[]): AggregateRow[] {
  const map = new Map<string, AggregateRow>();
  for (const total of totals) {
    const key = `${total.currency}`;
    const current = map.get(key);
    if (current) {
      current.debitCents += total.debitCents;
      current.creditCents += total.creditCents;
    } else {
      map.set(key, { ...total });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.currency.localeCompare(b.currency)
  );
}

export async function getBalancete(
  db: SQLiteDatabase,
  monthKey: string
): Promise<BalanceteReport> {
  const range = monthRange(monthKey);
  const aggregates = await fetchAggregate(db, range.startISO, range.endInclusiveISO);
  const rows = toReportRows(aggregates, "debit", false).sort((a, b) =>
    a.account.localeCompare(b.account)
  );
  return {
    monthKey,
    rows,
    totals: mergeTotals(aggregates),
  };
}

function normalizeTopLevel(account: string): string {
  return account
    .split(":")[0]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function getBalanceSheet(
  db: SQLiteDatabase,
  monthKey: string
): Promise<BalanceSheetReport> {
  const range = monthRange(monthKey);
  const aggregates = await fetchAggregate(db, null, range.endInclusiveISO);

  const buckets: Record<string, AggregateRow[]> = {
    ativo: [],
    passivo: [],
    pl: [],
    receita: [],
    despesa: [],
    outras: [],
  };
  for (const row of aggregates) {
    const level1 = normalizeTopLevel(row.account);
    if (level1 === "ativo") {
      buckets.ativo.push(row);
    } else if (level1 === "passivo") {
      buckets.passivo.push(row);
    } else if (level1 === "patrimonioliquido" || level1 === "pl") {
      buckets.pl.push(row);
    } else if (level1 === "receita") {
      buckets.receita.push(row);
    } else if (level1 === "despesa") {
      buckets.despesa.push(row);
    } else {
      buckets.outras.push(row);
    }
  }

  const ativoRows = toReportRows(buckets.ativo, "debit", true).sort((a, b) =>
    a.account.localeCompare(b.account)
  );
  const passivoRows = toReportRows(buckets.passivo, "credit", true).sort((a, b) =>
    a.account.localeCompare(b.account)
  );
  const plRows = toReportRows(buckets.pl, "credit", true).sort((a, b) =>
    a.account.localeCompare(b.account)
  );

  const receitasTotals = sumTotals(toReportRows(buckets.receita, "credit", true));
  const despesasTotals = sumTotals(toReportRows(buckets.despesa, "debit", true));

  const resultadoMap = new Map<string, number>();
  for (const entry of receitasTotals) {
    resultadoMap.set(entry.currency, (resultadoMap.get(entry.currency) ?? 0) + entry.cents);
  }
  for (const entry of despesasTotals) {
    resultadoMap.set(entry.currency, (resultadoMap.get(entry.currency) ?? 0) - entry.cents);
  }
  const resultado: CurrencyTotal[] = Array.from(resultadoMap.entries())
    .map(([currency, cents]) => ({ currency, cents }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  const ativoTotals = sumTotals(ativoRows);
  const passivoTotals = sumTotals(passivoRows);
  const plTotals = sumTotals(plRows);

  const currencies = new Set<string>([
    ...ativoTotals.map((entry) => entry.currency),
    ...passivoTotals.map((entry) => entry.currency),
    ...plTotals.map((entry) => entry.currency),
    ...resultado.map((entry) => entry.currency),
  ]);

  const checks: BalanceSheetCheck[] = Array.from(currencies)
    .sort()
    .map((currency) => {
      const ativoCents =
        ativoTotals.find((e) => e.currency === currency)?.cents ?? 0;
      const passivoCents =
        passivoTotals.find((e) => e.currency === currency)?.cents ?? 0;
      const plCents = plTotals.find((e) => e.currency === currency)?.cents ?? 0;
      const resultadoCents =
        resultado.find((e) => e.currency === currency)?.cents ?? 0;
      return {
        currency,
        ativoCents,
        passivoPlusPlCents: passivoCents + plCents + resultadoCents,
        ok: ativoCents === passivoCents + plCents + resultadoCents,
      };
    });

  return {
    monthKey,
    ativo: { title: "Ativo", rows: ativoRows, totals: ativoTotals },
    passivo: { title: "Passivo", rows: passivoRows, totals: passivoTotals },
    patrimonioLiquido: {
      title: "Patrimônio Líquido",
      rows: plRows,
      totals: plTotals,
    },
    resultado,
    checks,
  };
}

export async function getDre(
  db: SQLiteDatabase,
  monthKey: string
): Promise<DreReport> {
  const range = monthRange(monthKey);
  const aggregates = await fetchAggregate(db, range.startISO, range.endInclusiveISO);

  const receitasRows = toReportRows(
    aggregates.filter((row) => normalizeTopLevel(row.account) === "receita"),
    "credit",
    true
  ).sort((a, b) => a.account.localeCompare(b.account));
  const despesasRows = toReportRows(
    aggregates.filter((row) => normalizeTopLevel(row.account) === "despesa"),
    "debit",
    true
  ).sort((a, b) => a.account.localeCompare(b.account));

  const currencies = new Set<string>([
    ...receitasRows.map((row) => row.currency),
    ...despesasRows.map((row) => row.currency),
  ]);

  const totals: DreCurrencyTotal[] = Array.from(currencies)
    .sort()
    .map((currency) => {
      const receitasCents = receitasRows
        .filter((row) => row.currency === currency)
        .reduce((sum, row) => sum + row.balanceCents, 0);
      const despesasCents = despesasRows
        .filter((row) => row.currency === currency)
        .reduce((sum, row) => sum + row.balanceCents, 0);
      return {
        currency,
        receitasCents,
        despesasCents,
        resultadoCents: receitasCents - despesasCents,
      };
    });

  return {
    monthKey,
    receitas: { title: "Receitas", rows: receitasRows, total: sumTotals(receitasRows) },
    despesas: { title: "Despesas", rows: despesasRows, total: sumTotals(despesasRows) },
    totals,
  };
}
