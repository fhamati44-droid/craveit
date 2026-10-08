import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, money, Page, s } from "../components/ui";
import { useStore } from "../lib/state";
import { title } from "../lib/types";
import { groupByRestaurant, lineTotal } from "../lib/orders";

export default function Cart() {
  const { lines, quantity, subtotal } = useStore();
  if (!lines.length)
    return (
      <Page>
        <View style={c.empty}>
          <View style={c.emptyIcon}>
            <Ionicons name="bag-handle-outline" size={34} color={colors.teal} />
          </View>
          <Text style={c.emptyTitle}>سلتك فاضية</Text>
          <Text style={c.muted}>محتار شو تطلب؟ خلّي TAMAM تختارلك.</Text>
        </View>
        <Button label="العب TAMAM" tone="green" onPress={() => router.push("/game")} />
        <Button label="تصفّح المطاعم" tone="ghost" onPress={() => router.push("/restaurants")} />
      </Page>
    );
  const groups = groupByRestaurant(lines);
  return (
    <Page>
      <Text style={s.heading}>سلتك</Text>
      {groups.map((group) => (
        <View key={String(group[0].restaurant.id)} style={s.card}>
          <View style={c.restRow}>
            <Ionicons name="storefront-outline" size={16} color={colors.green} />
            <Text style={c.restName}>{title(group[0].restaurant)}</Text>
          </View>
          {group.map((line) => {
            const key = line.key;
            return (
              <View key={key} style={c.line}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={c.meal}>{title(line.meal)}</Text>
                  {line.extras.length ? (
                    <Text style={c.muted}>
                      {line.extras.map((x) => x.name_ar || x.name).join("، ")}
                    </Text>
                  ) : null}
                  {line.note ? <Text style={c.muted}>“{line.note}”</Text> : null}
                  <Text style={c.price}>{money(lineTotal(line))}</Text>
                </View>
                <View style={c.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="زيادة"
                    style={c.step}
                    onPress={() => quantity(key, line.quantity + 1)}
                  >
                    <Ionicons name="add" size={18} color={colors.teal} />
                  </Pressable>
                  <Text style={c.qty}>{line.quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={line.quantity === 1 ? "حذف" : "تنقيص"}
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
          طلبك من {groups.length} مطاعم، كل مطعم بيوصل لحاله ومع رسوم توصيله.
        </Text>
      ) : null}
      <View style={c.total}>
        <Text style={c.totalLabel}>مجموع الوجبات</Text>
        <Text style={c.totalValue}>{money(subtotal)}</Text>
      </View>
      <Button label="كمّل للدفع" tone="green" onPress={() => router.push("/checkout")} />
    </Page>
  );
}

const c = StyleSheet.create({
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
