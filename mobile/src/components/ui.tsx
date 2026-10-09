import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRef, type ReactNode } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { imageUrl } from "../lib/media";
import { useT } from "../lib/i18n";
export const colors = {
  // TAMAM campaign palette (sampled from the brand ads)
  bg: "#F6F5F0", // warm paper
  surface: "#FFFFFF",
  high: "#EEECE4",
  teal: "#06463F", // brand deep teal
  tealDeep: "#03332E",
  tealMid: "#0D5A51",
  green: "#3FA34D", // brand green (triangles, price brush)
  bright: "#5CC25E",
  mint: "#E6F4E4",
  ink: "#0F1A19",
  white: "#FFFFFF",
  text: "#0F1A19",
  muted: "#5E6B68",
  outline: "#E3E1D8",
  gold: "#E9B949",
  error: "#B3261E",
};
export const font = {
  regular: "Alexandria_400Regular",
  medium: "Alexandria_500Medium",
  bold: "Alexandria_700Bold",
  black: "Alexandria_800ExtraBold",
};
export const shadow = {
  shadowColor: "#06463F",
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};
const base = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  text: {
    color: colors.text,
    textAlign: "right",
    fontSize: 14,
    fontFamily: font.regular,
    lineHeight: 24,
    writingDirection: "rtl",
  },
  muted: {
    color: colors.muted,
    textAlign: "right",
    fontSize: 12,
    fontFamily: font.regular,
    lineHeight: 22,
    writingDirection: "rtl",
  },
  heading: {
    color: colors.text,
    textAlign: "right",
    fontSize: 22,
    fontFamily: font.black,
    lineHeight: 34,
    writingDirection: "rtl",
  },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  input: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 14,
    padding: 14,
    textAlign: "right",
    fontSize: 15,
    fontFamily: font.regular,
    minHeight: 50,
  },
  button: {
    backgroundColor: colors.teal,
    borderRadius: 16,
    padding: 16,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: colors.white,
    fontFamily: font.bold,
    fontSize: 14,
  },
  image: { width: "100%", height: 160, borderRadius: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 44,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
});
/** Shared styles, RTL as written. Components should use `useS()` so English mirrors. */
export const s = base;
export function useS() {
  return useT().sheet(base);
}
export function Txt({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  const s = useS();
  return <Text style={muted ? s.muted : s.text}>{children}</Text>;
}
export function Button({
  label,
  onPress,
  disabled = false,
  tone = "teal",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "teal" | "green" | "ghost";
}) {
  const s = useS();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        tone === "green" && { backgroundColor: colors.green },
        tone === "ghost" && {
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: colors.teal,
        },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text
        style={[s.buttonText, tone === "ghost" && { color: colors.teal }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Page({ children }: { children: ReactNode }) {
  const s = useS();
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
  const s = useS();
  const { t } = useT();
  return uri ? (
    <Image
      source={{ uri: imageUrl(uri) }}
      style={s.image}
      accessibilityLabel={t("image")}
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
      <Ionicons name="restaurant-outline" size={40} color={colors.green} />
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
  const s = useS();
  const { t, msg } = useT();
  return loading ? (
    <ActivityIndicator
      color={colors.green}
      size="large"
      style={{ margin: 24 }}
    />
  ) : error ? (
    <View style={s.card}>
      <Text accessibilityRole="alert" style={[s.text, { color: colors.error }]}>
        {msg(error)}
      </Text>
      <Button label={t("retry")} onPress={retry} />
    </View>
  ) : null;
}
export const money = (value: number) => `₪${Number(value).toFixed(2)}`;

/**
 * Horizontal row laid out right-to-left. With `row-reverse`, the first item
 * sits at the far end of the content, so start scrolled to the end, otherwise
 * the row opens on its last items.
 */
export function RtlRow({
  children,
  gap = 12,
}: {
  children: ReactNode;
  gap?: number;
}) {
  const ref = useRef<ScrollView>(null);
  const { rtl } = useT();
  // RTL: start scrolled to the end, where the first item is. Runs after
  // layout settles (web applies scroll only once sizes are known).
  const toStart = () =>
    rtl && setTimeout(() => ref.current?.scrollToEnd({ animated: false }), 0);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={toStart}
      onContentSizeChange={toStart}
      contentContainerStyle={{
        flexDirection: rtl ? "row-reverse" : "row",
        gap,
        paddingBottom: 12,
        paddingHorizontal: 2,
      }}
    >
      {children}
    </ScrollView>
  );
}
