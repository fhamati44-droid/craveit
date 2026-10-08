import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, font } from "./ui";
import { TamamMark } from "./brand";

type Icon = keyof typeof Ionicons.glyphMap;
const ICONS: Record<string, [Icon, Icon]> = {
  index: ["home-outline", "home"],
  restaurants: ["restaurant-outline", "restaurant"],
  orders: ["receipt-outline", "receipt"],
  profile: ["person-outline", "person"],
};

/** RTL bottom bar with the raised TAMAM game button in the middle. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[t.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key].options.title ?? route.name;
        const go = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented)
            navigation.navigate(route.name, route.params);
        };
        if (route.name === "game")
          return <GameButton key={route.key} focused={focused} onPress={go} />;
        const [off, on] = ICONS[route.name] || ["ellipse-outline", "ellipse"];
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={go}
            style={t.item}
          >
            <Ionicons
              name={focused ? on : off}
              size={23}
              color={focused ? colors.teal : colors.muted}
            />
            <Text style={[t.label, focused && t.labelOn]}>{label}</Text>
            {focused ? <View style={t.dot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function GameButton({
  focused,
  onPress,
}: {
  focused: boolean;
  onPress: () => void;
}) {
  const reduce = useReducedMotion();
  const ring = useSharedValue(0);
  useEffect(() => {
    if (reduce || focused) return;
    ring.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
    );
  }, [reduce, focused, ring]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: focused ? 0 : 0.55 * (1 - ring.value),
    transform: [{ scale: 1 + ring.value * 0.45 }],
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel="TAMAM، لعبة المود"
      onPress={onPress}
      style={t.item}
    >
      <View style={t.gameWrap}>
        <Animated.View style={[t.ring, ringStyle]} />
        <View style={[t.game, focused && { backgroundColor: colors.green }]}>
          <TamamMark
            size={26}
            color={colors.white}
            accent={focused ? colors.teal : colors.green}
          />
        </View>
      </View>
      <Text style={[t.label, t.gameLabel]}>TAMAM</Text>
    </Pressable>
  );
}

const t = StyleSheet.create({
  bar: {
    flexDirection: "row-reverse",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: 8,
    shadowColor: "#06463F",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: "center", gap: 3, minHeight: 48 },
  label: { fontFamily: font.medium, fontSize: 10, color: colors.muted },
  labelOn: { fontFamily: font.bold, color: colors.teal },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.green,
  },
  gameWrap: {
    marginTop: -30,
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green,
  },
  game: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.teal,
    borderWidth: 4,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#06463F",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  gameLabel: { fontFamily: font.black, color: colors.teal, letterSpacing: 1 },
});
