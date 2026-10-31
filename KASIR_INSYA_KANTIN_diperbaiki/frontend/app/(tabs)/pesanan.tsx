import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { useCart, type CartItem } from "@/src/cart";
import { colors, spacing, radius } from "@/src/theme";
import { formatRp, parseRp } from "@/src/format";
import { Display } from "@/src/components/ui";
import { ReceiptSheet, type ReceiptData } from "@/src/components/ReceiptSheet";
import { useAuth } from "@/src/auth";

type PM = "tunai" | "qris" | "transfer";

export default function Pesanan() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { items, add, dec, remove, subtotal, clear } = useCart();
  const [pm, setPm] = useState<PM>("tunai");
  const [paidStr, setPaidStr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const paid = pm === "tunai" ? parseRp(paidStr) : subtotal;
  const change = Math.max(0, paid - subtotal);
  const canPay = items.length > 0 && (pm !== "tunai" || paid >= subtotal);

  const pay = async () => {
    setErr(null); setBusy(true);
    try {
      const res = await api<any>("/sales", {
        method: "POST",
        body: JSON.stringify({
          items: items.map((it) => ({ product_id: it.product_id, name: it.name, price: it.price, cost: it.cost, qty: it.qty })),
          payment_method: pm,
          paid_amount: paid,
          note,
        }),
      });
      setReceipt({
        id: res.id,
        items: [...items],
        subtotal,
        payment_method: pm,
        paid_amount: paid,
        change_amount: change,
        created_at: res.created_at,
        cashier: user?.username || "kasir",
      });
      clear(); setPaidStr(""); setNote("");
    } catch (e: any) { setErr(e?.message || "Gagal memproses pembayaran"); }
    finally { setBusy(false); }
  };

  const onReceiptClose = () => {
    setReceipt(null);
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Display style={styles.title}>Pesanan saya</Display>
        <Text style={styles.subtitle}>Ambil di Kantin Pusat</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 220 }}>
        {items.length === 0 ? (
          <View style={styles.empty} testID="empty-cart">
            <Feather name="shopping-bag" size={36} color={colors.muted} />
            <Text style={styles.emptyText}>Belum ada pesanan</Text>
            <Pressable onPress={() => router.replace("/(tabs)")} style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>Pilih menu</Text>
            </Pressable>
          </View>
        ) : (
          items.map((it: CartItem) => (
            <View key={it.product_id} style={styles.item} testID={`cart-item-${it.product_id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.name}</Text>
                <Text style={styles.itemPrice}>{formatRp(it.price)} / porsi</Text>
              </View>
              <View style={styles.stepRow}>
                <Pressable onPress={() => dec(it.product_id)} style={styles.step} testID={`cart-dec-${it.product_id}`}>
                  <Feather name="minus" size={16} color={colors.onSurface} />
                </Pressable>
                <Text style={styles.qty}>{it.qty}</Text>
                <Pressable onPress={() => add({ product_id: it.product_id, name: it.name, price: it.price, cost: it.cost })} style={styles.step} testID={`cart-inc-${it.product_id}`}>
                  <Feather name="plus" size={16} color={colors.onSurface} />
                </Pressable>
                <Pressable onPress={() => remove(it.product_id)} style={[styles.step, { marginLeft: spacing.xs }]}>
                  <Feather name="trash-2" size={14} color={colors.error} />
                </Pressable>
              </View>
            </View>
          ))
        )}

        {items.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>METODE PEMBAYARAN</Text>
            <View style={styles.pmRow}>
              {(["tunai", "qris", "transfer"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setPm(m)}
                  style={[styles.pmCard, pm === m && styles.pmCardActive]}
                  testID={`pm-${m}`}
                >
                  <Feather name={m === "tunai" ? "dollar-sign" : m === "qris" ? "maximize" : "credit-card"} size={18} color={pm === m ? colors.onBrand : colors.onSurface} />
                  <Text style={[styles.pmText, pm === m && styles.pmTextActive]}>{m.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            {pm === "tunai" && (
              <>
                <Text style={styles.sectionLabel}>UANG DITERIMA</Text>
                <TextInput
                  value={paidStr}
                  onChangeText={(v) => setPaidStr(String(parseRp(v)))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  style={styles.cashInput}
                  testID="paid-amount-input"
                />
                <View style={styles.quickRow}>
                  {[20000, 50000, 100000].map((v) => (
                    <Pressable key={v} onPress={() => setPaidStr(String(v))} style={styles.quickBtn} testID={`quick-${v}`}>
                      <Text style={styles.quickText}>{formatRp(v)}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionLabel}>CATATAN</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="opsional"
              placeholderTextColor={colors.muted}
              style={styles.noteInput}
              testID="note-input"
            />
          </>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={[styles.footer, { paddingBottom: spacing.md }]}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Display style={styles.totalVal}>{formatRp(subtotal)}</Display>
          </View>
          {pm === "tunai" && paid > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>Kembalian</Text>
              <Text style={styles.changeVal}>{formatRp(change)}</Text>
            </View>
          )}
          {err && <Text style={styles.err}>{err}</Text>}
          <Pressable
            onPress={pay}
            disabled={!canPay || busy}
            style={({ pressed }) => [styles.payBtn, (!canPay || busy) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
            testID="pay-button"
          >
            <Text style={styles.payText}>{busy ? "Memproses..." : "Lanjut ke pembayaran"}</Text>
          </Pressable>
        </View>
      )}

      <ReceiptSheet visible={!!receipt} data={receipt} onClose={onReceiptClose} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 24 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  itemName: { fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  itemPrice: { fontSize: 12, color: colors.muted, marginTop: 2 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  step: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  qty: { minWidth: 20, textAlign: "center", color: colors.onSurface, fontWeight: "700" },
  sectionLabel: { fontSize: 11, letterSpacing: 2, color: colors.muted, marginTop: spacing.xl, marginBottom: spacing.sm },
  pmRow: { flexDirection: "row", gap: spacing.sm },
  pmCard: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: 4 },
  pmCardActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  pmText: { color: colors.onSurface, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  pmTextActive: { color: colors.onBrand },
  cashInput: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: 18, color: colors.onSurface },
  quickRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  quickBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.brandTertiary, alignItems: "center" },
  quickText: { color: colors.onSurface, fontSize: 12, fontWeight: "600" },
  noteInput: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: 14, color: colors.onSurface },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  totalLabel: { color: colors.muted, fontSize: 13 },
  totalVal: { fontSize: 22 },
  changeVal: { color: colors.success, fontSize: 15, fontWeight: "700" },
  payBtn: { marginTop: spacing.sm, backgroundColor: colors.brandPrimary, borderRadius: radius.pill, paddingVertical: spacing.lg, alignItems: "center" },
  payText: { color: colors.onBrand, fontWeight: "700", fontSize: 15 },
  err: { color: colors.error, fontSize: 13, marginTop: spacing.sm, textAlign: "center" },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: 80 },
  emptyText: { color: colors.muted, fontSize: 14 },
  ghostBtn: { marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  ghostBtnText: { color: colors.onSurface, fontWeight: "600" },
});
