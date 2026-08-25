import type { SQLiteDatabase } from "expo-sqlite";
import type { Side } from "@/lib/parser";

export interface NewPosting {
  account: string;
  side: Side;
  currency: string;
  cents: number;
}

export interface NewTransaction {
  dateISO: string;
  description: string;
  postings: NewPosting[];
}

export interface TransactionRow {
  id: number;
  date: string;
  description: string;
}

export interface PostingRow {
  id: number;
  transaction_id: number;
  account: string;
  side: Side;
  currency: string;
  amount_cents: number;
  line_order: number;
}

export interface TransactionDetail {
  transaction: TransactionRow;
  postings: PostingRow[];
}

export async function insertTransaction(
  db: SQLiteDatabase,
  tx: NewTransaction
): Promise<number> {
  let insertedId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      "INSERT INTO transactions (date, description) VALUES (?, ?)",
      tx.dateISO,
      tx.description
    );
    const id = result.lastInsertRowId;
    for (let i = 0; i < tx.postings.length; i += 1) {
      const posting = tx.postings[i];
      await db.runAsync(
        "INSERT INTO postings (transaction_id, account, side, currency, amount_cents, line_order) VALUES (?, ?, ?, ?, ?, ?)",
        id,
        posting.account,
        posting.side,
        posting.currency,
        posting.cents,
        i + 1
      );
    }
    insertedId = id;
  });
  return insertedId;
}

export async function listTransactions(
  db: SQLiteDatabase
): Promise<TransactionRow[]> {
  return db.getAllAsync<TransactionRow>(
    "SELECT id, date, description FROM transactions ORDER BY date DESC, id DESC"
  );
}

export async function getTransactionDetail(
  db: SQLiteDatabase,
  id: number
): Promise<TransactionDetail | null> {
  const transaction = await db.getFirstAsync<TransactionRow>(
    "SELECT id, date, description FROM transactions WHERE id = ?",
    [id]
  );
  if (!transaction) {
    return null;
  }
  const postings = await db.getAllAsync<PostingRow>(
    "SELECT * FROM postings WHERE transaction_id = ? ORDER BY line_order ASC",
    [id]
  );
  return { transaction, postings };
}

export async function deleteTransaction(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
}
