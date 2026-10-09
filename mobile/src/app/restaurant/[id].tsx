import { useCallback, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  Button,
  colors,
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
export default function Restaurant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, count } = useStore();
  const { t, name, desc } = useT();
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
          <Picture uri={restaurant.cover_url || restaurant.image_url} />
          <Text style={s.heading}>{name(restaurant)}</Text>
          <Txt muted>
            {desc(restaurant)}
          </Txt>
          {(restaurant.is_open ?? restaurant.active) === false && (
            <Txt>{t("restaurantClosed")}</Txt>
          )}
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
