import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font } from "./ui";
import { TamamLogo } from "./brand";
import { useStore } from "../lib/state";
import { useT } from "../lib/i18n";
import { LangSwitch } from "./LangSwitch";

export function BrandHeader() {
  const { count } = useStore();
  const { t, sheet } = useT();
  const h = sheet(hs);
  return (
    <SafeAreaView edges={["top"]} style={h.safe}>
      <View style={h.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("homeA11y")}
          onPress={() => router.push("/")}
          hitSlop={8}
        >
          <TamamLogo height={20} />
        </Pressable>
        <LangSwitch />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("search")}
            onPress={() => router.push("/restaurants")}
            style={h.icon}
          >
            <Ionicons name="search" size={19} color={colors.teal} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("cartCount", { n: count })}
            onPress={() => router.push("/cart")}
            style={h.icon}
          >
            <Ionicons name="bag-handle-outline" size={19} color={colors.teal} />
            {count > 0 ? (
              <View style={h.badge}>
                <Text style={h.badgeText}>{count}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
const hs = StyleSheet.create({
  safe: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  bar: {
    paddingHorizontal: 16,
    height: 62,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  icon: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -2,
    top: -3,
    backgroundColor: colors.green,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 9, fontFamily: font.bold, color: colors.white },
});
