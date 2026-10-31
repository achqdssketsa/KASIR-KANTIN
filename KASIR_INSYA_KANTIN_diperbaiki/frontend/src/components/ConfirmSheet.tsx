import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius } from "../theme";
import { Display } from "./ui";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  askReason?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
};

export function ConfirmSheet({ visible, title, message, confirmLabel, askReason, onCancel, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (visible) { setReason(""); setErr(null); } }, [visible]);

  const confirm = async () => {
    if (askReason && reason.trim().length < 3) { setErr("Tulis alasan minimal 3 huruf"); return; }
    setBusy(true);
    try { await onConfirm(reason.trim()); } catch (e: any) { setErr(e?.message || "Gagal"); } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]} testID="confirm-sheet">
          <View style={styles.handle} />
          <Display style={styles.title}>{title}</Display>
          <Text style={styles.msg}>{message}</Text>
          {askReason && (
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Alasan (wajib, tercatat di audit)"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="confirm-reason-input"
            />
          )}
          {err && <Text style={styles.err} testID="confirm-error">{err}</Text>}
          <View style={styles.row}>
            <Pressable onPress={onCancel} style={styles.cancel} testID="confirm-cancel">
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
            <Pressable onPress={confirm} disabled={busy} style={[styles.ok, busy && { opacity: 0.6 }]} testID="confirm-ok">
              <Text style={styles.okText}>{busy ? "Memproses..." : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  handle: { alignSelf: "center", width: 44, height: 4, borderRadius: 999, backgroundColor: colors.borderStrong, marginBottom: spacing.lg },
  title: { fontSize: 20 },
  msg: { color: colors.muted, fontSize: 14, marginTop: spacing.xs, marginBottom: spacing.md },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.onSurface, fontSize: 14 },
  err: { color: colors.error, marginTop: spacing.sm, fontSize: 13 },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  cancel: { flex: 1, paddingVertical: spacing.md + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center" },
  cancelText: { color: colors.onSurface, fontWeight: "600" },
  ok: { flex: 1, paddingVertical: spacing.md + 2, borderRadius: radius.pill, backgroundColor: colors.error, alignItems: "center" },
  okText: { color: colors.onError, fontWeight: "700" },
});
