import { useCallback, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Button, money, Page, Picture, s, Status, Txt } from "../components/ui";
import { useStore } from "../lib/state";
import { useLoad } from "../lib/useLoad";
export default function Suggestions() {
  const { mood } = useLocalSearchParams<{ mood?: string }>();
  const { api } = useStore();
  const [tier, setTier] = useState("all");
  const load = useCallback(() => api.suggestions(mood), [api, mood]);
  const data = useLoad(load);
  const sets = data.value?.sets?.filter(
    (x) => tier === "all" || x.package_level === tier,
  );
  return (
    <Page>
      <Text style={s.heading}>اقتراحات TAMAM</Text>
      <View style={[s.row, { flexWrap: "wrap" }]}>
        {["all", "classic", "mix", "plus"].map((t) => (
          <Pressable
            key={t}
            style={s.chip}
            onPress={() => setTier(t)}
            accessibilityRole="button"
            accessibilityState={{ selected: tier === t }}
          >
            <Txt>
              {tier === t ? "✓ " : ""}
              {t === "all" ? "الكل" : t}
            </Txt>
          </Pressable>
        ))}
      </View>
      <Status
        loading={data.loading}
        error={data.error}
        retry={() => void data.reload()}
      />
      {sets?.map((set) => (
        <View key={set.id} style={s.card}>
          <Picture uri={set.hero_image_url} />
          <Text style={s.heading}>{set.title_ar || set.title}</Text>
          <Txt muted>{set.description_ar || ""}</Txt>
          <Txt>
            {set.package_level}{" "}
            {set.display_price_override != null || set.display_price != null
              ? money(set.display_price_override ?? set.display_price ?? 0)
              : ""}
          </Txt>
          <Button
            label="شوف الاقتراح"
            onPress={() =>
              router.push({
                pathname: "/suggestion/[id]",
                params: { id: String(set.id) },
              })
            }
          />
        </View>
      ))}
      {sets?.length === 0 && <Txt>ما في اقتراحات منشورة لهالمود.</Txt>}
    </Page>
  );
}
