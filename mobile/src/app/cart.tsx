import { router } from "expo-router";
import { Text, View } from "react-native";
import { Button, money, Page, s, Txt } from "../components/ui";
import { useStore } from "../lib/state";
import { title } from "../lib/types";
export default function Cart() {
  const { lines, quantity, subtotal } = useStore();
  return (
    <Page>
      <Text style={s.heading}>سلتك</Text>
      {lines.map((line) => (
        <View key={line.key} style={s.card}>
          <Txt>{title(line.meal)}</Txt>
          <Txt muted>{title(line.restaurant)}</Txt>
          <Txt muted>
            {line.extras.map((x) => x.name).join("، ")} {line.note}
          </Txt>
          <Txt>
            {money(
              (Number(line.meal.price) +
                line.extras.reduce((sum, e) => sum + Number(e.price || 0), 0)) *
                line.quantity,
            )}
          </Txt>
          <View style={s.row}>
            <Button
              label="+"
              onPress={() => quantity(line.key, line.quantity + 1)}
            />
            <Txt>{line.quantity}</Txt>
            <Button
              label="−"
              onPress={() => quantity(line.key, line.quantity - 1)}
            />
          </View>
        </View>
      ))}
      {!lines.length ? (
        <>
          <Txt>سلتك فاضية. اختار وجبة بتحبها.</Txt>
          <Button
            label="استكشف المطاعم"
            onPress={() => router.push("/restaurants")}
          />
        </>
      ) : (
        <View style={s.card}>
          <Txt>مجموع الوجبات: {money(subtotal)}</Txt>
          <Txt muted>
            التوصيل وأي خصومات ليست محسوبة بعد. إتمام الطلب والدفع قيد نقل من
            نظام CraveIt والتحقق؛ هذه النسخة لا ترسل طلبات.
          </Txt>
        </View>
      )}
    </Page>
  );
}
