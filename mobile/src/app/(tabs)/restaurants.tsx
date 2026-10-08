import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, Page, s, Status, Txt } from "../../components/ui";
import { RestaurantCard } from "../../components/cards";
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
      <View style={{ justifyContent: "center" }}>
        <TextInput
          style={[s.input, { paddingRight: 44 }]}
          placeholder="فتّش عن مطعم أو أكلة"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="بحث المطاعم"
        />
        <Ionicons
          name="search"
          size={19}
          color={colors.teal}
          style={{ position: "absolute", right: 14 }}
        />
      </View>
      <View style={s.row}>
        {[
          [false, "كل المطاعم"],
          [true, "مفتوح هسا"],
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
      {restaurants?.length === 0 && <Txt muted>ما لقينا مطاعم مناسبة.</Txt>}
    </Page>
  );
}
