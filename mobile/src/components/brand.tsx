// TAMAM brand primitives, drawn from the campaign artwork:
// geometric wordmark with green triangles inside the A's, deep teal panels,
// scattered triangle confetti and brush-stroke price tags.
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { G, Path, Polygon } from "react-native-svg";
import { colors } from "./ui";

// Letter geometry on a 100-unit-high grid.
const T = "0,0 70,0 70,18 44,18 44,100 26,100 26,18 0,18";
const A = "0,100 31,0 49,0 80,100 61,100 40,30 19,100";
const A_MARK = "40,58 53,100 27,100";
const M =
  "0,100 0,0 18,0 43,52 68,0 86,0 86,100 68,100 68,40 48,82 38,82 18,40 18,100";
const GAP = 9;
const LETTERS = [
  ["T", 70],
  ["A", 80],
  ["M", 86],
  ["A", 80],
  ["M", 86],
] as const;
const WIDTH = LETTERS.reduce((w, [, lw]) => w + lw, 0) + GAP * 4;

export function TamamLogo({
  height = 24,
  color = colors.ink,
  accent = colors.green,
}: {
  height?: number;
  color?: string;
  accent?: string;
}) {
  return (
    <Svg
      width={(WIDTH / 100) * height}
      height={height}
      viewBox={`0 0 ${WIDTH} 100`}
      accessibilityLabel="TAMAM"
    >
      {OFFSETS.map(([letter, ox], i) =>
        letter === "A" ? (
          <G key={i}>
            <Polygon points={shift(A, ox)} fill={color} />
            {/* the brand's green triangle inside every A */}
            <Polygon points={shift(A_MARK, ox)} fill={accent} />
          </G>
        ) : (
          <Polygon
            key={i}
            points={shift(letter === "T" ? T : M, ox)}
            fill={color}
          />
        ),
      )}
    </Svg>
  );
}
const shift = (points: string, ox: number) =>
  points
    .split(" ")
    .map((p) => {
      const [x, y] = p.split(",").map(Number);
      return `${x + ox},${y}`;
    })
    .join(" ");
const OFFSETS = LETTERS.reduce<[string, number][]>((list, [letter], i) => {
  const prev = list[i - 1];
  const x = prev ? prev[1] + LETTERS[i - 1][1] + GAP : 0;
  return [...list, [letter, x]];
}, []);

/** The single "A" mark — used as app icon / tab button / wheel pointer. */
export function TamamMark({
  size = 28,
  color = colors.white,
  accent = colors.green,
}: {
  size?: number;
  color?: string;
  accent?: string;
}) {
  return (
    <Svg width={size * 0.8} height={size} viewBox="0 0 80 100">
      <Polygon points={A} fill={color} />
      <Polygon points={A_MARK} fill={accent} />
    </Svg>
  );
}

/** Upward triangle, the brand's confetti/pointer shape. */
export function Tri({
  size,
  color,
  rotate = 0,
  style,
}: {
  size: number;
  color: string;
  rotate?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <Svg width={size} height={size * 0.9} viewBox="0 0 100 90">
        <Polygon points="50,0 100,90 0,90" fill={color} />
      </Svg>
    </View>
  );
}

/** Scattered translucent triangles, like the campaign backgrounds. */
export function TrianglePattern({
  color = "#FFFFFF",
  opacity = 0.07,
}: {
  color?: string;
  opacity?: number;
}) {
  const items: [string, string, number, number][] = [
    ["6%", "4%", 70, 0],
    ["78%", "2%", 46, 180],
    ["86%", "30%", 90, 0],
    ["-6%", "38%", 110, 0],
    ["64%", "58%", 54, 180],
    ["10%", "78%", 64, 0],
    ["82%", "84%", 80, 0],
    ["40%", "92%", 40, 180],
  ];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {items.map(([left, top, size, rotate], i) => (
        <Tri
          key={i}
          size={size}
          color={color}
          rotate={rotate}
          style={{ position: "absolute", left: left as `${number}%`, top: top as `${number}%` }}
        />
      ))}
    </View>
  );
}

// A rough paint-brush stroke; stretched behind its content.
const BRUSH =
  "M6 14 L22 8 L60 10 L120 4 L190 9 L250 3 L292 10 L298 22 L293 36 L299 52 L290 66 L296 78 L262 84 L200 80 L140 88 L80 82 L30 88 L8 82 L3 66 L9 52 L2 38 L8 26 Z";

export function Brush({
  children,
  color = colors.green,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ paddingHorizontal: 14, paddingVertical: 6 }, style]}>
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox="0 0 300 92"
        preserveAspectRatio="none"
      >
        <Path d={BRUSH} fill={color} />
      </Svg>
      {children}
    </View>
  );
}
