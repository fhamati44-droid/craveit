import { useCallback, useMemo } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, font, money, RtlRow, Status } from "./ui";
import { FoodImage } from "./cards";
import { useT } from "../lib/i18n";
import { useLoad } from "../lib/useLoad";
import { loadBasketCatalog, type OrderableOffer } from "../lib/basketCatalog";
import { DEFAULT_BASKET_INPUT, type BasketInput } from "../lib/basketEngine";
import { mealRelations } from "../lib/basketProfiles";
import { recommendMealBaskets } from "../lib/multiBasketEngine";

// Render the existing planner's live results, never the Stitch sample prices.
export function HomeTablePreview() {
  const { lang, sheet, name, restaurantName } = useT();
  const s = sheet(styles);
  const copy = (ar: string, he: string, en: string) => lang === "en" ? en : lang === "he" ? he : ar;
  const catalog = useLoad(useCallback(() => loadBasketCatalog(), []));
  const events = useMemo(() => {
    const definitions: { id: string; input: BasketInput }[] = [
      { id: "family", input: { ...DEFAULT_BASKET_INPUT, period: "lunch" } },
      { id: "friends", input: { ...DEFAULT_BASKET_INPUT, period: "dinner", gathering: "friends", occasion: "guests", profile: "variety" } },
      { id: "brunch", input: { ...DEFAULT_BASKET_INPUT, period: "brunch", people: 2 } },
    ];
    const now = new Date();
    return definitions.map(event => ({ ...event, basket: catalog.value ? recommendMealBaskets(catalog.value, mealRelations, event.input, now)[0]?.best : undefined }));
  }, [catalog.value]);
  const selected = events.find(event => event.basket);
  const open = (event: typeof events[number]) => router.push({ pathname: "/basket", params: { homeInput: JSON.stringify(event.input), homeGroup: event.basket?.group || "" } });
  const eventName = (id: string) => id === "family" ? copy("غدا العيلة", "ארוחה למשפחה", "Family lunch") : id === "friends" ? copy("لمّة صحاب", "מפגש חברים", "Friends gathering") : copy("ترويقة على مهلك", "בראנץ׳ בנחת", "A relaxed brunch");
  return <View style={s.section}>
    <Text style={s.heading}>{copy("اقتراحات حسب اللمّة", "הצעות לכל מפגש", "For your gathering")}</Text>
    <Text style={s.muted}>{copy("حسب العدد ونوع اللمّة، من قوائم المطاعم الحالية.", "לפי מספר הסועדים והמפגש, מתפריטי המסעדות הנוכחיים.", "For your party size and occasion, from current restaurant menus.")}</Text>
    <RtlRow>{events.map(event => <Pressable key={event.id} accessibilityRole="button" onPress={() => open(event)} style={s.event}>
      <Ionicons name={event.id === "brunch" ? "sunny-outline" : "people-outline"} size={24} color={colors.gold} />
      <Text style={s.muted}>{event.input.people} {copy("أشخاص", "סועדים", "people")}</Text>
      <Text style={s.heading}>{eventName(event.id)}</Text>
      <Text style={s.muted}>{event.basket ? event.basket.lines.map(line => line.offer.name).join("، ") : copy("شوف الاقتراحات وعدّل على ذوقك", "לצפייה בהצעות ולהתאמה לטעם שלך", "Explore suggestions and make them yours")}</Text>
      {event.basket ? <Text style={s.amount}>{money(event.basket.total)}</Text> : null}
    </Pressable>)}</RtlRow>
    <Status loading={catalog.loading} error={catalog.error} retry={catalog.reload} />
    {selected?.basket ? <View style={s.table}>
      <Text style={s.eyebrow}>{copy("طاولة مقترحة · قابلة للتعديل", "שולחן מוצע · ניתן לשינוי", "A suggested table · Yours to edit")}</Text>
      <Text style={s.heading}>{eventName(selected.id)}</Text>
      {selected.basket.lines.map(line => {
        const offer = line.offer as OrderableOffer;
        return <View key={offer.uid} style={s.dish}>
          <View style={s.photo}><FoodImage uri={offer.meal.image_url} height={82} /></View>
          <View style={s.dishCopy}>
            <Text style={s.dishName}>{name(offer.meal) || offer.name}</Text>
            <Text style={s.muted}>{restaurantName(offer.restaurant)}</Text>
            <Text style={s.equation}>{line.quantity} × {money(offer.price)} = {money(line.quantity * offer.price)}</Text>
          </View>
        </View>;
      })}
      <View style={s.summary}><Text style={s.muted}>{copy("مجموع الأصناف", "סכום המנות", "Items")}</Text><Text style={s.amount}>{money(selected.basket.subtotal)}</Text></View>
      <View style={s.summary}><Text style={s.muted}>{copy("التوصيل", "משלוח", "Delivery")}</Text><Text style={s.amount}>{money(selected.basket.delivery)}</Text></View>
      <View style={s.summary}><Text style={s.heading}>{copy("المجموع", "סך הכול", "Total")}</Text><Text style={s.amount}>{money(selected.basket.total)}</Text></View>
      <Pressable accessibilityRole="button" onPress={() => open(selected)} style={s.action}><Text style={s.actionText}>{copy("استكشف وعدّل الطاولة", "לצפייה ולשינוי השולחן", "Explore and edit your table")}</Text></Pressable>
    </View> : !catalog.loading && !catalog.error ? <Text style={s.muted}>{copy("ما في طاولة مطابقة حاليًا. رتّب طاولتك لتغيير العدد والميزانية.", "אין כרגע שולחן מתאים. אפשר לשנות מספר סועדים ותקציב בהרכבת השולחן.", "No matching table right now. Adjust party size and budget in the table planner.")}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  heading: { fontFamily: font.bold, fontSize: 19, lineHeight: 31, color: colors.teal, textAlign: "right" },
  muted: { fontFamily: font.regular, fontSize: 13, lineHeight: 23, color: colors.muted, textAlign: "right" },
  eyebrow: { fontFamily: font.medium, fontSize: 12, lineHeight: 22, color: colors.gold, textAlign: "right" },
  event: { width: 250, padding: 18, gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: 12 },
  table: { padding: 20, gap: 14, borderWidth: 1, borderColor: colors.outline, borderRadius: 16, backgroundColor: colors.surface },
  dish: { flexDirection: "row-reverse", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.outline, alignItems: "center" },
  photo: { width: 82, borderRadius: 8, overflow: "hidden" },
  dishCopy: { flex: 1, gap: 4 },
  dishName: { fontFamily: font.bold, fontSize: 14, lineHeight: 24, color: colors.teal, textAlign: "right" },
  equation: { fontFamily: font.medium, fontSize: 12, lineHeight: 22, color: colors.teal, writingDirection: "ltr", textAlign: "right" },
  summary: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  amount: { fontFamily: font.bold, fontSize: 16, lineHeight: 28, color: colors.teal, writingDirection: "ltr" },
  action: { backgroundColor: colors.teal, padding: 16, minHeight: 52, borderRadius: 10 },
  actionText: { fontFamily: font.bold, fontSize: 14, lineHeight: 24, color: colors.white, textAlign: "center" },
});
