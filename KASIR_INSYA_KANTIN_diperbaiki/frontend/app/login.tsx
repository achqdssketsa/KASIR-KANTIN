import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useAuth } from "@/src/auth";
import { colors, spacing, radius } from "@/src/theme";
import { Brand, Display } from "@/src/components/ui";

const HERO = "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<"owner" | "cashier">("owner");
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("owner123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onRoleChange = (r: "owner" | "cashier") => {
    setRole(r);
    if (r === "owner") { setUsername("owner"); setPassword("owner123"); }
    else { setUsername("kasir"); setPassword("kasir123"); }
    setErr(null);
  };

  const submit = async () => {
    setErr(null); setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e?.message || "Gagal masuk");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill as any} contentFit="cover" />
          <View style={styles.scrim} />
          <View style={[styles.heroInner, { paddingTop: insets.top + spacing.lg }]}>
            <Brand light />
          </View>
        </View>

        <View style={styles.body}>
          <Display style={styles.title}>Selamat datang kembali</Display>
          <Text style={styles.subtitle}>Masuk untuk mulai mencatat setiap transaksi hari ini.</Text>

          <View style={styles.roleRow}>
            {(["owner", "cashier"] as const).map((r) => (
              <Pressable
                key={r}
                onPress={() => onRoleChange(r)}
                style={[styles.rolePill, role === r && styles.rolePillActive]}
                testID={`login-role-${r}`}
              >
                <Text style={[styles.rolePillText, role === r && styles.rolePillTextActive]}>
                  {r === "owner" ? "Pemilik" : "Kasir"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            style={styles.input}
            placeholder="username"
            placeholderTextColor={colors.muted}
            testID="login-username-input"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholder="password"
            placeholderTextColor={colors.muted}
            testID="login-password-input"
          />

          {err ? <Text style={styles.err} testID="login-error">{err}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={loading}
            style={({ pressed }) => [styles.cta, (pressed || loading) && { opacity: 0.8 }]}
            testID="login-submit"
          >
            <Text style={styles.ctaText}>{loading ? "Memproses..." : "Masuk"}</Text>
            {!loading && <Feather name="arrow-right" size={18} color={colors.onBrand} />}
          </Pressable>

          <Text style={styles.hint}>
            Default: pemilik <Text style={styles.bold}>owner / owner123</Text>  ·  kasir <Text style={styles.bold}>kasir / kasir123</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 220, position: "relative", backgroundColor: colors.surfaceTertiary },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(31,58,46,0.55)" },
  heroInner: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingBottom: spacing.lg },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.sm },
  title: { fontSize: 28, marginTop: spacing.md },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: spacing.lg },
  roleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  rolePill: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  rolePillActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  rolePillText: { color: colors.onSurface, fontWeight: "600", fontSize: 14 },
  rolePillTextActive: { color: colors.onBrand },
  label: { fontSize: 12, color: colors.muted, letterSpacing: 1, marginTop: spacing.md, marginBottom: 4 },
  input: { borderBottomWidth: 1, borderBottomColor: colors.borderStrong, paddingVertical: spacing.md, color: colors.onSurface, fontSize: 16 },
  err: { color: colors.error, fontSize: 13, marginTop: spacing.md },
  cta: { marginTop: spacing.xl, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radius.pill },
  ctaText: { color: colors.onBrand, fontSize: 16, fontWeight: "600" },
  hint: { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: spacing.lg },
  bold: { fontWeight: "700", color: colors.onSurface },
});
