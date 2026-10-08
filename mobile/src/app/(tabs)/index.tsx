import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, money, Page, s, Status } from "../../components/ui";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { imageUrl } from "../../lib/media";
import { title, type Section } from "../../lib/types";

const intents = [
  ["home-outline", "للبيت"],
  ["people-outline", "مع الصحاب"],
  ["restaurant-outline", "مشبعة"],
  ["leaf-outline", "خفيفة"],
] as const;
function SectionTitle({
  label,
  sub,
  open,
}: {
  label: string;
  sub?: string;
  open?: () => void;
}) {
  return (
    <View style={h.sectionTitle}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={h.heading}>{label}</Text>
        {sub ? <Text style={h.muted}>{sub}</Text> : null}
      </View>
      {open ? (
        <Pressable onPress={open} accessibilityRole="button" style={h.all}>
          <Text style={h.link}>عرض الكل</Text>
          <Ionicons name="arrow-back" size={17} color={colors.bright} />
        </Pressable>
      ) : null}
    </View>
  );
}
function FoodImage({ uri, height = 150 }: { uri?: string; height?: number }) {
  const [failed, setFailed] = useState(false);
  return uri && !failed ? (
    <Image
      source={{ uri: imageUrl(uri) }}
      style={{ height, width: "100%", backgroundColor: colors.high }}
      onError={() => setFailed(true)}
    />
  ) : (
    <View
      style={{
        height,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.high,
      }}
    >
      <Ionicons name="restaurant-outline" size={38} color={colors.green} />
    </View>
  );
}
export default function Home() {
  const { api } = useStore();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const home = useLoad(useCallback(() => api.home(), [api]));
  const restaurants = useLoad(useCallback(() => api.restaurants(), [api]));
  const suggestions = useLoad(useCallback(() => api.suggestions(), [api]));
  const moods = useLoad(useCallback(() => api.moods(), [api]));
  const section = (key: string, fallback?: string) =>
    home.value?.sections?.find((x) => x.section_key === key) ||
    home.value?.sections?.find((x) => x.section_key === fallback);
  const visible = (value: Section | undefined, defaultVisible = true) =>
    value
      ? value.enabled !== false &&
        (!value.starts_at || Date.parse(value.starts_at) <= now) &&
        (!value.ends_at || Date.parse(value.ends_at) >= now)
      : defaultVisible;
  const hero = section("home_hero", "hero");
  let settings: {
    headline?: string;
    supporting_text?: string;
    media_id?: string;
  } = {};
  try {
    settings = JSON.parse(hero?.settings_json || "{}") || {};
  } catch {}
  const mediaId =
    settings.media_id ||
    home.value?.items?.find(
      (x) =>
        x.homepage_section_id === hero?.id && x.enabled !== false && x.media_id,
    )?.media_id;
  const media = mediaId ? home.value?.media_map?.[mediaId] : undefined;
  const sets =
    suggestions.value?.sets?.filter((x) => x.is_active !== false).slice(0, 6) ||
    [];
  const suggestionSection = section("time_suggestions", "suggestions");
  const restaurantSection = section("featured_restaurants");
  const goSuggestions = () => router.push("/suggestions");
  return (
    <Page>
      {!home.loading && visible(hero) ? (
        <View style={h.hero}>
          <FoodImage
            uri={
              media?.media_type?.includes("video")
                ? undefined
                : media?.file_url || restaurants.value?.[0]?.cover_url
            }
            height={230}
          />
          <LinearGradient
            colors={["transparent", "#0B0F0D"]}
            style={h.heroShade}
          />
          <View style={h.heroCopy}>
            <Text style={h.eyebrow}>TAMAM · حسب مودك</Text>
            <Text style={h.heroTitle}>
              {settings.headline || "شو عبالك تاكل اليوم؟"}
            </Text>
            <Text style={h.muted}>
              {settings.supporting_text || "إذا محتار، TAMAM بتسهّلها عليك."}
            </Text>
          </View>
        </View>
      ) : null}
      <Pressable
        style={h.surprise}
        onPress={() => router.push("/game")}
        accessibilityRole="button"
      >
        <View style={h.spark}>
          <Ionicons name="sparkles" size={26} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={h.primaryText}>فاجئني</Text>
          <Text style={h.primarySub}>خلّي TAMAM تختارلك وجبة</Text>
        </View>
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
      </Pressable>
      <View style={h.secondaryRow}>
        <Pressable
          style={[h.secondary, { flex: 1.6 }]}
          onPress={goSuggestions}
          accessibilityRole="button"
        >
          <Ionicons name="restaurant-outline" size={23} color={colors.bright} />
          <View style={{ flex: 1 }}>
            <Text style={h.cardTitle}>اقتراحات TAMAM</Text>
            <Text style={h.small}>حسب مودك والوقت</Text>
          </View>
        </Pressable>
        <Pressable
          style={[
            h.secondary,
            {
              flex: 1,
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: "#303A31",
            },
          ]}
          onPress={() => router.push("/restaurants")}
          accessibilityRole="button"
        >
          <Ionicons name="search-outline" size={20} color={colors.muted} />
          <Text style={h.cardTitle}>فتّش</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={h.horizontal}
      >
        {intents.map(([icon, label]) => (
          <Pressable
            key={label}
            style={h.intent}
            onPress={goSuggestions}
            accessibilityRole="button"
          >
            <Ionicons name={icon} size={15} color={colors.bright} />
            <Text style={h.small}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {visible(suggestionSection) ? (
        <View style={h.section}>
          <SectionTitle
            label={suggestionSection?.title || "اختيارات TAMAM إلك"}
            sub="حسب مودك والوقت"
            open={goSuggestions}
          />
          <Status
            loading={suggestions.loading}
            error={suggestions.error}
            retry={suggestions.reload}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={h.horizontal}
          >
            {sets.map((set) => (
              <Pressable
                key={set.id}
                style={h.foodCard}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/suggestion/[id]",
                    params: { id: String(set.id) },
                  })
                }
              >
                <FoodImage uri={set.hero_image_url} />
                <View style={h.cardBody}>
                  <View style={h.pill}>
                    <Text style={h.pillText}>
                      {set.package_level === "plus"
                        ? "بلس"
                        : set.package_level === "mix"
                          ? "ميكس"
                          : "كلاسيك"}
                    </Text>
                  </View>
                  <Text style={h.cardTitle} numberOfLines={2}>
                    {set.title_ar || set.title}
                  </Text>
                  <View style={h.priceRow}>
                    {set.display_price_override != null ||
                    set.display_price != null ? (
                      <Text style={h.price}>
                        {money(
                          set.display_price_override ?? set.display_price ?? 0,
                        )}
                      </Text>
                    ) : null}
                    <Ionicons
                      name="arrow-back"
                      size={19}
                      color={colors.bright}
                    />
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          {!suggestions.loading && !suggestions.error && !sets.length ? (
            <Text style={h.muted}>ما في اقتراحات منشورة حالياً.</Text>
          ) : null}
        </View>
      ) : null}
      {visible(restaurantSection) ? (
        <View style={h.section}>
          <SectionTitle
            label={restaurantSection?.title || "مطاعم قريبة منك"}
            open={() => router.push("/restaurants")}
          />
          <Status
            loading={restaurants.loading}
            error={restaurants.error}
            retry={restaurants.reload}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={h.horizontal}
          >
            {restaurants.value?.map((restaurant) => (
              <Pressable
                key={restaurant.id}
                style={[h.foodCard, { width: 260 }]}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/restaurant/[id]",
                    params: { id: String(restaurant.id) },
                  })
                }
              >
                <FoodImage uri={restaurant.cover_url || restaurant.image_url} />
                <View style={h.cardBody}>
                  <Text style={h.cardTitle} numberOfLines={1}>
                    {title(restaurant)}
                  </Text>
                  <View style={h.priceRow}>
                    <Text style={h.small}>
                      {restaurant.delivery_fee != null
                        ? `توصيل ${money(restaurant.delivery_fee)}`
                        : ""}
                    </Text>
                    <Text style={h.link}>شوف المنيو ←</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <LinearGradient colors={["#27352A", "#15221B"]} style={h.game}>
        <Text style={[h.eyebrow, { color: colors.gold }]}>✦ TAMAM مود جيم</Text>
        <Text style={h.heading}>جوعان ومش عارف شو تختار؟</Text>
        <Text style={h.muted}>اختار مود، وإحنا بنكمل معك.</Text>
        <View style={h.moods}>
          {moods.value?.slice(0, 4).map((mood) => (
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
              <Ionicons name="sparkles-outline" size={20} color={colors.gold} />
              <Text style={h.small} numberOfLines={2}>
                {title(mood)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => router.push("/game")}
          accessibilityRole="button"
          style={h.gameCta}
        >
          <Text style={h.primaryText}>اكتشف مودك</Text>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>
      </LinearGradient>
      {visible(section("home_trust", "trust_payments")) ? (
        <View style={h.trust}>
          <Ionicons name="restaurant-outline" size={20} color={colors.green} />
          <Text style={h.small}>مطاعم محلية · اختيارات حسب مودك</Text>
        </View>
      ) : null}
      {!!home.error ? (
        <Text style={h.muted}>
          تعذر تحديث إعدادات الصفحة.{" "}
          <Text onPress={home.reload} style={h.link}>
            حاول ثانية
          </Text>
        </Text>
      ) : null}
    </Page>
  );
}
const h = StyleSheet.create({
  section: { gap: 14, marginTop: 12 },
  sectionTitle: { flexDirection: "row-reverse", alignItems: "center", gap: 16 },
  heading: {
    fontFamily: "Alexandria_700Bold",
    fontSize: 18,
    lineHeight: 30,
    color: colors.text,
    textAlign: "right",
  },
  muted: { ...s.muted },
  small: {
    fontFamily: "Alexandria_400Regular",
    fontSize: 11,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "right",
  },
  link: {
    fontFamily: "Alexandria_700Bold",
    color: colors.bright,
    fontSize: 11,
  },
  all: {
    flexDirection: "row-reverse",
    gap: 5,
    alignItems: "center",
    minHeight: 44,
  },
  hero: { borderRadius: 22, overflow: "hidden" },
  heroShade: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  heroCopy: { position: "absolute", bottom: 18, right: 18, left: 18, gap: 6 },
  heroTitle: {
    fontFamily: "Alexandria_700Bold",
    fontSize: 25,
    lineHeight: 36,
    color: colors.text,
    textAlign: "right",
  },
  eyebrow: {
    fontFamily: "Alexandria_700Bold",
    fontSize: 11,
    color: colors.bright,
    textAlign: "right",
  },
  surprise: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.green,
    borderRadius: 20,
    padding: 16,
  },
  spark: {
    height: 48,
    width: 48,
    backgroundColor: "#07131215",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontFamily: "Alexandria_700Bold",
    fontSize: 16,
    color: colors.ink,
    textAlign: "right",
  },
  primarySub: {
    fontFamily: "Alexandria_400Regular",
    fontSize: 10,
    lineHeight: 21,
    color: colors.ink,
    textAlign: "right",
  },
  secondaryRow: { flexDirection: "row-reverse", gap: 10 },
  secondary: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.high,
    flexDirection: "row-reverse",
    gap: 10,
    alignItems: "center",
  },
  horizontal: { flexDirection: "row-reverse", gap: 12, paddingBottom: 4 },
  intent: {
    flexDirection: "row-reverse",
    gap: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#303A31",
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 42,
    backgroundColor: colors.surface,
  },
  foodCard: {
    width: 220,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2B332D",
    backgroundColor: "#0B0F0D",
  },
  cardBody: { padding: 14, gap: 10 },
  cardTitle: {
    fontFamily: "Alexandria_700Bold",
    fontSize: 12,
    lineHeight: 23,
    color: colors.text,
    textAlign: "right",
  },
  pill: {
    alignSelf: "flex-end",
    backgroundColor: "#6EBF5F18",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: {
    fontFamily: "Alexandria_700Bold",
    fontSize: 10,
    color: colors.bright,
  },
  priceRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontFamily: "Alexandria_700Bold",
    fontSize: 15,
    color: colors.bright,
  },
  game: {
    borderRadius: 24,
    padding: 22,
    gap: 8,
    borderWidth: 1,
    borderColor: "#3D4B37",
    marginTop: 12,
  },
  moods: {
    flexDirection: "row-reverse",
    gap: 8,
    marginVertical: 12,
    flexWrap: "wrap",
  },
  mood: {
    flex: 1,
    minWidth: 65,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 10,
    borderRadius: 15,
    backgroundColor: "#10141270",
    minHeight: 90,
  },
  gameCta: {
    backgroundColor: colors.green,
    borderRadius: 15,
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trust: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#263028",
    marginTop: 10,
  },
});
