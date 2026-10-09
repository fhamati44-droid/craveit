import { useCallback, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { colors, Page, Status, Txt, useS } from "../components/ui";
import { useT } from "../lib/i18n";
import { SuggestionCard } from "../components/cards";
import { useStore } from "../lib/state";
import { useLoad } from "../lib/useLoad";
export default function Suggestions() {
  const { mood } = useLocalSearchParams<{ mood?: string }>();
  const { api } = useStore();
  const { t: tr, pkg } = useT();
  const s = useS();
  const [tier, setTier] = useState("all");
  const load = useCallback(() => api.suggestions(mood), [api, mood]);
  const data = useLoad(load);
  const sets = data.value?.sets?.filter(
    (x) => x.is_active !== false && (tier === "all" || x.package_level === tier),
  );
  return (
    <Page>
      <Text style={s.heading}>{tr("suggestionsTitle")}</Text>
      <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
        {["all", "classic", "mix", "plus"].map((t) => (
          <Pressable
            key={t}
            style={[s.chip, tier === t && s.chipOn]}
            onPress={() => setTier(t)}
            accessibilityRole="button"
            accessibilityState={{ selected: tier === t }}
          >
            <Text
              style={[
                s.text,
                { fontSize: 12, color: tier === t ? colors.white : colors.ink },
              ]}
            >
              {t === "all" ? tr("all") : pkg(t)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Status
        loading={data.loading}
        error={data.error}
        retry={() => void data.reload()}
      />
      {sets?.map((set) => (
        <SuggestionCard key={set.id} set={set} width="100%" />
      ))}
      {sets?.length === 0 && <Txt muted>{tr("noMoodSuggestions")}</Txt>}
    </Page>
  );
}
