import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, colors, font, money, Page, Status } from '../components/ui';
import { MealSheet } from '../components/MealSheet';
import { useStore, type Line } from '../lib/state';
import { useT } from '../lib/i18n';
import { imageUrl } from '../lib/media';
import { WHATSAPP_NUMBER } from '../lib/orders';
import { basketText } from '../lib/basketCopy';
import { loadBasketCatalog, type OrderableOffer } from '../lib/basketCatalog';
import { mealRelations } from '../lib/basketProfiles';
import { validBasketInput, DEFAULT_BASKET_INPUT, type BasketInput } from '../lib/basketEngine';
import { buildMealBasket, recommendMealBaskets, redundantSide, type MealBasket, type MealBasketGroup } from '../lib/multiBasketEngine';
type DraftLine=Omit<Line,'key'>;
type QueueItem={offer:OrderableOffer;quantity:number;reserved:number};
const STORAGE_KEY='tamam.basket.preferences.v1';
export default function BasketPlanner(){
 const {lang,sheet,name,restaurantName}=useT(),t=basketText(lang),s=sheet(styles);
 const {lines,add,clear}=useStore();
 const [input,setInput]=useState<BasketInput>({...DEFAULT_BASKET_INPUT});
 const [applied,setApplied]=useState<BasketInput|null>(null),[catalog,setCatalog]=useState<OrderableOffer[]>([]);
 const [groups,setGroups]=useState<MealBasketGroup[]|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[advanced,setAdvanced]=useState(false);
 const [groupId,setGroupId]=useState(''),[quote,setQuote]=useState<MealBasket|null>(null),[at,setAt]=useState(new Date());
 const [pending,setPending]=useState<MealBasket|null>(null),[queue,setQueue]=useState<QueueItem[]>([]),[draft,setDraft]=useState<DraftLine[]>([]),[draftDelivery,setDraftDelivery]=useState(0);
 useEffect(()=>{let active=true;AsyncStorage.getItem(STORAGE_KEY).then(raw=>{if(!raw||!active)return;try{const saved={...DEFAULT_BASKET_INPUT,...JSON.parse(raw)};if(validBasketInput(saved))setInput(saved);}catch{/* Ignore invalid local preferences. */}}).catch(()=>{});return()=>{active=false;};},[]);
 function set<K extends keyof BasketInput>(key:K,value:BasketInput[K]){setInput(old=>({...old,[key]:value}));setGroups(null);setApplied(null);setGroupId('');setQuote(null);setPending(null);setError('');}
 const reason=(r:MealBasket['reason'])=>({'':'',invalid:t.invalidReason,unavailable:t.unavailable,allergy:t.allergy,disliked:t.dislikedReason,budget:t.budgetReason,minimum:t.minimum,time:t.time,period:t.periodReason,quantity:t.quantityReason,pairing:t.pairingReason,flow:t.flowReason}[r]);
 const find=async()=>{if(!validBasketInput(input)){setError(t.invalid);return;}setLoading(true);setError('');setGroups(null);setGroupId('');setQuote(null);setPending(null);try{const live=await loadBasketCatalog(),now=new Date();setCatalog(live);setAt(now);setApplied({...input});setGroups(recommendMealBaskets(live,mealRelations,input,now));await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(input)).catch(()=>{});}catch{setError(t.failed);}finally{setLoading(false);}};
 const selectedGroup=groups?.find(g=>g.id===groupId);
 const currentMains=quote?.lines.filter(l=>l.offer.profile.role==='أساسي')||[];
 const optionalSides=catalog.filter(side=>side.profile.role==='جانبي'&&currentMains.some(l=>(mealRelations[l.offer.uid]||[]).includes(side.uid)&&l.offer.restaurantId===side.restaurantId)&&!redundantSide(currentMains.map(l=>l.offer),side));
 const dishName=(uid:string,fallback:string)=>{const o=catalog.find(o=>o.uid===uid);return o?name(o.meal):fallback;};
 const providerLabel=(b:MealBasket)=>b.restaurants.map(id=>{const offer=catalog.find(o=>o.restaurantId===id);return offer?restaurantName(offer.restaurant):id;}).join(' + ');
 const providerKey=(b:MealBasket)=>b.lines.filter(l=>l.offer.profile.role==='أساسي').map(l=>l.offer.uid).sort().join('|');
 function selectProvider(b:MealBasket){setQuote(b);setPending(null);setError('');}
 function choose(g:MealBasketGroup){setGroupId(g.id);selectProvider(g.best);}
 function enqueue(q:MealBasket,live:OrderableOffer[]){
  const recipe=q.lines.map(l=>({offer:live.find(o=>o.uid===l.offer.uid),quantity:l.quantity}));
  if(recipe.some(l=>!l.offer)){setError(t.unavailable);return;}
  if(recipe.every(l=>l.offer!.kind==='daily')){const meals=recipe.map(l=>({menuId:l.offer!.dailyMenuId,quantity:l.quantity}));router.push({pathname:'/daily-meal',params:{focusMenuId:String(meals[0].menuId),focusDate:recipe[0].offer!.serviceDate,focusQuantity:String(meals[0].quantity),focusBudget:String(applied?.budget||input.budget),plannerMeals:JSON.stringify(meals)}});return;}
  setDraft([]);setDraftDelivery(q.delivery);setQueue(recipe.map((l,i)=>({offer:l.offer!,quantity:l.quantity,reserved:recipe.slice(i+1).reduce((n,next)=>n+next.offer!.price*next.quantity,0)})));setPending(null);
 }
 const begin=async()=>{if(!quote?.eligible||!applied)return;setLoading(true);setError('');try{
  const live=await loadBasketCatalog(),recipe=quote.lines.map(l=>({offer:live.find(o=>o.uid===l.offer.uid),quantity:l.quantity}));
  if(recipe.some(l=>!l.offer)){setError(t.unavailable);return;}
  const now=new Date(),fresh=buildMealBasket(recipe.map(l=>({offer:l.offer!,quantity:l.quantity})),applied,now);setCatalog(live);setAt(now);setQuote(fresh);setGroups(recommendMealBaskets(live,mealRelations,applied,now));
  if(!fresh.eligible){setError(reason(fresh.reason));return;}if(Math.round(fresh.total*100)!==Math.round(quote.total*100)){setError(t.estimates);return;}
  if(recipe.some(l=>l.offer!.kind!=='daily')&&lines.length){setPending(fresh);return;}enqueue(fresh,live);
 }catch{setError(t.failed);}finally{setLoading(false);}};
 function prepared(line:DraftLine){
  const next=[...draft,line];if(queue.length>1){setDraft(next);setQueue(queue.slice(1));return;}
  const restaurants=new Map(next.map(l=>[String(l.restaurant.id),l.restaurant]));
  const subtotal=next.reduce((n,l)=>n+(Number(l.meal.price)+l.extras.reduce((a,x)=>a+Number(x.price||0),0))*l.quantity,0);
  const total=subtotal+[...restaurants.values()].reduce((n,r)=>n+Number(r.delivery_fee||0),0);
  const minimumFailed=[...restaurants].some(([id,r])=>next.filter(l=>String(l.restaurant.id)===id).reduce((n,l)=>n+(Number(l.meal.price)+l.extras.reduce((a,x)=>a+Number(x.price||0),0))*l.quantity,0)<Number(r.min_order??r.minimum_order??0));
  if(!applied||!Number.isFinite(total)||Math.round(total*100)>Math.round(applied.budget*100)||minimumFailed){setError(minimumFailed?t.minimum:t.budgetExceeded);setQueue([]);setDraft([]);return;}
  clear();next.forEach(add);setQueue([]);setDraft([]);router.push('/cart');
 }
 function choices(key:'profile'|'period'|'occasion'|'goal',label:string,values:[string,string][]){return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.chips}>{values.map(([id,text])=><Pressable key={id} accessibilityRole="radio" accessibilityLabel={text} accessibilityState={{checked:input[key]===id}} disabled={loading} onPress={()=>set(key,id as BasketInput[typeof key])} style={[s.chip,input[key]===id&&s.active]}><Text style={[s.chipText,input[key]===id&&s.activeText]}>{text}</Text></Pressable>)}</View></View>;}
 function numeric(key:'people'|'budget'|'maxMinutes'|'flavor'|'children',label:string,hint?:string){return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} keyboardType="numeric" editable={!loading} value={Number.isFinite(input[key])?String(input[key]):''} onChangeText={v=>set(key,v.trim()===''?NaN:Number(v.replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))))} style={s.input}/>{hint?<Text style={s.muted}>{hint}</Text>:null}</View>;}
 function textField(key:'disliked'|'allergen'|'lastMealHours'|'notes',label:string,placeholder=''){return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholder={placeholder} editable={!loading} value={input[key]} onChangeText={v=>set(key,v)} style={s.input} maxLength={500}/></View>;}
 return <Page>
  <View style={s.hero}><Ionicons name="basket-outline" size={34} color={colors.gold}/><Text style={s.title}>{t.title}</Text><Text style={s.text}>{t.intro}</Text></View>
  <View style={s.card}>
   {choices('profile',t.priority,[['home',t.home],['easy',t.easy],['value',t.value],['variety',t.variety]])}
   <View style={s.field}><Text style={s.label}>{t.mainCount}</Text><View style={s.chips}>{[1,2,3].map(n=><Pressable key={n} accessibilityRole="radio" accessibilityLabel={`${t.mainCount} ${n}`} accessibilityState={{checked:(input.mainDishes??2)===n}} disabled={loading} onPress={()=>set('mainDishes',n)} style={[s.chip,(input.mainDishes??2)===n&&s.active]}><Text style={[s.chipText,(input.mainDishes??2)===n&&s.activeText]}>{n}</Text></Pressable>)}</View></View>
   <View style={s.numbers}>{numeric('people',t.people,t.peopleHint)}{numeric('budget',t.budget)}</View>
   <View style={s.field}><Text style={s.label}>{t.hunger}</Text><View style={s.chips}>{[0,1,2,3,4,5].map(n=><Pressable key={n} accessibilityRole="radio" accessibilityLabel={`${t.hunger} ${n}`} accessibilityState={{checked:input.hunger===n}} disabled={loading} onPress={()=>set('hunger',n)} style={[s.hunger,input.hunger===n&&s.active]}><Text style={[s.chipText,input.hunger===n&&s.activeText]}>{n}</Text></Pressable>)}</View><Text style={s.muted}>{t.zero} 0 · 5 {t.five}</Text></View>
   {choices('goal',t.goal,[['full',t.full],['light',t.light],['treat',t.treat]])}
   <Pressable accessibilityRole="button" accessibilityState={{expanded:advanced}} onPress={()=>setAdvanced(!advanced)} style={s.detail}><Text style={s.link}>{t.details}</Text><Ionicons name={advanced?'chevron-up':'chevron-down'} size={18} color={colors.teal}/></Pressable>
   {advanced?<View style={s.field}><Pressable accessibilityRole="checkbox" accessibilityState={{checked:input.allowMixed!==false}} disabled={loading} onPress={()=>set('allowMixed',input.allowMixed===false)} style={s.chip}><Text style={s.text}>{input.allowMixed!==false?'✓ ':''}{t.allowMixed}</Text></Pressable>{numeric('maxMinutes',t.maxMinutes)}{numeric('flavor',t.flavor)}{choices('period',t.period,[['auto',t.auto],['breakfast',t.breakfast],['lunch',t.lunch],['dinner',t.dinner]])}{choices('occasion',t.occasion,[['solo',t.solo],['family',t.family],['guests',t.guests]])}{textField('disliked',t.disliked,t.dislikedHint)}{textField('allergen',t.allergen,t.allergenHint)}{textField('lastMealHours',t.lastMeal)}{numeric('children',t.children)}{textField('notes',t.notes)}<Text style={s.muted}>{t.remembered}</Text></View>:null}
   <Button label={t.find} onPress={()=>void find()} disabled={loading}/>
  </View>
  {loading?<Status loading error="" retry={()=>void find()}/>:null}{!!error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  {groups?<View style={s.field}><Text style={s.heading}>{t.results}</Text><Text style={s.muted}>{t.noScore}</Text>{!groups.length?<View style={s.card}><Text style={s.text}>{applied?.allergen.trim()?t.allergyMessage:t.empty}</Text>{applied?.allergen.trim()?<Button label={t.help} onPress={()=>void Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`)}/>:null}</View>:null}
   {groups.map(g=>{const first=g.best.lines[0],offer=catalog.find(o=>o.uid===first.offer.uid);return <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${t.chooseBasket}: ${g.best.lines.map(l=>dishName(l.offer.uid,l.offer.name)).join(' + ')}`} disabled={loading} onPress={()=>choose(g)} style={[s.card,groupId===g.id&&s.selected]}>
    {offer?.meal.image_url?<Image source={{uri:imageUrl(offer.meal.image_url)}} style={s.photo} resizeMode="cover" accessibilityLabel={name(offer.meal)}/>:null}
    <Text style={s.heading}>{t.basketContains}</Text>{g.best.lines.map(l=><Text key={l.offer.uid} style={s.text}>{l.quantity} × {dishName(l.offer.uid,l.offer.name)}</Text>)}
    <Text style={s.label}>{g.best.restaurants.length===1?t.sameRestaurant:t.mixedRestaurants}: {providerLabel(g.best)}</Text><Text style={s.text}>{t.total}: {money(g.best.total)}</Text><Text style={s.muted}>{t.score}: {g.best.score}/100</Text><Text style={s.link}>{t.chooseBasket}</Text>
   </Pressable>;})}
  </View>:null}
  {quote&&applied?<View style={s.card}><Text style={s.heading}>{t.choicesForBasket}</Text>{(selectedGroup?.providers||[quote]).map(b=><Pressable key={b.id} accessibilityRole="radio" accessibilityLabel={providerLabel(b)} accessibilityState={{checked:providerKey(quote)===providerKey(b),disabled:!b.eligible}} disabled={loading||!b.eligible} onPress={()=>selectProvider(b)} style={[s.provider,providerKey(quote)===providerKey(b)&&s.selected,!b.eligible&&s.disabled]}>
   <Text style={s.label}>{providerLabel(b)}</Text>{b.lines.map(l=><Text key={l.offer.uid} style={s.muted}>{l.quantity} × {dishName(l.offer.uid,l.offer.name)}</Text>)}<Text style={s.text}>{t.total}: {Number.isFinite(b.total)?money(b.total):t.unavailable}</Text><Text style={s.muted}>{t.delivery}: {money(b.delivery)} · {b.minutes} {t.minutes}</Text>{!b.eligible?<Text style={s.error}>{reason(b.reason)}</Text>:null}
  </Pressable>)}
   {optionalSides.length?<View style={s.field}><Text style={s.label}>{t.side}</Text>{optionalSides.map(side=>{const selected=quote.lines.some(l=>l.offer.uid===side.uid);return <Pressable key={side.uid} accessibilityRole="checkbox" accessibilityState={{checked:selected}} disabled={loading} onPress={()=>{const mains=quote.lines.filter(l=>l.offer.profile.role==='أساسي');setQuote(buildMealBasket(selected?mains:[...mains,{offer:side,quantity:Math.ceil(applied.people/(side.profile.servings||1))}],applied,at));setPending(null);}} style={s.chip}><Text style={s.text}>{selected?'✓ ':''}{name(side.meal)} · {restaurantName(side.restaurant)}</Text></Pressable>;})}<Text style={s.muted}>{t.sideIncluded}</Text></View>:null}
   <Text style={s.heading}>{t.basketContains}</Text>{quote.lines.map(l=><Text key={l.offer.uid} style={s.text}>{l.quantity} × {dishName(l.offer.uid,l.offer.name)}</Text>)}
   <Text style={s.text}>{t.subtotal}: {money(quote.subtotal)}</Text><Text style={s.text}>{t.delivery}: {money(quote.delivery)}</Text><Text style={s.heading}>{t.total}: {money(quote.total)}</Text><Text style={s.muted}>{t.score}: {quote.score}/100</Text>{quote.restaurants.length>1?<Text style={s.muted}>{t.mixedHint}</Text>:null}<Text style={s.muted}>{t.estimates}</Text>{!quote.eligible?<Text accessibilityRole="alert" style={s.error}>{reason(quote.reason)}</Text>:null}
   <Button label={quote.lines.every(l=>l.offer.kind==='daily')?t.daily:t.review} onPress={()=>void begin()} disabled={loading||!quote.eligible}/>
   {pending?<View style={s.field}><Text style={s.text}>{t.cartExists}</Text><Button label={t.replace} onPress={()=>enqueue(pending,catalog)}/><Button label={t.keep} onPress={()=>setPending(null)}/></View>:null}
  </View>:null}
  <Button label={t.cart} disabled={loading} onPress={()=>router.push('/cart')}/>
  {queue[0]&&applied?<MealSheet key={queue[0].offer.uid} meal={queue[0].offer.meal} restaurant={queue[0].offer.restaurant} extrasSourceId={queue[0].offer.extrasSourceId} initialQuantity={queue[0].quantity} minimumQuantity={queue[0].quantity} budgetLimit={applied.budget-queue[0].reserved} draftSubtotal={draft.reduce((sum,l)=>sum+(Number(l.meal.price)+l.extras.reduce((n,e)=>n+Number(e.price||0),0))*l.quantity,0)} deliveryTotal={draftDelivery} initialNote={applied.notes} onPrepared={prepared} close={()=>{setQueue([]);setDraft([]);}}/>:null}
 </Page>;
}
const styles=StyleSheet.create({hero:{gap:10,paddingVertical:12},title:{fontFamily:font.black,fontSize:25,lineHeight:39,color:colors.teal,textAlign:'right'},text:{fontFamily:font.regular,fontSize:14,lineHeight:24,color:colors.text,textAlign:'right'},heading:{fontFamily:font.bold,fontSize:19,lineHeight:30,color:colors.teal,textAlign:'right'},muted:{fontFamily:font.regular,fontSize:12,lineHeight:22,color:colors.muted,textAlign:'right'},label:{fontFamily:font.bold,fontSize:14,lineHeight:25,color:colors.teal,textAlign:'right'},card:{backgroundColor:colors.surface,borderRadius:16,padding:16,gap:14,borderWidth:1,borderColor:colors.outline},field:{gap:10,flex:1},numbers:{flexDirection:'row-reverse',gap:12},chips:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8},chip:{borderRadius:12,paddingVertical:12,paddingHorizontal:14,borderWidth:1,borderColor:colors.outline,backgroundColor:colors.surface,minHeight:46},chipText:{fontFamily:font.medium,fontSize:13,color:colors.teal,textAlign:'right'},active:{backgroundColor:colors.teal,borderColor:colors.teal},activeText:{color:colors.white},hunger:{minWidth:40,minHeight:44,borderRadius:10,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.outline},input:{fontFamily:font.regular,fontSize:15,color:colors.ink,borderWidth:1,borderColor:colors.outline,borderRadius:10,padding:13,minHeight:48,textAlign:'right',backgroundColor:colors.white},detail:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',paddingVertical:9},link:{fontFamily:font.bold,color:colors.teal,fontSize:14,textAlign:'right'},error:{fontFamily:font.regular,color:colors.error,fontSize:13,lineHeight:23,textAlign:'right'},selected:{borderColor:colors.green,borderWidth:2,backgroundColor:colors.mint},photo:{height:180,width:'100%',borderRadius:10},provider:{padding:13,borderRadius:12,borderWidth:1,borderColor:colors.outline,gap:5},disabled:{opacity:.65}});
