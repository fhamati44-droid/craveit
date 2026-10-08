import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../components/ui";
import { BrandHeader } from "../../components/BrandHeader";
const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  restaurants: "restaurant-outline",
  game: "sparkles-outline",
  profile: "person-outline",
};
export default function Layout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        header: () => <BrandHeader />,
        tabBarStyle: {
          backgroundColor: colors.ink,
          borderTopColor: "#263028",
          height: 76,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontFamily: "Alexandria_400Regular", fontSize: 10 },
        tabBarActiveTintColor: colors.bright,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color }) => (
          <Ionicons name={icons[route.name]} size={23} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية" }} />
      <Tabs.Screen name="restaurants" options={{ title: "استكشف" }} />
      <Tabs.Screen name="game" options={{ title: "TAMAM" }} />
      <Tabs.Screen name="profile" options={{ title: "حسابي" }} />
    </Tabs>
  );
}
