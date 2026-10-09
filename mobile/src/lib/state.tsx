import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createApi, type Api } from "./api";
import type { Extra, Meal, Restaurant } from "./types";
import { ActivityIndicator, Platform } from "react-native";

export interface Line {
  key: string;
  meal: Meal;
  restaurant: Restaurant;
  extras: Extra[];
  note: string;
  quantity: number;
}
export interface Customer {
  name: string;
  phone: string;
  address: string;
}
const emptyCustomer: Customer = { name: "", phone: "", address: "" };
export type Lang = "ar" | "he" | "en";
const asLang = (v: unknown): Lang | null =>
  v === "ar" || v === "he" || v === "en" ? v : null;
/** Website links can force a language: ?lang=he */
const urlLang = () =>
  Platform.OS === "web" && typeof window !== "undefined"
    ? asLang(new URLSearchParams(window.location.search).get("lang"))
    : null;
interface Store {
  api: Api;
  lang: Lang;
  setLang: (l: Lang) => void;
  customer: Customer;
  saveCustomer: (c: Customer) => void;
  orderIds: number[];
  rememberOrders: (ids: number[]) => void;
  ready: boolean;
  lines: Line[];
  add: (line: Omit<Line, "key">) => void;
  quantity: (key: string, amount: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
}
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [ready, setReady] = useState(false);
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [orderIds, setOrderIds] = useState<number[]>([]);
  const [lang, setLangState] = useState<Lang>("ar");
  useEffect(() => {
    let active = true;
    AsyncStorage.multiGet(["craveit.cart", "tamam.customer", "tamam.orders", "tamam.lang"])
      .then((values) => {
        if (!active) return;
        try {
          if (values[0][1]) setLines(JSON.parse(values[0][1]));
          if (values[1][1])
            setCustomer({ ...emptyCustomer, ...JSON.parse(values[1][1]) });
          if (values[2][1]) setOrderIds(JSON.parse(values[2][1]));
          const fromUrl = urlLang();
          const chosen = fromUrl || asLang(values[3][1]);
          if (chosen) setLangState(chosen);
          // A ?lang= link sticks, so later pages/reloads keep that language.
          if (fromUrl) AsyncStorage.setItem("tamam.lang", fromUrl).catch(() => {});
        } catch {
          /* Ignore an old/corrupt local snapshot. */
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem("craveit.cart", JSON.stringify(lines)).catch(
        () => {},
      );
  }, [lines, ready]);
  const api = useMemo(() => createApi(), []);
  // Keep the page's lang attribute in sync for screen readers and search.
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined")
      document.documentElement.lang = lang;
  }, [lang]);
  const store: Store = {
    api,
    lang,
    setLang: (l) => {
      setLangState(l);
      AsyncStorage.setItem("tamam.lang", l).catch(() => {});
    },
    customer,
    saveCustomer: (c) => {
      setCustomer(c);
      AsyncStorage.setItem("tamam.customer", JSON.stringify(c)).catch(() => {});
    },
    orderIds,
    rememberOrders: (ids) =>
      setOrderIds((previous) => {
        const next = [...ids, ...previous.filter((x) => !ids.includes(x))].slice(0, 30);
        AsyncStorage.setItem("tamam.orders", JSON.stringify(next)).catch(() => {});
        return next;
      }),
    ready,
    lines,
    add: (line) =>
      setLines((previous) => {
        const key = JSON.stringify([
          line.restaurant.id,
          line.meal.id,
          line.extras.map((e) => String(e.id)).sort(),
          line.note,
        ]);
        const existing = previous.find((x) => x.key === key);
        return existing
          ? previous.map((x) =>
              x.key === key
                ? { ...x, quantity: x.quantity + line.quantity }
                : x,
            )
          : [...previous, { ...line, key }];
      }),
    quantity: (key, amount) =>
      setLines((previous) =>
        previous
          .map((x) => (x.key === key ? { ...x, quantity: amount } : x))
          .filter((x) => x.quantity > 0),
      ),
    clear: () => setLines([]),
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines.reduce(
      (sum, line) =>
        sum +
        (Number(line.meal.price) +
          line.extras.reduce((s, e) => s + Number(e.price || 0), 0)) *
          line.quantity,
      0,
    ),
  };
  return (
    <Context.Provider value={store}>
      {ready ? (
        children
      ) : (
        <ActivityIndicator
          color="#6EBF5F"
          style={{ flex: 1, backgroundColor: "#101412" }}
        />
      )}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing provider");
  return value;
}
