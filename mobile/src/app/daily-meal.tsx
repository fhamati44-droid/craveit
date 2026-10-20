import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, Page } from "../components/ui";
import { useStore } from "../lib/state";
import { useT, localName } from "../lib/i18n";
import { DAILY_CATEGORIES, getPublicMenuOptionOverrides, getPublicOptions, getPublishedMenus, getVisibleDailyCategories, getVisibleDailyOptions, submitDailyReservation, type DailyCategory, type DailyMenu, type DailyMenuOptionOverride, type DailyOption, type SharedDailyCategory } from "../lib/dailyMeals";

const categoryKey: Record<DailyCategory, "dailySoup" | "dailyMain" | "dailyAddition" | "dailySalad"> = {
  soup: "dailySoup", main: "dailyMain", addition: "dailyAddition", salad: "dailySalad",
};
const categoryIcons: Record<DailyCategory, React.ComponentProps<typeof Ionicons>["name"]> = {
  soup: "water-outline", main: "restaurant-outline", addition: "add-circle-outline", salad: "leaf-outline",
};
const previewCategoryOrder: DailyCategory[] = ["main", "soup", "addition", "salad"];
const skipKey: Record<SharedDailyCategory, "dailySkipSoup" | "dailySkipAddition" | "dailySkipSalad"> = {
  soup: "dailySkipSoup", addition: "dailySkipAddition", salad: "dailySkipSalad",
};
const initialDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
const addDays = (date: string, offset: number) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
};

export default function DailyMeal() {
  const { api, customer, saveCustomer, lang } = useStore();
  const { t, sheet } = useT();
  const s = sheet(styles);
  const [weekStart] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(weekStart);
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [options, setOptions] = useState<DailyOption[]>([]);
  const [optionOverrides, setOptionOverrides] = useState<DailyMenuOptionOverride[]>([]);
  const [restaurantNames, setRestaurantNames] = useState<Record<string, string>>({});
  const [menuId, setMenuId] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Partial<Record<DailyCategory, number>>>({});
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await getPublishedMenus(weekStart, addDays(weekStart, 6));
      setMenus(rows);
      const [optionRows, overrideRows] = await Promise.all([
        getPublicOptions(rows.map((m) => m.id)),
        getPublicMenuOptionOverrides(rows.map((m) => m.id)),
      ]);
      setOptions(optionRows); setOptionOverrides(overrideRows);
      const ids = [...new Set(rows.map((m) => m.restaurant_id))];
      const pairs = await Promise.all(ids.map(async (id) => {
        try { const restaurant = await api.restaurant(id); return [String(id), localName(lang, restaurant)] as const; }
        catch { return [String(id), "TAMAM"] as const; }
      }));
      setRestaurantNames(Object.fromEntries(pairs));
    } catch (e) { setError(e instanceof Error ? e.message : t("errServer")); }
    finally { setLoading(false); }
  }, [api, lang, t, weekStart]);
  // Fetching is a mount effect; `load` updates state only after its requests settle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const menu = menus.find((m) => m.id === menuId) || null;
  const dayMenus = menus.filter((item) => item.service_date === selectedDate);
  const visibleCategories = menu ? getVisibleDailyCategories(options, menuId, optionOverrides) : [];
  const detailStep = visibleCategories.length + 1;
  const currentCategory = visibleCategories[step - 1];
  const currentOverride = optionOverrides.find((row) => row.menu_id === menuId && row.category === currentCategory);
  const visibleOptions = currentCategory ? getVisibleDailyOptions(options, menuId, currentCategory, currentOverride) : [];
  const chosenOptions = DAILY_CATEGORIES.map((category) => options.find((o) => o.id === selected[category])).filter(Boolean) as DailyOption[];
  const dateLabel = (date: string) => new Intl.DateTimeFormat(lang === "ar" ? "ar" : lang === "he" ? "he" : "en", { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
  const weekdayLabel = (date: string) => new Intl.DateTimeFormat(lang === "ar" ? "ar" : lang === "he" ? "he" : "en", { timeZone: "Asia/Jerusalem", weekday: "short" }).format(new Date(`${date}T12:00:00`)).replace(/\.$/, "");
  const stepNames = ["dailyDate", ...visibleCategories.map((category) => categoryKey[category]), "dailyYourDetails"] as const;

  const next = () => {
    setError("");
    if (step === 0 && !menu) { setError(t("dailyChooseDate")); return; }
    if (currentCategory === "main" && !selected.main) { setError(t("dailyChooseOption")); return; }
    setStep((n) => Math.min(n + 1, detailStep));
  };
  const submit = async () => {
    const cleanPhone = phone.replace(/[\s()-]/g, "");
    if (!name.trim()) { setError(t("errName")); return; }
    if (cleanPhone.replace(/\D/g, "").length < 8) { setError(t("errPhone")); return; }
    if (!menu || !selected.main) { setError(t("dailyFinishChoices")); return; }
    setSending(true); setError("");
    try {
      await submitDailyReservation({ menu_id: menu.id, customer_name: name.trim(), phone: cleanPhone, quantity, selected_options: selected, unit_price: Number(menu.price) });
      saveCustomer({ ...customer, name: name.trim(), phone: cleanPhone });
      setSuccess(true);
    } catch (e) { setError(e instanceof Error ? e.message : t("errServer")); }
    finally { setSending(false); }
  };

  return (
    <Page>
      <View style={[s.hero, step === 0 && s.heroBrowse]}>
        {step > 0 ? <View style={s.heroIcon}><Ionicons name="calendar-outline" size={27} color={colors.green} /></View> : null}
        {step > 0 ? <Text style={s.eyebrow}>{t("dailyEyebrow")}</Text> : null}
        <Text style={[s.title, step === 0 && s.titleBrowse]}>{t("dailyTitle")}</Text>
        <Text style={[s.subtitle, step === 0 && s.subtitleBrowse]}>{t("dailySub")}</Text>
      </View>
      {success ? (
        <View style={s.success}>
          <Ionicons name="checkmark-circle" size={48} color={colors.green} />
          <Text style={s.title}>{t("dailyThanks")}</Text>
          <Text style={s.body}>{t("dailyReservationReceived")}</Text>
          <Text style={s.body}>{menu ? `${dateLabel(menu.service_date)} · ${quantity} · ${Number(menu.price) * quantity} ₪` : ""}</Text>
          <Button label={t("backHome")} onPress={() => router.replace("/")} tone="ghost" />
        </View>
      ) : (
        <>
          {step > 0 ? <View style={s.progressRow}>
            {stepNames.map((key, i) => (
              <View key={key} style={s.progressItem}>
                <View style={[s.dot, step >= i && s.dotOn]}><Text style={[s.dotText, step >= i && s.dotTextOn]}>{i + 1}</Text></View>
                <Text numberOfLines={1} style={[s.progressLabel, step === i && s.progressActive]}>{t(key)}</Text>
              </View>
            ))}
          </View> : null}
          {loading ? <ActivityIndicator color={colors.green} style={{ padding: 28 }} /> : null}
          {!loading && error && !menus.length ? <View style={s.card}><Text style={s.error}>{error}</Text><Button label={t("retry")} onPress={() => { setLoading(true); setError(""); void load(); }} /></View> : null}
          {!loading && !menus.length && !error ? <View style={s.card}><Text style={s.body}>{t("dailyNoMenus")}</Text></View> : null}

          {!loading && menus.length > 0 && step === 0 ? (
            <View style={s.browseSection}>
              <View style={s.rowBetween}>
                <Text style={s.sectionTitle}>{selectedDate === weekStart ? t("dailyTodayMeals") : dateLabel(selectedDate)}</Text>
                <Text style={s.body}>{dayMenus.length ? t("dailyDayMealsCount", { n: dayMenus.length }) : t("dailyNoMenusShort")}</Text>
              </View>
              <Text style={s.weekLabel}>{t("dailyWeekTitle")}</Text>
              <View style={s.dateStrip}>
                {(() => {
                  const todayCount = menus.filter((item) => item.service_date === weekStart).length;
                  const todayActive = selectedDate === weekStart;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: todayActive }}
                      accessibilityLabel={`${t("dailyTodayShort")} · ${dateLabel(weekStart)} · ${todayCount ? t("dailyDayMealsCount", { n: todayCount }) : t("dailyNoMenusShort")}`}
                      onPress={() => { setSelectedDate(weekStart); setMenuId(null); setSelected({}); setError(""); }}
                      style={[s.todayChip, todayActive && s.todayChipActive]}
                    >
                      <Text style={[s.todayChipLabel, todayActive && s.todayChipTextActive]}>{t("dailyTodayShort")}</Text>
                      <Text style={[s.todayChipDate, todayActive && s.todayChipTextActive]}>{new Intl.DateTimeFormat(lang === "ar" ? "ar" : lang === "he" ? "he" : "en", { timeZone: "Asia/Jerusalem", day: "numeric" }).format(new Date(`${weekStart}T12:00:00`))}</Text>
                    </Pressable>
                  );
                })()}
                <ScrollView horizontal style={s.otherDaysScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={s.weekStrip}>
                {weekDates.slice(1).map((date) => {
                  const count = menus.filter((item) => item.service_date === date).length;
                  const active = selectedDate === date;
                  return (
                    <Pressable
                      key={date}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${dateLabel(date)} · ${count ? t("dailyDayMealsCount", { n: count }) : t("dailyNoMenusShort")}`}
                      onPress={() => { setSelectedDate(date); setMenuId(null); setSelected({}); setError(""); }}
                      style={[s.dayChip, active && s.dayChipActive]}
                    >
                      <Text style={[s.dayName, active && s.dayNameActive]}>{weekdayLabel(date)}</Text>
                      <Text style={[s.dayNumber, active && s.dayNameActive]}>{new Intl.DateTimeFormat(lang === "ar" ? "ar" : lang === "he" ? "he" : "en", { timeZone: "Asia/Jerusalem", day: "numeric" }).format(new Date(`${date}T12:00:00`))}</Text>
                      <Text style={[s.dayCount, active && s.dayNameActive]}>{count || "–"}</Text>
                    </Pressable>
                  );
                })}
                </ScrollView>
              </View>
              {!dayMenus.length ? <View style={s.card}><Text style={s.body}>{t("dailyNoMenusThisDay")}</Text></View> : null}
              {dayMenus.map((item) => (
                <Pressable key={item.id} onPress={() => { setMenuId(item.id); setSelected({}); }} style={[s.menuCard, menuId === item.id && s.selectedCard]}>
                  <View style={s.menuCardTop}>
                    {item.image_url
                      ? <Image source={{ uri: item.image_url }} style={s.menuPhoto} accessibilityLabel={t("image")} />
                      : <View style={s.menuMark}><Ionicons name="restaurant" size={20} color={colors.teal} /></View>}
                    <View style={{ flex: 1 }}>
                      <Text style={s.menuTitle}>{item.title}</Text>
                      <Text style={s.body}>{restaurantNames[String(item.restaurant_id)] || "TAMAM"}</Text>
                    </View>
                    <Text style={s.price}>{Number(item.price)} ₪</Text>
                    {menuId === item.id ? <Ionicons name="checkmark-circle" size={22} color={colors.green} /> : null}
                  </View>
                  <View style={s.menuPreview}>
                    {previewCategoryOrder.map((category) => {
                      const override = optionOverrides.find((row) => row.menu_id === item.id && row.category === category);
                      const allowed = getVisibleDailyOptions(options, item.id, category, override);
                      const missingKey = category === "soup" ? "dailyPreviewWithoutSoup" : category === "addition" ? "dailyPreviewWithoutAddition" : "dailyPreviewWithoutSalad";
                      return (
                        <View key={`${item.id}-${category}`} style={s.previewLine}>
                          <Text style={s.previewCategory}>{t(categoryKey[category])}:</Text>
                          <Text style={s.previewText}>
                            {allowed.length
                              ? `${allowed.map((option) => localName(lang, option) || option.name).join("، ")} · ${t(category === "main" ? "dailyPreviewChooseOneRequired" : "dailyPreviewChooseOneOptional")}`
                              : t(category === "main" ? "dailyPreviewNoMain" : missingKey)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {!loading && step >= 1 && step <= visibleCategories.length && menu && currentCategory ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t(categoryKey[currentCategory])}</Text>
              <Text style={s.body}>{dateLabel(menu.service_date)} · {Number(menu.price)} ₪</Text>
              {visibleOptions.map((option) => {
                const active = selected[currentCategory] === option.id;
                return (
                  <Pressable key={option.id} onPress={() => setSelected((old) => ({ ...old, [currentCategory]: option.id }))} style={[s.option, active && s.selectedCard]}>
                    {option.image_url
                      ? <Image source={{ uri: option.image_url }} style={s.optionPhoto} accessibilityLabel={t("image")} />
                      : <View style={s.optionIcon}><Ionicons name={categoryIcons[currentCategory]} size={18} color={active ? colors.white : colors.teal} /></View>}
                    <View style={{ flex: 1 }}>
                      <Text style={s.optionTitle}>{localName(lang, option) || option.name}</Text>
                      {option.description ? <Text style={s.body}>{option.description}</Text> : null}
                    </View>
                    <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={22} color={active ? colors.green : colors.muted} />
                  </Pressable>
                );
              })}
              {!visibleOptions.length ? <Text style={s.body}>{t("dailyNoOptions")}</Text> : null}
              {currentCategory !== "main" ? <Text style={s.body}>{t("dailyStageOptional")}</Text> : null}
            </View>
          ) : null}

          {step === detailStep && menu ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t("dailyYourDetails")}</Text>
              <View style={s.card}>
                <Text style={s.body}>{dateLabel(menu.service_date)} · {Number(menu.price)} ₪ / {t("dailyMeal")}</Text>
                {chosenOptions.map((option) => <Text key={option.id} style={s.summaryLine}>• {t(categoryKey[option.category])}: {localName(lang, option) || option.name}</Text>)}
              </View>
              <Text style={s.label}>{t("name")}</Text>
              <TextInput value={name} onChangeText={setName} style={s.input} placeholder={t("name")} autoComplete="name" />
              <Text style={s.label}>{t("phone")}</Text>
              <TextInput value={phone} onChangeText={setPhone} style={s.input} placeholder="05…" keyboardType="phone-pad" autoComplete="tel" />
              <View style={s.quantityRow}>
                <Text style={s.label}>{t("dailyQuantity")}</Text>
                <View style={s.quantityControls}>
                  <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={s.qtyButton}><Ionicons name="remove" size={18} color={colors.teal} /></Pressable>
                  <Text style={s.quantity}>{quantity}</Text>
                  <Pressable onPress={() => setQuantity((q) => Math.min(20, q + 1))} style={s.qtyButton}><Ionicons name="add" size={18} color={colors.teal} /></Pressable>
                </View>
              </View>
              <Text style={s.total}>{t("total")}: {Number(menu.price) * quantity} ₪</Text>
            </View>
          ) : null}

          {error && menus.length ? <Text style={s.error}>{error}</Text> : null}
          {!loading && menus.length ? (
            <View style={s.actions}>
              {step > 0 ? <Button label={t("dailyBack")} onPress={() => { setError(""); setStep((n) => n - 1); }} tone="ghost" /> : null}
              {currentCategory && currentCategory !== "main" ? <Button label={t(skipKey[currentCategory])} onPress={() => { setSelected((old) => { const nextSelected = { ...old }; delete nextSelected[currentCategory]; return nextSelected; }); setError(""); setStep((n) => Math.min(n + 1, detailStep)); }} tone="ghost" /> : null}
              {step < detailStep ? <Button label={t("dailyContinue")} onPress={next} disabled={(step === 0 && !menu) || (currentCategory === "main" && !visibleOptions.length)} /> : <Button label={sending ? t("sending") : `${t("dailyReserve")} · ${menu ? Number(menu.price) * quantity : 0} ₪`} onPress={() => void submit()} disabled={sending} />}
            </View>
          ) : null}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.teal, borderRadius: 24, padding: 20, gap: 5, alignItems: "flex-end" },
  heroBrowse: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 15, gap: 3 },
  heroIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  eyebrow: { color: colors.bright, fontFamily: font.bold, fontSize: 11, textAlign: "right" },
  title: { color: colors.white, fontFamily: font.black, fontSize: 21, textAlign: "right" },
  titleBrowse: { fontSize: 18, lineHeight: 24 },
  subtitle: { color: "#D5E8E4", fontFamily: font.regular, fontSize: 12, lineHeight: 20, textAlign: "right" },
  subtitleBrowse: { fontSize: 11, lineHeight: 15 },
  progressRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginVertical: 14, gap: 3 },
  progressItem: { alignItems: "center", flex: 1, gap: 5 },
  dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.high, alignItems: "center", justifyContent: "center" },
  dotOn: { backgroundColor: colors.green },
  dotText: { fontSize: 11, fontFamily: font.bold, color: colors.muted },
  dotTextOn: { color: colors.white },
  progressLabel: { fontSize: 8, lineHeight: 12, color: colors.muted, fontFamily: font.regular, textAlign: "center" },
  progressActive: { color: colors.teal, fontFamily: font.bold },
  section: { gap: 11 },
  browseSection: { gap: 7 },
  sectionTitle: { color: colors.teal, fontFamily: font.black, fontSize: 18, textAlign: "right" },
  weekLabel: { color: colors.muted, fontFamily: font.bold, fontSize: 10, textAlign: "right" },
  rowBetween: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  dateStrip: { height: 54, flexDirection: "row-reverse", alignItems: "stretch", gap: 6 },
  todayChip: { width: 58, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 13, borderWidth: 1, borderColor: colors.green, backgroundColor: colors.mint },
  todayChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  todayChipLabel: { color: colors.teal, fontFamily: font.bold, fontSize: 10 },
  todayChipDate: { color: colors.teal, fontFamily: font.black, fontSize: 14 },
  todayChipTextActive: { color: colors.white },
  otherDaysScroll: { flex: 1 },
  weekStrip: { flexDirection: "row-reverse", alignItems: "stretch", gap: 6, paddingVertical: 1 },
  dayChip: { minWidth: 52, alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 6, borderRadius: 13, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface },
  dayChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  dayName: { color: colors.muted, fontFamily: font.bold, fontSize: 10 },
  dayNumber: { color: colors.ink, fontFamily: font.black, fontSize: 16 },
  dayCount: { color: colors.muted, fontFamily: font.regular, fontSize: 8, lineHeight: 9 },
  dayNameActive: { color: colors.white },
  menuCard: { gap: 6, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.outline, padding: 10 },
  menuCardTop: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  menuPreview: { borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: 6, gap: 2 },
  previewHeading: { color: colors.teal, fontFamily: font.bold, fontSize: 11, textAlign: "right" },
  previewLine: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 4 },
  previewCategory: { color: colors.ink, fontFamily: font.bold, fontSize: 11, textAlign: "right" },
  previewText: { flex: 1, color: colors.muted, fontFamily: font.regular, fontSize: 11, lineHeight: 17, textAlign: "right" },
  selectedCard: { borderColor: colors.green, borderWidth: 2, backgroundColor: colors.mint },
  menuMark: { width: 38, height: 38, backgroundColor: colors.high, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  menuPhoto: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.high },
  menuTitle: { color: colors.ink, fontFamily: font.bold, fontSize: 14, textAlign: "right" },
  price: { color: colors.teal, fontFamily: font.black, fontSize: 14 },
  option: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: 16, padding: 12 },
  optionIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  optionPhoto: { width: 54, height: 54, borderRadius: 12, backgroundColor: colors.high },
  optionTitle: { color: colors.ink, fontFamily: font.bold, fontSize: 14, textAlign: "right" },
  body: { color: colors.muted, fontFamily: font.regular, fontSize: 12, lineHeight: 19, textAlign: "right" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: 18, padding: 14, gap: 7 },
  input: { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: 14, padding: 13, minHeight: 48, textAlign: "right", fontSize: 14, fontFamily: font.regular },
  label: { color: colors.ink, fontFamily: font.bold, fontSize: 13, textAlign: "right" },
  summaryLine: { color: colors.ink, fontFamily: font.regular, fontSize: 12, textAlign: "right" },
  quantityRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  quantity: { color: colors.ink, fontFamily: font.bold, fontSize: 16 },
  total: { color: colors.teal, fontFamily: font.black, fontSize: 18, textAlign: "right" },
  actions: { flexDirection: "row-reverse", gap: 10, marginTop: 6 },
  error: { color: colors.error, fontFamily: font.medium, fontSize: 12, textAlign: "right" },
  success: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, alignItems: "center", gap: 12 },
});
