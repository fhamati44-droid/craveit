import { useCallback, useState } from "react";
import Head from "expo-router/head";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CampaignContact, CampaignHero, CampaignTrust } from "../components/CampaignLanding";
import { SuggestionCard } from "../components/cards";
import { colors, font, Page, Status, Txt, useS } from "../components/ui";
import { useStore } from "../lib/state";
import { useLoad } from "../lib/useLoad";
import { useT } from "../lib/i18n";

export default function FamilyMealsLanding() {
  const { api } = useStore();
  const { t, pkg } = useT();
  const s = useS();
  const [level, setLevel] = useState("all");
  const data = useLoad(useCallback(() => api.suggestions(), [api]));
  const offers = data.value?.sets?.filter(
    (item) => item.is_active !== false && (level === "all" || item.package_level === level),
  );
  const heroImage = data.value?.sets?.find((item) => item.is_active !== false && item.hero_image_url)?.hero_image_url;

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
          image={heroImage}
          eyebrow={t("familyMealsEyebrow")}
          title={t("familyMealsTitle")}
          description={t("familyMealsIntro")}
        />
        <CampaignContact message={t("familyMealsWaMessage")} />
        <CampaignTrust items={[
          { icon: "people-outline", title: t("familyMealsPoint1Title"), detail: t("familyMealsPoint1Detail") },
          { icon: "list-outline", title: t("familyMealsPoint2Title"), detail: t("familyMealsPoint2Detail") },
          { icon: "card-outline", title: t("familyMealsPoint3Title"), detail: t("familyMealsPoint3Detail") },
        ]} />
        <View style={styles.offerHeading}>
          <Text style={styles.offerTitle}>{t("familyMealsOffersTitle")}</Text>
          <Text style={styles.offerSub}>{t("familyMealsOffersSub")}</Text>
        </View>
        <View style={[s.row, styles.filters]}>
          {["all", "classic", "mix", "plus"].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: level === value }}
              onPress={() => setLevel(value)}
              style={[s.chip, level === value && s.chipOn]}
            >
              <Text style={[s.text, styles.filterText, level === value && styles.filterTextActive]}>
                {value === "all" ? t("all") : pkg(value)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Status loading={data.loading} error={data.error} retry={() => void data.reload()} />
        {offers?.map((offer) => <SuggestionCard key={offer.id} set={offer} width="100%" />)}
        {offers?.length === 0 ? <Txt muted>{t("noMoodSuggestions")}</Txt> : null}
        <Text style={styles.footer}>{t("familyMealsFooter")}</Text>
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  offerHeading: { alignItems: "flex-end", gap: 4, paddingTop: 2 },
  offerTitle: { color: colors.tealDeep, fontFamily: font.black, fontSize: 18, textAlign: "right" },
  offerSub: { color: colors.muted, fontFamily: font.regular, fontSize: 11, lineHeight: 17, textAlign: "right" },
  filters: { flexWrap: "wrap", gap: 7 },
  filterText: { fontSize: 11, color: colors.ink },
  filterTextActive: { color: colors.white },
  footer: { color: colors.muted, fontFamily: font.regular, fontSize: 10, lineHeight: 16, textAlign: "right" },
});
