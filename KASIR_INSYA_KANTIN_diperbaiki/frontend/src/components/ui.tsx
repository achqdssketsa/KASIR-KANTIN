import React from "react";
import { Platform, StyleSheet, Text, TextProps, View, ViewProps } from "react-native";
import { colors, spacing, radius } from "../theme";

const displayFont = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

export function Display({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[{ fontFamily: displayFont, color: colors.onSurface }, style]} />;
}

export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[cardStyles.card, style]} />;
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export function Brand({ small, light }: { small?: boolean; light?: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontFamily: displayFont, fontSize: small ? 18 : 22, letterSpacing: 4, color: light ? colors.onBrand : colors.onSurface }}>KANTIN</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
        <View style={{ width: 14, height: 1, backgroundColor: colors.borderStrong, marginRight: 6 }} />
        <Text style={{ fontSize: small ? 9 : 10, letterSpacing: 3, color: light ? colors.onBrand : colors.muted }}>INSYA</Text>
        <View style={{ width: 14, height: 1, backgroundColor: colors.borderStrong, marginLeft: 6 }} />
      </View>
    </View>
  );
}
