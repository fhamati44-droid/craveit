import { useCallback, useRef, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { colors, font, money } from "../../components/ui";
import { Brush, TamamLogo, TrianglePattern } from "../../components/brand";
import { MoodWheel, type WheelHandle } from "../../components/MoodWheel";
import { useStore } from "../../lib/state";
import { useLoad } from "../../lib/useLoad";
import { imageUrl } from "../../lib/media";
import { moodIcon } from "../../lib/moods";
import { title, type Mood, type Suggestion } from "../../lib/types";

const MAX_ON_WHEEL = 8;
const packageName = (level?: string) =>
  level === "plus" ? "بلس" : level === "mix" ? "ميكس" : "كلاسيك";

type Result =
  | { mood: Mood; state: "loading" }
  | { mood: Mood; state: "ready"; pick?: Suggestion; total: number }
  | { mood: Mood; state: "error" };

export default function Game() {
  const { api } = useStore();
  const { width } = useWindowDimensions();
  const moods = useLoad(useCallback(() => api.moods(), [api]));
  const wheel = useRef<WheelHandle>(null);
  const [live, setLive] = useState<Mood>();
  const [result, setResult] = useState<Result>();

  const onWheel = (moods.value || []).slice(0, MAX_ON_WHEEL);
  const size = Math.min(Math.min(width, 480) - 36, 360);

  const reveal = async (mood: Mood) => {
    setResult({ mood, state: "loading" });
    try {
      const data = await api.suggestions(mood.id);
      const sets = (data?.sets || []).filter((x) => x.is_active !== false);
      const pick = sets[Math.floor(Math.random() * sets.length)];
      setResult({ mood, state: "ready", pick, total: sets.length });
    } catch {
      setResult({ mood, state: "error" });
    }
  };

  return (
    <View style={g.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.teal, colors.tealDeep]}
        style={StyleSheet.absoluteFill}
      />
      <TrianglePattern opacity={0.06} />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={g.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={g.top}>
            <TamamLogo height={18} color={colors.white} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="السلة"
              onPress={() => router.push("/cart")}
              style={g.iconBtn}
            >
              <Ionicons name="bag-handle-outline" size={20} color={colors.white} />
            </Pressable>
          </View>

          <Text style={g.title}>شو مودك هسا؟</Text>
          <Brush style={{ alignSelf: "center", marginTop: -2 }}>
            <Text style={g.tag}>لفّ العجلة · TAMAM بتختارلك الوجبة</Text>
          </Brush>

          {moods.loading ? (
            <View style={g.state}>
              <ActivityIndicator color={colors.bright} size="large" />
              <Text style={g.sub}>عم نجهّز المودات...</Text>
            </View>
          ) : moods.error ? (
            <View style={g.state}>
              <Text style={g.stateTitle}>ما قدرنا نحمّل المودات.</Text>
              <Text style={g.sub}>{moods.error}</Text>
              <Pressable style={g.cta} onPress={moods.reload} accessibilityRole="button">
                <Text style={g.ctaText}>حاول مرة ثانية</Text>
              </Pressable>
            </View>
          ) : !onWheel.length ? (
            <View style={g.state}>
              <Text style={g.stateTitle}>ما في مودات جاهزة هسا.</Text>
              <Pressable
                style={g.cta}
                onPress={() => router.push("/restaurants")}
                accessibilityRole="button"
              >
                <Text style={g.ctaText}>تصفّح المطاعم</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={{ alignItems: "center", marginTop: 8 }}>
                <MoodWheel
                  ref={wheel}
                  moods={onWheel}
                  size={size}
                  onSpinStart={() => setResult(undefined)}
                  onTick={(i) => setLive(onWheel[i])}
                  onLand={(i) => void reveal(onWheel[i])}
                />
              </View>
              <View style={g.ticker} accessibilityLiveRegion="polite">
                <Text style={g.tickerText} numberOfLines={1}>
                  {live ? title(live) : "دوس على مود، أو خلّيها علينا"}
                </Text>
              </View>

              {(moods.value?.length || 0) > MAX_ON_WHEEL ? (
                <View style={{ gap: 10, marginTop: 8 }}>
                  <Text style={g.section}>
                    كل المودات ({moods.value?.length})
                  </Text>
                  <View style={g.chips}>
                    {moods.value?.map((m, i) => (
                      <Pressable
                        key={String(m.id)}
                        accessibilityRole="button"
                        style={g.chip}
                        onPress={() =>
                          i < MAX_ON_WHEEL
                            ? wheel.current?.spin(i)
                            : router.push({
                                pathname: "/suggestions",
                                params: { mood: String(m.id) },
                              })
                        }
                      >
                        <MaterialIcons
                          name={moodIcon(m)}
                          size={15}
                          color={colors.bright}
                        />
                        <Text style={g.chipText}>{title(m)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {result ? (
        <>
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={g.backdrop}
          >
            <Pressable
              style={{ flex: 1 }}
              accessibilityLabel="إغلاق"
              onPress={() => setResult(undefined)}
            />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(18)}
            exiting={SlideOutDown}
            style={g.sheet}
          >
            <ResultCard
              result={result}
              again={() => {
                setResult(undefined);
                setTimeout(() => wheel.current?.spin(), 250);
              }}
              retry={() => void reveal(result.mood)}
            />
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

function ResultCard({
  result,
  again,
  retry,
}: {
  result: Result;
  again: () => void;
  retry: () => void;
}) {
  const { mood } = result;
  const openMood = () =>
    router.push({ pathname: "/suggestions", params: { mood: String(mood.id) } });
  return (
    <View style={{ gap: 14 }}>
      <View style={g.handle} />
      <View style={g.moodRow}>
        <View style={g.moodIcon}>
          <MaterialIcons
            name={moodIcon(mood)}
            size={26}
            color={colors.white}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={g.eyebrow}>طلع مودك</Text>
          <Text style={g.moodName}>{title(mood)}</Text>
        </View>
      </View>

      {result.state === "loading" ? (
        <View style={[g.pickCard, g.center]}>
          <ActivityIndicator color={colors.green} />
          <Text style={g.muted}>عم نختارلك وجبة...</Text>
        </View>
      ) : result.state === "error" ? (
        <View style={[g.pickCard, g.center]}>
          <Text style={g.muted}>ما قدرنا نجيب الوجبات هسا.</Text>
          <Pressable onPress={retry} accessibilityRole="button">
            <Text style={g.link}>حاول مرة ثانية</Text>
          </Pressable>
        </View>
      ) : result.pick ? (
        <Pressable
          accessibilityRole="button"
          style={g.pickCard}
          onPress={() =>
            router.push({
              pathname: "/suggestion/[id]",
              params: { id: String(result.pick!.id) },
            })
          }
        >
          <PickImage uri={result.pick.hero_image_url} />
          <View style={g.pickBody}>
            <View style={g.pill}>
              <Text style={g.pillText}>{packageName(result.pick.package_level)}</Text>
            </View>
            <Text style={g.pickTitle} numberOfLines={2}>
              {result.pick.title_ar || result.pick.title}
            </Text>
            {result.pick.description_ar ? (
              <Text style={g.muted} numberOfLines={2}>
                {result.pick.description_ar}
              </Text>
            ) : null}
          </View>
          {result.pick.display_price_override != null ||
          result.pick.display_price != null ? (
            <Brush style={g.price}>
              <Text style={g.priceText}>
                {money(
                  result.pick.display_price_override ??
                    result.pick.display_price ??
                    0,
                ).replace(".00", "")}
              </Text>
            </Brush>
          ) : null}
        </Pressable>
      ) : (
        <View style={[g.pickCard, g.center]}>
          <Text style={g.muted}>لسا ما في وجبات جاهزة لهالمود.</Text>
        </View>
      )}

      {result.state === "ready" && result.pick ? (
        <Pressable
          style={g.primary}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/suggestion/[id]",
              params: { id: String(result.pick!.id) },
            })
          }
        >
          <Text style={g.primaryText}>بدّي هاي!</Text>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
        </Pressable>
      ) : null}
      <View style={{ flexDirection: "row-reverse", gap: 10 }}>
        <Pressable style={g.secondary} onPress={again} accessibilityRole="button">
          <Ionicons name="refresh" size={17} color={colors.teal} />
          <Text style={g.secondaryText}>لفّ كمان مرة</Text>
        </Pressable>
        <Pressable style={g.secondary} onPress={openMood} accessibilityRole="button">
          <Text style={g.secondaryText}>
            {result.state === "ready" && result.total > 1
              ? `كل الوجبات (${result.total})`
              : "كل الوجبات"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function PickImage({ uri }: { uri?: string }) {
  const [failed, setFailed] = useState(false);
  return uri && !failed ? (
    <Image
      source={{ uri: imageUrl(uri) }}
      style={g.pickImage}
      onError={() => setFailed(true)}
      accessibilityLabel="صورة الوجبة"
    />
  ) : (
    <View style={[g.pickImage, g.center]}>
      <Ionicons name="restaurant-outline" size={40} color={colors.green} />
    </View>
  );
}

const g = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.teal },
  content: { padding: 18, paddingBottom: 40, gap: 6 },
  top: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: font.black,
    fontSize: 32,
    lineHeight: 46,
    color: colors.white,
    textAlign: "center",
  },
  tag: {
    fontFamily: font.bold,
    fontSize: 12,
    color: colors.white,
    textAlign: "center",
  },
  sub: {
    fontFamily: font.regular,
    fontSize: 13,
    color: "#CFE3DE",
    textAlign: "center",
  },
  state: { alignItems: "center", gap: 14, paddingVertical: 60 },
  stateTitle: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.white,
    textAlign: "center",
  },
  cta: {
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingHorizontal: 26,
    paddingVertical: 14,
  },
  ctaText: { fontFamily: font.bold, color: colors.white, fontSize: 14 },
  ticker: {
    alignSelf: "center",
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tickerText: { fontFamily: font.medium, fontSize: 13, color: colors.white },
  section: {
    fontFamily: font.bold,
    fontSize: 14,
    color: colors.white,
    textAlign: "right",
  },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  chipText: { fontFamily: font.medium, fontSize: 12, color: colors.white },
  backdrop: {
    position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: "rgba(3,30,27,0.55)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    paddingBottom: 22,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.outline,
  },
  moodRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  moodIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.green,
    textAlign: "right",
  },
  moodName: {
    fontFamily: font.black,
    fontSize: 22,
    lineHeight: 32,
    color: colors.teal,
    textAlign: "right",
  },
  pickCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.outline,
  },
  center: { alignItems: "center", justifyContent: "center", gap: 8, minHeight: 120 },
  pickImage: { width: "100%", height: 150, backgroundColor: colors.high },
  pickBody: { padding: 14, gap: 6 },
  pickTitle: {
    fontFamily: font.bold,
    fontSize: 16,
    lineHeight: 26,
    color: colors.ink,
    textAlign: "right",
  },
  pill: {
    alignSelf: "flex-end",
    backgroundColor: colors.mint,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillText: { fontFamily: font.bold, fontSize: 10, color: colors.green },
  price: { position: "absolute", top: 110, left: 12, paddingHorizontal: 18 },
  priceText: { fontFamily: font.black, fontSize: 22, color: colors.white },
  muted: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "right",
  },
  link: { fontFamily: font.bold, fontSize: 13, color: colors.teal },
  primary: {
    backgroundColor: colors.green,
    borderRadius: 16,
    minHeight: 54,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryText: { fontFamily: font.black, fontSize: 17, color: colors.white },
  secondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.teal,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryText: { fontFamily: font.bold, fontSize: 13, color: colors.teal },
});
