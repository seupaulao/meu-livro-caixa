import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  deleteTransaction,
  getTransactionDetail,
  listTransactions,
  type TransactionDetail,
  type TransactionRow,
} from "@/lib/db/repo";
import { isoToBr } from "@/lib/dates";
import TransactionDetailModal from "@/components/TransactionDetailModal";

export default function Listagem() {
  const db = useSQLiteContext();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [detail, setDetail] = useState<TransactionDetail | null>(null);

  const reload = useCallback(async () => {
    setTransactions(await listTransactions(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  function openDetail(id: number) {
    void (async () => {
      setDetail(await getTransactionDetail(db, id));
    })();
  }

  function confirmDelete(transaction: TransactionRow) {
    Alert.alert("Excluir", "Deseja realmente excluir? (s/n)", [
      { text: "Não", style: "cancel" },
      {
        text: "Sim",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await deleteTransaction(db, transaction.id);
            await reload();
          })();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemDate}>{isoToBr(item.date)}</Text>
              <Text style={styles.itemDescription} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={[styles.button, styles.detailButton]}
                onPress={() => openDetail(item.id)}
              >
                <Text style={styles.detailButtonText}>Detalhar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={() => confirmDelete(item)}
              >
                <Text style={styles.deleteButtonText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nenhum lançamento registrado. Vá para a aba Lançamento.
          </Text>
        }
      />
      <TransactionDetailModal detail={detail} onClose={() => setDetail(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 8,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemDate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
  itemDescription: {
    color: "#0f172a",
  },
  itemActions: {
    flexDirection: "row",
    gap: 6,
  },
  button: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailButton: {
    backgroundColor: "#dbeafe",
  },
  detailButtonText: {
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontWeight: "700",
    fontSize: 12,
  },
  empty: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: 32,
  },
});
