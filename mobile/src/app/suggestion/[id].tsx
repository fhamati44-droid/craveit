import { useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, money, Page, s, Status } from "../../components/ui";
import { Brush } from "../../components/brand";
import { FoodImage, packageName } from "../../components/cards";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { lineTotal } from "../../lib/orders";
import { title } from "../../lib/types";

export default function Suggestion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, add } = useStore();
  const data = useLoad(
    useCallback(async () => {
      const { set, items } = await api.suggestion(id);
      // A package that can't be resolved still shows, with menu links instead.
      const lines = await api.resolvePackage(items || []).catch(() => []);
      return { set, items: items || [], lines };
    }, [api, id]),
  );
  const set = data.value?.set;
  const lines = data.value?.lines || [];
  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const price = set?.display_price_override ?? set?.display_price;

  const addAll = () => {
    lines.forEach((l) => add(l));
    router.push("/cart");
  };

  return (
    <Page>
      <Status loading={data.loading} error={data.error} retry={data.reload} />
      {set ? (
        <>
          <View style={p.hero}>
            <FoodImage uri={set.hero_image_url} height={220} />
            {price != null ? (
              <Brush style={p.price}>
                <Text style={p.priceText}>{money(price).replace(".00", "")}</Text>
              </Brush>
            ) : null}
          </View>
          <View style={{ gap: 6 }}>
            <View style={p.pill}>
              <Text style={p.pillText}>{set.badge_text_ar || packageName(set.package_level)}</Text>
            </View>
            <Text style={s.heading}>{set.title_ar || set.title}</Text>
            {set.description_ar ? <Text style={p.muted}>{set.description_ar}</Text> : null}
          </View>

          {lines.length ? (
            <View style={s.card}>
              <Text style={p.section}>شو في بالباقة</Text>
              {lines.map((l, i) => (
                <View key={i} style={p.line}>
                  <Text style={p.qty}>{l.quantity}×</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={p.meal}>{title(l.meal)}</Text>
                    <Text style={p.muted}>
                      {title(l.restaurant)}
                      {l.extras.length ? ` · ${l.extras.map((e) => e.name_ar || e.name).join("، ")}` : ""}
                    </Text>
                  </View>
                  <Text style={p.lineTotal}>{money(lineTotal(l))}</Text>
                </View>
              ))}
              <View style={[p.line, p.totalRow]}>
                <Text style={p.section}>المجموع</Text>
                <Text style={p.total}>{money(total)}</Text>
              </View>
            </View>
          ) : null}

          {lines.length ? (
            <Button label="ضيف الباقة للسلة" tone="green" onPress={addAll} />
          ) : (
            <Text style={p.muted}>اختار الوجبات من قائمة المطعم:</Text>
          )}
          {[...new Set((data.value?.items || []).map((it) => String(it.restaurant_id)))].map((rid) => {
            const r = lines.find((l) => String(l.restaurant.id) === rid)?.restaurant;
            return (
              <Button
                key={rid}
                tone="ghost"
                label={r ? `غيّر بالطلب من ${title(r)}` : "شوف قائمة المطعم"}
                onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: rid } })}
              />
            );
          })}
          <View style={p.hint}>
            <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
            <Text style={p.muted}>بتقدر تعدّل الكميات من السلة قبل ما تطلب.</Text>
          </View>
        </>
      ) : null}
    </Page>
  );
}

const p = StyleSheet.create({
  hero: { borderRadius: 22, overflow: "hidden" },
  price: { position: "absolute", bottom: 14, left: 14, paddingHorizontal: 20 },
  priceText: { fontFamily: font.black, fontSize: 24, color: colors.white },
  pill: { alignSelf: "flex-end", backgroundColor: colors.mint, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontFamily: font.bold, fontSize: 11, color: colors.green },
  muted: { fontFamily: font.regular, fontSize: 12, lineHeight: 20, color: colors.muted, textAlign: "right" },
  section: { fontFamily: font.bold, fontSize: 14, color: colors.teal, textAlign: "right" },
  line: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  qty: { fontFamily: font.black, fontSize: 14, color: colors.green, minWidth: 26, textAlign: "center" },
  meal: { fontFamily: font.bold, fontSize: 14, color: colors.ink, textAlign: "right" },
  lineTotal: { fontFamily: font.medium, fontSize: 13, color: colors.ink },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: 10, justifyContent: "space-between" },
  total: { fontFamily: font.black, fontSize: 18, color: colors.teal },
  hint: { flexDirection: "row-reverse", alignItems: "center", gap: 6, justifyContent: "center" },
});
