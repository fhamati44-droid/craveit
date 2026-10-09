import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, Page, Status, Txt, useS } from "../../components/ui";
import { RestaurantCard } from "../../components/cards";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { useT } from "../../lib/i18n";
export default function Restaurants() {
  const { t, name, f } = useT();
  const s = useS();
  const { api } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const load = useCallback(() => api.restaurants(), [api]);
  const data = useLoad(load);
  const restaurants = data.value?.filter(
    (r) =>
      (!open || (r.is_open ?? r.active) !== false) &&
      `${name(r)} ${r.name_ar || ""} ${r.name || ""} ${r.description_ar || r.description || ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Page>
      <Text style={s.heading}>{t("craving")}</Text>
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
