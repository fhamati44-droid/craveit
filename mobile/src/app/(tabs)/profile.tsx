import { useState } from "react";
import { TextInput, View } from "react-native";
import { Button, colors, Page, s, Txt } from "../../components/ui";
import { useStore } from "../../lib/state";
import { createApi } from "../../lib/api";
export default function Profile() {
  const { connection, saveConnection } = useStore();
  const [id, setId] = useState(connection.appId);
  const [url, setUrl] = useState(connection.appBaseUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const connect = async () => {
    setBusy(true);
    setMessage("");
    try {
      const next = {
        appId: id.trim(),
        appBaseUrl: url.trim().replace(/\/$/, ""),
      };
      if (!next.appId)
        throw new Error("أدخل App ID من مشروع CraveIt في Base44.");
      if (next.appBaseUrl && !/^https:\/\//.test(next.appBaseUrl))
        throw new Error("عنوان الخادم يجب أن يبدأ بـ https://");
      await createApi(next).restaurants();
      await saveConnection(next);
      setMessage("تم الربط وتحميل المطاعم بنجاح.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "فشل الاتصال");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <View style={s.card}>
        <Txt>ربط تطبيق TAMAM بخادم CraveIt</Txt>
        <Txt muted>
          انسخ App ID وعنوان الخادم من إعدادات مشروع Base44 أو من متغيرات نشر
          الموقع. هذه ليست بيانات حساب Expo.
        </Txt>
        <TextInput
          style={[s.input, { textAlign: "left", writingDirection: "ltr" }]}
          value={id}
          onChangeText={setId}
          placeholder="Base44 App ID"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Base44 App ID"
        />
        <TextInput
          style={[s.input, { textAlign: "left", writingDirection: "ltr" }]}
          value={url}
          onChangeText={setUrl}
          placeholder="https://your-project.base44.app"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel="عنوان خادم Base44"
        />
        <Button
          label={busy ? "جارٍ التحقق…" : "تحقق واحفظ الاتصال"}
          disabled={busy}
          onPress={() => void connect()}
        />
        {!!message && <Txt>{message}</Txt>}
      </View>
      <View style={s.card}>
        <Txt>TAMAM · CraveIt</Txt>
        <Txt muted>
          تطبيق أصلي مبني من مشروع craveit. بيانات الاتصال محفوظة على هذا
          الجهاز.
        </Txt>
      </View>
    </Page>
  );
}
