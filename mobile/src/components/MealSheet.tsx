import { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, colors, font, money, Page, Picture, Status, useS } from "./ui";
import { PizzaVisual, pizzaKind } from "./PizzaVisual";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/state";
import type { Line } from "../lib/state";
import { basketText } from "../lib/basketCopy";
import { useLoad } from "../lib/useLoad";
import {
  type Extra,
  type ExtraGroup,
  type Id,
  type Meal,
  type Restaurant,
} from "../lib/types";
export function MealSheet({
  meal,
  restaurant,
  extrasSourceId,
  close,
  initialQuantity = 1,
  minimumQuantity = 1,
  budgetLimit,
  draftSubtotal = 0,
  initialNote = "",
  onPrepared,
  deliveryTotal,
  submitLabel,
  externalError,
}: {
  meal: Meal;
  restaurant: Restaurant;
  extrasSourceId?: Id | null;
  close: () => void;
  initialQuantity?: number;
  minimumQuantity?: number;
  budgetLimit?: number;
  draftSubtotal?: number;
  initialNote?: string;
  onPrepared?: (line: Omit<Line, "key">) => void;
  deliveryTotal?: number;
  submitLabel?: string;
  externalError?: string;
}) {
  const { api, add } = useStore();
  const { t, name, desc, lang } = useT();
  const s = useS();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [note, setNote] = useState(initialNote);
  const [selected, setSelected] = useState<Record<string, Extra[]>>({});
  const [error, setError] = useState("");
  const [showNote, setShowNote] = useState(!!initialNote);
  const load = useCallback(
    () => extrasSourceId === undefined
      ? api.extras(meal.id)
      : extrasSourceId === null
        ? Promise.resolve([] as ExtraGroup[])
        : api.extras(extrasSourceId),
    [api, extrasSourceId, meal.id],
  );
  const data = useLoad(load);
  const extras = Object.values(selected).flat();
  const isPersonalPizza = /بيتزا شخصية|פיצה אישית|personal pizza/i.test(
    [meal.name_ar, meal.name_he, meal.name_en, meal.name].filter(Boolean).join(" "),
  );
  const toppingGroup = isPersonalPizza
    ? data.value?.find(group => Number(group.max_select) === 5)
    : undefined;
  const toppings = toppingGroup ? (selected[String(toppingGroup.id)] || []) : [];
  const pizzaVisualSelected = toppings.map(item => ({
    id: String(item.id), text: [item.name_ar, item.name_he, item.name_en, item.name].filter(Boolean).join(" "), item,
  }));
  const unit =
    Number(meal.price) +
    extras.reduce((sum, x) => sum + Number(x.price || 0), 0);
  const toggle = (group: ExtraGroup, option: Extra) => {
    setError("");
    setSelected((previous) => {
      const key = String(group.id);
      const old = previous[key] || [];
      const exists = old.some((x) => x.id === option.id);
      const max = Number(group.max_select || 1);
      if (exists)
        return { ...previous, [key]: old.filter((x) => x.id !== option.id) };
      if (max === 1) return { ...previous, [key]: [option] };
      if (old.length >= max) {
        return previous;
      }
      return { ...previous, [key]: [...old, option] };
    });
  };
  const submit = () => {
    if (quantity < minimumQuantity) { setError(basketText(lang).tooLittle); return; }
    if (budgetLimit != null && Math.round((draftSubtotal + unit * quantity + (deliveryTotal ?? Number(restaurant.delivery_fee || 0))) * 100) > Math.round(budgetLimit * 100)) {
      setError(basketText(lang).budgetExceeded); return;
    }
    const missing = data.value?.find(
      (group) =>
        (selected[String(group.id)] || []).length <
        Math.max(Number(group.min_select || 0), group.required ? 1 : 0),
    );
    if (missing) {
      setError(t("chooseFirst", { name: name(missing) || missing.group_name }));
      return;
    }
    const line = { meal, restaurant, quantity, note: note.trim(), extras };
    if (onPrepared) onPrepared(line);
    else { add(line); close(); }
  };
  const unavailable = data.loading || !!data.error || !Number.isFinite(unit) || unit <= 0 ||
    meal.is_available === false || (restaurant.is_open ?? restaurant.active) === false;
  return (
    <Modal animationType="slide" onRequestClose={close}>
      <SafeAreaView style={ms.screen}>
        <View style={ms.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("close")} onPress={close} style={ms.close}>
            <Ionicons name="close" size={23} color={colors.teal}/>
          </Pressable>
          <Text numberOfLines={1} style={ms.heading}>{name(meal)}</Text>
          <Text style={ms.headerPrice}>{money(Number(meal.price))}</Text>
        </View>
        <Page>
          {isPersonalPizza ? (
            <PizzaVisual selected={pizzaVisualSelected}
              caption={lang === "he" ? "הדמיה להמחשה · התוספות שבחרת" : lang === "en" ? "Live illustration · your selected toppings" : "معاينة توضيحية · الإضافات اللي اخترتها"} />
          ) : <View style={ms.photo}><Picture uri={meal.image_url}/></View>}
          {!!desc(meal) && <Text numberOfLines={2} style={ms.desc}>{desc(meal)}</Text>}
          <Status loading={data.loading} error={data.error} retry={() => void data.reload()}/>
          {data.value?.map(group => {
            const chosen = selected[String(group.id)] || [];
            const required = !!group.required || Number(group.min_select || 0) > 0;
            return (
              <View key={String(group.id)} style={ms.group}>
                <View style={ms.groupHeader}>
                  <Text style={ms.groupTitle}>{name(group) || group.group_name}</Text>
                  {required && <Text style={ms.required}>{t("required")}</Text>}
                  <Text style={ms.limit}>{chosen.length}/{group.max_select || 1}</Text>
                </View>
                {isPersonalPizza && String(toppingGroup?.id) === String(group.id) && (
                  <View style={ms.toppingProgress}>
                    {Array.from({length: Number(group.max_select) || 5}, (_, i) =>
                      <View key={i} style={[ms.progressDot, i < chosen.length && ms.progressDotOn]}/>)}
                  </View>
                )}
                <View style={isPersonalPizza && String(toppingGroup?.id) === String(group.id) ? ms.toppingsGrid : undefined}>
                {(group.menu_extra_options || []).map(option => {
                  const active = chosen.some(x => String(x.id) === String(option.id));
                  const maxed = !active && chosen.length >= Number(group.max_select || 1);
                  const pizzaTopping = isPersonalPizza && String(toppingGroup?.id) === String(group.id);
                  const kind = pizzaKind([option.name_ar, option.name_he, option.name_en, option.name].filter(Boolean).join(" "));
                  const emoji = ({olive:"🫒",mushroom:"🍄",corn:"🌽",tomato:"🍅",onion:"🧅",pepper:"🌶️",cheese:"🧀",tuna:"🐟",anchovy:"🐟"} as Record<string,string>)[kind] || "🌿";
                  return (
                    <Pressable key={String(option.id)} accessibilityRole="checkbox"
                      accessibilityLabel={name(option)}
                      disabled={maxed}
                      accessibilityState={{checked: active, disabled: maxed}}
                      onPress={() => toggle(group, option)}
                      style={[ms.option, pizzaTopping && ms.toppingOption, active && ms.optionSelected, maxed && ms.optionDisabled]}>
                      {pizzaTopping && <Text style={ms.toppingEmoji}>{emoji}</Text>}
                      <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={24}
                        color={active ? colors.green : colors.muted}/>
                      <Text numberOfLines={2} style={ms.optionLabel}>{name(option)}</Text>
                      <Text style={ms.optionPrice}>{Number(option.price || 0) ? "+" + money(Number(option.price)) : (lang === "he" ? "חינם" : lang === "en" ? "Free" : "مجاني")}</Text>
                    </Pressable>
                  );
                })}
                </View>
              </View>
            );
          })}
          <Pressable accessibilityRole="button" onPress={() => setShowNote(v => !v)} style={ms.noteToggle}>
            <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.teal}/>
            <Text style={ms.noteText}>{t("mealNote")}</Text>
            <Ionicons name={showNote ? "chevron-up" : "chevron-down"} size={17} color={colors.teal}/>
          </Pressable>
          {showNote && <TextInput style={[s.input, ms.noteInput]} value={note} onChangeText={setNote}
            multiline maxLength={500} placeholder={t("mealNotePh")}
            placeholderTextColor={colors.muted} accessibilityLabel={t("mealNote")}/>}
          {!!(error || externalError) && <Text accessibilityRole="alert" style={ms.error}>{error || externalError}</Text>}
          <View style={{height:12}}/>
        </Page>
        <View style={ms.footer}>
          <View style={ms.quantityRow}>
            <View style={ms.quantity}>
              <Pressable accessibilityRole="button" accessibilityLabel={t("increase")}
                style={ms.qtyButton} onPress={() => setQuantity(n => Math.min(99, n + 1))}>
                <Ionicons name="add" size={22} color={colors.teal}/>
              </Pressable>
              <Text style={ms.qtyNum}>{quantity}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t("decrease")}
                style={ms.qtyButton} onPress={() => setQuantity(n => Math.max(minimumQuantity, n - 1))}>
                <Ionicons name="remove" size={21} color={colors.teal}/>
              </Pressable>
            </View>
            <View style={ms.sumColumn}>
              <Text style={ms.sumValue}>{money(unit * quantity)}</Text>
              <Text style={ms.sumHint}>{lang === "he" ? "משלוח בסל" : lang === "en" ? "Delivery in cart" : "التوصيل بالسلة"}</Text>
            </View>
          </View>
          <Button label={submitLabel || t("addToCart", {p: money(unit * quantity)})}
            disabled={unavailable} onPress={submit}/>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const ms = StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.bg},
  header:{flexDirection:"row-reverse",alignItems:"center",paddingHorizontal:16,paddingVertical:10,gap:10,backgroundColor:colors.surface},
  close:{width:44,height:44,borderRadius:22,alignItems:"center",justifyContent:"center",backgroundColor:colors.mint},
  heading:{flex:1,fontFamily:font.bold,color:colors.teal,fontSize:16,textAlign:"right"},
  headerPrice:{fontFamily:font.black,color:colors.green,fontSize:15},
  photo:{borderRadius:19,overflow:"hidden"},
  desc:{fontFamily:font.regular,color:colors.muted,fontSize:12,lineHeight:21,textAlign:"right"},
  group:{backgroundColor:colors.surface,borderRadius:19,padding:12,gap:8},
  groupHeader:{flexDirection:"row-reverse",alignItems:"center",gap:8,paddingVertical:3},
  groupTitle:{flex:1,color:colors.teal,fontFamily:font.bold,fontSize:15,textAlign:"right"},
  required:{color:colors.green,fontFamily:font.bold,fontSize:11,backgroundColor:colors.mint,paddingHorizontal:8,paddingVertical:4,borderRadius:10},
  limit:{fontFamily:font.medium,fontSize:11,color:colors.muted},
  option:{minHeight:53,flexDirection:"row-reverse",gap:10,alignItems:"center",paddingHorizontal:12,paddingVertical:8,borderRadius:15,backgroundColor:colors.bg,borderWidth:1,borderColor:colors.outline},
  optionSelected:{borderColor:colors.green,backgroundColor:colors.mint},
  optionDisabled:{opacity:0.48},
  toppingsGrid:{flexDirection:"row-reverse",flexWrap:"wrap",justifyContent:"space-between",gap:8},
  toppingOption:{width:"48%",minHeight:88,flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,paddingHorizontal:7,paddingVertical:8},
  toppingEmoji:{fontSize:23,textAlign:"center"},
  toppingProgress:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"center",gap:7,paddingVertical:5},
  progressDot:{height:9,width:25,borderRadius:5,backgroundColor:"#D5E3CF"},
  progressDotOn:{backgroundColor:colors.green},
  optionLabel:{flex:1,color:colors.ink,fontFamily:font.medium,fontSize:13,textAlign:"right"},
  optionPrice:{color:colors.teal,fontFamily:font.bold,fontSize:12},
  noteToggle:{flexDirection:"row-reverse",alignItems:"center",gap:10,padding:12,borderRadius:15,backgroundColor:colors.surface,minHeight:48},
  noteText:{flex:1,fontFamily:font.medium,color:colors.teal,textAlign:"right",fontSize:13},
  noteInput:{minHeight:80,textAlignVertical:"top"},
  error:{color:colors.error,textAlign:"right",fontSize:13},
  footer:{padding:14,paddingBottom:18,borderTopWidth:1,borderTopColor:colors.outline,backgroundColor:colors.surface,gap:10},
  quantityRow:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between"},
  quantity:{flexDirection:"row-reverse",alignItems:"center",gap:10,backgroundColor:colors.bg,borderRadius:24,padding:3},
  qtyButton:{width:44,height:44,alignItems:"center",justifyContent:"center",backgroundColor:colors.surface,borderRadius:22},
  qtyNum:{fontFamily:font.black,color:colors.ink,fontSize:16,minWidth:25,textAlign:"center"},
  sumColumn:{alignItems:"flex-start",gap:2},
  sumValue:{fontFamily:font.black,color:colors.teal,fontSize:20},
  sumHint:{fontFamily:font.regular,fontSize:10,color:colors.muted},
});
