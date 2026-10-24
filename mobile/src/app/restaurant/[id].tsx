import { useCallback, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Button,
  colors,
  font,
  money,
  Page,
  Picture,
  Status,
  Txt,
  useS,
} from "../../components/ui";
import { useT } from "../../lib/i18n";
import { MealSheet } from "../../components/MealSheet";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import type { Meal } from "../../lib/types";
import { imageUrl } from "../../lib/media";
export default function Restaurant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, count } = useStore();
  const { t, name, restaurantName, desc } = useT();
  const s = useS();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Meal>();
  const load = useCallback(async () => {
    const [restaurant, categories] = await Promise.all([
      api.restaurant(id),
      api.menu(id),
    ]);
    return { restaurant, categories };
  }, [api, id]);
  const data = useLoad(load);
  const restaurant = data.value?.restaurant;
  return (
    <Page>
      <Status
        loading={data.loading}
        error={data.error}
        retry={() => void data.reload()}
      />
      {restaurant && (
        <>
          <View style={landing.hero}>
            {restaurant.cover_url || restaurant.image_url ? (
              <Image
                nativeID="restaurant-cover-photo"
                source={{ uri: imageUrl(restaurant.cover_url || restaurant.image_url) }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessibilityLabel={t("image")}
              />
            ) : null}
            <LinearGradient
              colors={["rgba(7,29,27,0.02)", "rgba(7,29,27,0.94)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={landing.heroCopy}>
              <Text style={landing.eyebrow}>TAMAM · {t("nearby")}</Text>
              <Text style={landing.title}>{restaurantName(restaurant)}</Text>
              {desc(restaurant) ? <Text style={landing.description}>{desc(restaurant)}</Text> : null}
              <View style={landing.metaRow}>
                {(restaurant.is_open ?? restaurant.active) === false ? (
                  <Text style={landing.closed}>{t("restaurantClosed")}</Text>
                ) : (
                  <Text style={landing.open}>{t("open")}</Text>
                )}
                {restaurant.delivery_time != null ? (
                  <Text style={landing.meta}><Ionicons name="time-outline" size={12} color={colors.white} /> {t("minutesShort", { n: restaurant.delivery_time })}</Text>
                ) : null}
              </View>
            </View>
          </View>
          <TextInput
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t("searchMenu")}
            placeholderTextColor={colors.muted}
            accessibilityLabel={t("searchMenu")}
          />
          {data.value?.categories.map((category) => (
            <View key={category.id} style={{ gap: 12 }}>
              <Text style={s.heading}>{name(category)}</Text>
              {category.items
                .filter((meal) =>
                  `${name(meal)} ${meal.name || ""} ${meal.name_ar || ""}`
                    .toLowerCase()
                    .includes(query.trim().toLowerCase()),
                )
                .map((meal) => (
                  <Pressable
                    key={meal.id}
                    accessibilityRole="button"
                    style={s.card}
                    onPress={() => setSelected(meal)}
                  >
                    <Picture uri={meal.image_url} />
                    <Txt>{name(meal)}</Txt>
                    <Txt muted>{desc(meal)}</Txt>
                    <Txt>
                      {money(Number(meal.price))}{" "}
                      {meal.is_available === false ? t("unavailable") : ""}
                    </Txt>
                  </Pressable>
                ))}
            </View>
          ))}
          {data.value?.categories.length === 0 && (
            <Txt>{t("menuUnpublished")}</Txt>
          )}
          {count > 0 && (
            <Button
              label={t("viewCartN", { n: count })}
              onPress={() => router.push("/cart")}
            />
          )}
        </>
      )}
      {selected && restaurant && (
        <MealSheet
          key={String(selected.id)}
          meal={selected}
          restaurant={restaurant}
          close={() => setSelected(undefined)}
        />
      )}
    </Page>
  );
}

const landing = StyleSheet.create({
  hero: { minHeight: 260, borderRadius: 14, overflow: "hidden", justifyContent: "flex-end", backgroundColor: colors.tealDeep },
  heroCopy: { gap: 7, padding: 18, alignItems: "flex-end" },
  eyebrow: { color: colors.bright, fontFamily: font.bold, fontSize: 10, letterSpacing: 1, textAlign: "right" },
  title: { color: colors.white, fontFamily: font.black, fontSize: 25, lineHeight: 34, textAlign: "right" },
  description: { color: "#E1E8E3", fontFamily: font.regular, fontSize: 12, lineHeight: 20, textAlign: "right" },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, marginTop: 2 },
  meta: { color: colors.white, fontFamily: font.medium, fontSize: 10, flexDirection: "row-reverse" },
  open: { color: colors.tealDeep, backgroundColor: colors.bright, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, fontFamily: font.bold, fontSize: 10 },
  closed: { color: colors.white, backgroundColor: colors.error, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, fontFamily: font.bold, fontSize: 10 },
});
