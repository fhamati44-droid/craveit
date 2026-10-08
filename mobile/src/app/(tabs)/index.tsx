import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, colors, Page, Picture, s, Txt } from "../../components/ui";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
export default function Home() {
  const { api, connection, ready } = useStore();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const load = useCallback(() => api.home(), [api]);
  const data = useLoad(load);
  const hero = data.value?.sections?.find((section) =>
    ["home_hero", "hero"].includes(section.section_key),
  );
  let settings: {
    headline?: string;
    supporting_text?: string;
    media_id?: string;
  } = {};
  try {
    settings = JSON.parse(hero?.settings_json || "{}");
  } catch {
    /* Use the same default copy as HomeIntentHero. */
  }
  const visible =
    !hero ||
    (hero.enabled !== false &&
      (!hero.starts_at || Date.parse(hero.starts_at) <= now) &&
      (!hero.ends_at || Date.parse(hero.ends_at) >= now));
  const mediaId =
    settings.media_id ||
    data.value?.items?.find(
      (item) =>
        item.homepage_section_id === hero?.id &&
        item.enabled !== false &&
        item.media_id,
    )?.media_id;
  const media = mediaId ? data.value?.media_map?.[mediaId] : undefined;
  return (
    <Page>
      {visible && (
        <View
          style={{
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: colors.surface,
          }}
        >
          {!!media?.file_url && !media.media_type?.includes("video") && (
            <Picture uri={media.file_url} />
          )}
          <LinearGradient
            colors={["#262B29", "#0B0F0D"]}
            style={{ padding: 22, gap: 8 }}
          >
            <Txt muted>أهلاً في TAMAM</Txt>
            <Text style={s.heading}>
              {settings.headline || "شو عبالك تاكل اليوم؟"}
            </Text>
            <Txt muted>
              {settings.supporting_text || "إذا محتار، TAMAM بتسهّلها عليك."}
            </Txt>
          </LinearGradient>
        </View>
      )}
      <Button
        label="✦  فاجئني — خلّي TAMAM تختارلك وجبة"
        onPress={() => router.push("/game")}
      />
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Button
            label="اقتراحات TAMAM"
            onPress={() => router.push("/suggestions")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="فتّش" onPress={() => router.push("/restaurants")} />
        </View>
      </View>
      <Text style={s.heading}>حسب مودك والوقت</Text>
      <View style={s.card}>
        <Txt>للبيت · مع الصحاب · مشبعة · خفيفة</Txt>
        <Txt muted>اختار مودك، واكتشف اقتراحات كلاسيك، ميكس وبلس.</Txt>
        <Button label="شو مودك هسا؟" onPress={() => router.push("/game")} />
      </View>
      <Text style={s.heading}>مطاعم بنرشحها</Text>
      <Button
        label="استكشف كل المطاعم"
        onPress={() => router.push("/restaurants")}
      />
      {ready && !connection.appId && (
        <View style={s.card}>
          <Txt>
            تصميم TAMAM جاهز. يلزم ربط خادم CraveIt لعرض المطاعم والاقتراحات
            الحقيقية.
          </Txt>
          <Button label="ربط CraveIt" onPress={() => router.push("/profile")} />
        </View>
      )}
      {!!connection.appId && !!data.error && (
        <View style={s.card}>
          <Txt>{data.error}</Txt>
          <Button
            label="إعادة تحميل الصفحة"
            onPress={() => void data.reload()}
          />
        </View>
      )}
      <View style={s.card}>
        <Txt>اختيارات تستاهل التجربة</Txt>
        <Txt muted>السعر والتفاصيل من المطعم، قبل ما تضيف للسلة.</Txt>
      </View>
    </Page>
  );
}
