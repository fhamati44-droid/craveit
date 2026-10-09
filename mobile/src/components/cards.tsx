import { useState } from "react";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, font, money, shadow } from "./ui";
import { Brush } from "./brand";
import { imageUrl } from "../lib/media";
import type { Restaurant, Suggestion } from "../lib/types";
import { useT } from "../lib/i18n";

export function FoodImage({
  uri,
  height = 150,
}: {
  uri?: string;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  const { t } = useT();
  const c = cs;
  return uri && !failed ? (
    <Image
      source={{ uri: imageUrl(uri) }}
      style={{ height, width: "100%", backgroundColor: colors.high }}
      onError={() => setFailed(true)}
      accessibilityLabel={t("image")}
    />
  ) : (
    <View style={[c.placeholder, { height }]}>
      <Ionicons name="restaurant-outline" size={34} color={colors.green} />
    </View>
  );
}

const price = (value: number) => money(value).replace(".00", "");

export function SuggestionCard({
  set,
  width = 230,
}: {
  set: Suggestion;
  width?: number | `${number}%`;
}) {
  const amount = set.display_price_override ?? set.display_price;
  const { name, desc, pkg, sheet } = useT();
  const c = sheet(cs);
  return (
    <Pressable
      style={({ pressed }) => [c.card, { width }, pressed && c.pressed]}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/suggestion/[id]",
          params: { id: String(set.id) },
        })
      }
    >
      <FoodImage uri={set.hero_image_url} height={140} />
      {amount != null ? (
        <Brush style={c.price}>
          <Text style={c.priceText}>{price(amount)}</Text>
        </Brush>
      ) : null}
      <View style={c.body}>
        <View style={c.pill}>
          <Text style={c.pillText}>{pkg(set.package_level)}</Text>
        </View>
        <Text style={c.title} numberOfLines={2}>
          {name(set)}
        </Text>
        {desc(set) ? (
          <Text style={c.meta} numberOfLines={1}>
            {desc(set)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function RestaurantCard({
  restaurant,
  width = 270,
}: {
  restaurant: Restaurant;
  width?: number | `${number}%`;
}) {
  const closed = (restaurant.is_open ?? restaurant.active) === false;
  const { t, name, sheet } = useT();
  const c = sheet(cs);
  const logo = restaurant.logo_url || restaurant.image_url;
  return (
    <Pressable
      style={({ pressed }) => [c.card, { width }, pressed && c.pressed]}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/restaurant/[id]",
          params: { id: String(restaurant.id) },
        })
      }
    >
      <View>
        <FoodImage
          uri={restaurant.cover_url || restaurant.image_url}
          height={130}
        />
        <View style={[c.status, closed && { backgroundColor: colors.error }]}>
          <Text style={c.statusText}>{closed ? t("closed") : t("open")}</Text>
        </View>
        {logo ? (
          <View style={c.logo}>
            <Image
              source={{ uri: imageUrl(logo) }}
              style={{ width: "100%", height: "100%" }}
            />
          </View>
        ) : null}
      </View>
      <View style={[c.body, logo ? { paddingTop: 20 } : null]}>
        <Text style={c.title} numberOfLines={1}>
          {name(restaurant)}
        </Text>
        <View style={c.metaRow}>
          {restaurant.delivery_time != null ? (
            <View style={c.metaItem}>
              <Ionicons name="time-outline" size={13} color={colors.green} />
              <Text style={c.meta}>{t("minutesShort", { n: restaurant.delivery_time })}</Text>
            </View>
          ) : null}
          {restaurant.delivery_fee != null ? (
            <View style={c.metaItem}>
              <Ionicons name="bicycle-outline" size={14} color={colors.green} />
              <Text style={c.meta}>{t("deliveryFee", { p: price(restaurant.delivery_fee) })}</Text>
            </View>
          ) : null}
          {(restaurant.minimum_order ?? restaurant.min_order) != null ? (
            <Text style={c.meta}>
              {t("minOrder", { p: price(Number(restaurant.minimum_order ?? restaurant.min_order)) })}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  placeholder: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint,
  },
  body: { padding: 14, gap: 6 },
  title: {
    fontFamily: font.bold,
    fontSize: 14,
    lineHeight: 23,
    color: colors.ink,
    textAlign: "right",
  },
  meta: {
    fontFamily: font.regular,
    fontSize: 11,
    color: colors.muted,
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  metaItem: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  pill: {
    alignSelf: "flex-end",
    backgroundColor: colors.mint,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillText: { fontFamily: font.bold, fontSize: 10, color: colors.green },
  price: { position: "absolute", top: 104, left: 10, paddingHorizontal: 16 },
  priceText: { fontFamily: font.black, fontSize: 17, color: colors.white },
  status: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusText: { fontFamily: font.bold, fontSize: 10, color: colors.white },
  logo: {
    position: "absolute",
    bottom: -22,
    right: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
  },
});
