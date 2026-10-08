import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ReactNode } from "react";
import { imageUrl } from "../lib/media";
export const colors = {
  bg: "#101412",
  surface: "#1C211E",
  high: "#262B29",
  green: "#6EBF5F",
  bright: "#89DB78",
  ink: "#071312",
  text: "#DFE3E0",
  muted: "#C0CAB8",
  outline: "#40493C",
  gold: "#EAC45C",
  error: "#FFB4AB",
};
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  text: {
    color: colors.text,
    textAlign: "right",
    fontSize: 14,
    fontFamily: "Alexandria_400Regular",
    lineHeight: 24,
    writingDirection: "rtl",
  },
  muted: {
    color: colors.muted,
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Alexandria_400Regular",
    lineHeight: 22,
    writingDirection: "rtl",
  },
  heading: {
    color: colors.text,
    textAlign: "right",
    fontSize: 22,
    fontFamily: "Alexandria_700Bold",
    lineHeight: 34,

    writingDirection: "rtl",
  },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  input: {
    color: colors.text,
    backgroundColor: colors.high,
    borderRadius: 14,
    padding: 14,
    textAlign: "right",
    fontSize: 16,
    minHeight: 48,
  },
  button: {
    backgroundColor: colors.green,
    borderRadius: 16,
    padding: 16,
    minHeight: 48,
    alignItems: "center",
  },
  buttonText: {
    color: colors.ink,
    fontFamily: "Alexandria_700Bold",
    fontSize: 14,
  },
  image: { width: "100%", height: 160, borderRadius: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.high,
    minHeight: 44,
  },
});
export function Txt({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return <Text style={muted ? s.muted : s.text}>{children}</Text>;
}
export function Button({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, disabled && { opacity: 0.45 }]}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  );
}
export function Page({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
export function Picture({ uri }: { uri?: string }) {
  return uri ? (
    <Image
      source={{ uri: imageUrl(uri) }}
      style={s.image}
      accessibilityLabel="صورة الوجبة أو المطعم"
    />
  ) : (
    <View
      style={[
        s.image,
        {
          backgroundColor: colors.high,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Text style={{ fontSize: 46 }}>🍽️</Text>
    </View>
  );
}
export function Status({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  return loading ? (
    <ActivityIndicator
      color={colors.green}
      size="large"
      style={{ margin: 24 }}
    />
  ) : error ? (
    <View style={s.card}>
      <Text accessibilityRole="alert" style={[s.text, { color: colors.error }]}>
        {error}
      </Text>
      <Button label="حاول مرة ثانية" onPress={retry} />
    </View>
  ) : null;
}
export const money = (value: number) => `₪${Number(value).toFixed(2)}`;
