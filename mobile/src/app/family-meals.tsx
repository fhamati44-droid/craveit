import { useCallback, useState } from "react";
import { router } from "expo-router";
import Head from "expo-router/head";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CampaignContact, CampaignHero } from "../components/CampaignLanding";
import { colors, font, money, Page, Status } from "../components/ui";
import { FoodImage } from "../components/cards";
import { useStore } from "../lib/state";
import { useLoad } from "../lib/useLoad";
import { useT } from "../lib/i18n";
import type { Suggestion } from "../lib/types";

export default function FamilyMealsLanding() {
  const { api, add } = useStore();
  const { t, name, desc, pkg } = useT();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const data = useLoad(useCallback(() => api.suggestions(), [api]));
  const offers = data.value?.sets?.filter((item) => item.is_active !== false) ?? [];
  const featured = offers[0];

  const addPackage = async (offer: Suggestion) => {
    if (pendingId) return;
    setPendingId(String(offer.id));
    setError("");
    try {
      const { items } = await api.suggestion(offer.id);
      const lines = await api.resolvePackage(items || []);
      if (!lines.length) {
        router.push({ pathname: "/suggestion/[id]", params: { id: String(offer.id) } });
        return;
      }
      lines.forEach((line) => add(line));
      router.push("/cart");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errServer"));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>{t("familyMealsMetaTitle")}</title>
        <meta name="description" content={t("familyMealsMetaDescription")} />
        <meta property="og:title" content={t("familyMealsMetaTitle")} />
        <meta property="og:description" content={t("familyMealsMetaDescription")} />
      </Head>
      <Page>
        <CampaignHero
          image={featured?.hero_image_url}
          eyebrow={t("familyMealsEyebrow")}
          title={featured ? name(featured) : t("familyMealsTitle")}
          description={featured
            ? `${desc(featured) || t("familyMealsIntro")}${(featured.display_price_override ?? featured.display_price) != null ? ` · ${money(Number(featured.display_price_override ?? featured.display_price)).replace(".00", "")}` : ""}`
            : t("familyMealsIntro")}
          actionLabel={featured ? (pendingId === String(featured.id) ? t("sending") : t("addPackage")) : undefined}
          onAction={featured ? () => void addPackage(featured) : undefined}
          secondaryLabel={featured ? t("familyMealsDetails") : undefined}
          onSecondaryAction={featured ? () => router.push({ pathname: "/suggestion/[id]", params: { id: String(featured.id) } }) : undefined}
        />

        <View style={styles.promise}>
          <View style={styles.promiseIcon}><Ionicons name="people-outline" size={18} color={colors.tealDeep} /></View>
          <View style={styles.promiseCopy}>
            <Text style={styles.promiseTitle}>{t("familyMealsPoint3Title")}</Text>
            <Text style={styles.promiseSub}>{t("familyMealsPoint3Detail")}</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View style={styles.headingLabel}><View style={styles.goldRule} /><Text style={styles.eyebrow}>{t("familyMealsEyebrow")}</Text></View>
          <Text style={styles.sectionTitle}>{t("familyMealsOffersTitle")}</Text>
          <Text style={styles.sectionSub}>{t("familyMealsOffersSub")}</Text>
        </View>
        <Status loading={data.loading} error={data.error} retry={() => void data.reload()} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {!data.loading && !data.error && !offers.length ? <Text style={styles.empty}>{t("noMoodSuggestions")}</Text> : null}
        <View style={styles.offers}>
          {offers.slice(featured ? 1 : 0).map((offer) => {
            const price = offer.display_price_override ?? offer.display_price;
            const loading = pendingId === String(offer.id);
            return (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.imageWrap}>
                  <FoodImage uri={offer.hero_image_url} height={155} />
                  <View style={styles.levelTag}><Text style={styles.levelText}>{pkg(offer.package_level)}</Text></View>
                  {price != null ? <View style={styles.priceTag}><Text style={styles.priceText}>{money(Number(price)).replace(".00", "")}</Text></View> : null}
                </View>
                <View style={styles.offerBody}>
                  <Text style={styles.offerTitle}>{name(offer)}</Text>
                  {desc(offer) ? <Text style={styles.offerDescription} numberOfLines={3}>{desc(offer)}</Text> : null}
                  <View style={styles.offerActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: Boolean(pendingId) }}
                      disabled={Boolean(pendingId)}
                      onPress={() => void addPackage(offer)}
                      style={({ pressed }) => [styles.addButton, loading && styles.busy, pressed && styles.pressed]}
                    >
                      <Ionicons name={loading ? "hourglass-outline" : "bag-add-outline"} size={16} color={colors.white} />
                      <Text style={styles.addText}>{loading ? t("sending") : t("addPackage")}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: "/suggestion/[id]", params: { id: String(offer.id) } })}
                      style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.detailsText}>{t("familyMealsDetails")}</Text>
                      <Ionicons name="arrow-back" size={15} color={colors.tealDeep} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.handoff}>
          <Text style={styles.handoffText}>{t("familyMealsContactSub")}</Text>
          <CampaignContact message={t("familyMealsWaMessage")} />
        </View>
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  promise: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 11, borderBottomWidth: 1, borderColor: "#CDBB96" },
  promiseIcon: { width: 37, height: 37, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "#E7D3A8" },
  promiseCopy: { flex: 1, alignItems: "flex-end", gap: 3 },
  promiseTitle: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 11, textAlign: "right" },
  promiseSub: { color: colors.muted, fontFamily: font.regular, fontSize: 9, lineHeight: 14, textAlign: "right" },
  sectionHeading: { alignItems: "flex-end", gap: 5, paddingTop: 3 },
  headingLabel: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  goldRule: { width: 24, height: 2, backgroundColor: colors.gold },
  eyebrow: { color: colors.teal, fontFamily: font.bold, fontSize: 10 },
  sectionTitle: { color: colors.tealDeep, fontFamily: font.black, fontSize: 18, textAlign: "right" },
  sectionSub: { color: colors.muted, fontFamily: font.regular, fontSize: 10, lineHeight: 16, textAlign: "right" },
  offers: { gap: 11 },
  offerCard: { overflow: "hidden", backgroundColor: "#FFFDF8", borderRadius: 12, borderWidth: 1, borderColor: "#D9CFBF" },
  imageWrap: { position: "relative" },
  levelTag: { position: "absolute", top: 9, right: 9, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, backgroundColor: "rgba(8,45,41,0.9)" },
  levelText: { color: colors.white, fontFamily: font.bold, fontSize: 9 },
  priceTag: { position: "absolute", bottom: 9, left: 9, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: "rgba(8,45,41,0.92)" },
  priceText: { color: colors.white, fontFamily: font.black, fontSize: 13 },
  offerBody: { gap: 7, padding: 12, alignItems: "flex-end" },
  offerTitle: { color: colors.tealDeep, fontFamily: font.black, fontSize: 15, textAlign: "right" },
  offerDescription: { color: "#5D5A53", fontFamily: font.regular, fontSize: 10, lineHeight: 16, textAlign: "right", alignSelf: "stretch" },
  offerActions: { flexDirection: "row-reverse", width: "100%", gap: 7, paddingTop: 1 },
  addButton: { flex: 1, minHeight: 43, borderRadius: 8, backgroundColor: colors.tealDeep, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 5 },
  addText: { color: colors.white, fontFamily: font.bold, fontSize: 10 },
  detailsButton: { minWidth: 90, minHeight: 43, borderRadius: 8, borderWidth: 1, borderColor: "#CFC4B5", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 7 },
  detailsText: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 9 },
  busy: { opacity: 0.58 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  error: { color: colors.error, fontFamily: font.bold, fontSize: 11, textAlign: "right" },
  empty: { color: colors.muted, fontFamily: font.regular, fontSize: 11, textAlign: "right" },
  handoff: { gap: 7, paddingTop: 3 },
  handoffText: { color: colors.muted, fontFamily: font.regular, fontSize: 9, lineHeight: 15, textAlign: "right" },
});
