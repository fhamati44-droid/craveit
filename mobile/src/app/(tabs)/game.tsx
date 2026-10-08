import { useCallback } from "react";
import { router } from "expo-router";
import { Pressable, Text } from "react-native";
import { Page, s, Status, Txt } from "../../components/ui";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { title } from "../../lib/types";
export default function Game() {
  const { api } = useStore();
  const load = useCallback(() => api.moods(), [api]);
  const data = useLoad(load);
  return (
    <Page>
      <Text style={s.heading}>شو مودك هسا؟</Text>
      <Txt muted>اختار اللي بناسبك، وخلّي TAMAM تساعدك تختار.</Txt>
      <Status
        loading={data.loading}
        error={data.error}
        retry={() => void data.reload()}
      />
      {data.value?.map((mood) => (
        <Pressable
          key={mood.id}
          style={s.card}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/suggestions",
              params: { mood: String(mood.id) },
            })
          }
        >
          <Text style={s.heading}>
            {mood.emoji || "✦"} {title(mood)}
          </Text>
          <Txt muted>{mood.description_ar || ""}</Txt>
        </Pressable>
      ))}
      {data.value?.length === 0 && <Txt>ما في مودات منشورة حالياً.</Txt>}
    </Page>
  );
}
