import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Feather from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "../theme";
import { formatRp, formatDate } from "../format";
import type { CartItem } from "../cart";

export type ReceiptData = {
  id: string;
  items: CartItem[];
  subtotal: number;
  payment_method: "tunai" | "qris" | "transfer";
  paid_amount: number;
  change_amount: number;
  created_at: string;
  cashier: string;
};

const buildHtml = (d: ReceiptData) => `
<!doctype html><html><head><meta charset="utf-8"/><style>
body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#2D2A26;padding:16px;max-width:360px;margin:0 auto}
h1{font-size:18px;letter-spacing:3px;text-align:center;margin:0}
.sub{text-align:center;color:#757068;font-size:11px;letter-spacing:2px}
.hr{border-top:1px dashed #C2BDB1;margin:10px 0}
.row{display:flex;justify-content:space-between;font-size:12px;margin:3px 0}
.total{font-weight:700;font-size:14px}
.muted{color:#757068}
</style></head><body>
<h1>KANTIN INSYA</h1>
<div class="sub">— STRUK PEMBELIAN —</div>
<div class="hr"></div>
<div class="row muted"><span>${formatDate(d.created_at)}</span><span>#${d.id.slice(0,8)}</span></div>
<div class="row muted"><span>Kasir: ${d.cashier}</span><span>${d.payment_method.toUpperCase()}</span></div>
<div class="hr"></div>
${d.items.map(it => `
<div class="row"><span>${it.name}</span><span>${formatRp(it.price*it.qty)}</span></div>
<div class="row muted"><span>  ${it.qty} x ${formatRp(it.price)}</span><span></span></div>
`).join("")}
<div class="hr"></div>
<div class="row total"><span>Total</span><span>${formatRp(d.subtotal)}</span></div>
${d.payment_method === "tunai" ? `
<div class="row"><span>Bayar</span><span>${formatRp(d.paid_amount)}</span></div>
<div class="row"><span>Kembalian</span><span>${formatRp(d.change_amount)}</span></div>
` : ""}
<div class="hr"></div>
<p style="text-align:center;font-size:11px;color:#757068">Terima kasih! Semoga sehat selalu.</p>
</body></html>`;

export function ReceiptSheet({ visible, data, onClose }: { visible: boolean; data: ReceiptData | null; onClose: () => void }) {
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (visible) setStatus(null); }, [visible]);
  if (!data) return null;

  const print = async () => {
    try { await Print.printAsync({ html: buildHtml(data) }); setStatus({ ok: true, text: "Struk dikirim ke pencetak" }); }
    catch { setStatus({ ok: false, text: "Gagal mencetak, cek koneksi printer" }); }
  };
  const share = async () => {
    try {
      if (Platform.OS === "web" || !(await Sharing.isAvailableAsync())) {
        setStatus({ ok: false, text: "Bagikan hanya tersedia di HP. Gunakan Cetak Struk." });
        return;
      }
      const { uri } = await Print.printToFileAsync({ html: buildHtml(data) });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
    } catch { setStatus({ ok: false, text: "Gagal membagikan struk" }); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="receipt-backdrop" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.successBadge}>
          <Feather name="check" size={28} color={colors.onBrand} />
        </View>
        <Text style={styles.title}>Pembayaran Berhasil!</Text>
        <Text style={styles.sub}>Total {formatRp(data.subtotal)} · {data.payment_method.toUpperCase()}</Text>
        {data.payment_method === "tunai" && (
          <View style={styles.changeBox}>
            <Text style={styles.changeLabel}>Kembalian</Text>
            <Text style={styles.changeVal}>{formatRp(data.change_amount)}</Text>
          </View>
        )}
        <Text style={styles.q}>Cetak struk sekarang?</Text>
        <View style={styles.btnRow}>
          <Pressable onPress={print} style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]} testID="receipt-print">
            <Feather name="printer" size={18} color={colors.onBrand} />
            <Text style={styles.btnPrimaryText}>Cetak Struk</Text>
          </Pressable>
          <Pressable onPress={share} style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.85 }]} testID="receipt-share">
            <Feather name="share-2" size={18} color={colors.onSurface} />
            <Text style={styles.btnSecondaryText}>Bagikan</Text>
          </Pressable>
        </View>
        {status && <Text style={[styles.status, { color: status.ok ? colors.success : colors.error }]} testID="receipt-status">{status.text}</Text>}
        <Pressable onPress={onClose} style={styles.skipBtn} testID="receipt-skip">
          <Text style={styles.skipText}>{status?.ok ? "Selesai" : "Lewati"}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  handle: { width: 44, height: 4, borderRadius: 999, backgroundColor: colors.borderStrong, marginBottom: spacing.lg },
  successBadge: { width: 64, height: 64, borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  title: { fontSize: 22, color: colors.onSurface, fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }) },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  changeBox: { marginTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  changeLabel: { fontSize: 12, color: colors.muted, letterSpacing: 1 },
  changeVal: { fontSize: 22, color: colors.onSurface, fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }), marginTop: 2 },
  q: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: spacing.xl, marginBottom: spacing.md },
  btnRow: { flexDirection: "row", gap: spacing.sm, width: "100%" },
  btnPrimary: { flex: 1, backgroundColor: colors.brandPrimary, flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "center", paddingVertical: spacing.md + 2, borderRadius: radius.md },
  btnPrimaryText: { color: colors.onBrand, fontWeight: "600", fontSize: 14 },
  btnSecondary: { flex: 1, backgroundColor: colors.surfaceSecondary, flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "center", paddingVertical: spacing.md + 2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  btnSecondaryText: { color: colors.onSurface, fontWeight: "600", fontSize: 14 },
  skipBtn: { marginTop: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  status: { marginTop: spacing.md, fontSize: 13, textAlign: "center" },
  skipText: { color: colors.muted, fontSize: 14, textDecorationLine: "underline" },
});
