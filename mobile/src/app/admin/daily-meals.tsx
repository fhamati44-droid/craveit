import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, font, Page } from "../../components/ui";
import { useStore } from "../../lib/state";
import { useT, localName } from "../../lib/i18n";
import {
  DAILY_CATEGORIES, SHARED_DAILY_CATEGORIES, deleteAdminMenuOptionOverride, getAdminMenuOptionOverrides, getAdminMenus, getAdminOptions, getAdminReservations, getDailyOrderDetails, groupDailyReservations,
  saveAdminMenu, saveAdminMenuOptionOverride, saveAdminOption, sendAdminPasswordRecovery, setAdminPassword, signInAdmin, updateAdminReservationGroup, uploadDailyMealImage,
  type AdminSession, type DailyCategory, type DailyMenu, type DailyMenuOptionOverride, type DailyOption, type DailyReservation, type SharedDailyCategory,
} from "../../lib/dailyMeals";
import { emptyLandingCopy, getAdminLandingPageSettings, saveLandingPageSettings, uploadLandingHeroImage, type LandingCopy, type LandingLocale, type LandingPageKey, type LandingPageSettings } from "../../lib/landingSettings";

const categoryKey: Record<DailyCategory, "dailySoup" | "dailyMain" | "dailyAddition" | "dailySalad"> = {
  soup: "dailySoup", main: "dailyMain", addition: "dailyAddition", salad: "dailySalad",
};
const statusKey: Record<DailyReservation["status"], "adminNew" | "adminConfirmed" | "adminCancelled" | "adminCompleted"> = {
  new: "adminNew", confirmed: "adminConfirmed", cancelled: "adminCancelled", completed: "adminCompleted",
};
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());

export default function DailyMealsAdmin() {
  const { api, lang } = useStore();
  const { t, sheet } = useT();
  const s = sheet(styles);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [restaurants, setRestaurants] = useState<Awaited<ReturnType<typeof api.restaurants>>>([]);
  const [options, setOptions] = useState<DailyOption[]>([]);
  const [reservations, setReservations] = useState<DailyReservation[]>([]);
  const [menuOptionOverrides, setMenuOptionOverrides] = useState<DailyMenuOptionOverride[]>([]);
  const [menuOptionDrafts, setMenuOptionDrafts] = useState<Partial<Record<SharedDailyCategory, number[] | null>>>({});
  const [tab, setTab] = useState<"menus" | "reservations" | "landing">("menus");
  const [landingPage, setLandingPage] = useState<LandingPageKey>("home-cooked");
  const [landingLocale, setLandingLocale] = useState<LandingLocale>("ar");
  const [landingPages, setLandingPages] = useState<Partial<Record<LandingPageKey, LandingPageSettings>>>({});
  const [landingImageUrl, setLandingImageUrl] = useState("");
  const [landingError, setLandingError] = useState("");
  const [menuId, setMenuId] = useState<number | null>(null);
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [menuDate, setMenuDate] = useState(today());
  const [dailyRepeat, setDailyRepeat] = useState(false);
  const [restaurantId, setRestaurantId] = useState("");
  const [restaurantPickerOpen, setRestaurantPickerOpen] = useState(false);
  const [menuTitle, setMenuTitle] = useState("وجبة اليوم");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuImageUrl, setMenuImageUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [optionCategory, setOptionCategory] = useState<DailyCategory>("soup");
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null);
  const [optionName, setOptionName] = useState("");
  const [optionDescription, setOptionDescription] = useState("");
  const [optionImageUrl, setOptionImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const readAuthLink = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.hash.slice(1));
      const type = params.get("type");
      const token = params.get("access_token");
      if ((type === "recovery" || type === "invite") && token) {
        setRecoveryToken(token);
        setError("");
      }
    };
    readAuthLink();
    if (typeof window === "undefined") return;
    window.addEventListener("hashchange", readAuthLink);
    return () => window.removeEventListener("hashchange", readAuthLink);
  }, []);

  const refresh = useCallback(async (current: AdminSession) => {
    try {
      const [menuRows, optionRows, reservationRows, overrideRows, restaurantRows] = await Promise.all([
        getAdminMenus(current.access_token), getAdminOptions(current.access_token), getAdminReservations(current.access_token), getAdminMenuOptionOverrides(current.access_token), api.restaurants(),
      ]);
      setMenus(menuRows); setOptions(optionRows); setReservations(reservationRows); setMenuOptionOverrides(overrideRows); setRestaurants(restaurantRows);
      if (!menuId && menuRows[0]) setMenuId(menuRows[0].id);
    } catch (e) { setError(e instanceof Error ? e.message : t("adminLoadError")); }
    finally { setLoading(false); }
  }, [api, menuId, t]);
  // Load protected records after the sign-in state becomes available.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (session) void refresh(session); }, [session, refresh]);

  useEffect(() => {
    if (!session) return;
    getAdminLandingPageSettings(session.access_token)
      .then((rows) => {
        setLandingPages(Object.fromEntries(rows.map((row) => [row.page_key, row])));
        setLandingError("");
      })
      .catch((e) => setLandingError(e instanceof Error ? e.message : t("adminLoadError")));
  }, [session, t]);

  const login = async () => {
    setBusy(true); setError("");
    try {
      const result = await signInAdmin(email, password);
      setLoading(true);
      setSession(result); setPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : t("adminNotAllowed")); }
    finally { setBusy(false); }
  };
  const requestPasswordLink = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      if (typeof window === "undefined") throw new Error(t("adminRecoveryError"));
      await sendAdminPasswordRecovery(email, `${window.location.origin}/admin/daily-meals`);
      setNotice(t("adminRecoverySent"));
    } catch (e) { setError(e instanceof Error ? e.message : t("adminRecoveryError")); }
    finally { setBusy(false); }
  };
  const saveNewPassword = async () => {
    if (!recoveryToken) return;
    if (newPassword.length < 8) { setError(t("adminPasswordTooShort")); return; }
    if (newPassword !== confirmPassword) { setError(t("adminPasswordsMismatch")); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await setAdminPassword(recoveryToken, newPassword);
      setRecoveryToken(""); setPassword(""); setNewPassword(""); setConfirmPassword("");
      if (typeof window !== "undefined") window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      setNotice(t("adminPasswordUpdated"));
    } catch (e) { setError(e instanceof Error ? e.message : t("adminRecoveryError")); }
    finally { setBusy(false); }
  };
  const saveMenu = async () => {
    if (!session) return;
    const rid = Number(restaurantId), price = Number(menuPrice);
    if (!restaurants.some((restaurant) => String(restaurant.id) === String(rid))) {
      setError(t("adminChooseRestaurant")); return;
    }
    if (!Number.isInteger(rid) || rid <= 0 || !menuDate || !menuTitle.trim() || !Number.isFinite(price) || price < 0) {
      setError(t("adminLoadError")); return;
    }
    if (menuImageUrl) {
      try {
        const url = new URL(menuImageUrl.trim());
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
      } catch { setError(t("adminInvalidImageUrl")); return; }
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const creatingMenu = !editingMenuId;
      const saved = await saveAdminMenu(session.access_token, { ...(editingMenuId ? { id: editingMenuId } : {}), restaurant_id: rid, service_date: menuDate, title: menuTitle.trim(), price, ...(menuImageUrl.trim() ? { image_url: menuImageUrl.trim() } : {}), published, is_daily: dailyRepeat });
      if (saved[0]) {
        setMenuId(saved[0].id); setEditingMenuId(saved[0].id);
        if (creatingMenu) setMenuOptionDrafts(Object.fromEntries(SHARED_DAILY_CATEGORIES.map((category) => [category, null])));
      }
      setNotice(t("adminSaved")); await refresh(session);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(message.includes("is_daily") && dailyRepeat ? t("adminRepeatMigration") : message.includes("daily_menus_restaurant_id_service_date_key") ? t("adminDuplicateMenu") : message || t("adminLoadError"));
    }
    finally { setBusy(false); }
  };
  const chooseMenuForEditing = (menu: DailyMenu) => {
    setEditingOptionId(null); setOptionName(""); setOptionDescription(""); setOptionImageUrl("");
    setMenuId(menu.id); setEditingMenuId(menu.id); setMenuDate(menu.service_date); setRestaurantId(String(menu.restaurant_id));
    setMenuTitle(menu.title); setMenuPrice(String(menu.price)); setMenuImageUrl(menu.image_url || ""); setPublished(menu.published); setDailyRepeat(menu.is_daily === true);
    setMenuOptionDrafts(Object.fromEntries(SHARED_DAILY_CATEGORIES.map((category) => {
      const override = menuOptionOverrides.find((row) => row.menu_id === menu.id && row.category === category);
      return [category, override ? override.option_ids.map(Number) : null];
    })));
  };
  const saveMenuOptionSettings = async () => {
    if (!session || !editingMenuId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      for (const category of SHARED_DAILY_CATEGORIES) {
        const draft = menuOptionDrafts[category];
        if (draft === undefined) continue;
        if (draft === null) await deleteAdminMenuOptionOverride(session.access_token, editingMenuId, category);
        else await saveAdminMenuOptionOverride(session.access_token, { menu_id: editingMenuId, category, option_ids: draft });
      }
      setNotice(t("adminSaved")); await refresh(session);
    } catch (e) { setError(e instanceof Error ? e.message : t("adminLoadError")); }
    finally { setBusy(false); }
  };
  const saveOption = async () => {
    if (!session || (optionCategory === "main" && !menuId) || !optionName.trim()) { setError(t(optionCategory === "main" ? "adminChooseMenuForMain" : "adminLoadError")); return; }
    if (optionImageUrl.trim()) {
      try {
        const url = new URL(optionImageUrl.trim());
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
      } catch { setError(t("adminInvalidImageUrl")); return; }
    }
    setBusy(true); setError(""); setNotice("");
    try {
      await saveAdminOption(session.access_token, { ...(editingOptionId ? { id: editingOptionId } : {}), menu_id: optionCategory === "main" ? menuId : null, category: optionCategory, name: optionName.trim(), name_ar: optionName.trim(), description: optionDescription.trim() || null, image_url: optionImageUrl.trim() || null, active: true });
      setEditingOptionId(null); setOptionName(""); setOptionDescription(""); setOptionImageUrl(""); setNotice(t("adminSaved")); await refresh(session);
    } catch (e) { setError(e instanceof Error ? e.message : t("adminLoadError")); }
    finally { setBusy(false); }
  };
  const activeLanding = landingPages[landingPage] || {
    page_key: landingPage,
    images: [],
    copy: emptyLandingCopy,
  };
  const activeLandingCopy = activeLanding.copy?.[landingLocale] || emptyLandingCopy[landingLocale];
  const updateLandingCopy = (field: keyof LandingCopy, value: string) => {
    setLandingPages((current) => {
      const page = current[landingPage] || { page_key: landingPage, images: [], copy: emptyLandingCopy };
      return {
        ...current,
        [landingPage]: {
          ...page,
          copy: { ...page.copy, [landingLocale]: { ...page.copy[landingLocale], [field]: value } },
        },
      };
    });
  };
  const updateLandingImages = (images: string[]) => {
    setLandingPages((current) => {
      const page = current[landingPage] || { page_key: landingPage, images: [], copy: emptyLandingCopy };
      return { ...current, [landingPage]: { ...page, images } };
    });
  };
  const addLandingUrl = () => {
    try {
      const url = new URL(landingImageUrl.trim());
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
      if (activeLanding.images.includes(url.toString())) return;
      updateLandingImages([...activeLanding.images, url.toString()]);
      setLandingImageUrl(""); setLandingError("");
    } catch {
      setLandingError(t("adminInvalidImageUrl"));
    }
  };
  const chooseLandingImage = () => {
    if (typeof document === "undefined" || !session) return;
    const picker = document.createElement("input");
    picker.type = "file"; picker.accept = "image/*";
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      setBusy(true); setLandingError("");
      try {
        const url = await uploadLandingHeroImage(session.access_token, landingPage, file);
        updateLandingImages([...activeLanding.images, url]);
      } catch (e) { setLandingError(e instanceof Error ? e.message : t("adminImageUploadError")); }
      finally { setBusy(false); }
    };
    picker.click();
  };
  const moveLandingImage = (index: number, direction: -1 | 1) => {
    const next = [...activeLanding.images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateLandingImages(next);
  };
  const saveLandingPage = async () => {
    if (!session) return;
    setBusy(true); setLandingError(""); setNotice("");
    try {
      const saved = await saveLandingPageSettings(session.access_token, activeLanding);
      setLandingPages((current) => ({ ...current, [landingPage]: saved[0] || activeLanding }));
      setNotice(t("adminSaved"));
    } catch (e) { setLandingError(e instanceof Error ? e.message : t("adminLoadError")); }
    finally { setBusy(false); }
  };
  const chooseOptionImage = () => {
    if (typeof document === "undefined" || !session || (optionCategory === "main" && !menuId)) return;
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/*";
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      setBusy(true); setError(""); setNotice("");
      try {
        const url = await uploadDailyMealImage(session.access_token, menuId || 0, file);
        setOptionImageUrl(url);
      } catch (e) { setError(e instanceof Error ? e.message : t("adminImageUploadError")); }
      finally { setBusy(false); }
    };
    picker.click();
  };
  const chooseMenuImage = () => {
    if (typeof document === "undefined" || !editingMenuId || !session) return;
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/*";
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      setBusy(true); setError(""); setNotice("");
      try {
        const url = await uploadDailyMealImage(session.access_token, editingMenuId, file, "cover");
        setMenuImageUrl(url);
        setNotice(t("adminImageSaveHint"));
      } catch (e) { setError(e instanceof Error ? e.message : t("adminImageUploadError")); }
      finally { setBusy(false); }
    };
    picker.click();
  };
  const changeStatus = async (rows: DailyReservation[], status: DailyReservation["status"]) => {
    if (!session) return;
    try { await updateAdminReservationGroup(session.access_token, rows.map((row) => row.id), status); await refresh(session); }
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
        {recoveryToken ? <>
          <Text style={s.label}>{t("adminNewPassword")}</Text>
          <TextInput value={newPassword} onChangeText={setNewPassword} style={s.input} secureTextEntry autoComplete="new-password" />
          <Text style={s.label}>{t("adminConfirmPassword")}</Text>
          <TextInput value={confirmPassword} onChangeText={setConfirmPassword} style={s.input} secureTextEntry autoComplete="new-password" />
        </> : <>
          <Text style={s.label}>{t("adminPassword")}</Text>
          <TextInput value={password} onChangeText={setPassword} style={s.input} secureTextEntry autoComplete="current-password" />
        </>}
        {error ? <Text style={s.error}>{error}</Text> : null}
        {notice ? <Text style={s.notice}>{notice}</Text> : null}
        {recoveryToken
          ? <Button label={busy ? t("sending") : t("adminSavePassword")} onPress={() => void saveNewPassword()} disabled={busy || !newPassword || !confirmPassword} />
          : <>
            <Button label={busy ? t("sending") : t("adminSignIn")} onPress={() => void login()} disabled={busy || !email || !password} />
            <Pressable accessibilityRole="button" onPress={() => void requestPasswordLink()} disabled={busy || !email} style={{ paddingVertical: 12, alignItems: "center" }}>
              <Text style={s.link}>{t("adminForgotPassword")}</Text>
            </Pressable>
          </>}
      </View>
    </Page>
  );

  const visibleOptions = options.filter((option) => option.category === optionCategory && (optionCategory === "main" ? option.menu_id === menuId : option.menu_id === null));
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
        <Pressable onPress={() => setTab("landing")} style={[s.tab, tab === "landing" && s.tabOn]}><Text style={[s.tabText, tab === "landing" && s.tabTextOn]}>{t("adminLandingSettings")}</Text></Pressable>
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
            <View style={s.rowBetween}><Text style={s.sectionTitle}>{editingMenuId ? t("adminTitle") : t("adminNewMenu")}</Text><Pressable onPress={() => { setEditingOptionId(null); setOptionName(""); setOptionDescription(""); setOptionImageUrl(""); setMenuId(null); setEditingMenuId(null); setMenuOptionDrafts({}); setMenuDate(today()); setDailyRepeat(false); setRestaurantId(""); setRestaurantPickerOpen(false); setMenuTitle("وجبة اليوم"); setMenuPrice(""); setMenuImageUrl(""); setPublished(false); }}><Text style={s.link}>{t("adminNewMenu")}</Text></Pressable></View>
            <View style={s.form}>
              <Text style={s.label}>{t("adminRestaurantId")}</Text>
              <Pressable accessibilityRole="button" onPress={() => setRestaurantPickerOpen((open) => !open)} style={s.pickerButton}>
                <Text style={restaurantId ? s.body : s.muted}>
                  {restaurants.find((restaurant) => String(restaurant.id) === restaurantId)
                    ? `${localName(lang, restaurants.find((restaurant) => String(restaurant.id) === restaurantId)!)} · #${restaurantId}`
                    : t("adminChooseRestaurant")}
                </Text>
              </Pressable>
              {restaurantPickerOpen ? (
                <View style={s.restaurantPicker}>
                  {restaurants.map((restaurant) => (
                    <Pressable key={String(restaurant.id)} accessibilityRole="button" onPress={() => { setRestaurantId(String(restaurant.id)); setRestaurantPickerOpen(false); }} style={s.restaurantChoice}>
                      <Text style={s.body}>{localName(lang, restaurant)}</Text>
                      <Text style={s.muted}>#{restaurant.id}</Text>
                    </Pressable>
                  ))}
                  {!restaurants.length ? <Text style={s.muted}>{t("adminNoRestaurants")}</Text> : null}
                </View>
              ) : null}
              <Text style={s.label}>{t(dailyRepeat ? "adminStartDate" : "adminDate")}</Text>
              <TextInput value={menuDate} onChangeText={setMenuDate} style={s.input} placeholder="YYYY-MM-DD" />
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: dailyRepeat }} onPress={() => setDailyRepeat((value) => !value)} style={s.switchRow}>
                <Text style={s.label}>{t("adminRepeatDaily")}</Text>
                <Ionicons name={dailyRepeat ? "checkbox" : "square-outline"} size={23} color={dailyRepeat ? colors.green : colors.muted} />
              </Pressable>
              <Text style={s.muted}>{t("adminRepeatDailyHint")}</Text>
              <Text style={s.label}>{t("adminTitle")}</Text>
              <TextInput value={menuTitle} onChangeText={setMenuTitle} style={s.input} />
              <Text style={s.label}>{t("adminPrice")}</Text>
              <TextInput value={menuPrice} onChangeText={setMenuPrice} style={s.input} keyboardType="decimal-pad" />
              <Text style={s.label}>{t("adminMenuImage")}</Text>
              {menuImageUrl ? <Image source={{ uri: menuImageUrl }} style={s.menuImagePreview} accessibilityLabel={t("image")} /> : null}
              <Pressable accessibilityRole="button" onPress={chooseMenuImage} disabled={busy || !editingMenuId} style={[s.imageUpload, (!editingMenuId || busy) && { opacity: 0.55 }]}>
                <Ionicons name="image-outline" size={20} color={colors.teal} />
                <Text style={s.link}>{t(busy ? "adminUploading" : "adminUploadImage")}</Text>
              </Pressable>
              <TextInput value={menuImageUrl} onChangeText={setMenuImageUrl} style={s.input} placeholder={t("adminPasteImageUrl")} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
              {!editingMenuId ? <Text style={s.muted}>{t("adminSaveMenuFirst")}</Text> : menuImageUrl ? <Text style={s.muted}>{t("adminImageSaveHint")}</Text> : null}
              <View style={s.switchRow}><Text style={s.label}>{t("adminPublish")}</Text><Switch value={published} onValueChange={setPublished} trackColor={{ true: colors.green }} /></View>
              <Button label={busy ? t("sending") : t("adminAddMenu")} onPress={() => void saveMenu()} disabled={busy} />
            </View>
          </View>
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t("adminMenus")}</Text>
            {menus.map((menu) => <Pressable key={menu.id} onPress={() => chooseMenuForEditing(menu)} style={[s.rowCard, menuId === menu.id && s.rowCardOn]}>
              <View style={{ flex: 1 }}><Text style={s.cardTitle}>{menu.title} · {menu.service_date}{menu.is_daily ? ` · ${t("adminRepeatDaily")}` : ""}</Text><Text style={s.muted}>{localName(lang, restaurants.find((restaurant) => String(restaurant.id) === String(menu.restaurant_id)) || { name: `#${menu.restaurant_id}` })} · {Number(menu.price)} ₪ · {menu.published ? t("adminPublished") : t("adminUnpublished")}</Text></View>
              <Ionicons name={menuId === menu.id ? "checkmark-circle" : "chevron-back"} size={20} color={menuId === menu.id ? colors.green : colors.muted} />
            </Pressable>)}
            {!menus.length && !loading ? <Text style={s.muted}>{t("dailyNoMenus")}</Text> : null}
          </View>
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t("adminMenuOptionSettings")}</Text>
            <Text style={s.muted}>{t("adminMenuOptionSettingsHint")}</Text>
            {!editingMenuId ? <Text style={s.muted}>{t("adminSelectMenuFirst")}</Text> : SHARED_DAILY_CATEGORIES.map((category) => {
              const saved = menuOptionOverrides.find((row) => row.menu_id === editingMenuId && row.category === category);
              const draft = menuOptionDrafts[category] === undefined ? (saved ? saved.option_ids.map(Number) : null) : menuOptionDrafts[category];
              const choices = options.filter((option) => option.category === category && option.menu_id === null && option.active);
              const inherited = draft === null;
              const allowed = inherited ? new Set(choices.map((option) => option.id)) : new Set((draft || []).map(Number));
              return <View key={category} style={s.form}>
                <Text style={s.cardTitle}>{t(categoryKey[category])}</Text>
                <Text style={s.muted}>{inherited ? t("adminAllSharedOptions") : `${allowed.size} · ${t("adminSelectedOptions")}`}</Text>
                {inherited ? (
                  <Pressable accessibilityRole="button" onPress={() => setMenuOptionDrafts((old) => ({ ...old, [category]: choices.map((option) => option.id) }))} style={s.imageUpload}>
                    <Ionicons name="options-outline" size={18} color={colors.teal} /><Text style={s.link}>{t("adminCustomizeForMenu")}</Text>
                  </Pressable>
                ) : <>
                  {choices.map((option) => {
                    const checked = allowed.has(option.id);
                    return <Pressable key={option.id} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setMenuOptionDrafts((old) => {
                      const prior = old[category] ?? saved?.option_ids.map(Number) ?? choices.map((item) => item.id);
                      const nextIds = new Set(prior);
                      if (nextIds.has(option.id)) nextIds.delete(option.id); else nextIds.add(option.id);
                      return { ...old, [category]: [...nextIds] };
                    })} style={s.rowCard}>
                      {option.image_url ? <Image source={{ uri: option.image_url }} style={s.optionListImage} accessibilityLabel={t("image")} /> : null}
                      <Text style={[s.cardTitle, { flex: 1 }]}>{optionLabel(option)}</Text>
                      <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={checked ? colors.green : colors.muted} />
                    </Pressable>;
                  })}
                  {!choices.length ? <Text style={s.muted}>{t("adminNoSharedOptions")}</Text> : null}
                  <Pressable accessibilityRole="button" onPress={() => setMenuOptionDrafts((old) => ({ ...old, [category]: null }))} style={s.imageUpload}>
                    <Ionicons name="refresh-outline" size={18} color={colors.teal} /><Text style={s.link}>{t("adminUseAllSharedOptions")}</Text>
                  </Pressable>
                </>}
              </View>;
            })}
            {editingMenuId ? <Button label={busy ? t("sending") : t("adminSaveMenuOptionSettings")} onPress={() => void saveMenuOptionSettings()} disabled={busy} /> : null}
          </View>
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t("adminAddOption")}</Text>
            <View style={s.chips}>{DAILY_CATEGORIES.map((category) => <Pressable key={category} onPress={() => { setOptionCategory(category); setEditingOptionId(null); setOptionName(""); setOptionDescription(""); setOptionImageUrl(""); }} style={[s.chip, optionCategory === category && s.chipOn]}><Text style={[s.chipText, optionCategory === category && s.chipTextOn]}>{t(categoryKey[category])}</Text></Pressable>)}</View>
            <Text style={s.muted}>{t(optionCategory === "main" ? (menuId ? "adminMainOptionsHint" : "adminChooseMenuForMain") : "adminSharedOptionsHint")}</Text>
            <TextInput value={optionName} onChangeText={setOptionName} style={s.input} placeholder={t("adminOptionName")} />
            <TextInput value={optionDescription} onChangeText={setOptionDescription} style={s.input} placeholder={t("adminDescription")} />
            <Text style={s.label}>{t("adminOptionImage")}</Text>
            {optionImageUrl ? <Image source={{ uri: optionImageUrl }} style={s.optionImagePreview} accessibilityLabel={t("image")} /> : null}
            <Pressable accessibilityRole="button" onPress={chooseOptionImage} disabled={busy} style={s.imageUpload}>
              <Ionicons name="image-outline" size={20} color={colors.teal} />
              <Text style={s.link}>{t(busy ? "adminUploading" : "adminUploadImage")}</Text>
            </Pressable>
            <TextInput value={optionImageUrl} onChangeText={setOptionImageUrl} style={s.input} placeholder={t("adminPasteImageUrl")} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            <View style={s.rowBetween}><Text style={s.muted}>{editingOptionId ? t("adminEditOption") : t("adminAddOption")}</Text>{editingOptionId ? <Pressable onPress={() => { setEditingOptionId(null); setOptionName(""); setOptionDescription(""); setOptionImageUrl(""); }}><Text style={s.link}>{t("close")}</Text></Pressable> : null}</View>
            <Button label={t(editingOptionId ? "adminSave" : "adminAddOption")} onPress={() => void saveOption()} disabled={busy || !optionName.trim() || (optionCategory === "main" && !menuId)} />
            {visibleOptions.map((option) => <View key={option.id} style={s.rowCard}>
              {option.image_url ? <Image source={{ uri: option.image_url }} style={s.optionListImage} accessibilityLabel={t("image")} /> : null}
              <View style={{ flex: 1 }}><Text style={s.cardTitle}>{t(categoryKey[option.category])}: {optionLabel(option)}</Text>{option.description ? <Text style={s.muted}>{option.description}</Text> : null}<Text style={s.muted}>{t(option.active ? "adminOptionActive" : "adminOptionInactive")}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel={t("adminEditOption")} onPress={() => { setEditingOptionId(option.id); setOptionCategory(option.category); setOptionName(option.name_ar || option.name); setOptionDescription(option.description || ""); setOptionImageUrl(option.image_url || ""); }} style={s.iconButton}><Ionicons name="create-outline" size={18} color={colors.teal} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t(option.active ? "adminDeactivateOption" : "adminActivateOption")} onPress={async () => { try { await saveAdminOption(session.access_token, { ...option, active: !option.active }); await refresh(session); } catch (e) { setError(e instanceof Error ? e.message : t("adminLoadError")); } }} style={s.iconButton}><Ionicons name={option.active ? "eye-off-outline" : "eye-outline"} size={18} color={option.active ? colors.error : colors.green} /></Pressable>
            </View>)}
          </View>
        </>
      ) : tab === "reservations" ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("adminReservations")}</Text>
          {groupDailyReservations(reservations).map((group) => {
            const first = group.rows[0];
            const count = group.rows.reduce((sum, row) => sum + row.quantity, 0);
            const amount = group.rows.reduce((sum, row) => sum + Number(row.unit_price) * row.quantity, 0);
            const uniformStatus = group.rows.every((row) => row.status === first.status);
            return <View key={group.id} style={s.reservation}>
              <View style={s.reservationTop}><Text style={s.cardTitle}>{first.customer_name} · {count} {t("adminQty")}</Text><Text style={s.price}>{amount} ₪</Text></View>
              <Text style={s.muted}>{t("adminPhone")}: {first.phone} · {group.rows.length} {t("dailyCartLines")}</Text>
              {group.order ? <Text style={s.muted}>{group.order.delivery_method === "delivery" ? `${t("dailyDelivery")}: ${group.order.delivery_address}` : t("dailyPickup")}{group.order.customer_notes ? ` · ${group.order.customer_notes}` : ""}</Text> : null}
              <Text style={s.muted}>{new Date(first.created_at).toLocaleString(lang === "ar" ? "ar" : lang === "he" ? "he" : "en")}</Text>
              {group.rows.map((row) => <View key={row.id} style={s.cartLine}>
                <Text style={s.choice}>{menus.find((m) => m.id === row.menu_id)?.title || `${t("adminMenuId")} ${row.menu_id}`}{getDailyOrderDetails(row)?.service_date ? ` · ${getDailyOrderDetails(row)?.service_date}` : ""} · {row.quantity} × {Number(row.unit_price)} ₪</Text>
                {DAILY_CATEGORIES.map((category) => {
                  const optionId = row.selected_options?.[category];
                  const chosen = options.find((option) => String(option.id) === String(optionId));
                  return chosen ? <Text key={category} style={s.choice}>· {t(categoryKey[category])}: {optionLabel(chosen)}</Text> : null;
                })}
              </View>)}
              <View style={s.chips}>{(["new", "confirmed", "completed", "cancelled"] as const).map((status) => <Pressable key={status} onPress={() => void changeStatus(group.rows, status)} style={[s.chip, uniformStatus && first.status === status && s.chipOn]}><Text style={[s.chipText, uniformStatus && first.status === status && s.chipTextOn]}>{t(statusKey[status])}</Text></Pressable>)}</View>
            </View>;
          })}
          {!reservations.length && !loading ? <Text style={s.muted}>{t("adminEmptyReservations")}</Text> : null}
        </View>
      ) : (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("adminLandingTitle")}</Text>
          <Text style={s.muted}>{t("adminLandingHint")}</Text>
          {landingError ? <Text style={s.error}>{landingError}</Text> : null}
          <View style={s.tabs}>
            {(["home-cooked", "daily-meal"] as const).map((pageKey) => {
              const selected = landingPage === pageKey;
              return <Pressable key={pageKey} onPress={() => { setLandingPage(pageKey); setLandingImageUrl(""); }} style={[s.tab, selected && s.tabOn]}>
                <Text style={[s.tabText, selected && s.tabTextOn]}>{t(pageKey === "home-cooked" ? "adminLandingHomeCooked" : "adminLandingDailyMeal")}</Text>
              </Pressable>;
            })}
          </View>
          <View style={s.form}>
            <Text style={s.label}>{t("adminLandingImages")}</Text>
            <Pressable accessibilityRole="button" onPress={chooseLandingImage} disabled={busy} style={s.imageUpload}>
              <Ionicons name="cloud-upload-outline" size={18} color={colors.teal} />
              <Text style={s.link}>{t(busy ? "adminUploading" : "adminUploadImage")}</Text>
            </Pressable>
            <View style={s.rowBetween}>
              <TextInput value={landingImageUrl} onChangeText={setLandingImageUrl} style={[s.input, { flex: 1 }]} placeholder={t("adminLandingImageUrl")} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
              <Pressable accessibilityRole="button" accessibilityLabel={t("adminLandingAddImage")} onPress={addLandingUrl} style={s.iconButton}><Ionicons name="add" size={22} color={colors.teal} /></Pressable>
            </View>
            {activeLanding.images.map((url, index) => <View key={`${url}-${index}`} style={s.landingImageRow}>
              <Image source={{ uri: url }} style={s.landingImagePreview} resizeMode="cover" accessibilityLabel={t("image")} />
              <View style={s.landingImageActions}>
                <Text numberOfLines={1} style={[s.muted, { flex: 1 }]}>{url}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={t("adminLandingMoveUp")} onPress={() => moveLandingImage(index, -1)} disabled={index === 0} style={s.iconButton}><Ionicons name="arrow-up" size={17} color={index === 0 ? colors.muted : colors.teal} /></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t("adminLandingMoveDown")} onPress={() => moveLandingImage(index, 1)} disabled={index === activeLanding.images.length - 1} style={s.iconButton}><Ionicons name="arrow-down" size={17} color={index === activeLanding.images.length - 1 ? colors.muted : colors.teal} /></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t("adminLandingRemoveImage")} onPress={() => updateLandingImages(activeLanding.images.filter((_, imageIndex) => imageIndex !== index))} style={s.iconButton}><Ionicons name="trash-outline" size={17} color={colors.error} /></Pressable>
              </View>
            </View>)}
          </View>
          <View style={s.form}>
            <Text style={s.label}>{t("adminLandingTitle")}</Text>
            <View style={s.tabs}>
              {(["ar", "he", "en"] as const).map((locale) => <Pressable key={locale} onPress={() => setLandingLocale(locale)} style={[s.tab, landingLocale === locale && s.tabOn]}>
                <Text style={[s.tabText, landingLocale === locale && s.tabTextOn]}>{locale === "ar" ? "العربية" : locale === "he" ? "עברית" : "English"}</Text>
              </Pressable>)}
            </View>
            <Text style={s.label}>{t("adminLandingEyebrow")}</Text>
            <TextInput value={activeLandingCopy.eyebrow} onChangeText={(value) => updateLandingCopy("eyebrow", value)} style={s.input} placeholder={t("adminLandingEyebrow")} />
            <Text style={s.label}>{t("adminLandingHeadline")}</Text>
            <TextInput value={activeLandingCopy.title} onChangeText={(value) => updateLandingCopy("title", value)} style={s.input} placeholder={t("adminLandingHeadline")} />
            <Text style={s.label}>{t("adminLandingDescription")}</Text>
            <TextInput value={activeLandingCopy.description} onChangeText={(value) => updateLandingCopy("description", value)} style={[s.input, { minHeight: 76 }]} multiline placeholder={t("adminLandingDescription")} />
            <Text style={s.label}>{t("adminLandingButton")}</Text>
            <TextInput value={activeLandingCopy.action_label} onChangeText={(value) => updateLandingCopy("action_label", value)} style={s.input} placeholder={t("adminLandingButton")} />
          </View>
          <Button label={busy ? t("sending") : t("adminSave")} onPress={() => void saveLandingPage()} disabled={busy} />
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
  pickerButton: { minHeight: 46, borderWidth: 1, borderColor: colors.outline, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, justifyContent: "center" },
  restaurantPicker: { borderWidth: 1, borderColor: colors.outline, borderRadius: 13, paddingHorizontal: 10, backgroundColor: colors.surface },
  restaurantChoice: { minHeight: 42, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.outline },
  body: { color: colors.ink, fontFamily: font.medium, fontSize: 12, textAlign: "right" },
  switchRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  tabs: { flexDirection: "row-reverse", padding: 4, backgroundColor: colors.high, borderRadius: 14 },
  tab: { flex: 1, padding: 11, borderRadius: 11, alignItems: "center" },
  tabOn: { backgroundColor: colors.teal },
  tabText: { color: colors.muted, fontFamily: font.bold, fontSize: 12 },
  tabTextOn: { color: colors.white },
  rowCard: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: 15, padding: 12 },
  rowCardOn: { borderColor: colors.green, backgroundColor: colors.mint },
  optionImagePreview: { width: "100%", height: 180, borderRadius: 14, backgroundColor: colors.high },
  menuImagePreview: { width: "100%", height: 200, borderRadius: 14, backgroundColor: colors.high },
  landingImageRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 8, borderWidth: 1, borderColor: colors.outline, borderRadius: 13, backgroundColor: colors.surface },
  landingImagePreview: { width: 76, height: 60, borderRadius: 9, backgroundColor: colors.high },
  landingImageActions: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  optionListImage: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.high },
  imageUpload: { minHeight: 48, borderWidth: 1, borderStyle: "dashed", borderColor: colors.green, borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.mint },
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
  cartLine: { borderBottomWidth: 1, borderBottomColor: colors.outline, paddingVertical: 6, gap: 3 },
  reservationTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  choice: { color: colors.ink, fontFamily: font.medium, fontSize: 11, textAlign: "right" },
  notice: { color: colors.green, fontFamily: font.bold, fontSize: 12, textAlign: "right" },
  error: { color: colors.error, fontFamily: font.medium, fontSize: 12, textAlign: "right" },
});
