import { useCallback, useState } from "react";
import { router } from "expo-router";
import { Linking } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, font, Page, RtlRow, Status } from "../../components/ui";
import { TamamMark, Tri, TrianglePattern } from "../../components/brand";
import { HomeTablePreview } from "../../components/HomeTablePreview";
import { RestaurantCard, SuggestionCard } from "../../components/cards";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { imageUrl } from "../../lib/media";
import { moodIcon } from "../../lib/moods";
import { useT } from "../../lib/i18n";
import { WHATSAPP_NUMBER } from "../../lib/orders";
import { getPublishedMenus } from "../../lib/dailyMeals";
import { basketText } from "../../lib/basketCopy";

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
  const { t, name, sheet, f, fwd, lang } = useT();
  const h = sheet(hs);
  const [heroFailed, setHeroFailed] = useState(false);
  const copy = (ar: string, he: string, en: string) => lang === "en" ? en : lang === "he" ? he : ar;
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
      <View style={h.intro}>
        <Text style={h.eyebrow}>{copy("الناصرة والمنطقة · اقتراحات على ذوقك", "נצרת והאזור · הצעות לטעם שלך", "Nazareth & nearby · Picked for your taste")}</Text>
        <Text style={h.heroTitle}>{copy("شو عبالك تاكل إسا؟", "מה בא לך לאכול עכשיו?", "What are you in the mood for?")}</Text>
        <Text style={h.heroSub}>{copy("وجبة لليوم، طاولة للّمة، أو مقاضي للبيت. منرتّبلك البداية، وإنت بتعدّل على ذوقك.", "ארוחה להיום, שולחן למפגש או קניות לבית. מתחילים מהצעה ומשנים לפי הטעם.", "Today's meal, a table to share, or groceries for home. Start with a suggestion and make it yours.")}</Text>
      </View>
      <View style={h.entryCard}>
        <View style={h.entryTop}><Ionicons name="restaurant-outline" size={24} color={colors.gold}/><Text style={h.eyebrow}>{copy("اقتراح جاهز · قابل للتعديل", "הצעה מוכנה · ניתנת לשינוי", "A ready suggestion · Yours to edit")}</Text></View>
        <Text style={h.heading}>{copy("رتّب طاولتك", "מרכיבים שולחן", "Build your table")}</Text>
        <Text style={h.muted}>{basketText(lang).intro}</Text>
        <View style={h.entryRule}/>
        <Text style={h.muted}>{copy("حسب العدد، المناسبة والميزانية", "לפי מספר הסועדים, האירוע והתקציב", "For your party size, occasion and budget")}</Text>
        <Pressable accessibilityRole="button" onPress={()=>router.push("/basket")} style={h.entryCta}><Text style={h.entryCtaText}>{copy("رتّب طاولتك إسا", "מרכיבים שולחן עכשיו", "Build your table")}</Text><Ionicons name={fwd("arrow-back")} size={19} color={colors.white}/></Pressable>
      </View>
      {[{path:"/daily-meal" as const,icon:"sunny-outline" as const,title:copy("وجبة اليوم", "ארוחת היום", "Daily meals"),detail:copy("شوف طبخات اليوم واختار الوجبة والحصص اللي بتناسبك.", "בוחרים מהתפריט היומי את הארוחה והמנות המתאימות.", "Explore today's menu and choose your meal and portions.")},{path:"/market" as const,icon:"basket-outline" as const,title:copy("مقاضي البيت", "קניות לבית", "Home groceries"),detail:copy("سلال وأفكار جاهزة، بتزيد عليها وبتنقص منها حسب حاجتك.", "סלים ורעיונות מוכנים שאפשר להתאים לצורך שלך.", "Ready baskets and ideas you can adjust to your needs.")}].map(entry=><Pressable key={entry.path} accessibilityRole="button" onPress={()=>router.push(entry.path)} style={h.entryCard}><View style={h.entryTop}><Ionicons name={entry.icon} size={24} color={colors.gold}/><Ionicons name={fwd("chevron-back")} size={18} color={colors.teal}/></View><Text style={h.heading}>{entry.title}</Text><Text style={h.muted}>{entry.detail}</Text></Pressable>)}
      {heroImage && !heroFailed ? <Pressable accessibilityRole="button" accessibilityLabel={t("dailyHomeCard")} onPress={()=>router.push("/daily-meal")} style={h.featureCard}>
        <Image nativeID="home-hero-photo" source={{uri:imageUrl(heroImage)}} style={h.featureImage} resizeMode="cover" onError={()=>setHeroFailed(true)} accessibilityLabel={t("mealImage")}/>
        <View style={h.featureBody}><Text style={h.eyebrow}>{copy("من قائمة اليوم", "מהתפריט היומי", "From today's menu")}</Text><Text style={h.heading}>{t("dailyHomeCard")}</Text><Text style={h.link}>{copy("شوف الوجبات والتفاصيل ←", "לארוחות ולפרטים ←", "Explore meals and details →")}</Text></View>
      </Pressable>:null}
      <HomeTablePreview />
      <View style={h.contactActions}>
        <Pressable accessibilityRole="button" onPress={()=>void Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`)} style={h.contactButton}><Ionicons name="logo-whatsapp" size={18} color={colors.teal}/><Text style={h.contactLabel}>{t("whatsappUs")}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={()=>void Linking.openURL(`tel:+${WHATSAPP_NUMBER}`)} style={h.contactButton}><Ionicons name="call-outline" size={18} color={colors.teal}/><Text style={h.contactLabel}>{t("callUs")}</Text></Pressable>
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
  intro: { gap: 12, paddingVertical: 20 },
  entryCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: 18, padding: 20, gap: 12 },
  entryTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12 },
  entryRule: { height: 1, backgroundColor: colors.outline, marginVertical: 3 },
  entryCta: { backgroundColor: colors.teal, borderRadius: 12, padding: 15, minHeight: 52, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 8 },
  entryCtaText: { fontFamily: font.bold, color: colors.white, fontSize: 15, flexShrink: 1, lineHeight: 25 },
  featureCard: { borderRadius: 18, overflow: "hidden", backgroundColor: colors.surface, borderColor: colors.outline, borderWidth: 1 },
  featureImage: { width: "100%", height: 210 },
  featureBody: { padding: 18, gap: 9 },
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
    fontSize: 14,
    lineHeight: 24,
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
    backgroundColor: colors.hero,
  },
  heroCopy: { gap: 7, alignItems: "flex-end", zIndex: 1 },
  eyebrow: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.teal,
    textAlign: "right",
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: font.medium,
    fontSize: 30,
    lineHeight: 42,
    color: colors.teal,
    textAlign: "right",
  },
  heroSub: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 22,
    color: colors.teal,
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
  contactLabel: { fontFamily: font.medium, fontSize: 11, color: colors.teal },
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
