import { useEffect, useState, useCallback } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";
import { formatRp, parseRp } from "@/src/format";
import { Display } from "@/src/components/ui";
import { ConfirmSheet } from "@/src/components/ConfirmSheet";

type Product = { id: string; name: string; category: string; price: number; cost: number; description: string; stock: number; icon: string };
type Category = { id: string; name: string };

export default function Produk() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [modal, setModal] = useState<Product | "new" | null>(null);

  const load = async () => {
    try {
      const [ps, cs] = await Promise.all([api<Product[]>("/products"), api<Category[]>("/categories")]);
      setProducts(ps); setCats(cs);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const [delTarget, setDelTarget] = useState<Product | null>(null);
  const doDelete = async () => {
    if (!delTarget) return;
    await api(`/products/${delTarget.id}`, { method: "DELETE" });
    setDelTarget(null); load();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="produk-back"><Feather name="chevron-left" size={22} color={colors.onSurface} /></Pressable>
        <Display style={styles.title}>Kelola Produk</Display>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100, gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={styles.row} testID={`produk-row-${item.id}`}>
            <View style={styles.icon}><Feather name={(item.icon || "coffee") as any} size={20} color={colors.onSurface} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.category} · {formatRp(item.price)} · stok {item.stock}</Text>
            </View>
            <Pressable onPress={() => setModal(item)} style={styles.editBtn} testID={`produk-edit-${item.id}`}><Feather name="edit-2" size={16} color={colors.onSurface} /></Pressable>
            <Pressable onPress={() => setDelTarget(item)} style={styles.delBtn} testID={`produk-del-${item.id}`}><Feather name="trash-2" size={16} color={colors.error} /></Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: colors.muted, marginTop: 60 }}>Belum ada produk</Text>}
      />

      <Pressable onPress={() => setModal("new")} style={[styles.fab, { bottom: insets.bottom + 24 }]} testID="produk-add">
        <Feather name="plus" size={22} color={colors.onBrand} />
      </Pressable>

      <ProductEditor
        visible={!!modal}
        initial={modal === "new" ? null : (modal as Product)}
        cats={cats}
        onClose={() => setModal(null)}
        onSaved={() => { setModal(null); load(); }}
      />
      <ConfirmSheet
        visible={!!delTarget}
        title="Hapus produk?"
        message={`"${delTarget?.name ?? ""}" tidak akan tampil lagi di kasir. Riwayat penjualannya tetap tersimpan.`}
        confirmLabel="Hapus"
        onCancel={() => setDelTarget(null)}
        onConfirm={doDelete}
      />
    </View>
  );
}

function ProductEditor({ visible, initial, cats, onClose, onSaved }: { visible: boolean; initial: Product | null; cats: Category[]; onClose: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name || "");
    setCat(initial?.category || cats[0]?.name || "");
    setPrice(initial?.price ? String(initial.price) : "");
    setCost(initial?.cost ? String(initial.cost) : "");
    setStock(initial?.stock !== undefined ? String(initial.stock) : "0");
    setDesc(initial?.description || "");
    setErr(null);
  }, [visible, initial, cats]);

  const save = async () => {
    setErr(null);
    if (!name.trim() || !cat || !price) { setErr("Nama, kategori, harga wajib diisi"); return; }
    setBusy(true);
    try {
      const body = { name: name.trim(), category: cat, price: parseRp(price), cost: parseRp(cost || "0"), stock: parseInt(stock || "0", 10) || 0, description: desc, icon: "coffee" };
      if (initial) await api(`/products/${initial.id}`, { method: "PUT", body: JSON.stringify(body) });
      else await api(`/products`, { method: "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { setErr(e?.message || "Gagal menyimpan"); } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View style={styles.handle} />
          <Display style={{ fontSize: 20, marginBottom: spacing.md }}>{initial ? "Edit Produk" : "Tambah Produk"}</Display>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.lbl}>Nama</Text>
            <TextInput value={name} onChangeText={setName} style={styles.in} testID="prod-name" />
            <Text style={styles.lbl}>Kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              {cats.map((c) => (
                <Pressable key={c.id} onPress={() => setCat(c.name)} style={[styles.chip, cat === c.name && styles.chipActive]}>
                  <Text style={[styles.chipText, cat === c.name && styles.chipTextActive]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.lbl}>Harga Jual (Rp)</Text>
            <TextInput value={price} onChangeText={(v) => setPrice(String(parseRp(v)))} keyboardType="number-pad" style={styles.in} testID="prod-price" />
            <Text style={styles.lbl}>HPP / Modal per item (Rp)</Text>
            <TextInput value={cost} onChangeText={(v) => setCost(String(parseRp(v)))} keyboardType="number-pad" style={styles.in} testID="prod-cost" />
            <Text style={styles.lbl}>Stok</Text>
            <TextInput value={stock} onChangeText={(v) => setStock(v.replace(/\D/g, ""))} keyboardType="number-pad" style={styles.in} testID="prod-stock" />
            <Text style={styles.lbl}>Deskripsi</Text>
            <TextInput value={desc} onChangeText={setDesc} style={styles.in} />
            {err && <Text style={{ color: colors.error, marginTop: spacing.sm }}>{err}</Text>}
            <Pressable onPress={save} disabled={busy} style={[styles.save, busy && { opacity: 0.6 }]} testID="prod-save">
              <Text style={{ color: colors.onBrand, fontWeight: "700" }}>{busy ? "Menyimpan..." : "Simpan"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  back: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  name: { color: colors.onSurface, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  editBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  delBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.error + "15", alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md, maxHeight: "90%" },
  handle: { alignSelf: "center", width: 44, height: 4, borderRadius: 999, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  lbl: { fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: spacing.md, marginBottom: 4 },
  in: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.onSurface, fontSize: 14 },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: colors.onBrand },
  save: { marginTop: spacing.lg, backgroundColor: colors.brandPrimary, borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: "center" },
});
