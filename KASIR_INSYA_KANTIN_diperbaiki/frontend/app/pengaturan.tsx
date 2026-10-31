import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";
import { colors, spacing, radius } from "@/src/theme";
import { Display } from "@/src/components/ui";

export default function Pengaturan() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const items = [
    { icon: "printer", title: "Pencetak Struk", sub: "Pilihan cetak muncul setelah setiap pembayaran (tidak otomatis)" },
    { icon: "download", title: "Ekspor Laporan", sub: "Dari halaman Laporan Harian, tap ikon share untuk mengekspor" },
    { icon: "info", title: "Tentang", sub: "Kantin Insya · versi 1.0.0" },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Feather name="chevron-left" size={22} color={colors.onSurface} /></Pressable>
        <Display style={styles.title}>Pengaturan</Display>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 60, gap: spacing.sm }}>
        {items.map((it) => (
          <View key={it.title} style={styles.card}>
            <View style={styles.icon}><Feather name={it.icon as any} size={18} color={colors.onSurface} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title2}>{it.title}</Text>
              <Text style={styles.sub}>{it.sub}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  back: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20 },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  icon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  title2: { fontSize: 14, color: colors.onSurface, fontWeight: "700" },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
