export type Side = "D" | "C";

const SEGMENT = "[\\p{L}][\\p{L}\\p{N}_-]*";
const ACCOUNT_NAME_RE = new RegExp(`^${SEGMENT}$`, "u");

export interface AccountType {
  label: string;
  key: string;
}

export const ACCOUNT_TYPES: AccountType[] = [
  { label: "Ativo", key: "Ativo" },
  { label: "Passivo", key: "Passivo" },
  { label: "Patrimônio Líquido", key: "PatrimonioLiquido" },
  { label: "Receita", key: "Receita" },
  { label: "Despesa", key: "Despesa" },
];

export function isCancelCommand(raw: string): boolean {
  return raw.trim() === ".";
}

export function parseAccountName(raw: string): string | null {
  const normalized = raw.trim().replace(/\s+/g, " ");
  if (!ACCOUNT_NAME_RE.test(normalized)) {
    return null;
  }
  return normalized;
}

export function buildAccount(typeLabel: string, name: string): string | null {
  const type = ACCOUNT_TYPES.find((entry) => entry.label === typeLabel);
  if (!type) {
    return null;
  }
  const parsedName = parseAccountName(name);
  if (!parsedName) {
    return null;
  }
  return `${type.key}:${parsedName}`;
}
