import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, font, Page, Status, Txt, useS } from "../../components/ui";
import { RestaurantCard } from "../../components/cards";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { useT } from "../../lib/i18n";
export default function Restaurants() {
  const { t, restaurantName, f } = useT();
  const s = useS();
  const { api } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const load = useCallback(() => api.restaurants(), [api]);
  const data = useLoad(load);
  const restaurants = data.value?.filter(
    (r) =>
      (!open || (r.is_open ?? r.active) !== false) &&
      `${restaurantName(r)} ${r.name_ar || ""} ${r.name || ""} ${r.description_ar || r.description || ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Page>
      <View style={landing.hero}>
        <View style={landing.rule} />
        <Text style={landing.eyebrow}>{t("restaurantLandingEyebrow")}</Text>
        <Text style={landing.title}>{t("craving")}</Text>
        <Text style={landing.sub}>{t("restaurantLandingSub")}</Text>
      </View>
      <View style={{ justifyContent: "center" }}>
        <TextInput
          style={[s.input, f({ paddingRight: 44 })]}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel={t("searchRestaurants")}
        />
        <Ionicons
          name="search"
          size={19}
          color={colors.teal}
          style={f({ position: "absolute", right: 14 })}
        />
      </View>
      <View style={s.row}>
        {[
          [false, t("allRestaurants")],
          [true, t("openNow")],
        ].map(([value, label]) => (
          <Pressable
            key={String(label)}
            accessibilityRole="button"
            accessibilityState={{ selected: open === value }}
            onPress={() => setOpen(value as boolean)}
            style={[s.chip, open === value && s.chipOn]}
          >
            <Text
              style={[
                s.text,
                { fontSize: 12, color: open === value ? colors.white : colors.ink },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Status
        loading={data.loading}
        error={data.error}
        retry={() => void data.reload()}
      />
      {restaurants?.map((r) => (
        <RestaurantCard key={r.id} restaurant={r} width="100%" />
      ))}
      {restaurants?.length === 0 && <Txt muted>{t("noRestaurants")}</Txt>}
    </Page>
  );
}

const landing = StyleSheet.create({
  hero: { backgroundColor: colors.tealDeep, padding: 20, gap: 7, borderRadius: 14, alignItems: "flex-end" },
  rule: { width: 42, height: 2, backgroundColor: colors.gold, marginBottom: 2 },
  eyebrow: { color: colors.bright, fontFamily: font.bold, fontSize: 10, letterSpacing: 1, textAlign: "right" },
  title: { color: colors.white, fontFamily: font.black, fontSize: 24, lineHeight: 34, textAlign: "right" },
  sub: { color: "#D6E2DD", fontFamily: font.regular, fontSize: 12, lineHeight: 20, textAlign: "right" },
});
