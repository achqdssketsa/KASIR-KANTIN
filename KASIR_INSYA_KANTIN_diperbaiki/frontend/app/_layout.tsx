import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { LogBox, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { AuthProvider, useAuth } from "@/src/auth";
import { CartProvider } from "@/src/cart";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);

const OWNER_ROUTES = ["produk", "laporan-harian", "laporan-audit", "modal", "pengaturan"];

function RouteGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const first = segments[0] as string | undefined;
    const isPublic = !first || first === "login";
    if (!user && !isPublic) router.replace("/login");
    else if (user && user.role !== "owner" && first && OWNER_ROUTES.includes(first)) router.replace("/(tabs)");
  }, [user, loading, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <KeyboardProvider>
              <AuthProvider>
                <CartProvider>
                  <StatusBar style="dark" />
                  <RouteGuard />
                  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="produk" options={{ presentation: "card" }} />
                    <Stack.Screen name="laporan-harian" />
                    <Stack.Screen name="laporan-audit" />
                    <Stack.Screen name="modal" />
                    <Stack.Screen name="pengaturan" />
                  </Stack>
                </CartProvider>
              </AuthProvider>
            </KeyboardProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
});
