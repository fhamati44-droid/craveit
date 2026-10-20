import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, Page } from "../components/ui";
import { useStore } from "../lib/state";
import { useT, localName } from "../lib/i18n";
import { DAILY_CATEGORIES, getPublicMenuOptionOverrides, getPublicOptions, getPublishedMenus, getVisibleDailyCategories, getVisibleDailyOptions, submitDailyOrder, type DailyCartLine, type DailyCategory, type DailyMenu, type DailyMenuOptionOverride, type DailyOption, type SharedDailyCategory } from "../lib/dailyMeals";

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
  const { width: viewportWidth } = useWindowDimensions();
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
  const [cart, setCart] = useState<DailyCartLine[]>([]);
  const [checkout, setCheckout] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
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
  const menuCardWidth = viewportWidth >= 720 ? "32%" : "48%";
  const total = cart.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
  const cartRestaurantNames = [...new Set(cart.map((line) => restaurantNames[String(menus.find((m) => m.id === line.menu_id)?.restaurant_id)] || "TAMAM"))];

  const addToCart = () => {
    if (!menu || !selected.main) { setError(t("dailyFinishChoices")); return; }
    setCart((old) => [...old, { menu_id: menu.id, quantity, selected_options: selected, unit_price: Number(menu.price) }]);
    setStep(0); setMenuId(null); setSelected({}); setQuantity(1); setError("");
  };
  const submit = async () => {
    const cleanPhone = phone.replace(/[\s()-]/g, "");
    if (!name.trim()) { setError(t("errName")); return; }
    if (cleanPhone.replace(/\D/g, "").length < 8) { setError(t("errPhone")); return; }
    if (!cart.length) { setError(t("dailyCartEmpty")); return; }
    if (deliveryMethod === "delivery" && !address.trim()) { setError(t("errAddress")); return; }
    setSending(true); setError("");
    try {
      await submitDailyOrder({ lines: cart, customer_name: name.trim(), phone: cleanPhone, delivery_method: deliveryMethod, delivery_address: address, customer_notes: notes });
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
          <Text style={s.body}>{t("dailyOrderSummary", { n: cart.reduce((sum, line) => sum + line.quantity, 0), p: total })}</Text>
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

          {!loading && menus.length > 0 && step === 0 && !checkout ? (
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
              {cart.length ? <View style={s.cartCard}>
                <View style={s.rowBetween}><Text style={s.sectionTitle}>{t("dailyCart", { n: cart.length })}</Text><Text style={s.total}>{total} ₪</Text></View>
                <Text style={s.body}>{cartRestaurantNames.join(" · ")}</Text>
                <Button label={t("dailyCheckout", { n: cart.reduce((sum, line) => sum + line.quantity, 0) })} onPress={() => { setCheckout(true); setError(""); }} />
              </View> : null}
              {!dayMenus.length ? <View style={s.card}><Text style={s.body}>{t("dailyNoMenusThisDay")}</Text></View> : null}
              <View style={s.menuGrid}>
              {dayMenus.map((item) => (
                <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.title} · ${t("dailyChooseMeal")}`} onPress={() => { setMenuId(item.id); setSelected({}); setQuantity(1); setStep(1); setError(""); }} style={[s.menuCard, { width: menuCardWidth }, menuId === item.id && s.selectedCard]}>
                  {item.image_url
                    ? <Image source={{ uri: item.image_url }} style={s.menuPhoto} resizeMode="cover" accessibilityLabel={t("image")} />
                    : <View style={s.menuPhotoPlaceholder}><Ionicons name="restaurant" size={34} color={colors.teal} /></View>}
                  <View style={s.menuHeadingRow}>
                    <View style={s.menuNameBlock}>
                      <Text numberOfLines={2} style={s.menuTitle}>{item.title}</Text>
                      <Text numberOfLines={1} style={s.restaurantName}>{restaurantNames[String(item.restaurant_id)] || "TAMAM"}</Text>
                    </View>
                    <View style={s.menuPriceBlock}>
                      <Text style={s.price}>{Number(item.price)} ₪</Text>
                      {menuId === item.id ? <Ionicons name="checkmark-circle" size={18} color={colors.green} /> : null}
                    </View>
                  </View>
                  <View style={s.menuPreview}>
                    {previewCategoryOrder.filter((category) => category !== "main").map((category) => {
                      const override = optionOverrides.find((row) => row.menu_id === item.id && row.category === category);
                      const allowed = getVisibleDailyOptions(options, item.id, category, override);
                      if (!allowed.length) return null;
                      return (
                        <View key={`${item.id}-${category}`} style={s.previewLine}>
                          <Ionicons name={categoryIcons[category]} size={12} color={colors.green} />
                          <Text style={s.previewCategory}>{t(categoryKey[category])}</Text>
                          <Text numberOfLines={2} style={s.previewText}>
                            {allowed.map((option) => localName(lang, option) || option.name).join("، ")}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Pressable>
              ))}
              </View>
            </View>
          ) : null}

          {!loading && !checkout && step >= 1 && step <= visibleCategories.length && menu && currentCategory ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t(categoryKey[currentCategory])}</Text>
              <Text style={s.body}>{dateLabel(menu.service_date)} · {Number(menu.price)} ₪</Text>
              {visibleOptions.map((option) => {
                const active = selected[currentCategory] === option.id;
                return (
                  <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { setSelected((old) => ({ ...old, [currentCategory]: option.id })); setError(""); setStep((n) => Math.min(n + 1, detailStep)); }} style={[s.option, active && s.selectedCard]}>
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

          {!checkout && step === detailStep && menu ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t("dailyMealSummary")}</Text>
              <View style={s.card}>
                <Text style={s.body}>{dateLabel(menu.service_date)} · {Number(menu.price)} ₪ / {t("dailyMeal")}</Text>
                {chosenOptions.map((option) => <Text key={option.id} style={s.summaryLine}>• {t(categoryKey[option.category])}: {localName(lang, option) || option.name}</Text>)}
              </View>
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

          {checkout ? <View style={s.section}>
            <Text style={s.sectionTitle}>{t("dailyCheckoutTitle")}</Text>
            <View style={s.cartCard}>
              {cart.map((line, index) => {
                const meal = menus.find((item) => item.id === line.menu_id);
                const mealOptions = DAILY_CATEGORIES.map((category) => {
                  const option = options.find((row) => row.id === line.selected_options[category]);
                  return option ? `${t(categoryKey[category])}: ${localName(lang, option) || option.name}` : "";
                }).filter(Boolean);
                return <View key={`${line.menu_id}-${index}`} style={s.cartLine}>
                  <View style={s.rowBetween}><Text style={s.menuTitle}>{meal?.title || t("dailyMeal")}</Text><Text style={s.price}>{line.unit_price * line.quantity} ₪</Text></View>
                  <Text style={s.muted}>{meal ? restaurantNames[String(meal.restaurant_id)] || "TAMAM" : ""} · {meal ? dateLabel(meal.service_date) : ""}</Text>
                  {mealOptions.map((label) => <Text key={label} style={s.summaryLine}>{label}</Text>)}
                  <View style={s.quantityRow}>
                    <Text style={s.body}>{t("dailyQuantity")}</Text>
                    <View style={s.quantityControls}>
                      <Pressable accessibilityRole="button" accessibilityLabel={t("decrease")} onPress={() => setCart((old) => old.map((row, i) => i === index ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row))} style={s.qtyButton}><Ionicons name="remove" size={18} color={colors.teal} /></Pressable>
                      <Text style={s.quantity}>{line.quantity}</Text>
                      <Pressable accessibilityRole="button" accessibilityLabel={t("increase")} onPress={() => setCart((old) => old.map((row, i) => i === index ? { ...row, quantity: Math.min(20, row.quantity + 1) } : row))} style={s.qtyButton}><Ionicons name="add" size={18} color={colors.teal} /></Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={t("remove")} onPress={() => setCart((old) => old.filter((_, i) => i !== index))} style={s.qtyButton}><Ionicons name="trash-outline" size={17} color={colors.error} /></Pressable>
                    </View>
                  </View>
                </View>;
              })}
              <Text style={s.total}>{t("total")}: {total} ₪</Text>
              {deliveryMethod === "pickup" && cartRestaurantNames.length > 1 ? <Text style={s.body}>{t("dailyPickupMulti", { names: cartRestaurantNames.join("، ") })}</Text> : null}
            </View>
            <Text style={s.label}>{t("dailyReceiveMethod")}</Text>
            <View style={s.receiveRow}>
              {([["delivery", "dailyDelivery", "bicycle-outline"], ["pickup", "dailyPickup", "storefront-outline"]] as const).map(([value, label, icon]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: deliveryMethod === value }} onPress={() => setDeliveryMethod(value)} style={[s.receiveButton, deliveryMethod === value && s.receiveButtonActive]}>
                <Ionicons name={icon} size={18} color={deliveryMethod === value ? colors.white : colors.teal} /><Text style={[s.receiveText, deliveryMethod === value && s.receiveTextActive]}>{t(label)}</Text>
              </Pressable>)}
            </View>
            {deliveryMethod === "delivery" ? <><Text style={s.label}>{t("deliveryAddress")}</Text><TextInput value={address} onChangeText={setAddress} style={s.input} placeholder={t("addressPh")} /></> : <Text style={s.body}>{t("dailyPickupHint")}</Text>}
            <Text style={s.label}>{t("name")}</Text>
            <TextInput value={name} onChangeText={setName} style={s.input} placeholder={t("name")} autoComplete="name" />
            <Text style={s.label}>{t("phone")}</Text>
            <TextInput value={phone} onChangeText={setPhone} style={s.input} placeholder="05…" keyboardType="phone-pad" autoComplete="tel" />
            <Text style={s.label}>{t("dailyNotesLabel")}</Text>
            <TextInput value={notes} onChangeText={setNotes} style={[s.input, { minHeight: 74 }]} placeholder={t("dailyNotesPlaceholder")} multiline />
          </View> : null}

          {error && menus.length ? <Text style={s.error}>{error}</Text> : null}
          {!loading && menus.length ? (
            <View style={s.actions}>
              {checkout ? <Button label={t("dailyBackToMeals")} onPress={() => { setCheckout(false); setError(""); }} tone="ghost" /> : null}
              {!checkout && step > 0 ? <Button label={t("dailyBack")} onPress={() => { setError(""); setStep((n) => n - 1); }} tone="ghost" /> : null}
              {!checkout && currentCategory && currentCategory !== "main" ? <Button label={t(skipKey[currentCategory])} onPress={() => { setSelected((old) => { const nextSelected = { ...old }; delete nextSelected[currentCategory]; return nextSelected; }); setError(""); setStep((n) => Math.min(n + 1, detailStep)); }} tone="ghost" /> : null}
              {checkout ? <Button label={sending ? t("sending") : t("dailyConfirmOrder", { p: total })} onPress={() => void submit()} disabled={sending || !cart.length} /> : step === detailStep && menu ? <Button label={t("dailyAddMealToCart")} onPress={addToCart} /> : null}
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
  menuGrid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", rowGap: 9 },
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
  menuPhoto: { width: "100%", aspectRatio: 1.15, borderRadius: 11, backgroundColor: colors.high },
  menuPhotoPlaceholder: { width: "100%", aspectRatio: 1.15, borderRadius: 11, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  menuHeadingRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 5 },
  menuNameBlock: { flex: 1, gap: 2, alignItems: "flex-end" },
  menuPriceBlock: { alignItems: "center", gap: 2 },
  restaurantName: { color: colors.muted, fontFamily: font.regular, fontSize: 9, textAlign: "right" },
  menuPreview: { borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: 5, gap: 3 },
  previewLine: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 3 },
  previewCategory: { color: colors.ink, fontFamily: font.bold, fontSize: 10, textAlign: "right" },
  previewText: { flex: 1, color: colors.muted, fontFamily: font.regular, fontSize: 10, lineHeight: 14, textAlign: "right" },
  selectedCard: { borderColor: colors.green, borderWidth: 2, backgroundColor: colors.mint },
  menuTitle: { color: colors.ink, fontFamily: font.bold, fontSize: 13, lineHeight: 18, textAlign: "right" },
  price: { color: colors.teal, fontFamily: font.black, fontSize: 14 },
  option: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: 16, padding: 12 },
  optionIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  optionPhoto: { width: 54, height: 54, borderRadius: 12, backgroundColor: colors.high },
  optionTitle: { color: colors.ink, fontFamily: font.bold, fontSize: 14, textAlign: "right" },
  body: { color: colors.muted, fontFamily: font.regular, fontSize: 12, lineHeight: 19, textAlign: "right" },
  muted: { color: colors.muted, fontFamily: font.regular, fontSize: 11, lineHeight: 17, textAlign: "right" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: 18, padding: 14, gap: 7 },
  cartCard: { backgroundColor: colors.mint, borderWidth: 1, borderColor: colors.green, borderRadius: 18, padding: 13, gap: 8 },
  cartLine: { borderBottomWidth: 1, borderBottomColor: colors.outline, paddingVertical: 7, gap: 4 },
  receiveRow: { flexDirection: "row-reverse", gap: 9 },
  receiveButton: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.outline, borderRadius: 13, backgroundColor: colors.surface, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7 },
  receiveButtonActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  receiveText: { color: colors.teal, fontFamily: font.bold, fontSize: 12 },
  receiveTextActive: { color: colors.white },
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
