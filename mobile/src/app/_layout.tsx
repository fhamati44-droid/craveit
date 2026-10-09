import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "../lib/state";
import { View, ActivityIndicator } from "react-native";
import { useFonts } from "expo-font";
import { Alexandria_400Regular } from "@expo-google-fonts/alexandria/400Regular";
import { Alexandria_500Medium } from "@expo-google-fonts/alexandria/500Medium";
import { Alexandria_700Bold } from "@expo-google-fonts/alexandria/700Bold";
import { Alexandria_800ExtraBold } from "@expo-google-fonts/alexandria/800ExtraBold";
import { Heebo_400Regular } from "@expo-google-fonts/heebo/400Regular";
import { Heebo_500Medium } from "@expo-google-fonts/heebo/500Medium";
import { Heebo_700Bold } from "@expo-google-fonts/heebo/700Bold";
import { Heebo_800ExtraBold } from "@expo-google-fonts/heebo/800ExtraBold";
import { colors } from "../components/ui";
import { useT } from "../lib/i18n";

function Screens() {
  const { t, lang } = useT();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.teal,
        headerTitleStyle: {
          fontFamily: lang === "he" ? "Heebo_700Bold" : "Alexandria_700Bold",
          fontSize: 16,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="restaurant/[id]" options={{ title: t("screenRestaurant") }} />
      <Stack.Screen name="cart" options={{ title: t("screenCart") }} />
      <Stack.Screen name="checkout" options={{ title: t("screenCheckout") }} />
      <Stack.Screen name="order/[id]" options={{ title: t("screenTracking") }} />
      <Stack.Screen name="suggestions" options={{ title: t("screenSuggestions") }} />
      <Stack.Screen name="suggestion/[id]" options={{ title: t("screenSuggestion") }} />
    </Stack>
  );
}
export default function Layout() {
  const [fontsLoaded, fontError] = useFonts({
    Alexandria_400Regular,
    Alexandria_500Medium,
    Alexandria_700Bold,
    Alexandria_800ExtraBold,
    // Hebrew (Alexandria has no Hebrew glyphs)
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_700Bold,
    Heebo_800ExtraBold,
  });
  if (!fontsLoaded && !fontError)
    return (
      <ActivityIndicator
        color={colors.green}
        style={{ flex: 1, backgroundColor: colors.bg }}
      />
    );
  return (
    <SafeAreaProvider>
      <View
        style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center" }}
      >
        <View style={{ flex: 1, width: "100%", maxWidth: 480 }}>
          <Provider>
            <StatusBar style="dark" />
            <Screens />
          </Provider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
