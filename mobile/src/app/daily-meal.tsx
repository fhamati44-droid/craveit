import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, Page } from "../components/ui";
import { useStore } from "../lib/state";
import { useT, localName } from "../lib/i18n";
import { DAILY_CATEGORIES, getPublicOptions, getPublishedMenus, submitDailyReservation, type DailyCategory, type DailyMenu, type DailyOption } from "../lib/dailyMeals";

const categoryKey: Record<DailyCategory, "dailySoup" | "dailyMain" | "dailyAddition" | "dailySalad"> = {
  soup: "dailySoup", main: "dailyMain", addition: "dailyAddition", salad: "dailySalad",
};
const categoryIcons: Record<DailyCategory, React.ComponentProps<typeof Ionicons>["name"]> = {
  soup: "water-outline", main: "restaurant-outline", addition: "add-circle-outline", salad: "leaf-outline",
};
const initialDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());

export default function DailyMeal() {
  const { api, customer, saveCustomer, lang } = useStore();
  const { t, sheet } = useT();
  const s = sheet(styles);
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [options, setOptions] = useState<DailyOption[]>([]);
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
      const rows = await getPublishedMenus(initialDate());
      setMenus(rows);
      const optionRows = await getPublicOptions(rows.map((m) => m.id));
      setOptions(optionRows);
      const ids = [...new Set(rows.map((m) => m.restaurant_id))];
      const pairs = await Promise.all(ids.map(async (id) => {
        try { const restaurant = await api.restaurant(id); return [String(id), localName(lang, restaurant)] as const; }
        catch { return [String(id), "TAMAM"] as const; }
      }));
      setRestaurantNames(Object.fromEntries(pairs));
    } catch (e) { setError(e instanceof Error ? e.message : t("errServer")); }
    finally { setLoading(false); }
  }, [api, lang, t]);
  // Fetching is a mount effect; `load` updates state only after its requests settle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const menu = menus.find((m) => m.id === menuId) || null;
  const currentCategory = DAILY_CATEGORIES[step - 1];
  const visibleOptions = useMemo(() => options.filter((o) => (o.menu_id === menuId || o.menu_id === null) && o.category === currentCategory), [options, menuId, currentCategory]);
  const chosenOptions = DAILY_CATEGORIES.map((category) => options.find((o) => o.id === selected[category])).filter(Boolean) as DailyOption[];
  const dateLabel = (date: string) => new Intl.DateTimeFormat(lang === "ar" ? "ar" : lang === "he" ? "he" : "en", { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
  const stepNames = ["dailyDate", ...DAILY_CATEGORIES.map((x) => categoryKey[x]), "dailyYourDetails"] as const;

  const next = () => {
    setError("");
    if (step === 0 && !menu) { setError(t("dailyChooseDate")); return; }
    if (step > 0 && step <= DAILY_CATEGORIES.length && currentCategory !== "soup" && !selected[currentCategory]) { setError(t("dailyChooseOption")); return; }
    setStep((n) => Math.min(n + 1, 5));
  };
  const submit = async () => {
    const cleanPhone = phone.replace(/[\s()-]/g, "");
    if (!name.trim()) { setError(t("errName")); return; }
    if (cleanPhone.replace(/\D/g, "").length < 8) { setError(t("errPhone")); return; }
    if (!menu || DAILY_CATEGORIES.some((c) => c !== "soup" && !selected[c])) { setError(t("dailyFinishChoices")); return; }
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
      <View style={s.hero}>
        <View style={s.heroIcon}><Ionicons name="calendar-outline" size={27} color={colors.green} /></View>
        <Text style={s.eyebrow}>{t("dailyEyebrow")}</Text>
        <Text style={s.title}>{t("dailyTitle")}</Text>
        <Text style={s.subtitle}>{t("dailySub")}</Text>
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
          <View style={s.progressRow}>
            {stepNames.map((key, i) => (
              <View key={key} style={s.progressItem}>
                <View style={[s.dot, step >= i && s.dotOn]}><Text style={[s.dotText, step >= i && s.dotTextOn]}>{i + 1}</Text></View>
                <Text numberOfLines={1} style={[s.progressLabel, step === i && s.progressActive]}>{t(key)}</Text>
              </View>
            ))}
          </View>
          {loading ? <ActivityIndicator color={colors.green} style={{ padding: 28 }} /> : null}
          {!loading && error && !menus.length ? <View style={s.card}><Text style={s.error}>{error}</Text><Button label={t("retry")} onPress={() => { setLoading(true); setError(""); void load(); }} /></View> : null}
          {!loading && !menus.length && !error ? <View style={s.card}><Text style={s.body}>{t("dailyNoMenus")}</Text></View> : null}

          {!loading && menus.length > 0 && step === 0 ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t("dailyPickDate")}</Text>
              {menus.map((item) => (
                <Pressable key={item.id} onPress={() => { setMenuId(item.id); setSelected({}); }} style={[s.menuCard, menuId === item.id && s.selectedCard]}>
                  {item.image_url
                    ? <Image source={{ uri: item.image_url }} style={s.menuPhoto} accessibilityLabel={t("image")} />
                    : <View style={s.menuMark}><Ionicons name="restaurant" size={20} color={colors.teal} /></View>}
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuTitle}>{dateLabel(item.service_date)}</Text>
                    <Text style={s.body}>{item.title} · {restaurantNames[String(item.restaurant_id)] || "TAMAM"}</Text>
                  </View>
                  <Text style={s.price}>{Number(item.price)} ₪</Text>
                  {menuId === item.id ? <Ionicons name="checkmark-circle" size={22} color={colors.green} /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          {!loading && step >= 1 && step <= 4 && menu ? (
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
              {currentCategory === "soup" ? <Text style={s.body}>{t("dailySoupOptional")}</Text> : null}
            </View>
          ) : null}

          {step === 5 && menu ? (
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
              {step === 1 ? <Button label={t("dailySkipSoup")} onPress={() => { setSelected((old) => { const nextSelected = { ...old }; delete nextSelected.soup; return nextSelected; }); setError(""); setStep(2); }} tone="ghost" /> : null}
              {step < 5 ? <Button label={t("dailyContinue")} onPress={next} disabled={step > 1 && step <= 4 && !visibleOptions.length} /> : <Button label={sending ? t("sending") : `${t("dailyReserve")} · ${menu ? Number(menu.price) * quantity : 0} ₪`} onPress={() => void submit()} disabled={sending} />}
            </View>
          ) : null}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.teal, borderRadius: 24, padding: 20, gap: 5, alignItems: "flex-end" },
  heroIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  eyebrow: { color: colors.bright, fontFamily: font.bold, fontSize: 11, textAlign: "right" },
  title: { color: colors.white, fontFamily: font.black, fontSize: 21, textAlign: "right" },
  subtitle: { color: "#D5E8E4", fontFamily: font.regular, fontSize: 12, lineHeight: 20, textAlign: "right" },
  progressRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginVertical: 14, gap: 3 },
  progressItem: { alignItems: "center", flex: 1, gap: 5 },
  dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.high, alignItems: "center", justifyContent: "center" },
  dotOn: { backgroundColor: colors.green },
  dotText: { fontSize: 11, fontFamily: font.bold, color: colors.muted },
  dotTextOn: { color: colors.white },
  progressLabel: { fontSize: 8, lineHeight: 12, color: colors.muted, fontFamily: font.regular, textAlign: "center" },
  progressActive: { color: colors.teal, fontFamily: font.bold },
  section: { gap: 11 },
  sectionTitle: { color: colors.teal, fontFamily: font.black, fontSize: 18, textAlign: "right" },
  menuCard: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.outline, padding: 13 },
  selectedCard: { borderColor: colors.green, borderWidth: 2, backgroundColor: colors.mint },
  menuMark: { width: 38, height: 38, backgroundColor: colors.high, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  menuPhoto: { width: 58, height: 58, borderRadius: 13, backgroundColor: colors.high },
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
