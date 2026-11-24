import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { colors, font } from "./ui";
import type { Extra } from "../lib/types";

type PizzaSelection = { id: string; text: string; item: Extra };
const POSITIONS = [
  [92, 71], [157, 72], [120, 113], [67, 129], [180, 128],
  [96, 181], [155, 184], [127, 55], [59, 91], [184, 91],
  [128, 157], [148, 135], [89, 148], [105, 99], [163, 102],
] as const;

export function pizzaKind(text: string) {
  const n = text.toLowerCase();
  if (/زيتون|olive|זית/.test(n)) return "olive";
  if (/فطر|mushroom|פטרי/.test(n)) return "mushroom";
  if (/ذرة|corn|תירס/.test(n)) return "corn";
  if (/بندورة|طماطم|tomato|עגבני/.test(n)) return "tomato";
  if (/بصل|onion|בצל/.test(n)) return "onion";
  if (/فلفل|pepper|פלפל/.test(n)) return "pepper";
  if (/جبنة|cheese|גבינ/.test(n)) return "cheese";
  if (/تونا|tuna|טונה/.test(n)) return "tuna";
  if (/أنشوف|anchov|אנשובי/.test(n)) return "anchovy";
  return "other";
}
function Slice({ kind, x, y, variation }: {kind:string; x:number; y:number; variation:number}) {
  const rotate = [0, 25, -28, 42, -10][variation % 5];
  if (kind === "olive") return <G transform={`translate(${x} ${y}) rotate(${rotate})`}>
    <Ellipse rx="10" ry="7" fill="#33372C"/><Ellipse rx="5" ry="3.2" fill="#E8B74D"/>
  </G>;
  if (kind === "mushroom") return <G transform={`translate(${x} ${y}) rotate(${rotate})`}>
    <Path d="M-11 2 Q-11 -12 0 -12 Q11 -12 11 2Z" fill="#E8C9A0" stroke="#9C7653" strokeWidth="1.5"/>
    <Rect x="-3" y="1" width="6" height="9" rx="2" fill="#E9D6B4"/>
  </G>;
  if (kind === "corn") return <G><Ellipse cx={x-4} cy={y-2} rx="4" ry="6" fill="#F8D43D"/><Ellipse cx={x+4} cy={y+4} rx="4" ry="6" fill="#F8CF22"/><Ellipse cx={x+6} cy={y-7} rx="3" ry="4.5" fill="#F9DC54"/></G>;
  if (kind === "tomato") return <G><Circle cx={x} cy={y} r="10" fill="#C93128" stroke="#F06449" strokeWidth="2"/><Circle cx={x} cy={y} r="5.5" fill="#D94E35"/><Circle cx={x-3} cy={y+2} r="1" fill="#F8CE88"/><Circle cx={x+3} cy={y-2} r="1" fill="#F8CE88"/></G>;
  if (kind === "onion") return <G><Ellipse cx={x} cy={y} rx="10" ry="7" fill="none" stroke="#A75C9E" strokeWidth="3"/><Ellipse cx={x} cy={y} rx="5.4" ry="3.2" fill="none" stroke="#C991C0" strokeWidth="1.4"/></G>;
  if (kind === "pepper") return <Path d={`M${x-8} ${y+5} Q${x-13} ${y-5} ${x-3} ${y-9} Q${x+8} ${y-11} ${x+10} ${y+5}`} fill="none" stroke={variation % 2 ? "#3E9A47" : "#CA4C30"} strokeWidth="5" strokeLinecap="round"/>;
  if (kind === "cheese") return <G transform={`translate(${x} ${y}) rotate(${rotate})`}><Rect x="-8" y="-7" width="16" height="14" rx="3" fill="#FEF1C9" stroke="#D9C98E" strokeWidth="1"/></G>;
  if (kind === "tuna") return <G><Path d={`M${x-10} ${y+2} Q${x-2} ${y-12} ${x+8} ${y-4} Q${x+14} ${y+6} ${x+1} ${y+8}Z`} fill="#D6A7A2" stroke="#A77778" strokeWidth="1"/></G>;
  if (kind === "anchovy") return <Path d={`M${x-10} ${y+6} Q${x} ${y-8} ${x+12} ${y-4}`} fill="none" stroke="#737E7D" strokeWidth="5" strokeLinecap="round"/>;
  return <G><Circle cx={x} cy={y} r="8" fill="#378747"/><Circle cx={x+3} cy={y-2} r="3" fill="#7DC66E"/></G>;
}
export function PizzaVisual({
  selected, caption,
}: {
  selected: PizzaSelection[];
  caption: string;
}) {
  const renderPieces = useMemo(() => selected.flatMap((extra, ix) =>
    Array.from({ length: 3 }, (_, i) => {
      const [x, y] = POSITIONS[(ix * 3 + i) % POSITIONS.length];
      return { key: `${extra.id}-${i}`, kind: pizzaKind(extra.text), x, y, variation: ix + i };
    })), [selected]);
  return (
    <View style={v.frame}>
      <View style={v.pizzaCircle}>
        <Svg width={218} height={218} viewBox="0 0 250 250" accessibilityLabel={caption}>
          <Defs>
            <LinearGradient id="crust" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#E8A54E"/><Stop offset="0.6" stopColor="#C77A2C"/><Stop offset="1" stopColor="#E9B76C"/>
            </LinearGradient>
            <LinearGradient id="cheese" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F9DE77"/><Stop offset="1" stopColor="#E6AF45"/>
            </LinearGradient>
          </Defs>
          <Circle cx="125" cy="128" r="120" fill="#132F28" opacity="0.12"/>
          <Circle cx="125" cy="123" r="120" fill="url(#crust)" stroke="#B77937" strokeWidth="2"/>
          <Circle cx="125" cy="123" r="104" fill="#BA4431"/>
          <Circle cx="125" cy="123" r="99" fill="url(#cheese)"/>
          <Path d="M125 24 V222 M29 123 H221 M57 55 L195 191 M56 192 L195 55" stroke="#C88C39" strokeOpacity="0.24" strokeWidth="2"/>
          {Array.from({length: 25}, (_,i) => {
            const a=(i*137.508)*(Math.PI/180),rr=Math.sqrt((i+0.5)/25)*93;
            return <Circle key={i} cx={125+Math.cos(a)*rr} cy={123+Math.sin(a)*rr} r={2+(i%3)} fill={i%4===0?"#D0823E":"#F6E6A9"} opacity="0.48"/>;
          })}
          {renderPieces.map(piece => <Slice key={piece.key} kind={piece.kind} x={piece.x} y={piece.y} variation={piece.variation}/>)}
        </Svg>
      </View>
      <Text style={v.caption}>{caption}</Text>
    </View>
  );
}
const v = StyleSheet.create({
  frame:{alignItems:"center",gap:6,paddingVertical:8,borderRadius:20,backgroundColor:"#E3EBD8"},
  pizzaCircle:{width:220,height:220,alignItems:"center",justifyContent:"center",borderRadius:110},
  caption:{fontFamily:font.medium,fontSize:11,color:colors.muted,textAlign:"center"},
});
