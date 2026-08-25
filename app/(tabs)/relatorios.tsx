import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { formatCents } from "@/lib/money";
import { formatMonthKey } from "@/lib/dates";
import type { Side } from "@/lib/parser";
import MonthPickerModal from "@/components/MonthPickerModal";
import {
  getBalancete,
  getBalanceSheet,
  getDre,
  type BalanceteReport,
  type BalanceSheetReport,
  type DreReport,
  type ReportAccountRow,
} from "@/lib/reports";

type ReportKind = "balanco" | "balancete" | "dre";
type ReportData =
  | { kind: Extract<ReportKind, "balanco">; data: BalanceSheetReport }
  | { kind: Extract<ReportKind, "balancete">; data: BalanceteReport }
  | { kind: Extract<ReportKind, "dre">; data: DreReport };

const REPORT_OPTIONS: { key: ReportKind; label: string }[] = [
  { key: "balanco", label: "Balanço Patrimonial" },
  { key: "balancete", label: "Balancete" },
  { key: "dre", label: "DRE" },
];

interface Column {
  label: string;
  width?: number;
  flex?: number;
  align?: "left" | "right";
}

export default function Relatorios() {
  const db = useSQLiteContext();
  const [kind, setKind] = useState<ReportKind>("balanco");
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(monthKey: string) {
    setMonthPickerVisible(false);
    setError(null);
    try {
      if (kind === "balancete") {
        setReport({ kind: "balancete", data: await getBalancete(db, monthKey) });
      } else if (kind === "balanco") {
        setReport({ kind: "balanco", data: await getBalanceSheet(db, monthKey) });
      } else {
        setReport({ kind: "dre", data: await getDre(db, monthKey) });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao gerar relatório.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Relatórios mensais</Text>
      <View style={styles.options}>
        {REPORT_OPTIONS.map((option) => (
          <Pressable
            key={option.key}
            style={[styles.option, kind === option.key && styles.optionActive]}
            onPress={() => setKind(option.key)}
          >
            <Text
              style={[
                styles.optionText,
                kind === option.key && styles.optionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <TouchableOpacity
        style={styles.generateButton}
        onPress={() => setMonthPickerVisible(true)}
      >
        <Text style={styles.generateButtonText}>Gerar Relatório</Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}

      <MonthPickerModal
        visible={monthPickerVisible}
        onCancel={() => setMonthPickerVisible(false)}
        onConfirm={(monthKey) => {
          void generate(monthKey);
        }}
      />
      <ReportModal report={report} onClose={() => setReport(null)} />
    </View>
  );
}

function ReportModal({
  report,
  onClose,
}: {
  report: ReportData | null;
  onClose: () => void;
}) {
  const title = report ? reportTitle(report.kind) : "";
  const monthLabel = report ? formatMonthKey(report.data.monthKey) : "";

  function sections(): { heading: string; table: TableData }[] {
    if (!report) {
      return [];
    }
    if (report.kind === "balancete") {
      return [
        {
          heading: "Movimentação do mês",
          table: accountTable(report.data.rows),
        },
        {
          heading: "Totais por moeda",
          table: {
            columns: [
              { label: "Moeda", flex: 1 },
              { label: "Débitos", align: "right", flex: 2 },
              { label: "Créditos", align: "right", flex: 2 },
            ],
            rows: report.data.totals.map((total) => [
              total.currency,
              formatCents(total.debitCents, total.currency),
              formatCents(total.creditCents, total.currency),
            ]),
          },
        },
      ];
    }
    if (report.kind === "balanco") {
      const data = report.data;
      const result: { heading: string; table: TableData }[] = [];
      for (const [section, naturalSide] of [
        [data.ativo, "D"],
        [data.passivo, "C"],
        [data.patrimonioLiquido, "C"],
      ] as const) {
        if (section.rows.length > 0) {
          result.push({
            heading: section.title,
            table: accountBalanceTable(section.rows, naturalSide),
          });
        }
        result.push({
          heading: `Total ${section.title}`,
          table: {
            columns: [
              { label: "Moeda", flex: 1 },
              { label: "Saldo", align: "right", flex: 2 },
            ],
            rows: section.totals.map((entry) => [
              entry.currency,
              formatCents(entry.cents, entry.currency),
            ]),
          },
        });
      }
      if (data.resultado.length > 0) {
        result.push({
          heading: "Resultado acumulado (Receitas − Despesas)",
          table: {
            columns: [
              { label: "Moeda", flex: 1 },
              { label: "Valor", align: "right", flex: 2 },
            ],
            rows: data.resultado.map((entry) => [
              entry.currency,
              formatCents(entry.cents, entry.currency),
            ]),
          },
        });
      }
      result.push({
        heading: "Verificação (Ativo = Passivo + PL + Resultado)",
        table: {
          columns: [
            { label: "Moeda", flex: 1 },
            { label: "Ativo", align: "right", flex: 2 },
            { label: "P+PL+R", align: "right", flex: 2 },
            { label: "Status", flex: 1 },
          ],
          rows: data.checks.map((check) => [
            check.currency,
            formatCents(check.ativoCents, check.currency),
            formatCents(check.passivoPlusPlCents, check.currency),
            check.ok ? "OK" : "Divergente",
          ]),
        },
      });
      return result;
    }
    const data = report.data;
    const sectionsList: { heading: string; table: TableData }[] = [
      {
        heading: data.receitas.title,
        table: accountBalanceTable(data.receitas.rows, "C"),
      },
      {
        heading: data.despesas.title,
        table: accountBalanceTable(data.despesas.rows, "D"),
      },
      {
        heading: "Resultado do mês",
        table: {
          columns: [
            { label: "Moeda", flex: 1 },
            { label: "Receitas", align: "right", flex: 2 },
            { label: "Despesas", align: "right", flex: 2 },
            { label: "Resultado", align: "right", flex: 2 },
          ],
          rows: data.totals.map((entry) => [
            entry.currency,
            formatCents(entry.receitasCents, entry.currency),
            formatCents(entry.despesasCents, entry.currency),
            formatCents(entry.resultadoCents, entry.currency),
          ]),
        },
      },
    ];
    return sectionsList;
  }

  return (
    <Modal visible={report !== null} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalSubtitle}>{monthLabel}</Text>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {sections().map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              {section.table.rows.length === 0 ? (
                <Text style={styles.sectionEmpty}>Sem dados no período.</Text>
              ) : (
                <>
                  <View style={styles.tableHeader}>
                    {section.table.columns.map((column) => (
                      <Text
                        key={column.label}
                        style={[
                          styles.headerCell,
                          column.flex ? { flex: column.flex } : null,
                          column.width ? { width: column.width } : null,
                          column.align === "right" && styles.cellRight,
                        ]}
                        numberOfLines={1}
                      >
                        {column.label}
                      </Text>
                    ))}
                  </View>
                  {section.table.rows.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.tableRow}>
                      {row.map((cell, cellIndex) => (
                        <Text
                          key={cellIndex}
                          style={[
                            styles.cell,
                            section.table.columns[cellIndex].flex
                              ? { flex: section.table.columns[cellIndex].flex as number }
                              : null,
                            section.table.columns[cellIndex].width
                              ? { width: section.table.columns[cellIndex].width as number }
                              : null,
                            section.table.columns[cellIndex].align === "right" &&
                              styles.cellRight,
                          ]}
                          numberOfLines={1}
                        >
                          {String(cell)}
                        </Text>
                      ))}
                    </View>
                  ))}
                </>
              )}
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function reportTitle(kind: ReportKind): string {
  if (kind === "balancete") {
    return "Balancete";
  }
  if (kind === "dre") {
    return "DRE — Demonstração do Resultado";
  }
  return "Balanço Patrimonial";
}

interface TableData {
  columns: Column[];
  rows: string[][];
}

function accountTable(rows: ReportAccountRow[]): TableData {
  return {
    columns: [
      { label: "Conta", flex: 3 },
      { label: "Débitos", align: "right", flex: 2 },
      { label: "Créditos", align: "right", flex: 2 },
      { label: "Saldo", align: "right", flex: 2 },
    ],
    rows: rows.map((row) => [
      row.account,
      formatCents(row.debitCents, row.currency),
      formatCents(row.creditCents, row.currency),
      `${formatCents(Math.abs(row.balanceCents), row.currency)} ${row.balanceCents >= 0 ? "D" : "C"}`,
    ]),
  };
}

function accountBalanceTable(
  rows: ReportAccountRow[],
  naturalSide: Side
): TableData {
  const opposite: Side = naturalSide === "D" ? "C" : "D";
  return {
    columns: [
      { label: "Conta", flex: 3 },
      { label: "Saldo", align: "right", flex: 2 },
    ],
    rows: rows
      .filter((row) => row.balanceCents !== 0)
      .map((row) => [
        row.account,
        `${formatCents(Math.abs(row.balanceCents), row.currency)} ${
          row.balanceCents > 0 ? naturalSide : opposite
        }`,
      ]),
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
  },
  options: {
    gap: 8,
  },
  option: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionActive: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  optionText: {
    color: "#334155",
    fontWeight: "600",
  },
  optionTextActive: {
    color: "#1d4ed8",
  },
  generateButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  generateButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  error: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f5f6fa",
    paddingTop: 48,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563eb",
    textAlign: "center",
    marginBottom: 8,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  sectionEmpty: {
    color: "#94a3b8",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
    paddingBottom: 4,
    marginBottom: 2,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    paddingRight: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#f1f5f9",
  },
  cell: {
    color: "#0f172a",
    paddingRight: 8,
    fontVariant: ["tabular-nums"],
  },
  cellRight: {
    textAlign: "right",
  },
  closeButton: {
    alignSelf: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 36,
    paddingVertical: 12,
    marginBottom: 24,
  },
  closeButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
