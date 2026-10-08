import { useCallback, useEffect, useState } from "react";
export function useLoad<T>(loader: () => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    loader: typeof loader;
    revision: number;
    value?: T;
    error: string;
  }>();
  useEffect(() => {
    let cancelled = false;
    loader()
      .then((value) => {
        if (!cancelled) setResult({ loader, revision, value, error: "" });
      })
      .catch((e) => {
        if (!cancelled)
          setResult({
            loader,
            revision,
            error: e instanceof Error ? e.message : "تعذر تحميل البيانات",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [loader, revision]);
  const reload = useCallback(() => setRevision((previous) => previous + 1), []);
  const loading = result?.loader !== loader || result?.revision !== revision;
  return {
    value: loading ? undefined : result?.value,
    error: loading ? "" : result?.error || "",
    loading,
    reload,
  };
}
