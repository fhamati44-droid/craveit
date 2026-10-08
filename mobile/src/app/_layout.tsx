import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "../lib/state";
import { colors } from "../components/ui";
export default function Layout() {
  return (
    <SafeAreaProvider>
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
          <Stack.Screen name="restaurant/[id]" options={{ title: "المطعم" }} />
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
    </SafeAreaProvider>
  );
}
