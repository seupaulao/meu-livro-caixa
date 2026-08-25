import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { currentMonthKey, parseMonthKey } from "@/lib/dates";

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (monthKey: string) => void;
}

export default function MonthPickerModal({ visible, onCancel, onConfirm }: Props) {
  const [monthInput, setMonthInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open() {
    const [year, month] = currentMonthKey().split("-");
    setMonthInput(`${month}/${year}`);
    setError(null);
  }

  function confirm() {
    const monthKey = parseMonthKey(monthInput);
    if (!monthKey) {
      setError("Mês inválido. Use o formato MM/AAAA.");
      return;
    }
    onConfirm(monthKey);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      onShow={open}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Mês do relatório</Text>
          <TextInput
            style={styles.input}
            value={monthInput}
            onChangeText={(text) => {
              setMonthInput(text);
              setError(null);
            }}
            onSubmitEditing={confirm}
            keyboardType="numbers-and-punctuation"
            maxLength={7}
            placeholder="MM/AAAA"
            autoFocus
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={confirm}
            >
              <Text style={styles.confirmButtonText}>Gerar</Text>
            </TouchableOpacity>
          </View>
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
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0f172a",
  },
  error: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cancelButton: {
    backgroundColor: "#e2e8f0",
  },
  cancelButtonText: {
    color: "#334155",
    fontWeight: "700",
  },
  confirmButton: {
    backgroundColor: "#2563eb",
  },
  confirmButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
