import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { brToIso, isoToBr, todayISO } from "@/lib/dates";
import {
  ACCOUNT_TYPES,
  buildAccount,
  isCancelCommand,
  type Side,
} from "@/lib/parser";
import {
  balanceByCurrency,
  formatCents,
  isBalanced,
  parseAmount,
} from "@/lib/money";
import { insertTransaction } from "@/lib/db/repo";

interface PendingPosting {
  account: string;
  side: Side;
  currency: string;
  cents: number;
}

type Step = "data" | "descricao" | "conta" | "valor";

export default function Index() {
  const db = useSQLiteContext();
  const [step, setStep] = useState<Step>("data");
  const [dateInput, setDateInput] = useState(isoToBr(todayISO()));
  const [descriptionInput, setDescriptionInput] = useState("");
  const [accountInput, setAccountInput] = useState("");
  const [sideInput, setSideInput] = useState<Side | null>(null);
  const [typeLabel, setTypeLabel] = useState<string | null>(null);
  const [valueInput, setValueInput] = useState("");
  const [pendingAccount, setPendingAccount] = useState<string | null>(null);
  const [pendingSide, setPendingSide] = useState<Side>("D");
  const [postings, setPostings] = useState<PendingPosting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function resetForm(message?: string) {
    setStep("data");
    setDateInput(isoToBr(todayISO()));
    setDescriptionInput("");
    setAccountInput("");
    setSideInput(null);
    setTypeLabel(null);
    setValueInput("");
    setPendingAccount(null);
    setPendingSide("D");
    setPostings([]);
    setError(null);
    setInfo(message ?? null);
  }

  function submitDate() {
    setError(null);
    setInfo(null);
    if (!brToIso(dateInput)) {
      setError("Data inválida. Use o formato DD/MM/AAAA.");
      return;
    }
    setStep("descricao");
  }

  function submitDescription() {
    setError(null);
    if (descriptionInput.trim().length === 0) {
      setError("Informe a descrição da operação.");
      return;
    }
    setStep("conta");
  }

  function cancelEntry() {
    resetForm("Lançamento cancelado.");
  }

  function submitAccount() {
    setError(null);
    if (isCancelCommand(accountInput)) {
      cancelEntry();
      return;
    }
    if (!sideInput) {
      setError("Selecione Débito (D) ou Crédito (C).");
      return;
    }
    if (!typeLabel) {
      setError("Selecione o tipo da conta.");
      return;
    }
    const account = buildAccount(typeLabel, accountInput);
    if (!account) {
      setError(
        "Nome de conta inválido. Use apenas letras/números (ex.: Caixa)."
      );
      return;
    }
    setPendingSide(sideInput);
    setPendingAccount(account);
    setValueInput("");
    setStep("valor");
  }

  async function finalize(nextPostings: PendingPosting[]) {
    const dateISO = brToIso(dateInput);
    if (!dateISO) {
      return;
    }
    try {
      setSaving(true);
      await insertTransaction(db, {
        dateISO,
        description: descriptionInput.trim(),
        postings: nextPostings.map((posting) => ({
          account: posting.account,
          side: posting.side,
          currency: posting.currency,
          cents: posting.cents,
        })),
      });
      Alert.alert("Sucesso", "Lançamento efetivado com partidas dobradas.");
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  function submitValue() {
    setError(null);
    if (isCancelCommand(valueInput)) {
      cancelEntry();
      return;
    }
    if (!pendingAccount) {
      return;
    }
    const amount = parseAmount(valueInput);
    if (!amount) {
      setError(
        "Valor inválido. Use o formato pt-BR sem cifra (ex.: 1.234,56)."
      );
      return;
    }
    const next = [
      ...postings,
      {
        account: pendingAccount,
        side: pendingSide,
        currency: amount.currency,
        cents: amount.cents,
      },
    ];
    setPostings(next);
    setAccountInput("");
    setSideInput(null);
    setTypeLabel(null);
    setPendingAccount(null);
    setValueInput("");
    const balances = balanceByCurrency(next);
    if (isBalanced(balances)) {
      void finalize(next);
    } else {
      setStep("conta");
    }
  }

  const balances = balanceByCurrency(postings);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Novo Lançamento</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Data (DD/MM/AAAA)</Text>
        <TextInput
          style={[styles.input, step !== "data" && styles.inputDone]}
          value={dateInput}
          onChangeText={(text) => {
            setDateInput(text);
            setError(null);
          }}
          onSubmitEditing={submitDate}
          onEndEditing={submitDate}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          placeholder="DD/MM/AAAA"
          returnKeyType="next"
          editable={step === "data"}
        />
      </View>

      {(step !== "data" || descriptionInput.length > 0) && (
        <View style={styles.field}>
          <Text style={styles.label}>Descrição da operação</Text>
          <TextInput
            style={[styles.input, step !== "descricao" && styles.inputDone]}
            value={descriptionInput}
            onChangeText={(text) => {
              setDescriptionInput(text);
              setError(null);
            }}
            onSubmitEditing={submitDescription}
            onEndEditing={submitDescription}
            placeholder="Ex.: Compra de material"
            returnKeyType="next"
            editable={step === "descricao"}
            autoFocus={step === "descricao"}
          />
        </View>
      )}

      {step === "conta" && (
        <View style={styles.field}>
          <Text style={styles.label}>Conta — débito ou crédito</Text>
          <View style={styles.sideRow}>
            <Pressable
              style={[
                styles.sideButton,
                sideInput === "D" && styles.sideButtonActive,
              ]}
              onPress={() => {
                setSideInput("D");
                setError(null);
              }}
              disabled={saving}
            >
              <Text
                style={[
                  styles.sideButtonText,
                  sideInput === "D" && styles.sideButtonTextActive,
                ]}
              >
                D
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.sideButton,
                sideInput === "C" && styles.sideButtonActive,
              ]}
              onPress={() => {
                setSideInput("C");
                setError(null);
              }}
              disabled={saving}
            >
              <Text
                style={[
                  styles.sideButtonText,
                  sideInput === "C" && styles.sideButtonTextActive,
                ]}
              >
                C
              </Text>
            </Pressable>
            <Text style={styles.sideHint}>D = Débito · C = Crédito</Text>
          </View>

          <Text style={styles.label}>Tipo da conta (obrigatório)</Text>
          <View style={styles.typeRow}>
            {ACCOUNT_TYPES.map((type) => (
              <Pressable
                key={type.key}
                style={[
                  styles.chip,
                  typeLabel === type.label && styles.chipActive,
                ]}
                onPress={() => {
                  setTypeLabel(type.label);
                  setError(null);
                }}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.chipText,
                    typeLabel === type.label && styles.chipTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Nome da conta</Text>
          <TextInput
            key={`conta-${postings.length}`}
            style={styles.input}
            value={accountInput}
            onChangeText={(text) => {
              setAccountInput(text);
              setError(null);
            }}
            onSubmitEditing={submitAccount}
            placeholder="Ex.: Caixa"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            autoFocus
            editable={!saving}
          />
        </View>
      )}

      {step === "valor" && pendingAccount && (
        <View style={styles.field}>
          <Text style={styles.label}>
            Valor para {pendingAccount} (formato pt-BR, ex.: 1.234,56)
          </Text>
          <TextInput
            key={`valor-${postings.length}`}
            style={styles.input}
            value={valueInput}
            onChangeText={(text) => {
              setValueInput(text);
              setError(null);
            }}
            onSubmitEditing={submitValue}
            placeholder="0,00"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            returnKeyType="done"
            autoFocus
            editable={!saving}
          />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {info && <Text style={styles.info}>{info}</Text>}

      {postings.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Lançamentos da operação</Text>
          {postings.map((posting, index) => (
            <View key={index} style={styles.summaryRow}>
              <Text style={styles.summarySide}>{posting.side}</Text>
              <Text style={styles.summaryAccount} numberOfLines={1}>
                {posting.account}
              </Text>
              <Text style={styles.summaryValue}>
                {formatCents(posting.cents, posting.currency)}
              </Text>
            </View>
          ))}
          <Text style={styles.hint}>
            Digite &apos;.&apos; + Enter em Nome da Conta ou Valor para
            cancelar.
          </Text>
        </View>
      )}

      {postings.length > 0 && !isBalanced(balances) && (
        <View style={styles.balances}>
          <Text style={styles.summaryTitle}>Partidas dobradas por moeda</Text>
          {balances.map((balance) => {
            const diff = balance.debitCents - balance.creditCents;
            return (
              <Text key={balance.currency} style={styles.balanceRow}>
                {balance.currency}: débitos{" "}
                {formatCents(balance.debitCents, balance.currency)} · créditos{" "}
                {formatCents(balance.creditCents, balance.currency)} — falta{" "}
                {diff > 0 ? "crédito" : "débito"} de{" "}
                {formatCents(Math.abs(diff), balance.currency)}
              </Text>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0f172a",
  },
  inputDone: {
    backgroundColor: "#e2e8f0",
    color: "#475569",
  },
  sideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sideButton: {
    minWidth: 44,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  sideButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  sideButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  sideButtonTextActive: {
    color: "#ffffff",
  },
  sideHint: {
    fontSize: 12,
    color: "#94a3b8",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  chipActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  chipTextActive: {
    color: "#1d4ed8",
  },
  error: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  info: {
    color: "#166534",
    fontWeight: "600",
  },
  summary: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summarySide: {
    width: 14,
    fontWeight: "700",
    color: "#2563eb",
  },
  summaryAccount: {
    flex: 1,
    color: "#334155",
  },
  summaryValue: {
    fontVariant: ["tabular-nums"],
    color: "#0f172a",
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: "#94a3b8",
  },
  balances: {
    backgroundColor: "#fef9c3",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#facc15",
    padding: 12,
    gap: 4,
  },
  balanceRow: {
    color: "#713f12",
    fontSize: 13,
  },
});
