import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font } from "./ui";
import { TamamLogo } from "./brand";
import { useStore } from "../lib/state";

export function BrandHeader() {
  const { count } = useStore();
  return (
    <SafeAreaView edges={["top"]} style={h.safe}>
      <View style={h.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="TAMAM الرئيسية"
          onPress={() => router.push("/")}
          hitSlop={8}
        >
          <TamamLogo height={20} />
        </Pressable>
        <Pressable style={h.location} accessibilityRole="button" accessibilityLabel="موقعك الحالي">
          <Ionicons name="location" size={14} color={colors.green} />
          <Text style={h.locationText}>موقعك الحالي</Text>
          <Ionicons name="chevron-down" size={12} color={colors.muted} />
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="بحث"
            onPress={() => router.push("/restaurants")}
            style={h.icon}
          >
            <Ionicons name="search" size={19} color={colors.teal} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`السلة ${count}`}
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
const h = StyleSheet.create({
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
  location: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: 18,
    paddingHorizontal: 10,
    height: 34,
  },
  locationText: { fontFamily: font.medium, fontSize: 11, color: colors.ink },
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
