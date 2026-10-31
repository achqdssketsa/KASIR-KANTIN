// Kantin Insya design tokens. Light theme only.
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F6F0E4",
  onSurface: "#2D2A26",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#2D2A26",
  surfaceTertiary: "#EDE4D3",
  onSurfaceTertiary: "#4A4641",
  surfaceInverse: "#1F3A2E",
  onSurfaceInverse: "#FFFFFF",
  muted: "#757068",

  brand: "#1F3A2E",
  onBrand: "#FFFFFF",
  brandPrimary: "#1F3A2E",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#355E45",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E5E0D5",
  onBrandTertiary: "#1F3A2E",

  success: "#2D5A3C",
  onSuccess: "#FFFFFF",
  warning: "#B87F25",
  onWarning: "#FFFFFF",
  error: "#9E3830",
  onError: "#FFFFFF",
  info: "#4A5B69",
  onInfo: "#FFFFFF",

  border: "#E5E0D5",
  borderStrong: "#C2BDB1",
  divider: "#E8E2D6",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };
export const fonts = { display: "Fraunces_600SemiBold", displayRegular: "Fraunces_500Medium", body: "PlusJakartaSans_400Regular", bodyMedium: "PlusJakartaSans_500Medium", bodyBold: "PlusJakartaSans_700Bold" };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = (system === "light" || system === "dark") && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export const colors = light;

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
