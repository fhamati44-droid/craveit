import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font } from "./ui";
import { LANGS, useT } from "../lib/i18n";
import { useStore } from "../lib/state";

/** ع | עב | EN segmented switch. `dark` for use on the teal game screen. */
export function LangSwitch({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useStore();
  const { t } = useT();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t("language")}
      style={[l.wrap, dark && l.wrapDark]}
    >
      {LANGS.map((x) => {
        const on = x.code === lang;
        return (
          <Pressable
            key={x.code}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={x.name}
            onPress={() => setLang(x.code)}
            hitSlop={4}
            style={[l.item, on && (dark ? l.onDark : l.on)]}
          >
            <Text
              style={[
                l.text,
                dark && { color: "rgba(255,255,255,0.75)" },
                on && { color: dark ? colors.teal : colors.white },
              ]}
            >
              {x.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const l = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderRadius: 18,
    padding: 3,
    gap: 2,
  },
  wrapDark: { backgroundColor: "rgba(255,255,255,0.1)" },
  item: {
    minWidth: 34,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  on: { backgroundColor: colors.teal },
  onDark: { backgroundColor: colors.white },
  text: { fontFamily: font.bold, fontSize: 12, color: colors.muted },
});
