import { useCallback, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, colors, money, Page, Picture, Status, Txt, useS } from "./ui";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/state";
import { useLoad } from "../lib/useLoad";
import {
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
  const { t, name, desc } = useT();
  const s = useS();
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
      setError(t("chooseFirst", { name: missing.group_name }));
      return;
    }
    add({ meal, restaurant, quantity, note: note.trim(), extras });
    close();
  };
  return (
    <Modal animationType="slide" onRequestClose={close}>
      <SafeAreaView style={s.page}>
        <Page>
          <Button label={t("close")} onPress={close} />
          <Picture uri={meal.image_url} />
          <Text style={s.heading}>{name(meal)}</Text>
          <Txt muted>{desc(meal)}</Txt>
          <Txt>{money(Number(meal.price))}</Txt>
          <Status
            loading={data.loading}
            error={data.error}
            retry={() => void data.reload()}
          />
          {data.value?.map((group) => (
            <View key={group.id} style={s.card}>
              <Txt>
                {group.group_name} {group.required ? t("required") : ""}
              </Txt>
              <Txt muted>{t("upTo", { n: group.max_select || 1 })}</Txt>
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
                    {name(option)} · {money(Number(option.price || 0))}
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
            placeholder={t("mealNotePh")}
            placeholderTextColor={colors.muted}
            accessibilityLabel={t("mealNote")}
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
            label={t("addToCart", { p: money(unit * quantity) })}
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
