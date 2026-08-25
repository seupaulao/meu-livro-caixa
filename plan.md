# Plano de Implementação — Meu Livro Caixa (simulador hledger)

Referência de requisitos: `meu-hledger.md`

## Decisões confirmadas

- Entrada da conta **sem** o `-`: `D Ativo:Caixa` / `Ativo:Caixa` (débito) · `C ...` / `a ...` (crédito)
- Flags: `D/d` ou ausente = débito · `C/c/a/A` = crédito
- Plano de contas nível 1 (antes do `:`): `Ativo`, `Passivo`, `PatrimonioLiquido`, `Receita`, `Despesa`
- Partidas dobradas validadas **por moeda**; relatórios agrupam valores por moeda

## Stack e arquitetura

- Expo SDK 54 + expo-router v6 (tabs JavaScript), TypeScript estrito, alias `@/*`
- Persistência: **expo-sqlite** (`SQLiteProvider` + `useSQLiteContext`), migração via `PRAGMA user_version`

```
app/_layout.tsx              → Stack raiz envolto em SQLiteProvider (migrations)
app/(tabs)/_layout.tsx       → Tabs: Lançamento (index), Listagem, Relatórios
app/(tabs)/index.tsx         → Aba 1: Lançamento
app/(tabs)/listagem.tsx      → Aba 2: Listagem
app/(tabs)/relatorios.tsx    → Aba 3: seletor dos 3 relatórios
lib/db/database.ts           → schema v1 (migrateDbIfNeeded)
lib/db/repo.ts               → CRUD lançamentos/postings (withTransactionAsync)
lib/money.ts                 → formatação/parsing R$ 1.234,56 ⇄ centavos inteiros
lib/dates.ts                 → DD/MM/AAAA ⇄ ISO, faixas de mês
lib/parser.ts                → parse linha conta (flag + conta) e valor (moeda + pt-BR)
lib/reports.ts               → Balancete, Balanço Patrimonial, DRE (por moeda)
components/                  → modais: Detalhar, Confirmar exclusão (s/n), Mês, Relatório
tasks.md                     → checklist marcado a cada item concluído
```

## Modelo de dados (SQLite)

```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE postings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account TEXT NOT NULL,
  side TEXT NOT NULL CHECK(side IN ('D','C')),
  currency TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  line_order INTEGER NOT NULL
);
```

- Valores como centavos inteiros (sem erro de ponto flutuante); sinal implícito pelo `side`
- `PRAGMA foreign_keys = ON` e `journal_mode = WAL`

## Regras-chave

### Aba Lançamento
1. Data com default no dia atual; valida `DD/MM/AAAA` real
2. Descrição obrigatória não vazia
3. Loop de pares Conta → Valor:
   - Conta: flag opcional no primeiro token (`D/d`=débito, `C/c/a/A`=crédito, ausente=débito) + conta com ao menos um `:`
   - Valor: obrigatório iniciar com cifra (`R$`, `U$`, `BRL`, `USD`…) + número pt-BR `1.234,56`
   - Digitar `.` e Enter em Conta ou Valor cancela o lançamento em andamento
4. Enquanto Σ débitos ≠ Σ créditos por moeda, continua solicitando pares (exibindo saldo faltante por moeda)
5. Ao fechar, grava transação + lançamentos em única transação SQL; disponível imediatamente na Listagem

### Aba Listagem
- Somente leitura; FlatList ordenada por data DESC com dia + descrição
- Botões alinhados à direita: `Detalhar`, `Excluir`
- Detalhar: modal só-leitura (data, descrição, contas/valores D/C) com botão centralizado "Fechar Janela"
- Excluir: confirmação "Deseja realmente excluir? (s/n)" → Sim remove do banco (cascade)

### Aba Relatórios
- Navegação interna entre Balanço Patrimonial, Balancete e DRE (mensais)
- Botão gera modal pedindo o mês (`MM/AAAA`); relatório exibido em modal com botão "Fechar" centralizado
- **Balancete**: contas movimentadas no mês — débitos, créditos, saldo final (D−C), total geral
- **Balanço Patrimonial**: saldos acumulados até o fim do mês, seções Ativo / Passivo / Patrimônio Líquido (+ Resultado = Receitas−Despesas acumulado), verificação A = P + PL + R
- **DRE**: Receitas (C−D) e Despesas (D−C) do mês, Resultado do período
- Todos agrupados por moeda

## Fases de execução (marcadas em tasks.md)

1. **Setup** — instalar expo-sqlite; criar `tasks.md`; estrutura `(tabs)`; SQLiteProvider + migration v1
2. **Camada de dados** — `database.ts`, `repo.ts`, `money.ts`, `dates.ts`
3. **Parser/validações** — `parser.ts` (funções puras)
4. **Aba Lançamento** — fluxo completo com partidas dobradas e cancelamento
5. **Aba Listagem** — lista + modais Detalhar/Excluir
6. **Aba Relatórios** — 3 relatórios + modal de mês
7. **Verificação** — `npm run lint`, `npx tsc --noEmit`, teste das funções puras em Node, checklist completo

## Aprimoramentos 01

- Alterar a forma de entrada de dados, atual:
D/d/ nada + TipoConta:NomeConta se débito
C/c/A/a + TipoConta:NomeConta se débito

para:

1. Colocar 2 botões alinhados a esquerda 'D' e 'C'.
Se teclar em 'D' a entrada deve ser Débito
Se teclar em 'C' a entrada deve ser Crédito

2. Colocar uma lista de seleção simples os valores: 
Ativo,Passivo,Patrimônio Líquido,Receita,Despesa
O Usuário deve selecionar um tipo de conta, obrigatoriamente
dessa seleção.

3. Campo de texto, no qual o usuário deve digitar o nome
da conta

4. Não é necessário criar campos novos no banco. Apenas
será alterado a forma de entrada de dados, o modo de salvar
permanece o mesmo. 

5. O detalhamento da listagem deve permanecer o mesmo também.

- O campo Valor não é mais necessário colocar a cifra
tipo USD,BRL,R$ ou US$. Automaticamente deve ir para '$'.

## Aprimoramento 02

- Permitir colocar admob
1. banner rodapé
2. video de recompensa - se assistir, desativa todas os ads por 120 minutos.

- exportar
1. exportar lançamentos e relatórios para
  * planilha microsoft/openoffice/google
  * docs google
  * arquivo markdown