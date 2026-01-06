export const config = { runtime: "nodejs" };

export default function handler(_req: any, res: any) {
  const now = new Date().toISOString();
  res.setHeader("Content-Type", "application/json");
  res.status(200).end(
    JSON.stringify({
      atualizadoEm: now,
      periodo: { inicio: now, fim: now },
      resumos: [],
      mapaHeat: [],
    }),
  );
}
