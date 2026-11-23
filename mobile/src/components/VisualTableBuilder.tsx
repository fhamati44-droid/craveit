import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, font, money } from './ui';
import { imageUrl } from '../lib/media';
import { buildBasket, type Basket, type BasketInput, type DishGroup } from '../lib/basketEngine';
import { type OrderableOffer } from '../lib/basketCatalog';
import { mealRelations } from '../lib/basketProfiles';

type Props = {
  group: DishGroup;
  catalog: OrderableOffer[];
  input: BasketInput;
  at: Date;
  disabled: boolean;
  mealName: (meal: OrderableOffer['meal']) => string;
  providerName: (provider: OrderableOffer['restaurant']) => string;
  onChoose: (basket: Basket, people: number) => void;
};

/**
 * Food first -> complete the table -> select a real supplier.
 * Only actual catalog records can be selected; no invented prices or ingredients.
 * A shared table must be serviceable by a single provider at this stage.
 */
export function VisualTableBuilder({ group, catalog, input, at, disabled, mealName, providerName, onChoose }: Props) {
  const [sideGroup, setSideGroup] = useState<string>('');
  const [people, setPeople] = useState(input.people);
  const effectiveInput = useMemo(() => ({...input, people}), [input, people]);
  const [ready, setReady] = useState(false);
  const offers = useMemo(() => new Map(catalog.map(o => [o.uid, o])), [catalog]);
  const primary = offers.get(group.best.primary.uid);
  const sides = useMemo(() => {
    const grouped = new Map<string, OrderableOffer>();
    for (const option of group.providers) {
      for (const uid of mealRelations[option.primary.uid] || []) {
        const side = offers.get(uid);
        if (side && side.available && side.profile.role === 'جانبي' && !grouped.has(side.group)) grouped.set(side.group, side);
      }
    }
    return [...grouped.values()];
  }, [group, offers]);

  const providers = useMemo(() => group.providers.map(option => {
    const main = offers.get(option.primary.uid);
    const side = sideGroup ? (mealRelations[option.primary.uid] || []).map(uid => offers.get(uid)).find(x => x?.group === sideGroup && x.available && x.restaurantId === option.primary.restaurantId) : undefined;
    if (!main || (sideGroup && !side)) return null;
    const quote = buildBasket(main, side, effectiveInput, at);
    return { quote, main };
  }).filter((item): item is { quote: Basket; main: OrderableOffer } => !!item && item.quote.eligible)
    .sort((a,b) => b.quote.score-a.quote.score || a.quote.total-b.quote.total), [group, offers, sideGroup, effectiveInput, at]);

  if (!primary) return null;
  const minPrice = providers.length ? Math.min(...providers.map(p => p.quote.total)) : 0;
  return <View style={styles.card}>
    <View style={styles.top}>
      <Ionicons name="restaurant-outline" size={23} color={colors.teal}/>
      <Text style={styles.heading}>رتّب طاولتك</Text>
    </View>
    {primary.meal.image_url ? <Image source={{ uri: imageUrl(primary.meal.image_url) }} style={styles.hero} resizeMode="cover" accessibilityLabel={mealName(primary.meal)}/> : null}
    <Text style={styles.title}>{mealName(primary.meal)}</Text>
    <View style={styles.counter}>
      <Text style={styles.label}>👥 عدد الأشخاص</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="زود شخص" onPress={() => {setPeople(n=>Math.min(99,n+1));setReady(false);}} style={styles.counterButton}><Ionicons name="add" size={21} color={colors.teal}/></Pressable>
      <Text style={styles.price}>{people}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="قلّل شخص" onPress={() => {setPeople(n=>Math.max(1,n-1));setReady(false);}} style={styles.counterButton}><Ionicons name="remove" size={21} color={colors.teal}/></Pressable>
    </View>
    {sides.length ? <View style={styles.section}>
      <Text style={styles.heading}>🥗 إضافات للطاولة</Text>
      <View style={styles.cards}>
        <Pressable accessibilityRole="radio" accessibilityState={{checked:!sideGroup}} onPress={() => {setSideGroup('');setReady(false);}} style={[styles.option,!sideGroup&&styles.active]}>
          <Ionicons name="remove-circle-outline" size={27} color={colors.teal}/>
          <Text style={styles.small}>بدون</Text>
        </Pressable>
        {sides.map(side => <Pressable key={side.group} accessibilityRole="radio" accessibilityState={{checked:sideGroup===side.group}} onPress={() => {setSideGroup(side.group);setReady(false);}} style={[styles.option,sideGroup===side.group&&styles.active]}>
          {side.meal.image_url ? <Image source={{uri:imageUrl(side.meal.image_url)}} style={styles.thumb}/> : <Text style={styles.emoji}>🥗</Text>}
          <Text numberOfLines={2} style={styles.small}>{mealName(side.meal)}</Text>
        </Pressable>)}
      </View>
    </View> : null}
    {!ready ? <Pressable accessibilityRole="button" disabled={disabled||!providers.length} onPress={()=>setReady(true)} style={[styles.action,(!providers.length||disabled)&&styles.dim]}>
      <Text style={styles.actionText}>{providers.length ? `اختاري المصلحة · من ${money(minPrice)}` : 'ما في مصلحة بتوفر هالطاولة'}</Text>
      <Ionicons name="arrow-back" size={20} color={colors.white}/>
    </Pressable> : <View style={styles.section}>
      <Text style={styles.heading}>🏪 اختاري المصلحة</Text>
      {providers.map(({quote,main})=><Pressable key={main.uid} accessibilityRole="button" disabled={disabled} onPress={()=>onChoose(quote,people)} style={styles.provider}>
        <View style={styles.providerLabel}><Text style={styles.label}>{providerName(main.restaurant)}</Text><Text style={styles.muted}>{quote.minutes} دقيقة</Text></View>
        <Text style={styles.price}>{money(quote.total)}</Text>
        <Ionicons name="chevron-back" size={20} color={colors.teal}/>
      </Pressable>)}
      <Pressable accessibilityRole="button" onPress={()=>setReady(false)} style={styles.back}><Text style={styles.small}>تعديل الطاولة</Text></Pressable>
    </View>}
  </View>;
}

const styles=StyleSheet.create({
  card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.outline,borderRadius:18,padding:15,gap:12},
  top:{flexDirection:'row-reverse',alignItems:'center',gap:9},
  heading:{fontFamily:font.bold,color:colors.teal,fontSize:18,textAlign:'right'},
  title:{fontFamily:font.bold,color:colors.teal,fontSize:20,textAlign:'right'},
  hero:{height:170,width:'100%',borderRadius:14},
  muted:{fontFamily:font.regular,color:colors.muted,fontSize:12,textAlign:'right'},
  section:{gap:10},
  cards:{flexDirection:'row-reverse',flexWrap:'wrap',gap:9},
  option:{width:100,borderWidth:1,borderColor:colors.outline,borderRadius:14,padding:8,alignItems:'center',gap:6},
  active:{borderWidth:2,borderColor:colors.green,backgroundColor:colors.mint},
  thumb:{width:76,height:65,borderRadius:9},
  emoji:{fontSize:30},
  small:{fontFamily:font.medium,fontSize:12,color:colors.teal,textAlign:'center'},
  action:{backgroundColor:colors.teal,borderRadius:13,minHeight:50,flexDirection:'row-reverse',justifyContent:'center',alignItems:'center',gap:9,padding:10},
  dim:{opacity:.5},
  actionText:{fontFamily:font.bold,color:colors.white,fontSize:15},
  provider:{flexDirection:'row-reverse',alignItems:'center',gap:12,borderWidth:1,borderColor:colors.outline,borderRadius:13,padding:12},
  providerLabel:{flex:1,gap:3},
  label:{fontFamily:font.bold,color:colors.teal,fontSize:14,textAlign:'right'},
  price:{fontFamily:font.bold,color:colors.teal,fontSize:16},
  counter:{flexDirection:'row-reverse',alignItems:'center',gap:10},
  counterButton:{borderRadius:12,borderWidth:1,borderColor:colors.outline,padding:9},
  back:{alignSelf:'flex-end',padding:10},
});
