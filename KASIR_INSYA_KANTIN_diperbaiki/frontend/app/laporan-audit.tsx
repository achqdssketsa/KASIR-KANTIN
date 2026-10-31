import { useState, useCallback } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";
import { formatRp, formatDate } from "@/src/format";
import { Display } from "@/src/components/ui";
import { useAuth } from "@/src/auth";
import { ConfirmSheet } from "@/src/components/ConfirmSheet";

type Txn = {
  id: string; kind: string; created_at: string; cashier: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number; payment_method?: string; amount: number; note: string; cost_total: number;
  voided?: boolean; void_reason?: string; voided_by?: string;
};

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "sale", label: "Penjualan" },
  { key: "modal_in", label: "Modal" },
  { key: "expense", label: "Pengeluaran" },
] as const;

export default function LaporanAudit() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("all");
  const [data, setData] = useState<Txn[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    const q = filter === "all" ? "" : `?kind=${filter}`;
    try { setData(await api<Txn[]>(`/transactions${q}`)); } catch {}
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { load(); }, [filter]));

  const [voidId, setVoidId] = useState<string | null>(null);
  const doVoid = async (reason: string) => {
    await api(`/transactions/${voidId}/void`, { method: "POST", body: JSON.stringify({ reason }) });
    setVoidId(null); load();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Feather name="chevron-left" size={22} color={colors.onSurface} /></Pressable>
        <Display style={styles.title}>Laporan Audit</Display>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chipsRow}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.chip, filter === f.key && styles.chipActive]} testID={`filter-${f.key}`}>
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={data}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 60, gap: spacing.sm }}
        renderItem={({ item }) => {
          const isSale = item.kind === "sale";
          const total = isSale ? item.subtotal : item.amount;
          const open = expanded === item.id;
          return (
            <Pressable onPress={() => setExpanded(open ? null : item.id)} style={styles.card} testID={`audit-${item.id}`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View style={[styles.badge, { backgroundColor: (item.kind === "expense" ? colors.error : item.kind === "modal_in" ? colors.info : colors.success) + "22" }]}>
                  <Feather name={isSale ? "shopping-bag" : item.kind === "modal_in" ? "arrow-down-circle" : "arrow-up-circle"} size={16} color={item.kind === "expense" ? colors.error : item.kind === "modal_in" ? colors.info : colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cTitle}>#{item.id.slice(0, 8)} · {isSale ? "Penjualan" : item.kind === "modal_in" ? "Modal Masuk" : "Pengeluaran"}</Text>
                  <Text style={styles.cSub}>{formatDate(item.created_at)} · {item.cashier}{item.payment_method ? ` · ${item.payment_method.toUpperCase()}` : ""}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.amt, item.voided && { textDecorationLine: "line-through", color: colors.muted }]}>{item.kind === "expense" ? "-" : "+"}{formatRp(total)}</Text>
                  {item.voided && <Text style={styles.voidTag}>DIBATALKAN</Text>}
                </View>
              </View>
              {open && (
                <View style={styles.detail}>
                  {isSale && item.items.map((it, i) => (
                    <View key={i} style={styles.detailRow}>
                      <Text style={styles.dLabel}>{it.qty}x {it.name}</Text>
                      <Text style={styles.dVal}>{formatRp(it.price * it.qty)}</Text>
                    </View>
                  ))}
                  {!!item.note && <Text style={{ color: colors.muted, marginTop: 6 }}>Catatan: {item.note}</Text>}
                  {isSale && (
                    <Text style={{ color: colors.muted, marginTop: 6, fontSize: 12 }}>HPP: {formatRp(item.cost_total || 0)} · Laba: {formatRp((item.subtotal || 0) - (item.cost_total || 0))}</Text>
                  )}
                  {item.voided ? (
                    <Text style={{ color: colors.error, marginTop: 6, fontSize: 12 }} testID={`audit-void-info-${item.id}`}>
                      Dibatalkan oleh {item.voided_by}: {item.void_reason}
                    </Text>
                  ) : user?.role === "owner" && (
                    <Pressable onPress={() => setVoidId(item.id)} style={styles.delBtn} testID={`audit-void-${item.id}`}>
                      <Feather name="x-circle" size={14} color={colors.error} />
                      <Text style={{ color: colors.error, fontSize: 12, fontWeight: "600" }}>Batalkan</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: colors.muted, marginTop: 60 }}>Tidak ada data</Text>}
      />
      <ConfirmSheet
        visible={!!voidId}
        title="Batalkan transaksi?"
        message="Transaksi tidak dihapus, tetapi ditandai dibatalkan dan tidak dihitung di laporan. Stok dikembalikan."
        confirmLabel="Batalkan"
        askReason
        onCancel={() => setVoidId(null)}
        onConfirm={doVoid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  back: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20 },
  chipsRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, height: 36, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.onBrand },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  badge: { width: 36, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  cTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 13 },
  cSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  amt: { color: colors.onSurface, fontWeight: "700", fontSize: 14 },
  voidTag: { color: colors.error, fontSize: 9, fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  detail: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  dLabel: { color: colors.onSurface, fontSize: 13 },
  dVal: { color: colors.onSurfaceTertiary, fontSize: 13 },
  delBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm, alignSelf: "flex-start", paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.error + "15" },
});
