import { useState } from "react";
import { ImageBackground, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, font } from "./ui";
import { useT } from "../lib/i18n";
import { imageUrl } from "../lib/media";
import { WHATSAPP_NUMBER } from "../lib/orders";

export function CampaignHero({
  image,
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: {
  image?: string;
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}) {
  const { t } = useT();
  const [failed, setFailed] = useState(false);
  const content = (
    <LinearGradient
      colors={["rgba(5,20,18,0.04)", "rgba(5,20,18,0.13)", "rgba(5,20,18,0.88)"]}
      locations={[0, 0.42, 1]}
      style={hero.copy}
    >
      <View style={hero.kickerRow}>
        <View style={hero.rule} />
        <Text style={hero.eyebrow}>{eyebrow}</Text>
      </View>
      <Text style={hero.title}>{title}</Text>
      <Text style={hero.description}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [hero.action, pressed && hero.pressed]}
        >
          <Text style={hero.actionText}>{actionLabel}</Text>
          <Ionicons name="arrow-back" size={17} color={colors.tealDeep} />
        </Pressable>
      ) : null}
      {secondaryLabel && onSecondaryAction ? (
        <Pressable accessibilityRole="button" onPress={onSecondaryAction} style={({ pressed }) => [hero.secondaryAction, pressed && hero.pressed]}>
          <Text style={hero.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </LinearGradient>
  );

  return (
    <View style={hero.wrap}>
      {image && !failed ? (
        <ImageBackground
          source={{ uri: imageUrl(image) }}
          style={hero.photo}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityLabel={t("mealImage")}
        >
          {content}
        </ImageBackground>
      ) : (
        <View style={[hero.photo, hero.fallback]}>
          <Ionicons name="restaurant-outline" size={31} color={colors.gold} />
          {content}
        </View>
      )}
    </View>
  );
}

export function CampaignContact({ message }: { message: string }) {
  const { t } = useT();
  const open = (url: string) => void Linking.openURL(url).catch(() => {});
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  return (
    <View style={contact.wrap}>
      <Pressable
        accessibilityRole="button"
        onPress={() => open(whatsappUrl)}
        style={({ pressed }) => [contact.button, contact.whatsapp, pressed && contact.pressed]}
      >
        <Ionicons name="logo-whatsapp" size={17} color={colors.white} />
        <Text style={contact.whatsappText}>{t("whatsappUs")}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => open(`tel:+${WHATSAPP_NUMBER}`)}
        style={({ pressed }) => [contact.button, contact.phone, pressed && contact.pressed]}
      >
        <Ionicons name="call-outline" size={17} color={colors.teal} />
        <Text style={contact.phoneText}>{t("callUs")}</Text>
      </Pressable>
    </View>
  );
}

const hero = StyleSheet.create({
  wrap: { overflow: "hidden", borderRadius: 15, backgroundColor: colors.tealDeep, borderWidth: 1, borderColor: "#C7AD79" },
  photo: { width: "100%", height: 294, justifyContent: "flex-end", backgroundColor: colors.tealDeep },
  fallback: { alignItems: "stretch", justifyContent: "flex-end" },
  copy: { minHeight: 205, paddingHorizontal: 17, paddingTop: 42, paddingBottom: 15, alignItems: "flex-end", justifyContent: "flex-end", gap: 7 },
  kickerRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  rule: { width: 31, height: 2, backgroundColor: colors.gold },
  eyebrow: { color: "#F0D7A5", fontFamily: font.bold, fontSize: 10, textAlign: "right" },
  title: { color: colors.white, fontFamily: font.black, fontSize: 23, lineHeight: 31, textAlign: "right" },
  description: { color: "#F5F3EE", fontFamily: font.regular, fontSize: 11, lineHeight: 17, textAlign: "right", maxWidth: 310 },
  action: { alignSelf: "stretch", minHeight: 44, marginTop: 3, borderRadius: 9, backgroundColor: "#E7D3A8", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12 },
  actionText: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 12 },
  secondaryAction: { alignSelf: "stretch", minHeight: 34, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.48)", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  secondaryText: { color: colors.white, fontFamily: font.bold, fontSize: 10 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
});

const contact = StyleSheet.create({
  wrap: { flexDirection: "row-reverse", gap: 8 },
  button: { flex: 1, minHeight: 43, borderRadius: 9, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  whatsapp: { backgroundColor: colors.tealDeep },
  phone: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#CFC4B5" },
  whatsappText: { color: colors.white, fontFamily: font.bold, fontSize: 11 },
  phoneText: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 11 },
  pressed: { opacity: 0.82 },
});
