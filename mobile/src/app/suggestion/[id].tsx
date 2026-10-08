import { useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";
import { Button, Page, Picture, s, Status, Txt } from "../../components/ui";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
export default function Suggestion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useStore();
  const load = useCallback(() => api.suggestion(id), [api, id]);
  const data = useLoad(load);
  return (
    <Page>
      <Status
        loading={data.loading}
        error={data.error}
        retry={() => void data.reload()}
      />
      {data.value?.set && (
        <>
          <Picture uri={data.value.set.hero_image_url} />
          <Text style={s.heading}>
            {data.value.set.title_ar || data.value.set.title}
          </Text>
          <Txt>{data.value.set.description_ar || ""}</Txt>
          <Txt muted>
            اختار الوجبات والتخصيص من قائمة المطعم قبل الإضافة للسلة.
          </Txt>
          {Array.from(
            new Set(data.value.items.map((item) => String(item.restaurant_id))),
          ).map((rid) => (
            <View key={rid} style={s.card}>
              <Button
                label="شوف قائمة المطعم"
                onPress={() =>
                  router.push({
                    pathname: "/restaurant/[id]",
                    params: { id: rid },
                  })
                }
              />
            </View>
          ))}
        </>
      )}
    </Page>
  );
}
