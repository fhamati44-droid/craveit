import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, money, Page, useS } from "../components/ui";
import { useStore } from "../lib/state";
import { useT } from "../lib/i18n";
import { groupByRestaurant, lineTotal } from "../lib/orders";

export default function Cart() {
  const { lines, quantity, subtotal, dailyCart } = useStore();
  const [expandedExtras, setExpandedExtras] = useState<Record<string, boolean>>({});
  const { t, name, sheet } = useT();
  const s = useS();
  const c = sheet(cs);
  if (!lines.length&&!dailyCart.length)
    return (
      <Page>
        <View style={c.empty}>
          <View style={c.emptyIcon}>
            <Ionicons name="bag-handle-outline" size={34} color={colors.teal} />
          </View>
          <Text style={c.emptyTitle}>{t("cartEmpty")}</Text>
          <Text style={c.muted}>{t("cartEmptySub")}</Text>
        </View>
        <Button label={t("dailyTitle")} tone="green" onPress={() => router.push("/daily-meal")} />
        <Button label={t("screenSuggestions")} onPress={() => router.push("/basket")} />
        <Button label={t("browseRestaurants")} tone="ghost" onPress={() => router.push("/restaurants")} />
      </Page>
    );
  const dailySection=dailyCart.length?<View style={s.card}><Text style={s.heading}>{t("dailyTitle")}</Text>{dailyCart.map((line,i)=><View key={`${line.menu_id}-${i}`}><Text style={s.text}>{line.menu_title||t("dailyTitle")} · ×{line.quantity}</Text><Text style={s.muted}>{line.service_date} · {money(line.unit_price*line.quantity)}</Text></View>)}<Button label={t("dailyCheckout",{n:dailyCart.reduce((n,l)=>n+l.quantity,0)})} onPress={()=>router.push({pathname:'/daily-meal',params:{openCart:'1'}})}/></View>:null;
  if(!lines.length)return <Page>{dailySection}</Page>;
  const groups = groupByRestaurant(lines);
  return (
    <View style={c.screen}>
      <ScrollView style={c.scroll} contentContainerStyle={c.content} keyboardShouldPersistTaps="handled">
      <View style={c.topRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} style={c.backButton}>
          <Ionicons name="arrow-forward" size={22} color={colors.teal} />
        </Pressable>
        <Text style={c.pageTitle}>{t("yourCart")}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/restaurants")} style={c.addFoodButton}>
          <Ionicons name="add" size={17} color={colors.green} />
          <Text style={c.addFoodLabel}>{t("browseRestaurants")}</Text>
        </Pressable>
      </View>
      {dailySection}
      {groups.map((group) => (
        <View key={String(group[0].restaurant.id)} style={s.card}>
          <View style={c.restRow}>
            <Ionicons name="storefront-outline" size={16} color={colors.green} />
            <Text style={c.restName}>{name(group[0].restaurant)}</Text>
          </View>
          {group.map((line) => {
            const key = line.key;
            return (
              <View key={key} style={c.line}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={c.meal}>{name(line.meal)}</Text>
                  {line.extras.length ? (
                    <View>
                      <Pressable accessibilityRole="button" accessibilityState={{ expanded: !!expandedExtras[key] }}
                        onPress={() => setExpandedExtras((prev) => ({ ...prev, [key]: !prev[key] }))} style={c.extrasToggle}>
                        <Text style={c.extrasToggleText}>{line.extras.length} +</Text>
                        <Ionicons name={expandedExtras[key] ? "chevron-up" : "chevron-down"} size={15} color={colors.teal} />
                      </Pressable>
                      {expandedExtras[key] ? <Text style={c.muted}>{line.extras.map((x) => name(x)).join(" · ")}</Text> : null}
                    </View>
                  ) : null}
                  {line.note ? <Text style={c.muted}>“{line.note}”</Text> : null}
                  <Text style={c.price}>{money(lineTotal(line))}</Text>
                </View>
                <View style={c.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("increase")}
                    style={c.step}
                    onPress={() => quantity(key, line.quantity + 1)}
                  >
                    <Ionicons name="add" size={18} color={colors.teal} />
                  </Pressable>
                  <Text style={c.qty}>{line.quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={line.quantity === 1 ? t("remove") : t("decrease")}
                    style={c.step}
                    onPress={() => quantity(key, line.quantity - 1)}
                  >
                    <Ionicons
                      name={line.quantity === 1 ? "trash-outline" : "remove"}
                      size={17}
                      color={line.quantity === 1 ? colors.error : colors.teal}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ))}
      {groups.length > 1 ? (
        <Text style={c.muted}>
          {t("multiRestaurant", { n: groups.length })}
        </Text>
      ) : null}
      <View style={c.total}>
        <Text style={c.totalLabel}>{t("itemsSubtotal")}</Text>
        <Text style={c.totalValue}>{money(subtotal)}</Text>
      </View>
      </ScrollView>
      <View style={c.footer}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("toCheckout")} onPress={() => router.push("/checkout")} style={c.checkoutButton}>
          <Text style={c.checkoutLabel}>{t("toCheckout")}</Text>
          <Text style={c.checkoutTotal}>{money(subtotal)}</Text>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12 },
  topRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  pageTitle: { flex: 1, fontFamily: font.black, fontSize: 19, color: colors.teal, textAlign: "right" },
  addFoodButton: { flexDirection: "row-reverse", alignItems: "center", gap: 4, padding: 9, borderRadius: 18, backgroundColor: colors.surface },
  addFoodLabel: { fontFamily: font.bold, fontSize: 11, color: colors.green },
  extrasToggle: { alignSelf: "flex-end", flexDirection: "row-reverse", gap: 5, alignItems: "center", paddingVertical: 4 },
  extrasToggleText: { fontFamily: font.bold, fontSize: 12, color: colors.teal },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.outline },
  checkoutButton: { minHeight: 54, borderRadius: 18, backgroundColor: colors.green, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, gap: 10 },
  checkoutLabel: { flex: 1, fontFamily: font.bold, fontSize: 15, color: "#fff", textAlign: "right" },
  checkoutTotal: { fontFamily: font.black, fontSize: 17, color: "#fff" },
  empty: { alignItems: "center", gap: 10, paddingTop: 40, paddingBottom: 10 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: font.black, fontSize: 20, color: colors.teal },
  muted: { fontFamily: font.regular, fontSize: 12, lineHeight: 20, color: colors.muted, textAlign: "right" },
  restRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  restName: { fontFamily: font.bold, fontSize: 14, color: colors.teal, textAlign: "right" },
  line: {
    flexDirection: "row-reverse",
    gap: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: 12,
  },
  meal: { fontFamily: font.bold, fontSize: 14, color: colors.ink, textAlign: "right" },
  price: { fontFamily: font.bold, fontSize: 13, color: colors.green, textAlign: "right" },
  stepper: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: 22,
    padding: 3,
  },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: { fontFamily: font.bold, fontSize: 14, minWidth: 20, textAlign: "center", color: colors.ink },
  total: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  totalLabel: { fontFamily: font.medium, fontSize: 14, color: colors.ink },
  totalValue: { fontFamily: font.black, fontSize: 20, color: colors.teal },
});
