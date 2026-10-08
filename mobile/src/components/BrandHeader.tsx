import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "./ui";
import { useStore } from "../lib/state";
export function BrandHeader() {
  const { count } = useStore();
  return (
    <SafeAreaView edges={["top"]} style={h.safe}>
      <View style={h.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الرئيسية"
          onPress={() => router.push("/")}
        >
          <Text style={h.logo}>▲ TAMAM</Text>
        </Pressable>
        <View style={h.location}>
          <Ionicons name="location-outline" size={14} color={colors.green} />
          <Text style={h.locationText}>موقعك الحالي</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="بحث"
            onPress={() => router.push("/restaurants")}
            style={h.icon}
          >
            <Ionicons name="search-outline" size={20} color={colors.muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`السلة ${count}`}
            onPress={() => router.push("/cart")}
            style={h.icon}
          >
            <Ionicons
              name="bag-handle-outline"
              size={20}
              color={colors.muted}
            />
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
    backgroundColor: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: "#263028",
  },
  bar: {
    paddingHorizontal: 16,
    height: 70,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    color: colors.bright,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  location: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  locationText: {
    fontFamily: "Alexandria_400Regular",
    fontSize: 10,
    color: colors.muted,
  },
  icon: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
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
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: colors.ink },
});
