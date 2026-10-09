import { useCallback } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, money, Page, Status, useS } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { statusKey } from "../../lib/orders";
import type { Order } from "../../lib/types";

const live = (o: Order) => o.status !== "delivered" && o.status !== "cancelled";

export default function Orders() {
  const { t, sheet, lang } = useT();
  const s = useS();
  const o = sheet(os);
  const { api, count, orderIds, customer } = useStore();
  const phone = customer.phone.trim();
  // Orders placed from this device, plus older ones (e.g. from the old site)
  // under the saved phone number.
  const data = useLoad(
    useCallback(async () => {
      const [mine, byPhone] = await Promise.all([
        api.ordersByIds(orderIds),
        phone ? api.ordersByPhone(phone) : Promise.resolve([] as Order[]),
      ]);
      const seen = new Set<number>();
      return [...mine, ...byPhone]
        .filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }, [api, orderIds, phone]),
  );

  if (!orderIds.length && !phone)
    return (
      <Page>
        <View style={o.empty}>
          <View style={o.icon}>
            <Ionicons name="receipt-outline" size={34} color={colors.teal} />
          </View>
          <Text style={o.title}>{t("noOrdersYet")}</Text>
          <Text style={o.sub}>{t("noOrdersSub")}</Text>
        </View>
        <Button label={t("playTamam")} tone="green" onPress={() => router.push("/game")} />
        {count > 0 ? (
          <Button label={t("continueCart", { n: count })} tone="ghost" onPress={() => router.push("/cart")} />
        ) : null}
      </Page>
    );

  return (
    <Page>
      <Text style={s.heading}>{t("tabOrders")}</Text>
      <Status loading={data.loading} error={data.error} retry={data.reload} />
      {data.value?.map((order) => (
        <Pressable
          key={order.id}
          accessibilityRole="button"
          style={[s.card, o.card]}
          onPress={() => router.push({ pathname: "/order/[id]", params: { id: String(order.id) } })}
        >
          <View style={[o.badge, live(order) ? o.badgeLive : order.status === "cancelled" ? o.badgeOff : null]}>
            <Text style={[o.badgeText, live(order) && { color: colors.white }]}>
              {t(statusKey(order.status))}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={o.items} numberOfLines={2}>{order.items || t("orderFallback", { id: order.id })}</Text>
            <Text style={o.meta}>
              #{order.id} · {order.created_at ? new Date(order.created_at).toLocaleDateString(lang) : ""}
            </Text>
          </View>
          <Text style={o.amount}>{money(Number(order.amount || 0))}</Text>
        </Pressable>
      ))}
      {data.value?.length === 0 ? <Text style={o.sub}>{t("noOrdersFound")}</Text> : null}
    </Page>
  );
}
const os = StyleSheet.create({
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
  sub: { fontFamily: font.regular, fontSize: 13, lineHeight: 22, color: colors.muted, textAlign: "center", maxWidth: 280, alignSelf: "center" },
  card: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  badge: { backgroundColor: colors.high, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 110 },
  badgeLive: { backgroundColor: colors.green },
  badgeOff: { backgroundColor: "#F6DCDA" },
  badgeText: { fontFamily: font.bold, fontSize: 10, color: colors.ink, textAlign: "center" },
  items: { fontFamily: font.bold, fontSize: 13, color: colors.ink, textAlign: "right" },
  meta: { fontFamily: font.regular, fontSize: 11, color: colors.muted, textAlign: "right" },
  amount: { fontFamily: font.black, fontSize: 15, color: colors.teal },
});
