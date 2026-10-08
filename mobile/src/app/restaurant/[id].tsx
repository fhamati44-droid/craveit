import { useCallback, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  Button,
  colors,
  money,
  Page,
  Picture,
  s,
  Status,
  Txt,
} from "../../components/ui";
import { MealSheet } from "../../components/MealSheet";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { title, type Meal } from "../../lib/types";
export default function Restaurant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, count } = useStore();
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
          <Text style={s.heading}>{title(restaurant)}</Text>
          <Txt muted>
            {restaurant.description_ar || restaurant.description || ""}
          </Txt>
          {(restaurant.is_open ?? restaurant.active) === false && (
            <Txt>المطعم مغلق حالياً</Txt>
          )}
          <TextInput
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="فتّش بالقائمة"
            placeholderTextColor={colors.muted}
            accessibilityLabel="بحث قائمة المطعم"
          />
          {data.value?.categories.map((category) => (
            <View key={category.id} style={{ gap: 12 }}>
              <Text style={s.heading}>{title(category)}</Text>
              {category.items
                .filter((meal) =>
                  title(meal)
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
                    <Txt>{title(meal)}</Txt>
                    <Txt muted>{meal.description || ""}</Txt>
                    <Txt>
                      {money(Number(meal.price))}{" "}
                      {meal.is_available === false ? "· غير متوفر" : ""}
                    </Txt>
                  </Pressable>
                ))}
            </View>
          ))}
          {data.value?.categories.length === 0 && (
            <Txt>القائمة غير منشورة حالياً.</Txt>
          )}
          {count > 0 && (
            <Button
              label={`شوف السلة · ${count} وجبات`}
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
