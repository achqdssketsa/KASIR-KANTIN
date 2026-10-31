import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, Text } from "react-native";
import Feather from "@react-native-vector-icons/feather";
import { colors, spacing } from "@/src/theme";
import { useCart } from "@/src/cart";

function TabIcon({ name, color }: { name: string; color: string }) {
  return <Feather name={name as any} size={22} color={color} />;
}

function PesananTabIcon({ color }: { color: string }) {
  const { count } = useCart();
  return (
    <View style={{ width: 36, alignItems: "center" }}>
      <Feather name="shopping-bag" size={22} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Menu", tabBarIcon: ({ color }) => <TabIcon name="grid" color={color} /> }} />
      <Tabs.Screen name="pesanan" options={{ title: "Pesanan", tabBarIcon: ({ color }) => <PesananTabIcon color={color} /> }} />
      <Tabs.Screen name="riwayat" options={{ title: "Riwayat", tabBarIcon: ({ color }) => <TabIcon name="clock" color={color} /> }} />
      <Tabs.Screen name="profil" options={{ title: "Profil", tabBarIcon: ({ color }) => <TabIcon name="user" color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute", top: -4, right: 2,
    backgroundColor: colors.brandPrimary, borderRadius: 999,
    minWidth: 16, height: 16, paddingHorizontal: 4,
    alignItems: "center", justifyContent: "center",
  },
  badgeText: { color: colors.onBrand, fontSize: 10, fontWeight: "700" },
});
