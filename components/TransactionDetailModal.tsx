import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatCents } from "@/lib/money";
import { isoToBr } from "@/lib/dates";
import type { TransactionDetail } from "@/lib/db/repo";

interface Props {
  detail: TransactionDetail | null;
  onClose: () => void;
}

export default function TransactionDetailModal({ detail, onClose }: Props) {
  return (
    <Modal
      visible={detail !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {detail && (
            <>
              <Text style={styles.title}>Detalhe do lançamento</Text>
              <Text style={styles.line}>
                <Text style={styles.labelText}>Data: </Text>
                {isoToBr(detail.transaction.date)}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.labelText}>Descrição: </Text>
                {detail.transaction.description}
              </Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.sideColumn]}>D/C</Text>
                <Text style={[styles.headerCell, styles.accountColumn]}>
                  Conta
                </Text>
                <Text style={[styles.headerCell, styles.valueColumn]}>
                  Valor
                </Text>
              </View>
              {detail.postings.map((posting) => (
                <View key={posting.id} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.sideColumn]}>
                    {posting.side}
                  </Text>
                  <Text style={[styles.cell, styles.accountColumn]} numberOfLines={1}>
                    {posting.account}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      styles.valueColumn,
                      posting.side === "C" && styles.creditValue,
                    ]}
                  >
                    {formatCents(posting.amount_cents, posting.currency)}
                  </Text>
                </View>
              ))}
            </>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fechar Janela</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  line: {
    color: "#334155",
  },
  labelText: {
    fontWeight: "700",
    color: "#475569",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingBottom: 4,
    marginTop: 8,
  },
  headerCell: {
    fontWeight: "700",
    fontSize: 13,
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  cell: {
    color: "#0f172a",
  },
  sideColumn: {
    width: 34,
    fontWeight: "700",
    color: "#2563eb",
  },
  accountColumn: {
    flex: 1,
    paddingRight: 8,
  },
  valueColumn: {
    fontVariant: ["tabular-nums"],
  },
  creditValue: {
    color: "#b45309",
  },
  closeButton: {
    marginTop: 16,
    alignSelf: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  closeButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
