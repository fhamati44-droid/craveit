import { useLocalSearchParams, router } from "expo-router";
import { ScrollView, Text, Pressable, View, Linking } from "react-native";
import { colors } from "../../components/ui";

export const LEGAL_VERSION = "2026-11-24";
export const BUSINESS = {
  brand: "TAMAM",
  registeredName: "גול סקור פרו בע״מ",
  englishName: "GOAL SCORE PRO LTD",
  registration: "517245411",
  // Merchant identification provided by site operator. Review legal text against actual processing and operations.
  address: "עכו, רחוב בן עמי 28",
  email: "artcabinet1989@gmail.com",
  phone: "0544616474",
};
const texts: Record<string, { title: string; rows: [string, string][] }> = {
  terms: {title:"תקנון אתר TAMAM",rows:[
    ["מפעיל האתר",`TAMAM הוא שם המותג של ${BUSINESS.registeredName} (${BUSINESS.englishName}), ח.פ. ${BUSINESS.registration}. כתובת: ${BUSINESS.address}. האתר מאפשר הזמנת מזון מעסקים עצמאיים. אין בתקנון לגרוע מזכויות צרכניות על פי דין.`],
    ["בחירת מוצרים והזמנות","הלקוח בוחר מוצר או מנה, מקבל את רשימת בתי העסק המספקים אותו, בוחר בית עסק ומשלים הזמנה. זמינות, מחיר, דמי משלוח וסכום כולל יוצגו לפני אישור ההזמנה. שינוי מהותי יחייב הסכמת הלקוח."],
    ["גביית תשלום","TAMAM גובה מהלקוח את מלוא סכום ההזמנה לרבות דמי משלוח ככל שישנם, ומנפיקה מסמכים חשבונאיים לפי דין. ההתחשבנות עם בתי העסק וספקי המשלוחים מבוצעת בנפרד על ידי TAMAM."],
    ["הכנת המזון ואחריות","בתי העסק העצמאיים מכינים את המזון ואחראים לרכיביו, איכותו ובטיחותו ולהחזקה ברישיונות הנדרשים לפי דין. TAMAM אחראית לניהול ההזמנה, לתשלומים, לשירות הלקוחות ולהסדרת המשלוח, לרבות משלוחים המבוצעים באמצעות ספק חיצוני, בהתאם לחובותיה בדין. לא תוגבל אחריות שאין להתנות עליה בדין."],
    ["אספקה","זמני אספקה משוערים, אזורי משלוח ועלויות יוצגו ללקוח לפני אישור העסקה. אם חל עיכוב מהותי או שההזמנה לא סופקה, יש לפנות ל-TAMAM. במקרה של אי-אספקה או אי-התאמה מהותית יינתן הסעד המגיע על פי דין."],
    ["ביטול והחזר","ניתן להגיש בקשת ביטול ל-TAMAM. מוצרי מזון פסידים עשויים להיות מוחרגים מזכות ביטול רגילה במכר מרחוק. כאשר קיימת זכאות להשבה, לרבות במקרה של אי-אספקה או הפרה אחרת, ההחזר יטופל על ידי TAMAM בהתאם לדין. אין לגרוע מזכויות לפי חוק הגנת הצרכן."],
    ["פרטיות ודין חל","המידע האישי מעובד כמתואר במדיניות הפרטיות. יחול הדין הישראלי והסמכות תהיה לערכאה המוסמכת לפי דין."],
  ]},
  delivery: {title:"מדיניות משלוחים",rows:[
    ["אספקה וזמני אספקה","זמן הגעה משוער, אזור אספקה ועלות המשלוח יוצגו בהזמנה לפני התשלום. זמני המשלוח עשויים להשתנות עקב עומסים ונסיבות תפעוליות."],
    ["אחריות","TAMAM אחראית כלפי הלקוח לתיאום המשלוח ולטיפול באי-אספקה ובתקלות, גם כאשר ביצוע המשלוח נמסר לספק חיצוני. אין בכך לגרוע מהוראות הדין."],
    ["אי אספקה","אם המוצר לא סופק יש לפנות לשירות הלקוחות. החזרים וסעדים יינתנו בהתאם לזכויות הלקוח בדין."],
  ]},
  cancellations:{title:"מדיניות ביטולים והחזרים",rows:[
    ["הגשת בקשה","ניתן להגיש בקשת ביטול לשירות הלקוחות בהקדם האפשרי. לפני תחילת הכנת המזון TAMAM תנסה לעצור את ההזמנה."],
    ["מזון פסיד","הדין עשוי להחריג מזון פסיד מזכות הביטול הרגילה בעסקת מכר מרחוק. ביטול לאחר תחילת הכנה ייבחן לפי הדין והנסיבות."],
    ["אי-התאמה ואי-אספקה","כאשר ההזמנה לא סופקה או שקיימת אי-התאמה מהותית, TAMAM תטפל בתלונה ובהחזר או בסעד המגיע על פי דין, ללא דמי ביטול כאשר הדבר אסור בדין."],
    ["אופן ההחזר","ההחזר יבוצע ככל שניתן באמצעי התשלום המקורי ובהתאם למועדים הקבועים בדין."],
  ]},
  privacy:{title:"מדיניות פרטיות",rows:[
    ["מידע נאסף","שם, טלפון, כתובת למשלוח, כתובת דוא״ל אם נמסרה, פרטי הזמנה ומידע טכני הנדרש להפעלת השירות."],
    ["מטרות עיבוד","קליטת הזמנה, שירות לקוחות, תשלום, אספקה, מניעת הונאות וקיום חובות חוקיות. דיוור שיווקי ייעשה בכפוף להסכמה ולהוראות הדין."],
    ["שיתוף מידע","מידע הנדרש להזמנה מועבר לבית העסק המבצע, לספקי משלוחים ולספקי סליקה וטכנולוגיה בהתאם לצורך ולדין."],
    ["בעל השליטה ויצירת קשר",`בעל השליטה במידע הנאסף במסגרת השירות הוא ${BUSINESS.registeredName}, ח.פ. ${BUSINESS.registration}, כתובת: ${BUSINESS.address}. לפניות בנושאי פרטיות: ${BUSINESS.email} או ${BUSINESS.phone}.`],
    ["מסירת מידע והשלכות אי מסירתו","מסירת פרטים לצורך הזמנה נעשית מרצון. אין חובה חוקית כללית למסור מידע לצורך הזמנה, אך ללא שם, טלפון ופרטי אספקה רלוונטיים לא ניתן יהיה להשלים הזמנה או לספקה. דוא״ל, ככל שאינו נדרש לצורך שירות מסוים, הוא שדה רשות."],
    ["נתוני שימוש ועוגיות","האתר עשוי להשתמש באחסון מקומי בדפדפן, בעוגיות ובכלי מדידה ופרסום דוגמת Meta Pixel ככל שהם מופעלים, לצורך תפעול, מדידה ושיפור השירות. אפשר לנהל הרשאות ומחיקת נתונים בהגדרות הדפדפן. מסירת מידע לספקי מדידה ופרסום תיעשה בכפוף לדין."],
    ["שמירה, אבטחה וזכויות",`המידע נשמר בהתאם לצורכי השירות, מניעת הונאות וחובות התיעוד שבדין; תקופת השמירה עשויה להשתנות לפי סוג המידע. ניתן לבקש עיון במידע אישי ותיקון מידע שאינו נכון, שלם, ברור או מעודכן, בהתאם לדין, באמצעות ${BUSINESS.email}. גישה למידע מוגבלת לפי הצורך התפעולי וננקטים אמצעי אבטחה סבירים.`],
  ]},
  about:{title:"אודות TAMAM",rows:[
    ["הפעילות שלנו",`TAMAM, המופעלת על ידי ${BUSINESS.registeredName} (ח.פ. ${BUSINESS.registration}), מאפשרת לבחור תחילה את המנה הרצויה, למצוא את בתי העסק שמציעים אותה, לבצע הזמנה ולשלם במקום אחד.`],
    ["אחריות ופעילות","TAMAM גובה את התשלום המלא, מנפיקה מסמכים חשבונאיים בהתאם לדין ומנהלת משלוחים ושירות לקוחות. הכנת המנות מתבצעת אצל המסעדות והמטבחים העצמאיים."],
  ]},
  contact:{title:"צור קשר",rows:[
    ["פרטי העסק",`${BUSINESS.registeredName} | ח.פ. ${BUSINESS.registration} | ${BUSINESS.address}`],
    ["יצירת קשר",`טלפון: ${BUSINESS.phone} | דוא״ל: ${BUSINESS.email}. כתובת העסק: ${BUSINESS.address}.  ניתן לפנות בנושאי הזמנה, משלוח, שירות וביטול.`],
  ]},
};
const nav=[["terms","תקנון"],["privacy","פרטיות"],["delivery","משלוחים"],["cancellations","ביטולים"],["about","אודות"],["contact","צור קשר"]] as const;
export default function LegalPage() {
  const { page } = useLocalSearchParams<{page:string}>();
  const section=texts[String(page||"terms")]||texts.terms;
  return <ScrollView style={{flex:1,backgroundColor:colors.bg}} contentContainerStyle={{padding:18,paddingBottom:70,gap:14}}>
    <Text style={{fontSize:23,fontWeight:"800",color:colors.teal,textAlign:"right"}}>{section.title}</Text>
    <Text style={{fontSize:11,color:"#6b7280",textAlign:"right"}}>עדכון אחרון: 24.11.2026</Text>
    {section.rows.map(([title,body])=><View key={title} style={{backgroundColor:colors.white||"#fff",padding:16,borderRadius:14,gap:7}}>
      <Text style={{fontSize:16,fontWeight:"700",textAlign:"right",color:colors.teal}}>{title}</Text>
      <Text style={{fontSize:13,lineHeight:23,textAlign:"right",color:"#374151"}}>{body}</Text>
    </View>)}
    {String(page)==="contact" && <>
      {!!BUSINESS.phone && <Pressable onPress={()=>Linking.openURL("tel:"+BUSINESS.phone)}><Text>{BUSINESS.phone}</Text></Pressable>}
      {!!BUSINESS.email && <Pressable onPress={()=>Linking.openURL("mailto:"+BUSINESS.email)}><Text>{BUSINESS.email}</Text></Pressable>}
    </>}
    <View style={{flexDirection:"row-reverse",flexWrap:"wrap",gap:12,marginTop:14}}>
      {nav.map(([slug,label])=><Pressable key={slug} onPress={()=>router.push({pathname:"/legal/[page]",params:{page:slug}})}><Text style={{color:colors.teal,textDecorationLine:"underline"}}>{label}</Text></Pressable>)}
    </View>
  </ScrollView>
}
