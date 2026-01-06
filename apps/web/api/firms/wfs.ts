export const config = { runtime: "nodejs" };

export default function handler(req: any, res: any) {
  const url = new URL(req.url, `http://${req.headers?.host ?? "localhost"}`);
  const typenames = url.searchParams.get("typenames")?.split(",").filter(Boolean) ?? [];
  const count = Number(url.searchParams.get("count") ?? 0);
  const format = url.searchParams.get("format") ?? "auto";
  const bbox = url.searchParams.get("bbox") ?? "brazil";

  const payload = {
    type: "FeatureCollection",
    features: [],
    meta: {
      typenames,
      bbox,
      count,
      source: "stub",
      cached: false,
      lastFetchedAt: new Date().toISOString(),
      formatAttempt: [format],
    },
  };

  res.setHeader("Content-Type", "application/json");
  res.status(200).end(JSON.stringify(payload));
}
