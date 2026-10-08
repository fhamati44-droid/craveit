import { useCallback, useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { Button, Page, Picture, s, Status, Txt } from "../../components/ui";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { title } from "../../lib/types";
export default function Restaurants() {
  const { api } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const load = useCallback(() => api.restaurants(), [api]);
  const data = useLoad(load);
  const restaurants = data.value?.filter(
    (r) =>
      (!open || (r.is_open ?? r.active) !== false) &&
      `${title(r)} ${r.description_ar || r.description || ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Page>
      <Text style={s.heading}>شو عبالك اليوم؟</Text>
      <TextInput
        style={s.input}
        placeholder="فتّش عن مطعم"
        placeholderTextColor="#C0CAB8"
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="بحث المطاعم"
      />
      <Button
        label={open ? "كل المطاعم" : "مفتوح هسا"}
        onPress={() => setOpen(!open)}
      />
      <Status
        loading={data.loading}
        error={data.error}
        retry={() => void data.reload()}
      />
      {restaurants?.map((r) => (
        <Pressable
          key={r.id}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/restaurant/[id]",
              params: { id: String(r.id) },
            })
          }
          style={s.card}
        >
          <Picture uri={r.cover_url || r.image_url} />
          <Text style={s.heading}>{title(r)}</Text>
          <Txt muted>{r.description_ar || r.description || ""}</Txt>
          <View style={s.row}>
            <Txt>{(r.is_open ?? r.active) === false ? "مغلق" : "مفتوح"}</Txt>
            {r.delivery_time != null && (
              <Txt muted>{r.delivery_time} دقيقة</Txt>
            )}
            {r.delivery_fee != null && <Txt muted>توصيل ₪{r.delivery_fee}</Txt>}
          </View>
        </Pressable>
      ))}
      {restaurants?.length === 0 && <Txt>ما لقينا مطاعم مناسبة.</Txt>}
    </Page>
  );
}
