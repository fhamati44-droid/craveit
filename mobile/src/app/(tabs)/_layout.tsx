import { Tabs } from "expo-router";
import { BrandHeader } from "../../components/BrandHeader";
import { TabBar } from "../../components/TabBar";
import { colors } from "../../components/ui";

// Visual order is right-to-left: الرئيسية · استكشف · TAMAM · طلباتي · حسابي
export default function Layout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        header: () => <BrandHeader />,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية" }} />
      <Tabs.Screen name="restaurants" options={{ title: "استكشف" }} />
      <Tabs.Screen name="game" options={{ title: "TAMAM", headerShown: false }} />
      <Tabs.Screen name="orders" options={{ title: "طلباتي" }} />
      <Tabs.Screen name="profile" options={{ title: "حسابي" }} />
    </Tabs>
  );
}
