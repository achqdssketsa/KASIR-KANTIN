import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";
import { formatRp, parseRp } from "@/src/format";
import { Display } from "@/src/components/ui";

type Kind = "modal_in" | "expense";

export default function Modal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("modal_in");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null); setMsg(null);
    const amt = parseRp(amount);
    if (amt <= 0) { setErr("Jumlah harus > 0"); return; }
    setBusy(true);
    try {
      await api("/modal", { method: "POST", body: JSON.stringify({ kind, amount: amt, note }) });
      setMsg(kind === "modal_in" ? "Modal masuk tercatat" : "Pengeluaran tercatat");
      setAmount(""); setNote("");
    } catch (e: any) { setErr(e?.message || "Gagal menyimpan"); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back}><Feather name="chevron-left" size={22} color={colors.onSurface} /></Pressable>
        <Display style={styles.title}>Modal & Pengeluaran</Display>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 60, gap: spacing.sm }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: spacing.sm }}>
          Catat setiap uang yang masuk sebagai modal maupun yang keluar untuk pengeluaran operasional agar laba bersih akurat.
        </Text>

        <View style={styles.row}>
          {(["modal_in", "expense"] as const).map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[styles.pill, kind === k && styles.pillActive]} testID={`kind-${k}`}>
              <Feather name={k === "modal_in" ? "arrow-down-circle" : "arrow-up-circle"} size={16} color={kind === k ? colors.onBrand : colors.onSurface} />
              <Text style={[styles.pillText, kind === k && styles.pillTextActive]}>{k === "modal_in" ? "Modal Masuk" : "Pengeluaran"}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.lbl}>JUMLAH</Text>
        <TextInput
          value={amount}
          onChangeText={(v) => setAmount(String(parseRp(v)))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.muted}
          style={styles.in}
          testID="modal-amount"
        />
        <Text style={styles.lbl}>KETERANGAN</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={kind === "modal_in" ? "Mis. tambah modal pribadi" : "Mis. beli bahan baku di pasar"}
          placeholderTextColor={colors.muted}
          style={styles.in}
          testID="modal-note"
        />

        {err && <Text style={{ color: colors.error, marginTop: spacing.sm }}>{err}</Text>}
        {msg && <Text style={{ color: colors.success, marginTop: spacing.sm }}>{msg}</Text>}

        <Pressable onPress={submit} disabled={busy} style={[styles.cta, busy && { opacity: 0.6 }]} testID="modal-submit">
          <Text style={styles.ctaText}>{busy ? "Menyimpan..." : "Simpan catatan"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  back: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20 },
  row: { flexDirection: "row", gap: spacing.sm },
  pill: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  pillText: { color: colors.onSurface, fontWeight: "600", fontSize: 13 },
  pillTextActive: { color: colors.onBrand },
  lbl: { fontSize: 11, letterSpacing: 2, color: colors.muted, marginTop: spacing.lg, marginBottom: 4 },
  in: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.onSurface, fontSize: 16 },
  cta: { marginTop: spacing.xl, backgroundColor: colors.brandPrimary, borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: "center" },
  ctaText: { color: colors.onBrand, fontWeight: "700", fontSize: 15 },
});
