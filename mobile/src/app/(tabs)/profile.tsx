import { useState } from "react";
import { router } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, Page, useS } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { LangSwitch } from "../../components/LangSwitch";
import { TamamLogo } from "../../components/brand";
import { useStore } from "../../lib/state";
import { WHATSAPP_NUMBER } from "../../lib/orders";

export default function Profile() {
  const { t, sheet, f, fwd } = useT();
  const s = useS();
  const p = sheet(ps);
  const { customer, saveCustomer } = useStore();
  const [form, setForm] = useState(customer);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };
  const rows: [keyof typeof Ionicons.glyphMap, string, () => void][] = [
    ["receipt-outline", t("tabOrders"), () => router.push("/orders")],
    ["bag-handle-outline", t("screenCart"), () => router.push("/cart")],
    ["sparkles-outline", t("playTamam"), () => router.push("/game")],
    [
      "logo-whatsapp",
      t("whatsappUs"),
      () => void Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`),
    ],
  ];
  return (
    <Page>
      <View style={[s.card, { gap: 12 }]}>
        <View style={p.head}>
          <View style={p.avatar}>
            <Ionicons name="person" size={26} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={p.name}>{customer.name || t("welcome")}</Text>
            <Text style={p.muted}>{t("profileHint")}</Text>
          </View>
        </View>
        {(
          [
            ["name", t("name"), "person-outline", undefined],
            ["phone", t("phone"), "call-outline", "phone-pad"],
            ["address", t("deliveryAddress"), "location-outline", undefined],
          ] as const
        ).map(([key, label, icon, keyboard]) => (
          <View key={key} style={{ justifyContent: "center" }}>
            <TextInput
              style={[s.input, f({ paddingRight: 44 })]}
              value={form[key]}
              onChangeText={set(key)}
              placeholder={label}
              placeholderTextColor={colors.muted}
              keyboardType={keyboard}
              accessibilityLabel={label}
            />
            <Ionicons name={icon} size={18} color={colors.teal} style={f({ position: "absolute", right: 14 })} />
          </View>
        ))}
        <Button
          label={saved ? t("saved") : t("save")}
          onPress={() => {
            saveCustomer({ name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() });
            setSaved(true);
          }}
        />
      </View>
      <View style={[s.card, p.langRow]}>
        <Ionicons name="language-outline" size={20} color={colors.teal} />
        <Text style={p.rowText}>{t("language")}</Text>
        <LangSwitch />
      </View>
      <View style={[s.card, { padding: 6, gap: 0 }]}>
        {rows.map(([icon, label, onPress], i) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={onPress}
            style={[p.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.outline }]}
          >
            <Ionicons name={icon} size={20} color={icon === "logo-whatsapp" ? "#25D366" : colors.teal} />
            <Text style={p.rowText}>{label}</Text>
            <Ionicons name={fwd("chevron-back")} size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
      <View style={{ alignItems: "center", gap: 6, paddingTop: 8 }}>
        <TamamLogo height={16} />
        <Text style={p.muted}>{t("tagline")}</Text>
      </View>
    </Page>
  );
}
const ps = StyleSheet.create({
  head: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: font.black, fontSize: 18, color: colors.teal, textAlign: "right" },
  muted: { fontFamily: font.regular, fontSize: 12, lineHeight: 20, color: colors.muted, textAlign: "right" },
  langRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 10 },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 14, minHeight: 52 },
  rowText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.ink, textAlign: "right" },
});
