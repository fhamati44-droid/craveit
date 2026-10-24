import { useCallback } from "react";
import { router } from "expo-router";
import { Linking } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, font, Page, RtlRow, Status } from "../../components/ui";
import { TamamMark, Tri, TrianglePattern } from "../../components/brand";
import { RestaurantCard, SuggestionCard } from "../../components/cards";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { imageUrl } from "../../lib/media";
import { moodIcon } from "../../lib/moods";
import { useT } from "../../lib/i18n";
import { WHATSAPP_NUMBER } from "../../lib/orders";
import { getPublishedMenus } from "../../lib/dailyMeals";

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
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  const dailyMenus = useLoad(useCallback(() => getPublishedMenus(today, today), [today]));
  const sets =
    suggestions.value?.sets?.filter((x) => x.is_active !== false).slice(0, 6) ||
    [];
  const goSuggestions = () => router.push("/suggestions");
  // Use today's actual meal photo so the home hero stays connected to the daily-meal landing page.
  const heroImage =
    dailyMenus.value?.find((meal) => meal.image_url)?.image_url ||
    sets.find((set) => set.hero_image_url)?.hero_image_url ||
    restaurants.value?.find((restaurant) => restaurant.cover_url)?.cover_url ||
    site.value?.covers?.find((cover) => cover.type !== "video" && cover.url)?.url ||
    site.value?.cover_url;
  return (
    <Page>
      <View style={h.hero}>
        {heroImage ? (
          <Image
            nativeID="home-hero-photo"
            source={{ uri: imageUrl(heroImage) }}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%" }}
            resizeMode="cover"
            accessibilityLabel={t("mealImage")}
          />
        ) : null}
          <LinearGradient
            colors={["rgba(7,29,27,0.02)", "rgba(7,29,27,0.18)", "rgba(7,29,27,0.88)"]}
            locations={[0, 0.46, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {!heroImage ? <TrianglePattern opacity={0.08} /> : null}
          <View style={h.heroCopy}>
            <Text style={h.eyebrow}>{t("homeEyebrow")}</Text>
            <Text style={h.heroTitle}>{t("homeTitle")}</Text>
            <Text style={h.heroSub}>{t("homeSub")}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/daily-meal")}
              style={h.heroCtaButton}
            >
              <View
                style={f({
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 8,
                })}
              >
                <Text style={h.heroCta}>{t("dailyHomeCard")}</Text>
                <Ionicons name={fwd("arrow-back")} size={18} color={colors.tealDeep} />
              </View>
            </Pressable>
            <View style={h.contactActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`)}
                style={h.contactButton}
              >
                <Ionicons name="logo-whatsapp" size={16} color={colors.white} />
                <Text style={h.contactLabel}>{t("whatsappUs")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void Linking.openURL(`tel:+${WHATSAPP_NUMBER}`)}
                style={h.contactButton}
              >
                <Ionicons name="call-outline" size={15} color={colors.white} />
                <Text style={h.contactLabel}>{t("callUs")}</Text>
              </Pressable>
            </View>
          </View>
          {!heroImage ? <View style={h.heroMark}><TamamMark size={54} color={colors.white} /></View> : null}
      </View>

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
    borderRadius: 14,
    overflow: "hidden",
    minHeight: 350,
    justifyContent: "flex-end",
    padding: 20,
    backgroundColor: colors.tealDeep,
  },
  heroCopy: { gap: 7, alignItems: "flex-end", zIndex: 1 },
  eyebrow: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.bright,
    textAlign: "right",
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: font.medium,
    fontSize: 30,
    lineHeight: 42,
    color: colors.white,
    textAlign: "right",
  },
  heroSub: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 22,
    color: "#CFE3DE",
    textAlign: "right",
  },
  heroCta: { fontFamily: font.black, fontSize: 14, color: colors.tealDeep },
  heroCtaButton: {
    alignSelf: "flex-end",
    marginTop: 5,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: colors.bright,
  },
  heroMark: {
    position: "absolute",
    top: 22,
    alignSelf: "center",
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  contactActions: {
    flexDirection: "row-reverse",
    alignSelf: "stretch",
    alignItems: "center",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.28)",
    paddingTop: 9,
    marginTop: 1,
  },
  contactButton: { flexDirection: "row-reverse", alignItems: "center", gap: 6, minHeight: 34 },
  contactLabel: { fontFamily: font.medium, fontSize: 11, color: colors.white },
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
    borderRadius: 12,
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
