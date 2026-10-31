import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useCart } from "@/src/cart";
import { colors, spacing, radius } from "@/src/theme";
import { formatRp, todayISO } from "@/src/format";
import { Brand, Display } from "@/src/components/ui";
import { SideDrawer } from "@/src/components/SideDrawer";

type Product = { id: string; name: string; category: string; price: number; cost: number; description: string; stock: number; icon: string };
type Category = { id: string; name: string };

export default function Kasir() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { add, count, subtotal } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [cat, setCat] = useState<string>("Semua");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [today, setToday] = useState<{ total_sales: number; sale_count: number } | null>(null);

  const load = async () => {
    try {
      const [ps, cs, rp] = await Promise.all([
        api<Product[]>("/products"),
        api<Category[]>("/categories"),
        api<{ total_sales: number; sale_count: number }>(`/reports/daily?date=${todayISO()}`),
      ]);
      setProducts(ps);
      setCats(cs);
      setToday(rp);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = useMemo(() => {
    return products.filter((p) =>
      (cat === "Semua" || p.category === cat) &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase()))
    );
  }, [products, cat, q]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  }, []);

  const addToCart = (p: Product) => {
    add({ product_id: p.id, name: p.name, price: p.price, cost: p.cost });
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.row} testID={`product-row-${item.id}`}>
      <View style={styles.rowIcon}>
        <Feather name={(item.icon || "coffee") as any} size={22} color={colors.onSurface} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowPrice}>{formatRp(item.price)}  ·  <Text style={{ color: item.stock <= 0 ? colors.error : item.stock <= 5 ? colors.warning : colors.muted }}>stok {item.stock}</Text></Text>
      </View>
      <Pressable onPress={() => addToCart(item)} style={styles.plus} testID={`product-add-${item.id}`}>
        <Feather name="plus" size={18} color={colors.onSurface} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => setDrawer(true)} style={styles.circleBtn} testID="open-drawer">
          <Feather name="menu" size={20} color={colors.onSurface} />
        </Pressable>
        <Brand small />
        <Pressable onPress={() => router.push("/(tabs)/riwayat")} style={styles.circleBtn} testID="header-history">
          <Feather name="clock" size={20} color={colors.onSurface} />
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: count > 0 ? 100 : spacing.xl, paddingTop: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.greet}>{greeting}, {user?.username}</Text>
            <Display style={styles.hero}>Mau makan apa hari ini?</Display>

            <View style={styles.search}>
              <Feather name="search" size={18} color={colors.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Cari makanan atau minuman"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                testID="search-input"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {["Semua", ...cats.map((c) => c.name)].map((name) => {
                const active = cat === name;
                return (
                  <Pressable
                    key={name}
                    onPress={() => setCat(name)}
                    style={[styles.chip, active && styles.chipActive]}
                    testID={`chip-${name}`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.promo} testID="today-summary">
              <View style={{ flex: 1 }}>
                <Text style={styles.promoLabel}>PENJUALAN HARI INI</Text>
                <Display style={styles.promoTitle} testID="today-total">{formatRp(today?.total_sales ?? 0)}</Display>
                <Text style={styles.promoPrice}>{today?.sale_count ?? 0} transaksi tercatat</Text>
              </View>
              {user?.role === "owner" && (
                <Pressable onPress={() => router.push("/laporan-harian")} style={styles.promoBtn} testID="today-report-btn">
                  <Text style={styles.promoBtnText}>Laporan</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.sectionRow}>
              <Display style={styles.sectionTitle}>{cat === "Semua" ? "Semua menu" : cat}</Display>
              <Text style={styles.linkText}>{filtered.length} item</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty} testID="empty-products">
              <Feather name="coffee" size={32} color={colors.muted} />
              <Text style={styles.emptyText}>Belum ada menu di kategori ini</Text>
            </View>
          )
        }
      />

      {count > 0 && (
        <Pressable
          onPress={() => router.push("/(tabs)/pesanan")}
          style={[styles.cartBar, { bottom: spacing.lg }]}
          testID="cart-bar"
        >
          <Text style={styles.cartBarLeft}>{count} item · {formatRp(subtotal)}</Text>
          <Text style={styles.cartBarRight}>Lihat pesanan</Text>
        </Pressable>
      )}

      <SideDrawer visible={drawer} onClose={() => setDrawer(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  circleBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  greet: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },
  hero: { fontSize: 26, lineHeight: 32, marginTop: 2, marginBottom: spacing.md },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface, paddingVertical: 0 },
  chipsRow: { gap: spacing.sm, paddingVertical: spacing.md, paddingRight: spacing.lg },
  chip: { paddingHorizontal: spacing.lg, height: 36, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.onBrand },
  promo: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.sm, flexDirection: "row", alignItems: "center" },
  promoLabel: { fontSize: 10, letterSpacing: 2, color: colors.muted },
  promoTitle: { fontSize: 20, marginTop: 2 },
  promoPrice: { color: colors.onSurface, marginTop: 4, fontSize: 13 },
  promoBtn: { backgroundColor: colors.brandPrimary, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  promoBtnText: { color: colors.onBrand, fontWeight: "700", fontSize: 13 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 18 },
  linkText: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowIcon: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  rowPrice: { fontSize: 13, color: colors.muted, marginTop: 2 },
  plus: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  cartBar: { position: "absolute", left: spacing.lg, right: spacing.lg, backgroundColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cartBarLeft: { color: colors.onBrand, fontSize: 14, fontWeight: "600" },
  cartBarRight: { color: colors.onBrand, fontSize: 14, fontWeight: "700" },
  empty: { paddingTop: 60, alignItems: "center", gap: spacing.sm },
  emptyText: { color: colors.muted, fontSize: 13 },
});
