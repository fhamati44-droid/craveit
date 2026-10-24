import { useCallback, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import Head from "expo-router/head";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CampaignContact, CampaignHero } from "../components/CampaignLanding";
import { FoodImage } from "../components/cards";
import { colors, font, money, Page, Status, useS } from "../components/ui";
import { useStore } from "../lib/state";
import { useLoad } from "../lib/useLoad";
import { useT } from "../lib/i18n";
import type { Suggestion } from "../lib/types";

const tiers = ["all", "classic", "mix", "plus"] as const;

export default function Suggestions() {
  const params = useLocalSearchParams<{ mood?: string | string[] }>();
  const moodId = Array.isArray(params.mood) ? params.mood[0] : params.mood;
  const { api, add } = useStore();
  const { t, name, desc, pkg } = useT();
  const s = useS();
  const [tier, setTier] = useState<(typeof tiers)[number]>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const data = useLoad(useCallback(() => api.suggestions(moodId), [api, moodId]));
  const moods = useLoad(useCallback(() => api.moods(), [api]));
  const currentMood = moods.value?.find((item) => String(item.id) === String(moodId));
  const allOffers = (data.value?.sets ?? []).filter((offer) => {
    const price = Number(offer.display_price_override ?? offer.display_price);
    return offer.is_active !== false && Number.isFinite(price) && price > 0;
  });
  const offers = allOffers.filter((offer) => tier === "all" || offer.package_level === tier);
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errServer"));
    } finally {
      setPendingId(null);
    }
  };

  const heading = currentMood ? name(currentMood) : t("moodPageHeadline");
  const pageTitle = currentMood ? `${heading} | TAMAM` : t("moodPageMetaTitle");
  const pageDescription = currentMood
    ? t("moodPageMetaDescription", { mood: heading })
    : t("moodPageMetaDescriptionGeneric");

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
      </Head>
      <Page>
        <CampaignHero
          image={featured?.hero_image_url}
          eyebrow={currentMood ? t("moodPageEyebrow") : t("byMoodTime")}
          title={heading}
          description={currentMood ? t("moodPageMoodIntro") : t("suggestionsLandingSub")}
        />

        <View style={styles.choiceIntro}>
          <Text style={styles.choiceTitle}>{t("moodPageChooseTitle")}</Text>
          <Text style={styles.choiceSub}>{t("moodPageChooseSub")}</Text>
        </View>

        <View style={[s.row, styles.filters]}>
          {tiers.map((value) => {
            const selected = tier === value;
            return (
              <Pressable
                key={value}
                style={[s.chip, selected && s.chipOn]}
                onPress={() => setTier(value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[s.text, styles.filterText, selected && styles.filterTextSelected]}>
                  {value === "all" ? t("all") : pkg(value)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Status loading={data.loading} error={data.error} retry={() => void data.reload()} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {!data.loading && !data.error && offers.length === 0 ? (
          <Text style={styles.empty}>{t("noMoodSuggestions")}</Text>
        ) : null}

        <View style={styles.offerList}>
          {offers.map((offer) => {
            const price = Number(offer.display_price_override ?? offer.display_price);
            const busy = pendingId === String(offer.id);
            return (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.imageWrap}>
                  <FoodImage uri={offer.hero_image_url} height={190} />
                  <View style={styles.levelTag}><Text style={styles.levelText}>{pkg(offer.package_level)}</Text></View>
                  <View style={styles.priceTag}><Text style={styles.priceText}>{money(price).replace(".00", "")}</Text></View>
                </View>
                <View style={styles.offerBody}>
                  <Text style={styles.offerTitle}>{name(offer)}</Text>
                  {desc(offer) ? <Text style={styles.offerDescription} numberOfLines={3}>{desc(offer)}</Text> : null}
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: Boolean(pendingId) }}
                      disabled={Boolean(pendingId)}
                      onPress={() => void addPackage(offer)}
                      style={({ pressed }) => [styles.addButton, busy && styles.busy, pressed && styles.pressed]}
                    >
                      <Ionicons name={busy ? "hourglass-outline" : "bag-add-outline"} size={17} color={colors.white} />
                      <Text style={styles.addText}>{busy ? t("addingToCart") : t("addPackage")}</Text>
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

        <View style={styles.contact}>
          <Text style={styles.contactText}>{t("moodPageHelp")}</Text>
          <CampaignContact message={t("moodPageContactMessage")} />
        </View>
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  choiceIntro: { alignItems: "flex-end", gap: 4 },
  choiceTitle: { color: colors.tealDeep, fontFamily: font.black, fontSize: 17, textAlign: "right" },
  choiceSub: { color: colors.muted, fontFamily: font.regular, fontSize: 10, lineHeight: 16, textAlign: "right" },
  filters: { flexWrap: "wrap", gap: 8 },
  filterText: { fontSize: 11, color: colors.ink },
  filterTextSelected: { color: colors.white },
  offerList: { gap: 12 },
  offerCard: { overflow: "hidden", backgroundColor: "#FFFDF8", borderRadius: 13, borderWidth: 1, borderColor: "#D9CFBF" },
  imageWrap: { position: "relative" },
  levelTag: { position: "absolute", top: 10, right: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(8,45,41,0.92)" },
  levelText: { color: colors.white, fontFamily: font.bold, fontSize: 10 },
  priceTag: { position: "absolute", bottom: 10, left: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(8,45,41,0.94)" },
  priceText: { color: colors.white, fontFamily: font.black, fontSize: 14 },
  offerBody: { gap: 8, padding: 13, alignItems: "flex-end" },
  offerTitle: { color: colors.tealDeep, fontFamily: font.black, fontSize: 15, textAlign: "right" },
  offerDescription: { color: "#5D5A53", fontFamily: font.regular, fontSize: 10, lineHeight: 16, textAlign: "right", alignSelf: "stretch" },
  actions: { flexDirection: "row-reverse", width: "100%", gap: 8, paddingTop: 1 },
  addButton: { flex: 1, minHeight: 45, borderRadius: 9, backgroundColor: colors.tealDeep, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 6 },
  addText: { color: colors.white, fontFamily: font.bold, fontSize: 10 },
  detailsButton: { minWidth: 96, minHeight: 45, borderRadius: 9, borderWidth: 1, borderColor: "#CFC4B5", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 8 },
  detailsText: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 9 },
  busy: { opacity: 0.6 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  error: { color: colors.error, fontFamily: font.bold, fontSize: 11, textAlign: "right" },
  empty: { color: colors.muted, fontFamily: font.regular, fontSize: 11, textAlign: "right", paddingVertical: 10 },
  contact: { gap: 8, paddingTop: 3 },
  contactText: { color: colors.muted, fontFamily: font.regular, fontSize: 10, lineHeight: 16, textAlign: "right" },
});
