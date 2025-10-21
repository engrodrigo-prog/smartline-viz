import { useQuery } from "@tanstack/react-query";

export interface FirmsRiskParams {
  lineId?: string;
  linha?: unknown;
  horizons?: number[];
  count?: number;
  windHeight?: number;
}

export const useFirmsRisk = (params: FirmsRiskParams) => {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const defaultHeight = Number(import.meta.env.VITE_WIND_HEIGHT ?? 0) || undefined;
  const body = { ...params } as FirmsRiskParams;
  if (body.windHeight == null && defaultHeight != null) {
    body.windHeight = defaultHeight;
  }

  return useQuery({
    queryKey: ["firms-risk", params],
    queryFn: async () => {
      const resp = await fetch(`${base}/firms/risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        throw new Error("FIRMS risk indisponível");
      }
      return resp.json();
    },
    staleTime: 60_000
  });
};
