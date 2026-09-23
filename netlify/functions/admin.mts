import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { isAdmin, json } from "../../lib/auth.js";

const db = getDatabase();

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\r\n");
};
const csvResponse = (rows: Record<string, unknown>[], name: string) =>
  new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });

export default async (req: Request) => {
  if (!isAdmin(req)) return json({ error: "Wrong password." }, 401);
  const url = new URL(req.url);

  if (req.method === "GET") {
    const view = url.searchParams.get("view") || "pending";

    if (view === "export") {
      const rows = await db.sql`SELECT *, trip_date::text AS trip_date FROM reports ORDER BY id`;
      const day = new Date().toISOString().slice(0, 10);
      return csvResponse(rows as Record<string, unknown>[], `arcfault-all-reports-${day}.csv`);
    }

    if (view === "newsletter") {
      const rows = await db.sql`
        SELECT DISTINCT ON (LOWER(email)) first_name, last_name, email, phone, town, state
        FROM reports WHERE newsletter = TRUE
        ORDER BY LOWER(email), created_at DESC`;
      if (url.searchParams.get("format") === "csv") return csvResponse(rows as Record<string, unknown>[], "arcfault-newsletter.csv");
      return json(rows);
    }

    if (!["pending", "published", "rejected"].includes(view)) return json({ error: "Unknown view." }, 400);
    const rows = await db.sql`
      SELECT *, trip_date::text AS trip_date, food_loss::float AS food_loss, property_loss::float AS property_loss
      FROM reports WHERE status = ${view}
      ORDER BY created_at DESC LIMIT 500`;
    return json(rows);
  }

  if (req.method === "POST") {
    let b: { action?: string; id?: number; summary?: string };
    try { b = await req.json(); } catch { return json({ error: "Bad request." }, 400); }
    const id = Number(b.id);
    if (!Number.isInteger(id)) return json({ error: "Missing report id." }, 400);

    if (b.action === "publish") {
      const summary = String(b.summary || "").trim().slice(0, 2000);
      if (!summary) return json({ error: "Write a public summary before publishing." }, 400);
      await db.sql`UPDATE reports SET status = 'published', public_summary = ${summary}, published_at = NOW() WHERE id = ${id}`;
    } else if (b.action === "reject") {
      await db.sql`UPDATE reports SET status = 'rejected' WHERE id = ${id}`;
    } else if (b.action === "pending") {
      await db.sql`UPDATE reports SET status = 'pending', published_at = NULL WHERE id = ${id}`;
    } else {
      return json({ error: "Unknown action." }, 400);
    }
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = { path: "/api/admin" };
