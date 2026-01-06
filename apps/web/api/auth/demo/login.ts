export const config = { runtime: "nodejs" };

const readJson = async (req: any) =>
  new Promise<Record<string, unknown>>((resolve) => {
    try {
      let raw = "";
      req.on("data", (chunk: Buffer) => {
        raw += chunk.toString();
      });
      req.on("end", () => {
        try {
          resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
        } catch {
          resolve({});
        }
      });
    } catch {
      resolve({});
    }
  });

export default async function handler(req: any, res: any) {
  const body = typeof req?.body === "object" && req.body ? req.body : await readJson(req);
  const displayName = typeof body.display_name === "string" ? body.display_name : "Guest";
  const email = typeof body.email === "string" ? body.email : undefined;

  res.setHeader("Content-Type", "application/json");
  res.status(200).end(
    JSON.stringify({
      ok: true,
      user: {
        id: `demo-${Math.random().toString(36).slice(2, 10)}`,
        display_name: displayName,
        email,
        issued_at: new Date().toISOString(),
      },
    }),
  );
}
