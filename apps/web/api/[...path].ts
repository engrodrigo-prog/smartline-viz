export const config = { runtime: "nodejs" };

import app from "./_serverless_app.js";

const readBody = async (req: any): Promise<Buffer | undefined> => {
  const method = String(req?.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return undefined;
  if (!req || typeof req.on !== "function") return undefined;

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve());
    req.on("error", reject);
  });
  return chunks.length ? Buffer.concat(chunks) : undefined;
};

export default async function handler(req: any, res: any) {
  try {
    const proto = (req.headers?.["x-forwarded-proto"] as string | undefined) ?? "https";
    const host = (req.headers?.host as string | undefined) ?? "localhost";
    const url = new URL(req.url ?? "/", `${proto}://${host}`);

    // Vercel invoca a function em /api/*; o app Hono define rotas sem esse prefixo.
    url.pathname = url.pathname.replace(/^\/api(\/|$)/, "/");

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers ?? {})) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, String(v));
      } else {
        headers.set(key, String(value));
      }
    }

    const body = await readBody(req);
    const honoReq = new Request(url.toString(), {
      method: req.method,
      headers,
      body: body ? (body as any) : undefined,
    });

    const response = await app.fetch(honoReq);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (err: any) {
    console.error("[api] handler failure", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "server_error", message: err?.message ?? String(err) }));
  }
}
