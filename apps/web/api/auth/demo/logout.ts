import { Hono } from "hono";
import { handle } from "hono/vercel";
import app from "../../_serverless_app.js";

export const config = { runtime: "nodejs" };

const root = new Hono().route("/api", app);
export default handle(root);
