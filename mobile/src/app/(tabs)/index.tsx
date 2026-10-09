import { useCallback } from "react";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, font, Page, RtlRow, Status } from "../../components/ui";
import { Brush, TamamMark, Tri, TrianglePattern } from "../../components/brand";
import { RestaurantCard, SuggestionCard } from "../../components/cards";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { imageUrl } from "../../lib/media";
import { moodIcon } from "../../lib/moods";
import { useT } from "../../lib/i18n";

function SectionTitle({
  label,
  sub,
  open,
}: {
  label: string;
  sub?: string;
  open?: () => void;
}) {
  const { t, sheet, f, fwd } = useT();
  const h = sheet(hs);
  return (
    <View style={h.sectionTitle}>
      <View style={{ flex: 1 }}>
        <View
          style={f({ flexDirection: "row-reverse", alignItems: "center", gap: 8 })}
        >
          <Tri size={12} color={colors.green} />
          <Text style={h.heading}>{label}</Text>
        </View>
        {sub ? <Text style={h.muted}>{sub}</Text> : null}
      </View>
      {open ? (
        <Pressable onPress={open} accessibilityRole="button" style={h.all}>
          <Text style={h.link}>{t("viewAll")}</Text>
          <Ionicons name={fwd("chevron-back")} size={15} color={colors.teal} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function Home() {
  const { api } = useStore();
  const { t, name, sheet, f, fwd } = useT();
  const h = sheet(hs);
  const site = useLoad(useCallback(() => api.settings(), [api]));
  const restaurants = useLoad(useCallback(() => api.restaurants(), [api]));
  const suggestions = useLoad(useCallback(() => api.suggestions(), [api]));
  const moods = useLoad(useCallback(() => api.moods(), [api]));
  const sets =
    suggestions.value?.sets?.filter((x) => x.is_active !== false).slice(0, 6) ||
    [];
  const goSuggestions = () => router.push("/suggestions");
  // Hero image: first image cover from site_settings (old site's admin),
  // else the first restaurant's cover.
  const heroImage =
    site.value?.covers?.find((c) => c.type !== "video" && c.url)?.url ||
    site.value?.cover_url ||
    restaurants.value?.[0]?.cover_url;
  return (
    <Page>
      {!site.loading ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/game")}
          style={({ pressed }) => [
            h.hero,
            pressed && { transform: [{ scale: 0.99 }] },
          ]}
        >
          <LinearGradient
            colors={[colors.tealMid, colors.teal, colors.tealDeep]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <TrianglePattern opacity={0.08} />
          <View style={h.heroCopy}>
            <Text style={h.eyebrow}>{t("homeEyebrow")}</Text>
            <Text style={h.heroTitle}>{t("homeTitle")}</Text>
            <Text style={h.heroSub}>{t("homeSub")}</Text>
            <Brush
              style={f({
                alignSelf: "flex-end",
                marginTop: 8,
                paddingHorizontal: 22,
                paddingVertical: 10,
              })}
            >
              <View
                style={f({
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 6,
                })}
              >
                <Text style={h.heroCta}>{t("go")}</Text>
                <Ionicons name={fwd("arrow-back")} size={18} color={colors.white} />
              </View>
            </Brush>
          </View>
          <View style={h.heroArt}>
            {heroImage ? (
              <Image
                source={{ uri: imageUrl(heroImage) }}
                style={h.heroImage}
              />
            ) : (
              <View style={[h.heroImage, h.heroMark]}>
                <TamamMark size={64} color={colors.white} />
              </View>
            )}
          </View>
        </Pressable>
      ) : null}

      {moods.value?.length ? (
        <View style={h.section}>
          <SectionTitle
            label={t("moodQuestion")}
            open={() => router.push("/game")}
          />
          <RtlRow>
            {moods.value.slice(0, 10).map((mood) => (
              <Pressable
                key={mood.id}
                accessibilityRole="button"
                style={h.mood}
                onPress={() =>
                  router.push({
                    pathname: "/suggestions",
                    params: { mood: String(mood.id) },
                  })
                }
              >
                <View style={h.moodCircle}>
                  <MaterialIcons
                    name={moodIcon(mood)}
                    size={28}
                    color={colors.teal}
                  />
                </View>
                <Text style={h.moodText} numberOfLines={2}>
                  {name(mood)}
                </Text>
              </Pressable>
            ))}
          </RtlRow>
        </View>
      ) : null}

      <View style={h.section}>
        <SectionTitle
          label={t("picksForYou")}
          sub={t("byMoodTime")}
          open={goSuggestions}
        />
        <Status
          loading={suggestions.loading}
          error={suggestions.error}
          retry={suggestions.reload}
        />
        <RtlRow>
          {sets.map((set) => (
            <SuggestionCard key={set.id} set={set} />
          ))}
        </RtlRow>
        {!suggestions.loading && !suggestions.error && !sets.length ? (
          <Text style={h.muted}>{t("noSuggestions")}</Text>
        ) : null}
      </View>

      <Pressable
        style={h.banner}
        onPress={() => router.push("/game")}
        accessibilityRole="button"
      >
        <View style={h.bannerIcon}>
          <TamamMark size={30} color={colors.teal} accent={colors.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={h.bannerTitle}>{t("undecided")}</Text>
          <Text style={h.muted}>{t("oneTap")}</Text>
        </View>
        <Ionicons name={fwd("chevron-back")} size={20} color={colors.teal} />
      </Pressable>

      <View style={h.section}>
        <SectionTitle
          label={t("nearby")}
          open={() => router.push("/restaurants")}
        />
        <Status
          loading={restaurants.loading}
          error={restaurants.error}
          retry={restaurants.reload}
        />
        <RtlRow>
          {restaurants.value?.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </RtlRow>
      </View>

      <View style={h.trust}>
        <Ionicons name="location" size={16} color={colors.green} />
        <Text style={h.muted}>{t("trust")}</Text>
      </View>
    </Page>
  );
}
const hs = StyleSheet.create({
  section: { gap: 12, marginTop: 6 },
  sectionTitle: { flexDirection: "row-reverse", alignItems: "center", gap: 16 },
  heading: {
    fontFamily: font.black,
    fontSize: 18,
    lineHeight: 30,
    color: colors.teal,
    textAlign: "right",
  },
  muted: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "right",
  },
  link: { fontFamily: font.bold, color: colors.teal, fontSize: 12 },
  all: {
    flexDirection: "row-reverse",
    gap: 2,
    alignItems: "center",
    minHeight: 44,
  },
  hero: {
    borderRadius: 26,
    overflow: "hidden",
    minHeight: 210,
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 18,
    gap: 12,
  },
  heroCopy: { flex: 1.25, gap: 4 },
  eyebrow: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.bright,
    textAlign: "right",
  },
  heroTitle: {
    fontFamily: font.black,
    fontSize: 24,
    lineHeight: 36,
    color: colors.white,
    textAlign: "right",
  },
  heroSub: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 20,
    color: "#CFE3DE",
    textAlign: "right",
  },
  heroCta: { fontFamily: font.black, fontSize: 16, color: colors.white },
  heroArt: { flex: 1, alignItems: "center" },
  heroImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.9)",
  },
  heroMark: {
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  mood: { width: 76, alignItems: "center", gap: 6 },
  moodCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.mint,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  moodText: {
    fontFamily: font.medium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.ink,
    textAlign: "center",
  },
  banner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.mint,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#CFE8CB",
  },
  bannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontFamily: font.black,
    fontSize: 15,
    color: colors.teal,
    textAlign: "right",
  },
  trust: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
});
