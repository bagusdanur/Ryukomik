export async function getCacheSizeMB(prefix = "rk"): Promise<string> {
  if (typeof window === "undefined") return "0.00";
  if (!("caches" in window)) return "0.00";

  let totalBytes = 0;
  const keys = await caches.keys();
  const filteredKeys = prefix ? keys.filter((key) => key.startsWith(prefix)) : keys;

  for (const key of filteredKeys) {
    try {
      const cache = await caches.open(key);
      const requests = await cache.keys();

      const sizes = await Promise.all(
        requests.map(async (req) => {
          try {
            const res = await cache.match(req);
            if (!res) return 0;
            const blob = await res.clone().blob();
            return blob.size;
          } catch {
            return 0;
          }
        })
      );

      totalBytes += sizes.reduce((a, b) => a + b, 0);
    } catch {
      continue;
    }
  }

  return (totalBytes / 1024 / 1024).toFixed(2);
}

