import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "../lib/state";
import { View, ActivityIndicator } from "react-native";
import { useFonts } from "expo-font";
import { Alexandria_400Regular } from "@expo-google-fonts/alexandria/400Regular";
import { Alexandria_700Bold } from "@expo-google-fonts/alexandria/700Bold";
import { colors } from "../components/ui";
export default function Layout() {
  const [fontsLoaded, fontError] = useFonts({
    Alexandria_400Regular,
    Alexandria_700Bold,
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
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.text,
                contentStyle: { backgroundColor: colors.bg },
                headerTitleAlign: "center",
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="restaurant/[id]"
                options={{ title: "المطعم" }}
              />
              <Stack.Screen name="cart" options={{ title: "السلة" }} />
              <Stack.Screen
                name="suggestions"
                options={{ title: "اقتراحات TAMAM" }}
              />
              <Stack.Screen
                name="suggestion/[id]"
                options={{ title: "اقتراح TAMAM" }}
              />
            </Stack>
          </Provider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
