import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Circle, G, Path } from "react-native-svg";
import { colors, font } from "./ui";
import { TamamMark, Tri } from "./brand";
import { moodIcon } from "../lib/moods";
import { title, type Mood } from "../lib/types";

export interface WheelHandle {
  spin: (index?: number) => void;
}
interface Props {
  moods: Mood[];
  size: number;
  onTick?: (index: number) => void;
  onLand: (index: number) => void;
  onSpinStart?: () => void;
}

const SLICE = [colors.surface, colors.tealMid] as const;
const point = (c: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [c + r * Math.sin(a), c - r * Math.cos(a)];
};
const buzz = (kind: "tick" | "land" | "go") => {
  if (Platform.OS === "web") return;
  if (kind === "tick") void Haptics.selectionAsync().catch(() => {});
  else if (kind === "go")
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => {},
    );
  else
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
};

export const MoodWheel = forwardRef<WheelHandle, Props>(function MoodWheel(
  { moods, size, onTick, onLand, onSpinStart },
  ref,
) {
  const n = Math.max(moods.length, 1);
  const seg = 360 / n;
  const c = size / 2;
  const rim = Math.round(size * 0.045);
  const r = c - rim;
  const reduceMotion = useReducedMotion();

  const rotation = useSharedValue(0);
  const kick = useSharedValue(0);
  const pulse = useSharedValue(1);
  const [spinning, setSpinning] = useState(false);
  const [blink, setBlink] = useState(false);

  // Invite the tap: the hub breathes while idle.
  useEffect(() => {
    if (spinning || reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = withTiming(1);
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [spinning, reduceMotion, pulse]);

  // Rim bulbs chase while spinning.
  useEffect(() => {
    if (!spinning) return;
    const t = setInterval(() => setBlink((b) => !b), 120);
    return () => clearInterval(t);
  }, [spinning]);

  const tick = (index: number) => {
    buzz("tick");
    onTick?.(index);
  };
  const land = (index: number) => {
    setSpinning(false);
    buzz("land");
    onLand(index);
  };

  // Which slice sits under the pointer -> pointer flick + haptic tick.
  useAnimatedReaction(
    () => {
      const local = (((-rotation.value % 360) + 360) % 360) / seg;
      return Math.floor(local) % n;
    },
    (index, previous) => {
      if (previous === null || index === previous) return;
      kick.value = withSequence(
        withTiming(-18, { duration: 40 }),
        withTiming(0, { duration: 140 }),
      );
      scheduleOnRN(tick, index);
    },
  );

  const spin = (target?: number) => {
    if (spinning || !moods.length) return;
    const random = target === undefined;
    const index = random ? Math.floor(Math.random() * moods.length) : target;
    const jitter = random ? (Math.random() - 0.5) * seg * 0.55 : 0;
    const centre = index * seg + seg / 2 + jitter;
    const current = rotation.value;
    const desired = (((360 - centre) % 360) + 360) % 360;
    const turns = reduceMotion ? 1 : random ? 5 : 3;
    let goal = current - (((current % 360) + 360) % 360) + desired;
    while (goal < current + turns * 360) goal += 360;
    setSpinning(true);
    onSpinStart?.();
    buzz("go");
    rotation.value = withTiming(
      goal,
      {
        duration: reduceMotion ? 700 : random ? 4200 : 2600,
        easing: Easing.bezier(0.12, 0.8, 0.2, 1),
      },
      (finished) => {
        if (finished) scheduleOnRN(land, index);
      },
    );
  };
  useImperativeHandle(ref, () => ({ spin }));

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const pointerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${kick.value}deg` }],
  }));
  const hubStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const hub = Math.round(size * 0.3);
  const labelW = Math.min(84, (2 * Math.PI * r * 0.62) / n - 4);
  const bulbs = Array.from({ length: n * 3 });

  return (
    <View style={{ width: size, height: size + 18, alignItems: "center" }}>
      <View style={{ width: size, height: size, marginTop: 18 }}>
        {/* glow */}
        <View
          style={[
            styles.glow,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
        <Animated.View style={[{ width: size, height: size }, wheelStyle]}>
          <Svg width={size} height={size}>
            <Circle cx={c} cy={c} r={c} fill={colors.tealDeep} />
            {moods.map((m, i) => {
              const [x0, y0] = point(c, r, i * seg);
              const [x1, y1] = point(c, r, (i + 1) * seg);
              const odd = n % 2 === 1 && i === n - 1;
              return (
                <Path
                  key={String(m.id)}
                  d={`M${c} ${c} L${x0} ${y0} A${r} ${r} 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z`}
                  fill={odd ? colors.green : SLICE[i % 2]}
                  stroke={colors.tealDeep}
                  strokeWidth={1.5}
                />
              );
            })}
            <G>
              {bulbs.map((_, i) => {
                const [bx, by] = point(c, c - rim / 2, (i * 360) / bulbs.length);
                const lit = spinning ? (i % 2 === 0) === blink : i % 2 === 0;
                return (
                  <Circle
                    key={i}
                    cx={bx}
                    cy={by}
                    r={rim * 0.24}
                    fill={lit ? colors.white : colors.green}
                  />
                );
              })}
            </G>
          </Svg>
          {moods.map((m, i) => {
            const angle = i * seg + seg / 2;
            const [lx, ly] = point(c, r * 0.64, angle);
            const dark = i % 2 === 1 || (n % 2 === 1 && i === n - 1);
            const ink = dark ? colors.white : colors.teal;
            // keep lower-half labels upright, icon still towards the rim
            const flip = angle > 90 && angle < 270;
            return (
              <Pressable
                key={String(m.id)}
                accessibilityRole="button"
                accessibilityLabel={`اختار مود ${title(m)}`}
                disabled={spinning}
                onPress={() => spin(i)}
                style={[
                  styles.label,
                  {
                    width: labelW,
                    left: lx - labelW / 2,
                    top: ly - 30,
                    transform: [{ rotate: `${flip ? angle - 180 : angle}deg` }],
                    flexDirection: flip ? "column-reverse" : "column",
                  },
                ]}
              >
                <MaterialIcons
                  name={moodIcon(m)}
                  size={Math.round(size * 0.07)}
                  color={dark ? colors.bright : colors.green}
                />
                <Text
                  numberOfLines={2}
                  style={[
                    styles.labelText,
                    { color: ink, fontSize: size < 300 ? 9 : 10.5 },
                  ]}
                >
                  {title(m)}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* centre hub: does not rotate */}
        <Animated.View
          style={[
            styles.hubWrap,
            {
              width: hub,
              height: hub,
              borderRadius: hub / 2,
              left: c - hub / 2,
              top: c - hub / 2,
            },
            hubStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="انطلق، خلّي TAMAM تختار"
            accessibilityState={{ disabled: spinning }}
            disabled={spinning}
            onPress={() => spin()}
            style={({ pressed }) => [
              styles.hub,
              { borderRadius: hub / 2 },
              pressed && { transform: [{ scale: 0.94 }] },
            ]}
          >
            <TamamMark size={hub * 0.2} color={colors.white} accent={colors.tealDeep} />
            <Text style={[styles.hubText, { fontSize: hub * 0.2 }]}>
              {spinning ? "..." : "انطلق"}
            </Text>
            {!spinning ? <Text style={styles.hubSub}>اضغط هنا</Text> : null}
          </Pressable>
        </Animated.View>
      </View>

      {/* pointer: the brand triangle, pointing into the wheel */}
      <Animated.View
        pointerEvents="none"
        style={[styles.pointer, { left: c - 17 }, pointerStyle]}
      >
        <Tri size={34} color={colors.white} rotate={180} />
        <Tri
          size={22}
          color={colors.green}
          rotate={180}
          style={{ position: "absolute", left: 6, top: 3 }}
        />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    backgroundColor: colors.green,
    opacity: 0.25,
    transform: [{ scale: 1.08 }],
    shadowColor: colors.bright,
    shadowOpacity: 0.8,
    shadowRadius: 40,
  },
  label: {
    position: "absolute",
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  labelText: {
    fontFamily: font.bold,
    textAlign: "center",
    lineHeight: 14,
  },
  hubWrap: {
    position: "absolute",
    backgroundColor: colors.white,
    padding: 5,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  hub: {
    flex: 1,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  hubText: {
    fontFamily: font.black,
    color: colors.white,
    lineHeight: undefined,
    marginTop: 2,
  },
  hubSub: { fontFamily: font.medium, fontSize: 9, color: colors.tealDeep },
  pointer: {
    position: "absolute",
    top: 0,
    width: 34,
    height: 34,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    transformOrigin: "50% 0%",
  },
});
