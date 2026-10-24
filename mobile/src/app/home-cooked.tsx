import { useCallback } from "react";
import { router } from "expo-router";
import Head from "expo-router/head";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CampaignContact, CampaignHero, CampaignTrust } from "../components/CampaignLanding";
import { colors, font, Page } from "../components/ui";
import { useT } from "../lib/i18n";
import { getPublishedMenus } from "../lib/dailyMeals";
import { useLoad } from "../lib/useLoad";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());

export default function HomeCookedLanding() {
  const { t } = useT();
  const date = today();
  const menus = useLoad(useCallback(() => getPublishedMenus(date, date), [date]));
  const heroImage = menus.value?.find((meal) => meal.image_url)?.image_url ?? undefined;

  return (
    <>
      <Head>
        <title>{t("homeCookedMetaTitle")}</title>
        <meta name="description" content={t("homeCookedMetaDescription")} />
        <meta property="og:title" content={t("homeCookedMetaTitle")} />
        <meta property="og:description" content={t("homeCookedMetaDescription")} />
      </Head>
      <Page>
        <CampaignHero
          image={heroImage}
          eyebrow={t("homeCookedEyebrow")}
          title={t("homeCookedTitle")}
          description={t("homeCookedIntro")}
        />
        <CampaignContact message={t("homeCookedWaMessage")} />
        <CampaignTrust items={[
          { icon: "home-outline", title: t("homeCookedPoint1Title"), detail: t("homeCookedPoint1Detail") },
          { icon: "restaurant-outline", title: t("homeCookedPoint2Title"), detail: t("homeCookedPoint2Detail") },
          { icon: "card-outline", title: t("homeCookedPoint3Title"), detail: t("homeCookedPoint3Detail") },
        ]} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/daily-meal")}
          style={({ pressed }) => [s.menuLink, pressed && { opacity: 0.82 }]}
        >
          <View style={s.menuIcon}><Ionicons name="calendar-outline" size={18} color={colors.teal} /></View>
          <View style={s.menuCopy}>
            <Text style={s.menuTitle}>{t("homeCookedSeeToday")}</Text>
            <Text style={s.menuSub}>{t("homeCookedSeeTodaySub")}</Text>
          </View>
          <Ionicons name="arrow-back" size={18} color={colors.teal} />
        </Pressable>
        <Text style={s.footnote}>{t("homeCookedFooter")}</Text>
      </Page>
    </>
  );
}

const s = StyleSheet.create({
  menuLink: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 13, borderRadius: 12, backgroundColor: "#EAE3D8", borderWidth: 1, borderColor: "#D8CDBD" },
  menuIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  menuCopy: { flex: 1, alignItems: "flex-end", gap: 2 },
  menuTitle: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 12, textAlign: "right" },
  menuSub: { color: colors.muted, fontFamily: font.regular, fontSize: 10, lineHeight: 16, textAlign: "right" },
  footnote: { color: colors.muted, fontFamily: font.regular, fontSize: 10, lineHeight: 16, textAlign: "right" },
});
