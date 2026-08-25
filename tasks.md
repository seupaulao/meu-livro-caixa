# Tasks — Meu Livro Caixa

## Fase 1 — Setup

- [x] Instalar expo-sqlite
- [x] Criar tasks.md
- [x] Estrutura de tabs `(tabs)` com Lançamento / Listagem / Relatórios
- [x] SQLiteProvider na raiz com migration v1 (schema transactions/postings)

## Fase 2 — Camada de dados

- [x] lib/db/database.ts (migrateDbIfNeeded)
- [x] lib/db/repo.ts (inserir/listar/detalhar/excluir lançamentos em transação única)
- [x] lib/money.ts (parsing/formatação pt-BR ⇄ centavos inteiros)
- [x] lib/dates.ts (DD/MM/AAAA ⇄ ISO, faixas de mês)

## Fase 3 — Parser e validações

- [x] lib/parser.ts: linha de conta (D/d/nada=débito; C/c/a/A=crédito; conta exige `:`)
- [x] lib/parser.ts: valor obrigatoriamente iniciado por cifra (R$, U$, BRL, USD…) + número pt-BR

## Fase 4 — Aba Lançamento

- [x] Data default no dia atual com validação DD/MM/AAAA real
- [x] Descrição obrigatória
- [x] Entrada de pares Conta → Valor em loop
- [x] Cancelamento com `.` + Enter em Conta ou Valor
- [x] Validação partidas dobradas por moeda (repetir até fechar)
- [x] Gravação em transação SQL única e limpeza do formulário

## Fase 5 — Aba Listagem

- [x] Lista somente leitura (data DESC) com dia + descrição
- [x] Botões alinhados à direita: Detalhar, Excluir
- [x] Modal Detalhar só-leitura com botão centralizado "Fechar Janela"
- [x] Excluir com confirmação "Deseja realmente excluir? (s/n)"
- [x] Recarregar lista ao focar na aba

## Fase 6 — Aba Relatórios

- [x] Seletor interno entre Balanço Patrimonial, Balancete e DRE
- [x] Modal solicitando mês (MM/AAAA) e modal do relatório com botão "Fechar" centralizado
- [x] Balancete mensal (débitos, créditos, saldo por conta)
- [x] Balanço Patrimonial acumulado até o mês (Ativo = Passivo + PL + Resultado)
- [x] DRE mensal (Receitas − Despesas = Resultado)
- [x] Agrupamento por moeda nos três relatórios

## Fase 7 — Verificação final

- [x] npm run lint sem erros
- [x] npx tsc --noEmit sem erros
- [x] Teste das funções puras (parser/money/dates/reports) via Node

## Fase 8 — Aprimoramento da entrada de dados

- [x] lib/parser.ts: ACCOUNT_TYPES (Ativo, Passivo, Patrimônio Líquido, Receita, Despesa → chaves nível 1)
- [x] lib/parser.ts: parseAccountName (nome simples sem ":") + buildAccount ("Tipo:Nome")
- [x] lib/money.ts: cifra opcional no valor — número pt-BR puro assume moeda "$"
- [x] Aba Lançamento: botões 'D' e 'C' alinhados à esquerda (débito/crédito do par)
- [x] Aba Lançamento: chips de seleção obrigatória do tipo de conta (5 opções)
- [x] Aba Lançamento: campo de texto para nome da conta (sem prefixo, cancelamento "." mantido)
- [x] Aba Lançamento: Valor sem exigir cifra (label/placeholder/teclado atualizados)
- [x] Confirmar que repo/schema e modal Detalhar permanecem inalterados
- [x] Verificação final: lint + tsc + teste das funções puras em Node


