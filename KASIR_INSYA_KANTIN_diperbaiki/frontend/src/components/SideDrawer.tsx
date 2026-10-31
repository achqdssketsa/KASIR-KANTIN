import React, { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { colors, spacing, radius } from "../theme";
import { useAuth } from "../auth";

type Item = { label: string; icon: string; route?: string; onPress?: () => void };

export function SideDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, user } = useAuth();

  useEffect(() => {}, [visible]);

  const items: Item[] = [
    { label: "Kasir", icon: "monitor", route: "/(tabs)" },
    { label: "Laporan Harian", icon: "calendar", route: "/laporan-harian" },
    { label: "Laporan Audit", icon: "clipboard", route: "/laporan-audit" },
    { label: "Produk", icon: "box", route: "/produk" },
    { label: "Modal", icon: "credit-card", route: "/modal" },
    { label: "Pengaturan Lainnya", icon: "sliders", route: "/pengaturan" },
  ];

  const go = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 50);
  };

  const doLogout = async () => {
    onClose();
    await logout();
    router.replace("/login");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="drawer-backdrop" />
      <View style={[styles.panel, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>KANTIN</Text>
            <View style={styles.brandRow}>
              <View style={styles.hr} />
              <Text style={styles.sub}>INSYA</Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} testID="drawer-close">
            <Feather name="x" size={20} color={colors.onSurface} />
          </Pressable>
        </View>

        <Text style={styles.menuLabel}>MENU</Text>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.lg }}>
          {items.map((it, idx) => {
            const isOwnerOnly = it.label !== "Kasir";
            if (isOwnerOnly && user?.role !== "owner") return null;
            return (
              <Pressable
                key={it.label}
                onPress={() => it.route && go(it.route)}
                style={({ pressed }) => [styles.item, idx === 0 && styles.itemActive, pressed && { opacity: 0.6 }]}
                testID={`drawer-item-${it.label.toLowerCase().replace(/ /g, "-")}`}
              >
                <View style={styles.iconBadge}>
                  <Feather name={it.icon as any} size={18} color={colors.onSurface} />
                </View>
                <Text style={styles.itemText}>{it.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable onPress={doLogout} style={styles.item} testID="drawer-logout">
          <View style={styles.iconBadge}>
            <Feather name="log-out" size={18} color={colors.onSurface} />
          </View>
          <Text style={styles.itemText}>Keluar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: "80%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl },
  brand: { fontSize: 22, letterSpacing: 4, color: colors.onSurface, fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }) },
  brandRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  hr: { width: 16, height: 1, backgroundColor: colors.borderStrong, marginRight: 8 },
  sub: { fontSize: 10, letterSpacing: 3, color: colors.muted },
  closeBtn: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  menuLabel: { fontSize: 11, letterSpacing: 2, color: colors.muted, marginBottom: spacing.sm },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.md, gap: spacing.md },
  itemActive: { backgroundColor: colors.brandTertiary },
  iconBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  itemText: { fontSize: 15, color: colors.onSurface },
});
