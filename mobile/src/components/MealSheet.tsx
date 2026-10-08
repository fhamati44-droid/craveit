import { useCallback, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, colors, money, Page, Picture, s, Status, Txt } from "./ui";
import { useStore } from "../lib/state";
import { useLoad } from "../lib/useLoad";
import {
  title,
  type Extra,
  type ExtraGroup,
  type Meal,
  type Restaurant,
} from "../lib/types";
export function MealSheet({
  meal,
  restaurant,
  close,
}: {
  meal: Meal;
  restaurant: Restaurant;
  close: () => void;
}) {
  const { api, add } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Record<string, Extra[]>>({});
  const [error, setError] = useState("");
  const load = useCallback(() => api.extras(meal.id), [api, meal.id]);
  const data = useLoad(load);
  const extras = Object.values(selected).flat();
  const unit =
    Number(meal.price) +
    extras.reduce((sum, x) => sum + Number(x.price || 0), 0);
  const toggle = (group: ExtraGroup, option: Extra) => {
    setError("");
    setSelected((previous) => {
      const key = String(group.id);
      const old = previous[key] || [];
      const exists = old.some((x) => x.id === option.id);
      const max = Number(group.max_select || 1);
      if (exists)
        return { ...previous, [key]: old.filter((x) => x.id !== option.id) };
      if (max === 1) return { ...previous, [key]: [option] };
      if (old.length >= max) {
        return previous;
      }
      return { ...previous, [key]: [...old, option] };
    });
  };
  const submit = () => {
    const missing = data.value?.find(
      (group) =>
        (selected[String(group.id)] || []).length <
        Math.max(Number(group.min_select || 0), group.required ? 1 : 0),
    );
    if (missing) {
      setError(`اختار ${missing.group_name} قبل الإضافة.`);
      return;
    }
    add({ meal, restaurant, quantity, note: note.trim(), extras });
    close();
  };
  return (
    <Modal animationType="slide" onRequestClose={close}>
      <SafeAreaView style={s.page}>
        <Page>
          <Button label="إغلاق" onPress={close} />
          <Picture uri={meal.image_url} />
          <Text style={s.heading}>{title(meal)}</Text>
          <Txt muted>{meal.description || ""}</Txt>
          <Txt>{money(Number(meal.price))}</Txt>
          <Status
            loading={data.loading}
            error={data.error}
            retry={() => void data.reload()}
          />
          {data.value?.map((group) => (
            <View key={group.id} style={s.card}>
              <Txt>
                {group.group_name} {group.required ? "· مطلوب" : ""}
              </Txt>
              <Txt muted>حتى {group.max_select || 1} خيارات</Txt>
              {(group.menu_extra_options || []).map((option) => (
                <Pressable
                  key={option.id}
                  style={s.chip}
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: !!selected[String(group.id)]?.some(
                      (x) => x.id === option.id,
                    ),
                  }}
                  onPress={() => toggle(group, option)}
                >
                  <Txt>
                    {selected[String(group.id)]?.some((x) => x.id === option.id)
                      ? "✓  "
                      : "○  "}
                    {option.name} · {money(Number(option.price || 0))}
                  </Txt>
                </Pressable>
              ))}
            </View>
          ))}
          <TextInput
            style={s.input}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            placeholder="مثلاً: بدون بصل، صوص زيادة…"
            placeholderTextColor={colors.muted}
            accessibilityLabel="ملاحظات الوجبة"
          />
          <View style={s.row}>
            <Button
              label="+"
              onPress={() => setQuantity((n) => Math.min(99, n + 1))}
            />
            <Txt>{quantity}</Txt>
            <Button
              label="−"
              onPress={() => setQuantity((n) => Math.max(1, n - 1))}
            />
          </View>
          {!!error && (
            <Text
              style={[s.text, { color: colors.error }]}
              accessibilityRole="alert"
            >
              {error}
            </Text>
          )}
          <Button
            label={`إضافة للسلة · ${money(unit * quantity)}`}
            disabled={
              data.loading ||
              !!data.error ||
              !Number.isFinite(unit) ||
              unit <= 0 ||
              meal.is_available === false ||
              (restaurant.is_open ?? restaurant.active) === false
            }
            onPress={submit}
          />
        </Page>
      </SafeAreaView>
    </Modal>
  );
}
