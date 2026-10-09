import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, money, Page, useS } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { TamamMark } from "../../components/brand";
import { useStore } from "../../lib/state";
import { statusKey, STATUS_STEPS, WHATSAPP_NUMBER } from "../../lib/orders";
import type { Order } from "../../lib/types";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  new: "receipt-outline",
  confirmed: "checkmark-circle-outline",
  cooking: "flame-outline",
  ready: "bicycle-outline",
  delivered: "happy-outline",
};

export default function OrderTracking() {
  const { id, more } = useLocalSearchParams<{ id: string; more?: string }>();
  const { api } = useStore();
  const { t: tr, sheet, msg } = useT();
  const s = useS();
  const t = sheet(ts);
  const [order, setOrder] = useState<Order | null>();
  const [error, setError] = useState("");

  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((n) => n + 1), []);
  const final = order?.status === "delivered" || order?.status === "cancelled";
  useEffect(() => {
    let active = true;
    api
      .order(id)
      .then((o) => {
        if (!active) return;
        setOrder(o);
        setError("");
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "loadFailed");
      });
    return () => {
      active = false;
    };
  }, [api, id, tick]);
  // The kitchen updates status in the CRM; poll until it's final.
  useEffect(() => {
    if (final) return;
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load, final]);

  if (order === undefined && !error)
    return <ActivityIndicator color={colors.green} size="large" style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!order)
    return (
      <Page>
        <Text style={s.heading}>{tr("orderNotFound")}</Text>
        {error ? <Text style={t.muted}>{msg(error)}</Text> : null}
        <Button label={tr("retry")} onPress={() => load()} />
      </Page>
    );

  const cancelled = order.status === "cancelled";
  const step = Math.max(0, STATUS_STEPS.indexOf((order.status || "new") as never));
  const extra = Number(more || 0);

  return (
    <Page>
      <View style={t.hero}>
        <TamamMark size={34} color={colors.white} />
        <Text style={t.heroTitle}>{tr(statusKey(cancelled ? "cancelled" : STATUS_STEPS[step]))}</Text>
        <Text style={t.heroSub}>{tr("orderNo", { id: order.id })}</Text>
      </View>

      {extra > 0 ? (
        <Text style={t.note}>
          {tr("orderSplit", { n: extra + 1 })}
        </Text>
      ) : null}

      {!cancelled ? (
        <View style={s.card}>
          {STATUS_STEPS.map((st, i) => {
            const done = i <= step;
            return (
              <View key={st} style={t.step}>
                <View style={{ alignItems: "center" }}>
                  <View style={[t.dot, done && t.dotOn]}>
                    <Ionicons name={ICONS[st]} size={18} color={done ? colors.white : colors.muted} />
                  </View>
                  {i < STATUS_STEPS.length - 1 ? <View style={[t.bar, i < step && t.barOn]} /> : null}
                </View>
                <Text style={[t.stepText, done && { color: colors.ink, fontFamily: font.bold }]}>
                  {tr(statusKey(st))}
                </Text>
              </View>
            );
          })}
          {!final ? <Text style={t.muted}>{tr("autoUpdate")}</Text> : null}
        </View>
      ) : null}

      <View style={s.card}>
        <Text style={t.section}>{tr("orderDetails")}</Text>
        {(order.order_items || []).map((item, i) => (
          <View key={i} style={t.row}>
            <Text style={t.item}>{item.quantity}× {item.name}</Text>
            <Text style={t.item}>{money(item.item_total)}</Text>
          </View>
        ))}
        {!order.order_items?.length && order.items ? <Text style={t.item}>{order.items}</Text> : null}
        <View style={[t.row, t.totalRow]}>
          <Text style={t.total}>{tr("total")}</Text>
          <Text style={t.total}>{money(Number(order.amount || 0))}</Text>
        </View>
        {order.address ? <Text style={t.muted}>📍 {order.address}</Text> : null}
      </View>

      <Button
        label={tr("problem")}
        tone="ghost"
        onPress={() =>
          void Linking.openURL(
            `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(tr("waAboutOrder", { id: order.id }))}`,
          )
        }
      />
      <Button label={tr("backHome")} onPress={() => router.replace("/")} />
    </Page>
  );
}

const ts = StyleSheet.create({
  hero: {
    backgroundColor: colors.teal,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    gap: 6,
  },
  heroTitle: { fontFamily: font.black, fontSize: 24, color: colors.white, textAlign: "center" },
  heroSub: { fontFamily: font.medium, fontSize: 12, color: "#CFE3DE" },
  note: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 20,
    color: colors.teal,
    backgroundColor: colors.mint,
    padding: 12,
    borderRadius: 14,
    textAlign: "right",
  },
  step: { flexDirection: "row-reverse", gap: 12 },
  dot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.high,
    alignItems: "center",
    justifyContent: "center",
  },
  dotOn: { backgroundColor: colors.green },
  bar: { width: 3, height: 18, backgroundColor: colors.high },
  barOn: { backgroundColor: colors.green },
  stepText: { fontFamily: font.regular, fontSize: 14, color: colors.muted, paddingTop: 8, textAlign: "right" },
  section: { fontFamily: font.bold, fontSize: 14, color: colors.teal, textAlign: "right" },
  row: { flexDirection: "row-reverse", justifyContent: "space-between" },
  item: { fontFamily: font.regular, fontSize: 13, color: colors.ink, textAlign: "right" },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: 8 },
  total: { fontFamily: font.black, fontSize: 15, color: colors.teal },
  muted: { fontFamily: font.regular, fontSize: 12, color: colors.muted, textAlign: "right" },
});
