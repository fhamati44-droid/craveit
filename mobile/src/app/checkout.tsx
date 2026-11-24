import { useState } from "react";
import { router } from "expo-router";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, money, Page, useS } from "../components/ui";
import { useT, type Key } from "../lib/i18n";
import { useStore } from "../lib/state";
import {
  buildOrders,
  deliveryFeeFor,
  groupByRestaurant,
  lineTotal,
  validate,
  WHATSAPP_NUMBER,
  type CheckoutForm,
} from "../lib/orders";

type Pay = CheckoutForm["payment"] | "whatsapp";
const PAYMENTS: [Pay, Key, Key, keyof typeof Ionicons.glyphMap][] = [
  ["cash", "payCash", "payCashHint", "cash-outline"],
  ["credit", "payCard", "payCardHint", "card-outline"],
  ["whatsapp", "payWa", "payWaHint", "logo-whatsapp"],
];

export default function Checkout() {
  const { api, lines, customer, saveCustomer, rememberOrders, clear } = useStore();
  const { t, name, sheet, msg } = useT();
  const s = useS();
  const k = sheet(ks);
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    notes: "",
    delivery: "delivery" as CheckoutForm["delivery"],
  });
  const [pay, setPay] = useState<Pay>("cash");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const groups = groupByRestaurant(lines);
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const delivery = groups.reduce(
    (sum, g) => sum + deliveryFeeFor(g[0].restaurant, form),
    0,
  );
  const total = subtotal + delivery;

  if (!lines.length)
    return (
      <Page>
        <Text style={s.heading}>{t("cartEmpty")}</Text>
        <Button label={t("backHome")} onPress={() => router.replace("/")} />
      </Page>
    );

  const submit = async () => {
    const full: CheckoutForm = {
      ...form,
      payment: pay === "credit" ? "credit" : "cash",
      channel: Platform.OS === "web" ? "אתר" : "אפליקציה",
    };
    const found = validate(full);
    setErrors(
      Object.fromEntries(Object.entries(found).map(([field, key]) => [field, t(key as Key)])),
    );
    if (Object.keys(found).length) return;
    saveCustomer({ name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() });
    setFailure("");

    if (pay === "whatsapp") {
      const text = [
        t("waNewOrder", { name: form.name }),
        t("waPhone", { v: form.phone }),
        form.delivery === "delivery" ? t("waAddress", { v: form.address }) : t("waPickup"),
        "",
        ...lines.map((l) => `${l.quantity}× ${name(l.meal)} (${name(l.restaurant)}) - ${money(lineTotal(l))}`),
        form.notes ? `\n${t("waNotes", { v: form.notes })}` : "",
        `\n${t("waTotal", { v: money(total) })}`,
      ].join("\n");
      await Linking.openURL(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
      ).catch(() => {});
      clear();
      router.replace("/");
      return;
    }

    setBusy(true);
    try {
      const created = [];
      // One order per restaurant, so each kitchen in the CRM gets its own ticket.
      for (const order of buildOrders(lines, full)) created.push(await api.createOrder(order));
      const ids = created.map((o) => Number(o.id)).filter(Boolean);
      // Same Meta Pixel event the old site sent (web only).
      const fbq = (globalThis as { fbq?: (...a: unknown[]) => void }).fbq;
      fbq?.("track", "Purchase", {
        value: total,
        currency: "ILS",
        num_items: lines.reduce((n, l) => n + l.quantity, 0),
        content_ids: lines.map((l) => String(l.meal.id)),
        content_type: "product",
      });
      rememberOrders(ids);
      clear();
      router.replace({ pathname: "/order/[id]", params: { id: String(ids[0]), more: String(ids.length - 1) } });
    } catch (e) {
      setFailure(
        t("sendFailed", { e: e instanceof Error ? msg(e.message) : "" }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Text style={s.heading}>{t("screenCheckout")}</Text>

      <View style={s.card}>
        <Text style={k.section}>{t("howToReceive")}</Text>
        <View style={k.toggle}>
          {(
            [
              ["delivery", t("delivery"), "bicycle-outline"],
              ["pickup", t("pickup"), "storefront-outline"],
            ] as const
          ).map(([value, label, icon]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: form.delivery === value }}
              onPress={() => setForm((f) => ({ ...f, delivery: value }))}
              style={[k.toggleItem, form.delivery === value && k.toggleOn]}
            >
              <Ionicons name={icon} size={18} color={form.delivery === value ? colors.white : colors.teal} />
              <Text style={[k.toggleText, form.delivery === value && { color: colors.white }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.card}>
        <Text style={k.section}>{t("yourDetails")}</Text>
        <Field icon="person-outline" placeholder={t("name")} value={form.name} onChange={set("name")} error={errors.name} />
        <Field icon="call-outline" placeholder={t("phone")} value={form.phone} onChange={set("phone")} error={errors.phone} keyboard="phone-pad" />
        {form.delivery === "delivery" ? (
          <Field icon="location-outline" placeholder={t("addressPh")} value={form.address} onChange={set("address")} error={errors.address} />
        ) : null}
        <Field icon="chatbubble-ellipses-outline" placeholder={t("notesPh")} value={form.notes} onChange={set("notes")} multiline />
      </View>

      <View style={s.card}>
        <Text style={k.section}>{t("payment")}</Text>
        {PAYMENTS.map(([value, label, hint, icon]) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected: pay === value }}
            onPress={() => setPay(value)}
            style={[k.pay, pay === value && k.payOn]}
          >
            <Ionicons name={icon} size={22} color={value === "whatsapp" ? "#25D366" : colors.teal} />
            <View style={{ flex: 1 }}>
              <Text style={k.payLabel}>{t(label)}</Text>
              <Text style={k.muted}>{t(hint)}</Text>
            </View>
            <Ionicons
              name={pay === value ? "radio-button-on" : "radio-button-off"}
              size={20}
              color={pay === value ? colors.green : colors.outline}
            />
          </Pressable>
        ))}
      </View>

      <View style={s.card}>
        <Text style={k.section}>{t("summary")}</Text>
        {groups.map((g) => (
          <View key={String(g[0].restaurant.id)} style={k.sumRow}>
            <Text style={k.sumLabel}>{name(g[0].restaurant)} · {t("meals", { n: g.reduce((n, l) => n + l.quantity, 0) })}</Text>
            <Text style={k.sumValue}>{money(g.reduce((n, l) => n + lineTotal(l), 0))}</Text>
          </View>
        ))}
        <View style={k.sumRow}>
          <Text style={k.sumLabel}>{t("delivery")}</Text>
          <Text style={k.sumValue}>{delivery ? money(delivery) : t("free")}</Text>
        </View>
        <View style={[k.sumRow, k.totalRow]}>
          <Text style={k.totalLabel}>{t("total")}</Text>
          <Text style={k.totalValue}>{money(total)}</Text>
        </View>
      </View>

      {failure ? (
        <Text accessibilityRole="alert" style={k.error}>{failure}</Text>
      ) : null}
      <Button
        label={busy ? t("sending") : pay === "whatsapp" ? t("continueWa") : t("orderNow", { p: money(total) })}
        tone="green"
        disabled={busy}
        onPress={() => void submit()}
      />
    </Page>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChange,
  error,
  keyboard,
  multiline,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  keyboard?: "phone-pad";
  multiline?: boolean;
}) {
  const s = useS();
  const { f, sheet } = useT();
  const k = sheet(ks);
  return (
    <View style={{ gap: 4 }}>
      <View style={{ justifyContent: "center" }}>
        <TextInput
          style={[s.input, f({ paddingRight: 44 }), multiline && { minHeight: 80, textAlignVertical: "top" }, !!error && { borderColor: colors.error }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboard}
          multiline={multiline}
          accessibilityLabel={placeholder}
        />
        <Ionicons name={icon} size={18} color={colors.teal} style={f({ position: "absolute", right: 14, top: 15 })} />
      </View>
      {error ? <Text style={k.error}>{error}</Text> : null}
    </View>
  );
}

const ks = StyleSheet.create({
  section: { fontFamily: font.bold, fontSize: 14, color: colors.teal, textAlign: "right" },
  muted: { fontFamily: font.regular, fontSize: 11, color: colors.muted, textAlign: "right" },
  toggle: { flexDirection: "row-reverse", gap: 8 },
  toggleItem: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.outline,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  toggleOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  toggleText: { fontFamily: font.bold, fontSize: 13, color: colors.teal },
  pay: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.outline,
  },
  payOn: { borderColor: colors.green, backgroundColor: colors.mint },
  payLabel: { fontFamily: font.bold, fontSize: 13, color: colors.ink, textAlign: "right" },
  sumRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  sumLabel: { fontFamily: font.regular, fontSize: 13, color: colors.ink, textAlign: "right", flex: 1 },
  sumValue: { fontFamily: font.medium, fontSize: 13, color: colors.ink },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontFamily: font.black, fontSize: 16, color: colors.teal, textAlign: "right" },
  totalValue: { fontFamily: font.black, fontSize: 20, color: colors.teal },
  error: { fontFamily: font.medium, fontSize: 12, color: colors.error, textAlign: "right" },
});
