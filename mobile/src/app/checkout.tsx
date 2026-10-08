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
import { Button, colors, font, money, Page, s } from "../components/ui";
import { useStore } from "../lib/state";
import { title } from "../lib/types";
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
const PAYMENTS: [Pay, string, string, keyof typeof Ionicons.glyphMap][] = [
  ["cash", "كاش عند الاستلام", "بتدفع لما يوصل الأكل", "cash-outline"],
  ["credit", "بطاقة عند الباب", "الشوفير معه جهاز", "card-outline"],
  ["whatsapp", "اطلب عبر واتساب", "منأكّد معك بالواتساب", "logo-whatsapp"],
];

export default function Checkout() {
  const { api, lines, customer, saveCustomer, rememberOrders, clear } = useStore();
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
        <Text style={s.heading}>سلتك فاضية</Text>
        <Button label="رجوع للرئيسية" onPress={() => router.replace("/")} />
      </Page>
    );

  const submit = async () => {
    const full: CheckoutForm = {
      ...form,
      payment: pay === "credit" ? "credit" : "cash",
      channel: Platform.OS === "web" ? "אתר" : "אפליקציה",
    };
    const found = validate(full);
    setErrors(found as Record<string, string>);
    if (Object.keys(found).length) return;
    saveCustomer({ name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() });
    setFailure("");

    if (pay === "whatsapp") {
      const text = [
        `طلب جديد من ${form.name}`,
        `هاتف: ${form.phone}`,
        form.delivery === "delivery" ? `عنوان: ${form.address}` : "استلام ذاتي",
        "",
        ...lines.map((l) => `${l.quantity}× ${title(l.meal)} (${title(l.restaurant)}) - ${money(lineTotal(l))}`),
        form.notes ? `\nملاحظات: ${form.notes}` : "",
        `\nالمجموع: ${money(total)}`,
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
        `ما قدرنا نبعت الطلب: ${e instanceof Error ? e.message : ""}. جرّب كمان مرة أو اطلب عبر واتساب.`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Text style={s.heading}>تأكيد الطلب</Text>

      <View style={s.card}>
        <Text style={k.section}>طريقة الاستلام</Text>
        <View style={k.toggle}>
          {(
            [
              ["delivery", "توصيل", "bicycle-outline"],
              ["pickup", "استلام من المطعم", "storefront-outline"],
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
        <Text style={k.section}>تفاصيلك</Text>
        <Field icon="person-outline" placeholder="الاسم" value={form.name} onChange={set("name")} error={errors.name} />
        <Field icon="call-outline" placeholder="رقم الهاتف" value={form.phone} onChange={set("phone")} error={errors.phone} keyboard="phone-pad" />
        {form.delivery === "delivery" ? (
          <Field icon="location-outline" placeholder="العنوان: الحي، الشارع، رقم البيت" value={form.address} onChange={set("address")} error={errors.address} />
        ) : null}
        <Field icon="chatbubble-ellipses-outline" placeholder="ملاحظات للمطعم أو الشوفير (اختياري)" value={form.notes} onChange={set("notes")} multiline />
      </View>

      <View style={s.card}>
        <Text style={k.section}>الدفع</Text>
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
              <Text style={k.payLabel}>{label}</Text>
              <Text style={k.muted}>{hint}</Text>
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
        <Text style={k.section}>ملخص</Text>
        {groups.map((g) => (
          <View key={String(g[0].restaurant.id)} style={k.sumRow}>
            <Text style={k.sumLabel}>{title(g[0].restaurant)} · {g.reduce((n, l) => n + l.quantity, 0)} وجبات</Text>
            <Text style={k.sumValue}>{money(g.reduce((n, l) => n + lineTotal(l), 0))}</Text>
          </View>
        ))}
        <View style={k.sumRow}>
          <Text style={k.sumLabel}>توصيل</Text>
          <Text style={k.sumValue}>{delivery ? money(delivery) : "مجاني"}</Text>
        </View>
        <View style={[k.sumRow, k.totalRow]}>
          <Text style={k.totalLabel}>المجموع</Text>
          <Text style={k.totalValue}>{money(total)}</Text>
        </View>
      </View>

      {failure ? (
        <Text accessibilityRole="alert" style={k.error}>{failure}</Text>
      ) : null}
      <Button
        label={busy ? "عم نبعت الطلب..." : pay === "whatsapp" ? "كمّل بالواتساب" : `اطلب هسا · ${money(total)}`}
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
  return (
    <View style={{ gap: 4 }}>
      <View style={{ justifyContent: "center" }}>
        <TextInput
          style={[s.input, { paddingRight: 44 }, multiline && { minHeight: 80, textAlignVertical: "top" }, !!error && { borderColor: colors.error }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboard}
          multiline={multiline}
          accessibilityLabel={placeholder}
        />
        <Ionicons name={icon} size={18} color={colors.teal} style={{ position: "absolute", right: 14, top: 15 }} />
      </View>
      {error ? <Text style={k.error}>{error}</Text> : null}
    </View>
  );
}

const k = StyleSheet.create({
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
