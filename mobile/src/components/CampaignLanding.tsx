import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, font } from "./ui";
import { useT } from "../lib/i18n";
import { imageUrl } from "../lib/media";
import { WHATSAPP_NUMBER } from "../lib/orders";

export function CampaignHero({
  image,
  eyebrow,
  title,
  description,
}: {
  image?: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const { t } = useT();
  const [failed, setFailed] = useState(false);
  return (
    <View style={hero.wrap}>
      {image && !failed ? (
        <Image
          source={{ uri: imageUrl(image) }}
          style={hero.photo}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityLabel={t("mealImage")}
        />
      ) : (
        <View style={[hero.photo, hero.photoFallback]}>
          <Ionicons name="restaurant-outline" size={48} color={colors.teal} />
          <Text style={hero.fallbackBrand}>TAMAM</Text>
        </View>
      )}
      <View style={hero.copy}>
        <View style={hero.kickerRow}>
          <View style={hero.rule} />
          <Text style={hero.eyebrow}>{eyebrow}</Text>
        </View>
        <Text style={hero.title}>{title}</Text>
        <Text style={hero.description}>{description}</Text>
      </View>
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
        <Ionicons name="logo-whatsapp" size={18} color={colors.white} />
        <Text style={contact.whatsappText}>{t("whatsappUs")}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => open(`tel:+${WHATSAPP_NUMBER}`)}
        style={({ pressed }) => [contact.button, contact.phone, pressed && contact.pressed]}
      >
        <Ionicons name="call-outline" size={18} color={colors.teal} />
        <Text style={contact.phoneText}>{t("callUs")}</Text>
      </Pressable>
    </View>
  );
}

export function CampaignTrust({
  items,
}: {
  items: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; detail: string }[];
}) {
  return (
    <View style={trust.wrap}>
      {items.map((item) => (
        <View key={item.title} style={trust.item}>
          <Ionicons name={item.icon} size={20} color={colors.teal} />
          <View style={trust.copy}>
            <Text style={trust.title}>{item.title}</Text>
            <Text style={trust.detail}>{item.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const hero = StyleSheet.create({
  wrap: { overflow: "hidden", borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: "#D8CDBD" },
  photo: { width: "100%", height: 214, backgroundColor: colors.high },
  photoFallback: { alignItems: "center", justifyContent: "center", gap: 8 },
  fallbackBrand: { color: colors.tealDeep, fontFamily: font.black, fontSize: 14, letterSpacing: 3 },
  copy: { paddingHorizontal: 17, paddingVertical: 17, alignItems: "flex-end", gap: 7 },
  kickerRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  rule: { width: 28, height: 2, backgroundColor: colors.gold },
  eyebrow: { color: colors.teal, fontFamily: font.bold, fontSize: 10, textAlign: "right" },
  title: { color: colors.tealDeep, fontFamily: font.black, fontSize: 23, lineHeight: 33, textAlign: "right" },
  description: { color: "#55524B", fontFamily: font.regular, fontSize: 12, lineHeight: 20, textAlign: "right" },
});

const contact = StyleSheet.create({
  wrap: { flexDirection: "row-reverse", gap: 9 },
  button: { flex: 1, minHeight: 48, borderRadius: 10, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 10 },
  whatsapp: { backgroundColor: colors.tealDeep },
  phone: { backgroundColor: colors.surface, borderWidth: 1, borderColor: "#D8CDBD" },
  whatsappText: { color: colors.white, fontFamily: font.bold, fontSize: 12 },
  phoneText: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 12 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});

const trust = StyleSheet.create({
  wrap: { gap: 8 },
  item: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingHorizontal: 13, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: "#E4DCCF" },
  copy: { flex: 1, alignItems: "flex-end", gap: 2 },
  title: { color: colors.tealDeep, fontFamily: font.bold, fontSize: 12, textAlign: "right" },
  detail: { color: colors.muted, fontFamily: font.regular, fontSize: 10, lineHeight: 16, textAlign: "right" },
});
