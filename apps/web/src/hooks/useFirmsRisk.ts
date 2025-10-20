import { useQuery } from "@tanstack/react-query";

export interface FirmsRiskParams {
  lineId?: string;
  linha?: unknown;
  horizons?: number[];
  count?: number;
}

export const useFirmsRisk = (params: FirmsRiskParams) => {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

  return useQuery({
    queryKey: ["firms-risk", params],
    queryFn: async () => {
      const resp = await fetch(`${base}/firms/risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });
      if (!resp.ok) {
        throw new Error("FIRMS risk indisponível");
      }
      return resp.json();
    },
    staleTime: 60_000
  });
};
