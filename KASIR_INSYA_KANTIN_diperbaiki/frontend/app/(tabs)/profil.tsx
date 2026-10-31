import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";
import { useAuth } from "@/src/auth";
import { useCart } from "@/src/cart";
import { colors, spacing, radius } from "@/src/theme";
import { Brand, Display } from "@/src/components/ui";

export default function Profil() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { clear } = useCart();

  const doLogout = async () => {
    await logout(); clear(); router.replace("/login");
  };

  const items = [
    { label: "Laporan Harian", icon: "calendar", route: "/laporan-harian", role: "owner" },
    { label: "Laporan Audit", icon: "clipboard", route: "/laporan-audit", role: "owner" },
    { label: "Kelola Produk", icon: "box", route: "/produk", role: "owner" },
    { label: "Modal & Pengeluaran", icon: "credit-card", route: "/modal", role: "owner" },
    { label: "Pengaturan Lainnya", icon: "sliders", route: "/pengaturan", role: "owner" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 100 }}>
      <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
        <Brand />
      </View>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Feather name="user" size={28} color={colors.onBrand} />
        </View>
        <Display style={styles.name}>{user?.username}</Display>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{user?.role === "owner" ? "Pemilik" : "Kasir"}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {items.map((it) => {
          if (it.role === "owner" && user?.role !== "owner") return null;
          return (
            <Pressable key={it.label} onPress={() => router.push(it.route as any)} style={styles.item} testID={`profile-${it.label.toLowerCase().replace(/ /g, "-")}`}>
              <View style={styles.itemIcon}>
                <Feather name={it.icon as any} size={18} color={colors.onSurface} />
              </View>
              <Text style={styles.itemText}>{it.label}</Text>
              <Feather name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          );
        })}

        <Pressable onPress={doLogout} style={[styles.item, { marginTop: spacing.lg }]} testID="profile-logout">
          <View style={[styles.itemIcon, { backgroundColor: colors.error + "22" }]}>
            <Feather name="log-out" size={18} color={colors.error} />
          </View>
          <Text style={[styles.itemText, { color: colors.error }]}>Keluar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm },
  avatar: { width: 72, height: 72, borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 22 },
  rolePill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.brandTertiary },
  roleText: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "600" },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2 },
  itemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1, color: colors.onSurface, fontWeight: "600" },
});
