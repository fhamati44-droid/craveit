import { useCallback, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import Head from "expo-router/head";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CampaignContact, CampaignHero } from "../components/CampaignLanding";
import { colors, font, money, Page, Status } from "../components/ui";
import { useT, localRestaurantName } from "../lib/i18n";
import { imageUrl } from "../lib/media";
import { getPublishedMenus, getPublicOptions, getPublicMenuOptionOverrides, getVisibleDailyOptions, type DailyCategory, type DailyMenu } from "../lib/dailyMeals";
import { useStore } from "../lib/state";
import { useLoad } from "../lib/useLoad";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
type DailyAddonCategory = Exclude<DailyCategory, "main">;
type MealGroup = { key: string; title: string; imageUrl?: string | null; price: number; menus: DailyMenu[] };
const categories: DailyAddonCategory[] = ["soup", "addition", "salad"];
const categoryLabels: Record<DailyAddonCategory, "dailySoup" | "dailyAddition" | "dailySalad"> = {
  soup: "dailySoup", addition: "dailyAddition", salad: "dailySalad",
};

const dishKey = (title: string) => title
  .normalize("NFKC")
  .toLocaleLowerCase()
  .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
  .replace(/[إأآ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim()
  .replace(/\s+/g, " ");

export default function HomeCookedLanding() {
  const { api, lang } = useStore();
  const { t } = useT();
  const pageScroll = useRef<ScrollView>(null);
  const mealsOffset = useRef(0);
  const [selectedMeal, setSelectedMeal] = useState<MealGroup | null>(null);
  const date = today();
  const data = useLoad(useCallback(async () => {
    const menus = await getPublishedMenus(date, date);
    const [options, overrides, restaurantPairs] = await Promise.all([
      getPublicOptions(menus.map((meal) => meal.id)),
      getPublicMenuOptionOverrides(menus.map((meal) => meal.id)),
      Promise.all([...new Set(menus.map((meal) => meal.restaurant_id))].map(async (id) => {
        try {
          const restaurant = await api.restaurant(id);
          return [String(id), {
            name: localRestaurantName(lang, restaurant),
            logo: imageUrl(restaurant.logo_url || restaurant.image_url),
            deliveryFee: restaurant.delivery_fee,
            deliveryTime: restaurant.delivery_time,
          }] as const;
        } catch {
          return [String(id), { name: "TAMAM" }] as const;
        }
      })),
    ]);
    return { menus, options, overrides, restaurants: Object.fromEntries(restaurantPairs) };
  }, [api, date, lang]));
  const meals = data.value?.menus ?? [];
  const mealGroups = useMemo(() => {
    const groups = new Map<string, MealGroup>();
    for (const meal of meals) {
      const key = dishKey(meal.title);
      if (!key) continue;
      const group = groups.get(key);
      if (group) {
        group.menus.push(meal);
        group.price = Math.min(group.price, Number(meal.price));
        if (!group.imageUrl && meal.image_url) group.imageUrl = meal.image_url;
      } else {
        groups.set(key, { key, title: meal.title, imageUrl: meal.image_url, price: Number(meal.price), menus: [meal] });
      }
    }
    return [...groups.values()];
  }, [meals]);
  const selectedVendors = useMemo(() => {
    if (!selectedMeal) return [];
    const unique = new Map<string, DailyMenu>();
    for (const meal of selectedMeal.menus) {
      const restaurantId = String(meal.restaurant_id);
      const current = unique.get(restaurantId);
      if (!current || Number(meal.price) < Number(current.price)) unique.set(restaurantId, meal);
    }
    return [...unique.values()].sort((a, b) => Number(a.price) - Number(b.price));
  }, [selectedMeal]);
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
        {!data.loading && !data.error && !mealGroups.length ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-clear-outline" size={22} color={colors.teal} />
            <Text style={styles.emptyText}>{t("dailyNoMenusThisDay")}</Text>
          </View>
        ) : null}
        <View style={styles.grid}>
          {mealGroups.map((group) => {
            const commonPreview = categories.map((category) => {
              const namesByMenu = group.menus.map((meal) => {
                const override = data.value?.overrides.find((item) => item.menu_id === meal.id && item.category === category);
                return getVisibleDailyOptions(data.value?.options ?? [], meal.id, category, override)
                  .map((option) => lang === "ar" ? option.name_ar : lang === "he" ? option.name : "")
                  .filter((label): label is string => Boolean(label));
              });
              const commonNames = (namesByMenu[0] ?? []).filter((label) => namesByMenu.every((items) => items.includes(label)));
              if (!commonNames.length) return null;
              return { category, text: commonNames.slice(0, 2).join("، ") };
            }).filter(Boolean) as { category: DailyAddonCategory; text: string }[];
            const sellerCount = new Set(group.menus.map((meal) => String(meal.restaurant_id))).size;
            return (
              <Pressable
                key={group.key}
                accessibilityRole="button"
                accessibilityLabel={`${t("homeCookedChooseRestaurant")} · ${group.title}`}
                onPress={() => setSelectedMeal(group)}
                style={({ pressed }) => [styles.mealCard, pressed && styles.pressed]}
              >
                {group.imageUrl ? (
                  <Image source={{ uri: imageUrl(group.imageUrl) }} style={styles.mealImage} resizeMode="cover" accessibilityLabel={t("mealImage")} />
                ) : (
                  <View style={[styles.mealImage, styles.imageFallback]}><Ionicons name="restaurant-outline" size={27} color={colors.teal} /></View>
                )}
                <View style={styles.mealInfo}>
                  <Text style={styles.mealTitle} numberOfLines={2}>{group.title}</Text>
                  {commonPreview.slice(0, 2).map((line) => (
                    <Text key={line.category} style={styles.preview} numberOfLines={1}>
                      <Text style={styles.previewLabel}>{t(categoryLabels[line.category])}: </Text>{line.text}
                    </Text>
                  ))}
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{money(group.price).replace(".00", "")}</Text>
                    <Text style={styles.priceSuffix}>{sellerCount > 1 ? t("homeCookedStartingPrice") : t("dailyMeal")}</Text>
                  </View>
                  <View style={styles.addButton}>
                    <Ionicons name="storefront-outline" size={16} color={colors.white} />
                    <Text style={styles.addButtonText}>{t("homeCookedChooseRestaurant")}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.footer}>{t("homeCookedFooter")}</Text>
        <CampaignContact message={t("homeCookedWaMessage")} />
      </Page>

      <Modal visible={Boolean(selectedMeal)} transparent animationType="slide" onRequestClose={() => setSelectedMeal(null)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("close")} onPress={() => setSelectedMeal(null)} style={styles.modalBackdrop} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetCopy}>
                <Text style={styles.sheetTitle}>{t("homeCookedChooseRestaurantTitle")}</Text>
                {selectedMeal ? <Text style={styles.sheetMeal}>{selectedMeal.title}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t("close")} onPress={() => setSelectedMeal(null)} style={styles.closeButton}>
                <Ionicons name="close" size={20} color={colors.tealDeep} />
              </Pressable>
            </View>
            <Text style={styles.sheetSub}>{t("homeCookedChooseRestaurantSub")}</Text>
            <ScrollView style={styles.sellerList} contentContainerStyle={styles.sellerListContent}>
              {selectedVendors.map((meal) => {
                const restaurant = data.value?.restaurants[String(meal.restaurant_id)];
                const mainOptions = data.value?.options.filter((option) => option.category === "main" && option.menu_id === meal.id) ?? [];
                return (
                  <Pressable
                    key={meal.id}
                    accessibilityRole="button"
                    onPress={() => { setSelectedMeal(null); startOrder(meal.id); }}
                    style={({ pressed }) => [styles.sellerCard, pressed && styles.pressed]}
                  >
                    {restaurant?.logo ? <Image source={{ uri: restaurant.logo }} style={styles.sellerLogo} resizeMode="cover" accessibilityLabel={t("image")} /> : <View style={styles.sellerLogoFallback}><Ionicons name="storefront-outline" size={17} color={colors.teal} /></View>}
                    <View style={styles.sellerCopy}>
                      <Text style={styles.sellerName}>{restaurant?.name || "TAMAM"}</Text>
                      {(restaurant?.deliveryTime != null || restaurant?.deliveryFee != null) ? (
                        <Text style={styles.sellerMeta}>
                          {restaurant?.deliveryTime != null ? t("minutesShort", { n: restaurant.deliveryTime }) : ""}
                          {restaurant?.deliveryTime != null && restaurant?.deliveryFee != null ? " · " : ""}
                          {restaurant?.deliveryFee != null ? t("deliveryFee", { p: money(Number(restaurant.deliveryFee)).replace(".00", "") }) : ""}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.sellerPrice}>
                      <Text style={styles.sellerPriceText}>{money(Number(meal.price)).replace(".00", "")}</Text>
                      <Text style={styles.sellerSelect}>{mainOptions.length === 1 ? t("dailyAddMealToCart") : t("homeCookedChooseOptions")}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  mealTitle: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 12, lineHeight: 17, textAlign: "right", minHeight: 32 },
  preview: { color: colors.muted, fontFamily: font.regular, fontSize: 9, lineHeight: 14, textAlign: "right" },
  previewLabel: { color: colors.teal, fontFamily: font.bold },
  priceRow: { flexDirection: "row-reverse", alignItems: "baseline", gap: 4, marginTop: 1 },
  price: { color: colors.tealDeep, fontFamily: font.black, fontSize: 15 },
  priceSuffix: { color: colors.muted, fontFamily: font.regular, fontSize: 9 },
  addButton: { minHeight: 39, marginTop: 2, borderRadius: 8, backgroundColor: colors.tealDeep, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 5 },
  addButtonText: { color: colors.white, fontFamily: font.bold, fontSize: 10 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.48)" },
  sheet: { maxHeight: "78%", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: colors.bg },
  sheetHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  sheetCopy: { flex: 1, alignItems: "flex-end", gap: 4 },
  sheetTitle: { color: colors.tealDeep, fontFamily: font.black, fontSize: 18, textAlign: "right" },
  sheetMeal: { color: colors.muted, fontFamily: font.bold, fontSize: 11, textAlign: "right" },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, alignItems: "center", justifyContent: "center" },
  sheetSub: { color: colors.muted, fontFamily: font.regular, fontSize: 10, textAlign: "right" },
  sellerList: { flexGrow: 0 },
  sellerListContent: { gap: 9, paddingBottom: 4 },
  sellerCard: { flexDirection: "row-reverse", alignItems: "center", gap: 9, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface },
  sellerLogo: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.outline },
  sellerLogoFallback: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.outline, alignItems: "center", justifyContent: "center", backgroundColor: colors.mint },
  sellerCopy: { flex: 1, alignItems: "flex-end", gap: 3 },
  sellerName: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 12, textAlign: "right" },
  sellerMeta: { color: colors.muted, fontFamily: font.regular, fontSize: 9, textAlign: "right" },
  sellerPrice: { alignItems: "flex-end", gap: 2 },
  sellerPriceText: { color: colors.tealDeep, fontFamily: font.black, fontSize: 13 },
  sellerSelect: { color: colors.teal, fontFamily: font.bold, fontSize: 8, textAlign: "right" },
  empty: { alignItems: "center", gap: 9, padding: 15, borderRadius: 12, backgroundColor: "#F4EFE5" },
  emptyText: { color: colors.ink, fontFamily: font.bold, fontSize: 12, textAlign: "center" },
  footer: { color: colors.muted, fontFamily: font.regular, fontSize: 9, lineHeight: 15, textAlign: "right" },
});
