import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, Page } from "../../components/ui";
import { useStore } from "../../lib/state";

// Order history is not ported from the web app yet; this tab is an honest
// empty state that routes people to the cart or the TAMAM game.
export default function Orders() {
  const { count } = useStore();
  return (
    <Page>
      <View style={o.empty}>
        <View style={o.icon}>
          <Ionicons name="receipt-outline" size={34} color={colors.teal} />
        </View>
        <Text style={o.title}>لسا ما في طلبات</Text>
        <Text style={o.sub}>
          أول طلب إلك رح يبيّن هون. محتار شو تطلب؟ خلّي TAMAM تختارلك.
        </Text>
      </View>
      <Button label="العب TAMAM" tone="green" onPress={() => router.push("/game")} />
      {count > 0 ? (
        <Button
          label={`كمّل سلتك · ${count}`}
          tone="ghost"
          onPress={() => router.push("/cart")}
        />
      ) : null}
    </Page>
  );
}
const o = StyleSheet.create({
  empty: { alignItems: "center", gap: 10, paddingTop: 48, paddingBottom: 16 },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: font.black, fontSize: 20, color: colors.teal },
  sub: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 22,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 280,
  },
});
