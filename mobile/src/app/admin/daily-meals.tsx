import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, Page } from "../../components/ui";
import { useStore } from "../../lib/state";
import { useT, localName } from "../../lib/i18n";
import {
  DAILY_CATEGORIES, deleteAdminOption, getAdminMenus, getAdminOptions, getAdminReservations,
  saveAdminMenu, saveAdminOption, signInAdmin, updateAdminReservation,
  type AdminSession, type DailyCategory, type DailyMenu, type DailyOption, type DailyReservation,
} from "../../lib/dailyMeals";

const categoryKey: Record<DailyCategory, "dailySoup" | "dailyMain" | "dailyAddition" | "dailySalad"> = {
  soup: "dailySoup", main: "dailyMain", addition: "dailyAddition", salad: "dailySalad",
};
const statusKey: Record<DailyReservation["status"], "adminNew" | "adminConfirmed" | "adminCancelled" | "adminCompleted"> = {
  new: "adminNew", confirmed: "adminConfirmed", cancelled: "adminCancelled", completed: "adminCompleted",
};
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());

export default function DailyMealsAdmin() {
  const { lang } = useStore();
  const { t, sheet } = useT();
  const s = sheet(styles);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [options, setOptions] = useState<DailyOption[]>([]);
  const [reservations, setReservations] = useState<DailyReservation[]>([]);
  const [tab, setTab] = useState<"menus" | "reservations">("menus");
  const [menuId, setMenuId] = useState<number | null>(null);
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [menuDate, setMenuDate] = useState(today());
  const [restaurantId, setRestaurantId] = useState("");
  const [menuTitle, setMenuTitle] = useState("وجبة اليوم");
  const [menuPrice, setMenuPrice] = useState("");
  const [published, setPublished] = useState(false);
  const [optionCategory, setOptionCategory] = useState<DailyCategory>("soup");
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null);
  const [optionName, setOptionName] = useState("");
  const [optionDescription, setOptionDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async (current: AdminSession) => {
    try {
      const [menuRows, optionRows, reservationRows] = await Promise.all([
        getAdminMenus(current.access_token), getAdminOptions(current.access_token), getAdminReservations(current.access_token),
      ]);
      setMenus(menuRows); setOptions(optionRows); setReservations(reservationRows);
      if (!menuId && menuRows[0]) setMenuId(menuRows[0].id);
    } catch (e) { setError(e instanceof Error ? e.message : t("adminLoadError")); }
    finally { setLoading(false); }
  }, [menuId, t]);
  // Load protected records after the sign-in state becomes available.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (session) void refresh(session); }, [session, refresh]);

  const login = async () => {
    setBusy(true); setError("");
    try {
      const result = await signInAdmin(email, password);
      setLoading(true);
      setSession(result); setPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : t("adminNotAllowed")); }
    finally { setBusy(false); }
  };
  const saveMenu = async () => {
    if (!session) return;
    const rid = Number(restaurantId), price = Number(menuPrice);
    if (!Number.isInteger(rid) || rid <= 0 || !menuDate || !menuTitle.trim() || !Number.isFinite(price) || price < 0) {
      setError(t("adminLoadError")); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await saveAdminMenu(session.access_token, { ...(editingMenuId ? { id: editingMenuId } : {}), restaurant_id: rid, service_date: menuDate, title: menuTitle.trim(), price, published });
      if (saved[0]) { setMenuId(saved[0].id); setEditingMenuId(saved[0].id); }
      setNotice(t("adminSaved")); await refresh(session);
    } catch (e) { setError(e instanceof Error ? e.message : t("adminLoadError")); }
    finally { setBusy(false); }
  };
  const saveOption = async () => {
    if (!session || !menuId || !optionName.trim()) { setError(t("dailyChooseDate")); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await saveAdminOption(session.access_token, { ...(editingOptionId ? { id: editingOptionId } : {}), menu_id: menuId, category: optionCategory, name: optionName.trim(), name_ar: optionName.trim(), description: optionDescription.trim() || null, active: true });
      setEditingOptionId(null); setOptionName(""); setOptionDescription(""); setNotice(t("adminSaved")); await refresh(session);
    } catch (e) { setError(e instanceof Error ? e.message : t("adminLoadError")); }
    finally { setBusy(false); }
  };
  const chooseMenu = (menu: DailyMenu) => {
    setMenuId(menu.id); setEditingMenuId(menu.id); setMenuDate(menu.service_date); setRestaurantId(String(menu.restaurant_id));
    setMenuTitle(menu.title); setMenuPrice(String(menu.price)); setPublished(menu.published);
  };
  const changeStatus = async (row: DailyReservation, status: DailyReservation["status"]) => {
    if (!session) return;
    try { await updateAdminReservation(session.access_token, row.id, status); await refresh(session); }
    catch (e) { setError(e instanceof Error ? e.message : t("adminLoadError")); }
  };

  if (!session) return (
    <Page>
      <View style={s.hero}>
        <Ionicons name="lock-closed-outline" size={28} color={colors.green} />
        <Text style={s.heroTitle}>{t("adminLoginTitle")}</Text>
        <Text style={s.heroSub}>{t("adminDailyMeals")}</Text>
      </View>
      <View style={s.form}>
        <Text style={s.label}>{t("adminEmail")}</Text>
        <TextInput value={email} onChangeText={setEmail} style={s.input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Text style={s.label}>{t("adminPassword")}</Text>
        <TextInput value={password} onChangeText={setPassword} style={s.input} secureTextEntry autoComplete="current-password" />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button label={busy ? t("sending") : t("adminSignIn")} onPress={() => void login()} disabled={busy || !email || !password} />
      </View>
    </Page>
  );

  const visibleOptions = options.filter((option) => option.menu_id === menuId);
  const optionLabel = (option: DailyOption) => localName(lang, option) || option.name;
  return (
    <Page>
      <View style={s.header}>
        <View><Text style={s.title}>{t("adminDailyMeals")}</Text><Text style={s.muted}>{session.user.email || email}</Text></View>
        <Pressable accessibilityRole="button" onPress={() => { setSession(null); setMenus([]); setOptions([]); setReservations([]); }} style={s.iconButton}>
          <Ionicons name="log-out-outline" size={20} color={colors.teal} />
        </Pressable>
      </View>
      <View style={s.tabs}>
        <Pressable onPress={() => setTab("menus")} style={[s.tab, tab === "menus" && s.tabOn]}><Text style={[s.tabText, tab === "menus" && s.tabTextOn]}>{t("adminMenus")}</Text></Pressable>
        <Pressable onPress={() => setTab("reservations")} style={[s.tab, tab === "reservations" && s.tabOn]}><Text style={[s.tabText, tab === "reservations" && s.tabTextOn]}>{t("adminReservations")}</Text></Pressable>
      </View>
      <View style={s.actions}>
        <Button label={t("adminRefresh")} onPress={() => { setLoading(true); setError(""); void refresh(session); }} tone="ghost" />
      </View>
      {loading ? <ActivityIndicator color={colors.green} style={{ padding: 16 }} /> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
      {notice ? <Text style={s.notice}>{notice}</Text> : null}

      {tab === "menus" ? (
        <>
          <View style={s.section}>
            <View style={s.rowBetween}><Text style={s.sectionTitle}>{editingMenuId ? t("adminTitle") : t("adminNewMenu")}</Text><Pressable onPress={() => { setMenuId(null); setEditingMenuId(null); setMenuDate(today()); setRestaurantId(""); setMenuTitle("وجبة اليوم"); setMenuPrice(""); setPublished(false); }}><Text style={s.link}>{t("adminNewMenu")}</Text></Pressable></View>
            <View style={s.form}>
              <Text style={s.label}>{t("adminRestaurantId")}</Text>
              <TextInput value={restaurantId} onChangeText={setRestaurantId} style={s.input} keyboardType="number-pad" />
              <Text style={s.label}>{t("adminDate")}</Text>
              <TextInput value={menuDate} onChangeText={setMenuDate} style={s.input} placeholder="YYYY-MM-DD" />
              <Text style={s.label}>{t("adminTitle")}</Text>
              <TextInput value={menuTitle} onChangeText={setMenuTitle} style={s.input} />
              <Text style={s.label}>{t("adminPrice")}</Text>
              <TextInput value={menuPrice} onChangeText={setMenuPrice} style={s.input} keyboardType="decimal-pad" />
              <View style={s.switchRow}><Text style={s.label}>{t("adminPublish")}</Text><Switch value={published} onValueChange={setPublished} trackColor={{ true: colors.green }} /></View>
              <Button label={busy ? t("sending") : t("adminAddMenu")} onPress={() => void saveMenu()} disabled={busy} />
            </View>
          </View>
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t("adminMenus")}</Text>
            {menus.map((menu) => <Pressable key={menu.id} onPress={() => chooseMenu(menu)} style={[s.rowCard, menuId === menu.id && s.rowCardOn]}>
              <View style={{ flex: 1 }}><Text style={s.cardTitle}>{menu.title} · {menu.service_date}</Text><Text style={s.muted}>{menu.restaurant_id} · {Number(menu.price)} ₪ · {menu.published ? t("adminPublished") : t("adminUnpublished")}</Text></View>
              <Ionicons name={menuId === menu.id ? "checkmark-circle" : "chevron-back"} size={20} color={menuId === menu.id ? colors.green : colors.muted} />
            </Pressable>)}
            {!menus.length && !loading ? <Text style={s.muted}>{t("dailyNoMenus")}</Text> : null}
          </View>
          {menuId ? <View style={s.section}>
            <Text style={s.sectionTitle}>{t("adminAddOption")}</Text>
            <View style={s.chips}>{DAILY_CATEGORIES.map((category) => <Pressable key={category} onPress={() => setOptionCategory(category)} style={[s.chip, optionCategory === category && s.chipOn]}><Text style={[s.chipText, optionCategory === category && s.chipTextOn]}>{t(categoryKey[category])}</Text></Pressable>)}</View>
            <TextInput value={optionName} onChangeText={setOptionName} style={s.input} placeholder={t("adminOptionName")} />
            <TextInput value={optionDescription} onChangeText={setOptionDescription} style={s.input} placeholder={t("adminDescription")} />
            <View style={s.rowBetween}><Text style={s.muted}>{editingOptionId ? t("adminEditOption") : t("adminAddOption")}</Text>{editingOptionId ? <Pressable onPress={() => { setEditingOptionId(null); setOptionName(""); setOptionDescription(""); }}><Text style={s.link}>{t("close")}</Text></Pressable> : null}</View>
            <Button label={t(editingOptionId ? "adminSave" : "adminAddOption")} onPress={() => void saveOption()} disabled={busy || !optionName.trim()} />
            {visibleOptions.map((option) => <View key={option.id} style={s.rowCard}>
              <View style={{ flex: 1 }}><Text style={s.cardTitle}>{t(categoryKey[option.category])}: {optionLabel(option)}</Text>{option.description ? <Text style={s.muted}>{option.description}</Text> : null}</View>
              <Pressable accessibilityRole="button" accessibilityLabel={t("adminEditOption")} onPress={() => { setEditingOptionId(option.id); setOptionCategory(option.category); setOptionName(option.name_ar || option.name); setOptionDescription(option.description || ""); }} style={s.iconButton}><Ionicons name="create-outline" size={18} color={colors.teal} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t("remove")} onPress={async () => { try { await deleteAdminOption(session.access_token, option.id); await refresh(session); } catch (e) { setError(e instanceof Error ? e.message : t("adminLoadError")); } }} style={s.iconButton}><Ionicons name="trash-outline" size={18} color={colors.error} /></Pressable>
            </View>)}
          </View> : null}
        </>
      ) : (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("adminReservations")}</Text>
          {reservations.map((row) => <View key={row.id} style={s.reservation}>
            <View style={s.reservationTop}><Text style={s.cardTitle}>{row.customer_name} · {row.quantity} {t("adminQty")}</Text><Text style={s.price}>{Number(row.unit_price) * row.quantity} ₪</Text></View>
            <Text style={s.muted}>{t("adminPhone")}: {row.phone} · {menus.find((m) => m.id === row.menu_id)?.service_date || `${t("adminMenuId")} ${row.menu_id}`}</Text>
            <Text style={s.muted}>{new Date(row.created_at).toLocaleString(lang === "ar" ? "ar" : lang === "he" ? "he" : "en")}</Text>
            {DAILY_CATEGORIES.map((category) => {
              const optionId = row.selected_options?.[category];
              const chosen = options.find((option) => String(option.id) === String(optionId));
              return chosen ? <Text key={category} style={s.choice}>{t(categoryKey[category])}: {optionLabel(chosen)}</Text> : null;
            })}
            <View style={s.chips}>{(["new", "confirmed", "completed", "cancelled"] as const).map((status) => <Pressable key={status} onPress={() => void changeStatus(row, status)} style={[s.chip, row.status === status && s.chipOn]}><Text style={[s.chipText, row.status === status && s.chipTextOn]}>{t(statusKey[status])}</Text></Pressable>)}</View>
          </View>)}
          {!reservations.length && !loading ? <Text style={s.muted}>{t("adminEmptyReservations")}</Text> : null}
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.teal, borderRadius: 22, padding: 20, alignItems: "flex-end", gap: 6 },
  heroTitle: { color: colors.white, fontFamily: font.black, fontSize: 20 },
  heroSub: { color: "#D5E8E4", fontFamily: font.regular, fontSize: 13 },
  title: { color: colors.teal, fontFamily: font.black, fontSize: 19, textAlign: "right" },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowBetween: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  link: { color: colors.teal, fontFamily: font.bold, fontSize: 11 },
  muted: { color: colors.muted, fontFamily: font.regular, fontSize: 11, lineHeight: 18, textAlign: "right" },
  section: { gap: 10, marginTop: 8 },
  sectionTitle: { color: colors.teal, fontFamily: font.black, fontSize: 16, textAlign: "right" },
  form: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: 18, padding: 14, gap: 9 },
  label: { color: colors.ink, fontFamily: font.bold, fontSize: 12, textAlign: "right" },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.outline, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, color: colors.ink, textAlign: "right", fontFamily: font.regular, fontSize: 13 },
  switchRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  tabs: { flexDirection: "row-reverse", padding: 4, backgroundColor: colors.high, borderRadius: 14 },
  tab: { flex: 1, padding: 11, borderRadius: 11, alignItems: "center" },
  tabOn: { backgroundColor: colors.teal },
  tabText: { color: colors.muted, fontFamily: font.bold, fontSize: 12 },
  tabTextOn: { color: colors.white },
  rowCard: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: 15, padding: 12 },
  rowCardOn: { borderColor: colors.green, backgroundColor: colors.mint },
  cardTitle: { color: colors.ink, fontFamily: font.bold, fontSize: 12, textAlign: "right" },
  price: { color: colors.teal, fontFamily: font.black, fontSize: 13 },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  chip: { borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, paddingHorizontal: 11, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.muted, fontFamily: font.medium, fontSize: 10 },
  chipTextOn: { color: colors.white },
  actions: { flexDirection: "row-reverse", justifyContent: "flex-start" },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.high, alignItems: "center", justifyContent: "center" },
  reservation: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: 17, padding: 13, gap: 7 },
  reservationTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  choice: { color: colors.ink, fontFamily: font.medium, fontSize: 11, textAlign: "right" },
  notice: { color: colors.green, fontFamily: font.bold, fontSize: 12, textAlign: "right" },
  error: { color: colors.error, fontFamily: font.medium, fontSize: 12, textAlign: "right" },
});
