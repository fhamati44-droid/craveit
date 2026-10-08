import { Tabs, router } from "expo-router";
import { Pressable, Text } from "react-native";
import { colors } from "../../components/ui";
import { useStore } from "../../lib/state";
const icons: Record<string, string> = {
  index: "⌂",
  restaurants: "☷",
  game: "✦",
  profile: "⚙",
};
export default function Layout() {
  const { count } = useStore();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleAlign: "center",
        tabBarStyle: {
          backgroundColor: colors.ink,
          borderTopColor: colors.outline,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.bright,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 26 }}>{icons[route.name]}</Text>
        ),
        headerRight: () => (
          <Pressable
            onPress={() => router.push("/cart")}
            accessibilityRole="button"
            accessibilityLabel={`السلة ${count}`}
            style={{ padding: 14 }}
          >
            <Text style={{ color: colors.green }}>السلة {count || ""}</Text>
          </Pressable>
        ),
      })}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "TAMAM", tabBarLabel: "الرئيسية" }}
      />
      <Tabs.Screen
        name="restaurants"
        options={{ title: "استكشف", tabBarLabel: "استكشف" }}
      />
      <Tabs.Screen
        name="game"
        options={{ title: "شو مودك؟", tabBarLabel: "TAMAM" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "حسابي", tabBarLabel: "حسابي" }}
      />
    </Tabs>
  );
}
