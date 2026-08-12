import "server-only";

type Metric = { requests: number; bytes: number; errors: number; largest: number };
const metrics = new Map<string, Metric>();

export function recordSocialMetric(pathname: string, status: number, bytes: number) {
  const current = metrics.get(pathname) || { requests: 0, bytes: 0, errors: 0, largest: 0 };
  current.requests += 1;
  current.bytes += bytes;
  current.errors += status >= 400 ? 1 : 0;
  current.largest = Math.max(current.largest, bytes);
  metrics.set(pathname, current);
}

export function socialMetricSnapshot() {
  return [...metrics.entries()].map(([endpoint, value]) => ({
    endpoint,
    ...value,
    averageBytes: value.requests ? Math.round(value.bytes / value.requests) : 0,
  })).sort((a, b) => b.bytes - a.bytes);
}
