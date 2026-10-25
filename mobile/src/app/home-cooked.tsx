import { useCallback, useMemo, useRef, useState } from "react";
import Head from "expo-router/head";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CampaignContact, CampaignHero } from "../components/CampaignLanding";
import { MealSheet } from "../components/MealSheet";
import { colors, font, money, Page, Status } from "../components/ui";
import { useT } from "../lib/i18n";
import { imageUrl } from "../lib/media";
import { useStore } from "../lib/state";
import { useLoad } from "../lib/useLoad";
import type { HomeCookedOffer, HomeCookedProduct, Id, Meal, Restaurant } from "../lib/types";

type ProductOffer = { product: HomeCookedProduct; offer: HomeCookedOffer; restaurant: Restaurant };
type ProductGroup = { product: HomeCookedProduct; offers: ProductOffer[] };
type SelectedOffer = { meal: Meal; restaurant: Restaurant; extrasSourceId: Id | null };

function kitchenLabel(restaurant: Restaurant, lang: string, localName: (x: Restaurant) => string) {
  const slug = (restaurant.slug || "").toLocaleLowerCase();
  const labels: Record<string, [string, string, string]> = {
    "mazawi": ["مزاوي", "מזאווי", "Mazawi"],
    "maha": ["مها", "מאהא", "Maha"],
    "mariana": ["ماريانا", "מריאנה", "Mariana"],
    "sahriyat": ["سهريات", "סהריאת", "Sahriyat"],
  };
  const label = labels[slug];
  if (label) return label[lang === "ar" ? 0 : lang === "he" ? 1 : 2];
  return localName(restaurant);
}

export default function HomeCookedLanding() {
  const { api } = useStore();
  const { t, name, restaurantName, desc, lang } = useT();
  const pageScroll = useRef<ScrollView>(null);
  const productsOffset = useRef(0);
  const [selectedProduct, setSelectedProduct] = useState<ProductGroup | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<SelectedOffer | null>(null);

  const data = useLoad(useCallback(() => api.homeCookedCatalog(), [api]));
  const productGroups = data.value ?? [];

  const selectedOffers = useMemo(() => {
    if (!selectedProduct) return [];
    return [...selectedProduct.offers].sort((a, b) => Number(a.offer.price) - Number(b.offer.price));
  }, [selectedProduct]);

  const heroProduct = productGroups.find((group) => group.product.image_url)?.product;

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
          image={heroProduct?.image_url ? imageUrl(heroProduct.image_url) : undefined}
          eyebrow={t("homeCookedEyebrow")}
          title={t("homeCookedTitle")}
          description={t("homeCookedIntro")}
          actionLabel={t("homeCookedBrowseProducts")}
          onAction={() => pageScroll.current?.scrollTo({ y: productsOffset.current, animated: true })}
        />

        <View onLayout={(event) => { productsOffset.current = event.nativeEvent.layout.y; }} style={styles.sectionHeading}>
          <View style={styles.headingLabel}>
            <View style={styles.goldRule} />
            <Text style={styles.eyebrow}>{t("homeCookedEyebrow")}</Text>
          </View>
          <Text style={styles.sectionTitle}>{t("homeCookedProductsTitle")}</Text>
          <Text style={styles.sectionSub}>{t("homeCookedProductsSub")}</Text>
        </View>

        <Status loading={data.loading} error={data.error} retry={() => void data.reload()} />
        {!data.loading && !data.error && !productGroups.length ? (
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={22} color={colors.teal} />
            <Text style={styles.emptyText}>{t("homeCookedNoProducts")}</Text>
          </View>
        ) : null}
        <View style={styles.grid}>
          {productGroups.map((group) => {
            const product = group.product;
            const price = Math.min(...group.offers.map((offer) => Number(offer.offer.price)));
            return (
              <Pressable
                key={String(product.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t("homeCookedChooseRestaurant")} · ${name(product)}`}
                onPress={() => setSelectedProduct(group)}
                style={({ pressed }) => [styles.productCard, pressed && styles.pressed]}
              >
                {product.image_url ? (
                  <Image source={{ uri: imageUrl(product.image_url) }} style={styles.productImage} resizeMode="cover" accessibilityLabel={t("mealImage")} />
                ) : (
                  <View style={[styles.productImage, styles.imageFallback]}><Ionicons name="restaurant-outline" size={27} color={colors.teal} /></View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle} numberOfLines={2}>{name(product)}</Text>
                  {desc(product) ? <Text style={styles.description} numberOfLines={2}>{desc(product)}</Text> : null}
                  <View style={styles.productMeta}>
                    <Text style={styles.price}>{money(price).replace(".00", "")}</Text>
                    <Text style={styles.priceSuffix}>{t(group.offers.length === 1 ? "homeCookedOneKitchen" : "homeCookedManyKitchens", { n: group.offers.length })}</Text>
                  </View>
                  <View style={styles.chooseButton}>
                    <Ionicons name="storefront-outline" size={16} color={colors.white} />
                    <Text style={styles.chooseButtonText}>{t("homeCookedChooseRestaurant")}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.footer}>{t("homeCookedFooter")}</Text>
        <CampaignContact message={t("homeCookedWaMessage")} />
      </Page>

      <Modal visible={Boolean(selectedProduct)} transparent animationType="slide" onRequestClose={() => setSelectedProduct(null)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("close")} onPress={() => setSelectedProduct(null)} style={styles.modalBackdrop} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetCopy}>
                <Text style={styles.sheetTitle}>{t("homeCookedChooseRestaurantTitle")}</Text>
                {selectedProduct ? <Text style={styles.sheetMeal}>{name(selectedProduct.product)}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t("close")} onPress={() => setSelectedProduct(null)} style={styles.closeButton}>
                <Ionicons name="close" size={20} color={colors.tealDeep} />
              </Pressable>
            </View>
            <Text style={styles.sheetSub}>{t("homeCookedChooseRestaurantSub")}</Text>
            <ScrollView style={styles.sellerList} contentContainerStyle={styles.sellerListContent}>
              {selectedOffers.map((offer) => {
                const restaurant = offer.restaurant;
                const product = offer.product;
                const meal: Meal = {
                  id: `home-cooked-${product.id}`,
                  name: product.name || undefined,
                  name_ar: product.name_ar || undefined,
                  name_he: product.name_he || undefined,
                  name_en: product.name_en || undefined,
                  description: product.description || undefined,
                  description_ar: product.description_ar || undefined,
                  image_url: product.image_url || undefined,
                  price: Number(offer.offer.price),
                  is_available: offer.offer.is_available,
                };
                const logo = imageUrl(restaurant.logo_url || restaurant.image_url || "");
                const open = (restaurant.is_open ?? restaurant.active) !== false;
                return (
                  <Pressable
                    key={`${restaurant.id}:${product.id}`}
                    accessibilityRole="button"
                    disabled={!open || offer.offer.is_available === false}
                    onPress={() => {
                      setSelectedProduct(null);
                      setSelectedOffer({
                        meal,
                        restaurant,
                        extrasSourceId: offer.offer.extras_source_menu_item_id ?? null,
                      });
                    }}
                    style={({ pressed }) => [styles.sellerCard, !open && styles.sellerCardDisabled, pressed && styles.pressed]}
                  >
                    {logo ? <Image source={{ uri: logo }} style={styles.sellerLogo} resizeMode="cover" accessibilityLabel={t("image")} /> : <View style={styles.sellerLogoFallback}><Ionicons name="storefront-outline" size={17} color={colors.teal} /></View>}
                    <View style={styles.sellerCopy}>
                      <Text style={styles.sellerName}>{kitchenLabel(restaurant, lang, restaurantName) || "TAMAM"}</Text>
                      {!open ? <Text style={styles.sellerMeta}>{t("restaurantClosed")}</Text> : (
                        (restaurant.delivery_time != null || restaurant.delivery_fee != null) ? (
                          <Text style={styles.sellerMeta}>
                            {restaurant.delivery_time != null ? t("minutesShort", { n: restaurant.delivery_time }) : ""}
                            {restaurant.delivery_time != null && restaurant.delivery_fee != null ? " · " : ""}
                            {restaurant.delivery_fee != null ? t("deliveryFee", { p: money(Number(restaurant.delivery_fee)).replace(".00", "") }) : ""}
                          </Text>
                        ) : null
                      )}
                    </View>
                    <View style={styles.sellerPrice}>
                      <Text style={styles.sellerPriceText}>{money(Number(offer.offer.price)).replace(".00", "")}</Text>
                      <Text style={styles.sellerSelect}>{open ? t("homeCookedChooseProduct") : t("restaurantClosed")}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {selectedOffer ? (
        <MealSheet
          key={`${selectedOffer.restaurant.id}:${selectedOffer.meal.id}`}
          meal={selectedOffer.meal}
          restaurant={selectedOffer.restaurant}
          extrasSourceId={selectedOffer.extrasSourceId}
          close={() => setSelectedOffer(null)}
        />
      ) : null}
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
  productCard: { width: "48%", flexGrow: 1, flexBasis: "46%", overflow: "hidden", backgroundColor: "#FFFDF8", borderRadius: 12, borderWidth: 1, borderColor: "#D9CFBF" },
  productImage: { width: "100%", height: 142, backgroundColor: "#EDE5D8" },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  productInfo: { paddingHorizontal: 10, paddingVertical: 9, gap: 5, alignItems: "stretch" },
  productTitle: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 12, lineHeight: 17, textAlign: "right", minHeight: 32 },
  description: { color: colors.muted, fontFamily: font.regular, fontSize: 9, lineHeight: 14, textAlign: "right", minHeight: 27 },
  productMeta: { flexDirection: "row-reverse", alignItems: "baseline", gap: 5, marginTop: 1 },
  price: { color: colors.tealDeep, fontFamily: font.black, fontSize: 15 },
  priceSuffix: { color: colors.muted, fontFamily: font.regular, fontSize: 9 },
  chooseButton: { minHeight: 39, marginTop: 2, borderRadius: 8, backgroundColor: colors.tealDeep, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 5 },
  chooseButtonText: { color: colors.white, fontFamily: font.bold, fontSize: 10 },
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
  sellerCardDisabled: { opacity: 0.56 },
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
