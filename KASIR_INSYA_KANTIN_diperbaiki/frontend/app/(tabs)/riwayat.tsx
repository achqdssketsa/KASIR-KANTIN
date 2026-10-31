import { useState, useCallback } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";
import { useFocusEffect } from "expo-router";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";
import { formatRp, formatDate } from "@/src/format";
import { Display } from "@/src/components/ui";

type Txn = {
  id: string; kind: string; created_at: string; cashier: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number; payment_method?: string; amount: number; note: string; voided?: boolean;
};

export default function Riwayat() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { const d = await api<Txn[]>("/transactions?limit=100"); setData(d); }
    catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const renderTxn = ({ item }: { item: Txn }) => {
    const isSale = item.kind === "sale";
    const total = isSale ? item.subtotal : item.amount;
    const title = isSale
      ? (item.items[0]?.name || "Penjualan") + (item.items.length > 1 ? ` +${item.items.length - 1}` : "")
      : item.kind === "modal_in" ? "Modal masuk" : "Pengeluaran";
    const kindColor = item.kind === "expense" ? colors.error : item.kind === "modal_in" ? colors.info : colors.success;
    return (
      <View style={styles.card} testID={`txn-${item.id}`}>
        <View style={[styles.badge, { backgroundColor: kindColor + "22" }]}>
          <Feather name={isSale ? "shopping-bag" : item.kind === "modal_in" ? "arrow-down-circle" : "arrow-up-circle"} size={18} color={kindColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{formatDate(item.created_at)} · {item.cashier}{isSale && item.payment_method ? ` · ${item.payment_method.toUpperCase()}` : ""}</Text>
          {!!item.note && <Text style={styles.cardNote}>{item.note}</Text>}
        </View>
        <Text style={[styles.amt, { color: item.kind === "expense" ? colors.error : colors.onSurface }, item.voided && { textDecorationLine: "line-through", color: colors.muted }]}>
          {item.kind === "expense" ? "-" : "+"}{formatRp(total)}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Display style={styles.title}>Riwayat</Display>
        <Text style={styles.subtitle}>Semua transaksi terbaru</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(x) => x.id}
        renderItem={renderTxn}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}><Feather name="clock" size={32} color={colors.muted} /><Text style={styles.emptyText}>Belum ada transaksi</Text></View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 24 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  badge: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, color: colors.onSurface, fontWeight: "700" },
  cardSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  cardNote: { fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 4 },
  amt: { fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: 60 },
  emptyText: { color: colors.muted },
});
