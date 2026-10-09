import { Tabs } from "expo-router";
import { BrandHeader } from "../../components/BrandHeader";
import { TabBar } from "../../components/TabBar";
import { colors } from "../../components/ui";

// Titles are translation keys, resolved in components/TabBar.tsx.
// Order: home · explore · TAMAM · orders · profile (mirrored for English).
export default function Layout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        header: () => <BrandHeader />,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "tabHome" }} />
      <Tabs.Screen name="restaurants" options={{ title: "tabExplore" }} />
      <Tabs.Screen name="game" options={{ title: "TAMAM", headerShown: false }} />
      <Tabs.Screen name="orders" options={{ title: "tabOrders" }} />
      <Tabs.Screen name="profile" options={{ title: "tabProfile" }} />
    </Tabs>
  );
}
