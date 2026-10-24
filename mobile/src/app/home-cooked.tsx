import { useCallback, useRef } from "react";
import { router } from "expo-router";
import Head from "expo-router/head";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CampaignContact, CampaignHero } from "../components/CampaignLanding";
import { colors, font, money, Page, Status } from "../components/ui";
import { useT, localRestaurantName } from "../lib/i18n";
import { imageUrl } from "../lib/media";
import { getPublishedMenus, getPublicOptions, getPublicMenuOptionOverrides, getVisibleDailyOptions, type DailyCategory } from "../lib/dailyMeals";
import { useStore } from "../lib/state";
import { useLoad } from "../lib/useLoad";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
type DailyAddonCategory = Exclude<DailyCategory, "main">;
const categories: DailyAddonCategory[] = ["soup", "addition", "salad"];
const categoryLabels: Record<DailyAddonCategory, "dailySoup" | "dailyAddition" | "dailySalad"> = {
  soup: "dailySoup", addition: "dailyAddition", salad: "dailySalad",
};

export default function HomeCookedLanding() {
  const { api, lang } = useStore();
  const { t } = useT();
  const pageScroll = useRef<ScrollView>(null);
  const mealsOffset = useRef(0);
  const date = today();
  const data = useLoad(useCallback(async () => {
    const menus = await getPublishedMenus(date, date);
    const [options, overrides, restaurantPairs] = await Promise.all([
      getPublicOptions(menus.map((meal) => meal.id)),
      getPublicMenuOptionOverrides(menus.map((meal) => meal.id)),
      Promise.all([...new Set(menus.map((meal) => meal.restaurant_id))].map(async (id) => {
        try {
          const restaurant = await api.restaurant(id);
          return [String(id), { name: localRestaurantName(lang, restaurant), logo: imageUrl(restaurant.logo_url || restaurant.image_url) }] as const;
        } catch {
          return [String(id), { name: "TAMAM" }] as const;
        }
      })),
    ]);
    return { menus, options, overrides, restaurants: Object.fromEntries(restaurantPairs) };
  }, [api, date, lang]));
  const meals = data.value?.menus ?? [];
  const heroMeal = meals.find((meal) => meal.image_url);

  const startOrder = (menuId: number) => {
    const mainOptions = data.value?.options.filter((option) => option.category === "main" && option.menu_id === menuId) ?? [];
    if (mainOptions.length === 1) {
      router.push({ pathname: "/daily-meal", params: { quickAddMenuId: String(menuId), quickAddMainId: String(mainOptions[0].id), quickAddDate: date } });
      return;
    }
    router.push({ pathname: "/daily-meal", params: { focusMenuId: String(menuId), focusDate: date } });
  };

  return (
    <>
      <Head>
        <title>{t("homeCookedMetaTitle")}</title>
        <meta name="description" content={t("homeCookedMetaDescription")} />
        <meta property="og:title" content={t("homeCookedMetaTitle")} />
        <meta property="og:description" content={t("homeCookedMetaDescription")} />
      </Head>
      <Page scrollRef={pageScroll}>
        <CampaignHero
          image={heroMeal?.image_url ?? undefined}
          eyebrow={t("homeCookedEyebrow")}
          title={t("homeCookedTitle")}
          description={t("homeCookedIntro")}
          actionLabel={t("homeCookedSeeToday")}
          onAction={() => pageScroll.current?.scrollTo({ y: mealsOffset.current, animated: true })}
        />

        <View onLayout={(event) => { mealsOffset.current = event.nativeEvent.layout.y; }} style={styles.sectionHeading}>
          <View style={styles.headingLabel}>
            <View style={styles.goldRule} />
            <Text style={styles.eyebrow}>{t("dailyTodayShort")}</Text>
          </View>
          <Text style={styles.sectionTitle}>{t("homeCookedMealsTitle")}</Text>
          <Text style={styles.sectionSub}>{t("homeCookedMealsSub")}</Text>
        </View>

        <Status loading={data.loading} error={data.error} retry={() => void data.reload()} />
        {!data.loading && !data.error && !meals.length ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-clear-outline" size={22} color={colors.teal} />
            <Text style={styles.emptyText}>{t("dailyNoMenusThisDay")}</Text>
          </View>
        ) : null}
        <View style={styles.grid}>
          {meals.map((meal) => {
            const mainOptions = data.value?.options.filter((option) => option.category === "main" && option.menu_id === meal.id) ?? [];
            const restaurant = data.value?.restaurants[String(meal.restaurant_id)];
            const preview = categories.map((category) => {
              const override = data.value?.overrides.find((item) => item.menu_id === meal.id && item.category === category);
              const available = getVisibleDailyOptions(data.value?.options ?? [], meal.id, category, override)
                .map((option) => ({ option, label: lang === "ar" ? option.name_ar : lang === "he" ? option.name : "" }))
                .filter((row) => row.label);
              if (!available.length) return null;
              return { category, text: available.slice(0, 2).map((row) => row.label).join("، ") };
            }).filter(Boolean) as { category: DailyAddonCategory; text: string }[];
            return (
              <View key={meal.id} style={styles.mealCard}>
                {meal.image_url ? (
                  <Image source={{ uri: imageUrl(meal.image_url) }} style={styles.mealImage} resizeMode="cover" accessibilityLabel={t("mealImage")} />
                ) : (
                  <View style={[styles.mealImage, styles.imageFallback]}><Ionicons name="restaurant-outline" size={27} color={colors.teal} /></View>
                )}
                <View style={styles.mealInfo}>
                  <View style={styles.identity}>
                    {restaurant?.logo ? <Image source={{ uri: restaurant.logo }} style={styles.logo} resizeMode="cover" accessibilityLabel={t("image")} /> : null}
                    <Text style={styles.restaurant} numberOfLines={1}>{restaurant?.name || "TAMAM"}</Text>
                  </View>
                  <Text style={styles.mealTitle} numberOfLines={2}>{meal.title}</Text>
                  {preview.slice(0, 2).map((line) => (
                    <Text key={line.category} style={styles.preview} numberOfLines={1}>
                      <Text style={styles.previewLabel}>{t(categoryLabels[line.category])}: </Text>{line.text}
                    </Text>
                  ))}
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{money(Number(meal.price)).replace(".00", "")}</Text>
                    <Text style={styles.priceSuffix}>{t("dailyMeal")}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${mainOptions.length === 1 ? t("dailyAddMealToCart") : t("dailyChooseMeal")} · ${meal.title}`}
                    onPress={() => startOrder(meal.id)}
                    style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                  >
                    <Ionicons name={mainOptions.length === 1 ? "bag-add-outline" : "options-outline"} size={16} color={colors.white} />
                    <Text style={styles.addButtonText}>{mainOptions.length === 1 ? t("dailyAddMealToCart") : t("homeCookedChooseOptions")}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
        <Text style={styles.footer}>{t("homeCookedFooter")}</Text>
        <CampaignContact message={t("homeCookedWaMessage")} />
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeading: { alignItems: "flex-end", gap: 5, paddingTop: 3 },
  headingLabel: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  goldRule: { width: 24, height: 2, backgroundColor: colors.gold },
  eyebrow: { color: colors.teal, fontFamily: font.bold, fontSize: 10 },
  sectionTitle: { color: colors.tealDeep, fontFamily: font.black, fontSize: 18, textAlign: "right" },
  sectionSub: { color: colors.muted, fontFamily: font.regular, fontSize: 10, lineHeight: 16, textAlign: "right" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9 },
  mealCard: { width: "48%", flexGrow: 1, flexBasis: "46%", overflow: "hidden", backgroundColor: "#FFFDF8", borderRadius: 12, borderWidth: 1, borderColor: "#D9CFBF" },
  mealImage: { width: "100%", height: 122, backgroundColor: "#EDE5D8" },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  mealInfo: { paddingHorizontal: 10, paddingVertical: 9, gap: 5, alignItems: "stretch" },
  identity: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  logo: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: "#D9CFBF" },
  restaurant: { flex: 1, color: colors.muted, fontFamily: font.bold, fontSize: 9, textAlign: "right" },
  mealTitle: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 12, lineHeight: 17, textAlign: "right", minHeight: 32 },
  preview: { color: colors.muted, fontFamily: font.regular, fontSize: 9, lineHeight: 14, textAlign: "right" },
  previewLabel: { color: colors.teal, fontFamily: font.bold },
  priceRow: { flexDirection: "row-reverse", alignItems: "baseline", gap: 4, marginTop: 1 },
  price: { color: colors.tealDeep, fontFamily: font.black, fontSize: 15 },
  priceSuffix: { color: colors.muted, fontFamily: font.regular, fontSize: 9 },
  addButton: { minHeight: 39, marginTop: 2, borderRadius: 8, backgroundColor: colors.tealDeep, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 5 },
  addButtonText: { color: colors.white, fontFamily: font.bold, fontSize: 10 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  empty: { alignItems: "center", gap: 9, padding: 15, borderRadius: 12, backgroundColor: "#F4EFE5" },
  emptyText: { color: colors.ink, fontFamily: font.bold, fontSize: 12, textAlign: "center" },
  footer: { color: colors.muted, fontFamily: font.regular, fontSize: 9, lineHeight: 15, textAlign: "right" },
});
