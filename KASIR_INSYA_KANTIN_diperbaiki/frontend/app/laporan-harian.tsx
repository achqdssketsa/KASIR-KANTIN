import { useState, useCallback } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";
import { formatRp, todayISO } from "@/src/format";
import { Display } from "@/src/components/ui";

type Report = {
  date: string; total_sales: number; total_cost: number; gross_profit: number; net_profit: number;
  modal_in_total: number; expense_total: number; sale_count: number; item_count: number;
  by_method: Record<string, number>; top_products: { name: string; qty: number }[];
};

export default function LaporanHarian() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<Report | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    try { setData(await api<Report>(`/reports/daily?date=${todayISO()}`)); } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const exportCsv = async () => {
    if (!data) return;
    const rows = [
      ["Metrik", "Nilai"],
      ["Tanggal", data.date],
      ["Total Penjualan", data.total_sales],
      ["Total Modal (HPP)", data.total_cost],
      ["Laba Kotor", data.gross_profit],
      ["Pengeluaran", data.expense_total],
      ["Laba Bersih", data.net_profit],
      ["Modal Masuk", data.modal_in_total],
      ["Jumlah Transaksi", data.sale_count],
      ["Jumlah Item Terjual", data.item_count],
      [""],
      ["Metode Pembayaran", "Total"],
      ...Object.entries(data.by_method).map(([k, v]) => [k, v]),
      [""],
      ["Top Produk", "Qty"],
      ...data.top_products.map((p) => [p.name, p.qty]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const filename = `laporan-${data.date}.csv`;
    try {
      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = (globalThis as any).document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        setMsg({ ok: true, text: "File CSV diunduh" });
        return;
      }
      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Ekspor laporan" });
      setMsg({ ok: true, text: "Laporan CSV siap dibagikan" });
    } catch {
      setMsg({ ok: false, text: "Gagal mengekspor laporan" });
    }
  };

  if (!data) return <View style={styles.root}><Text style={{ padding: 40, textAlign: "center", color: colors.muted }}>Memuat...</Text></View>;

  const sales = data.total_sales || 1;
  const methods = ["tunai", "qris", "transfer"] as const;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Feather name="chevron-left" size={22} color={colors.onSurface} /></Pressable>
        <Display style={styles.title}>Laporan Harian</Display>
        <Pressable onPress={exportCsv} style={styles.back} testID="export-btn"><Feather name="share" size={18} color={colors.onSurface} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 60, gap: spacing.sm }}>
        <Text style={styles.date}>{data.date}</Text>
        {msg && <Text style={{ color: msg.ok ? colors.success : colors.error, fontSize: 13 }} testID="export-status">{msg.text}</Text>}

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>LABA BERSIH HARI INI</Text>
          <Display style={styles.heroVal}>{formatRp(data.net_profit)}</Display>
          <Text style={styles.heroSub}>dari {data.sale_count} transaksi · {data.item_count} item terjual</Text>
        </View>

        <View style={styles.grid}>
          <Stat label="Penjualan" value={formatRp(data.total_sales)} icon="trending-up" />
          <Stat label="Modal (HPP)" value={formatRp(data.total_cost)} icon="package" />
          <Stat label="Laba Kotor" value={formatRp(data.gross_profit)} icon="bar-chart-2" />
          <Stat label="Pengeluaran" value={formatRp(data.expense_total)} icon="arrow-up-circle" tone="error" />
          <Stat label="Modal Masuk" value={formatRp(data.modal_in_total)} icon="arrow-down-circle" tone="info" />
          <Stat label="Transaksi" value={String(data.sale_count)} icon="list" />
        </View>

        <Text style={styles.section}>METODE PEMBAYARAN</Text>
        <View style={styles.card}>
          {methods.map((m) => {
            const val = data.by_method[m] || 0;
            const pct = Math.round((val / sales) * 100);
            return (
              <View key={m} style={{ marginBottom: spacing.sm }} testID={`method-${m}`}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.onSurface, fontSize: 13, fontWeight: "600" }}>{m.toUpperCase()}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{formatRp(val)} · {pct}%</Text>
                </View>
                <View style={styles.barBg}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>TOP PRODUK</Text>
        <View style={styles.card}>
          {data.top_products.length === 0 && <Text style={{ color: colors.muted }}>Belum ada data</Text>}
          {data.top_products.map((p, i) => (
            <View key={p.name} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }} testID={`top-${i}`}>
              <Text style={{ color: colors.onSurface }}>{i + 1}. {p.name}</Text>
              <Text style={{ color: colors.muted }}>{p.qty} porsi</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: string; icon: string; tone?: "error" | "info" }) {
  const color = tone === "error" ? colors.error : tone === "info" ? colors.info : colors.onSurface;
  return (
    <View style={styles.stat}>
      <Feather name={icon as any} size={16} color={color} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  back: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20 },
  date: { color: colors.muted, fontSize: 12, letterSpacing: 1 },
  heroCard: { backgroundColor: colors.brandPrimary, borderRadius: radius.lg, padding: spacing.xl, alignItems: "flex-start" },
  heroLabel: { color: "#D4C9A8", fontSize: 10, letterSpacing: 2 },
  heroVal: { color: colors.onBrand, fontSize: 30, marginTop: 4 },
  heroSub: { color: "#D4C9A8", fontSize: 12, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  stat: { width: "48%", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 4 },
  statLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1, marginTop: 4 },
  statVal: { fontSize: 15, fontWeight: "700" },
  section: { color: colors.muted, fontSize: 11, letterSpacing: 2, marginTop: spacing.lg },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  barBg: { height: 6, borderRadius: 999, backgroundColor: colors.surfaceTertiary, marginTop: 6, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 999, backgroundColor: colors.brandPrimary },
});
