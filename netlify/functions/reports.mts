import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { STATES, geocode } from "../../public/geo.js";
import { json } from "../../lib/auth.js";

const db = getDatabase();

const clip = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 10_000_000) : 0;
};

export default async (req: Request) => {
  // Public list: approved reports only, and only the columns that are safe to show.
  if (req.method === "GET") {
    const rows = await db.sql`
      SELECT id,
             CASE WHEN display_choice = 'anon' THEN 'Anonymous'
                  ELSE first_name || ' ' || UPPER(LEFT(last_name, 1)) || '.' END AS display,
             town, state, lat, lon, brand, breaker_type, appliance, frequency, fix,
             trip_date::text AS trip_date, public_summary AS summary,
             food_loss::float AS food_loss, property_loss::float AS property_loss,
             injury, (COALESCE(license, '') <> '') AS verified
      FROM reports
      WHERE status = 'published'
      ORDER BY trip_date DESC
      LIMIT 5000`;
    return new Response(JSON.stringify(rows), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=60" },
    });
  }

  // New report from the public form
  if (req.method === "POST") {
    let b: Record<string, unknown>;
    try { b = await req.json(); } catch { return json({ error: "The form data couldn't be read." }, 400); }

    if (b.website) return json({ ok: true }); // hidden spam trap: bots fill it, people don't

    const f = {
      first: clip(b.first, 80), last: clip(b.last, 80), email: clip(b.email, 200), phone: clip(b.phone, 40),
      street: clip(b.street), town: clip(b.town, 100), state: clip(b.state, 2).toUpperCase(), zip: clip(b.zip, 10),
      date: clip(b.date, 10), freq: clip(b.freq, 50), brand: clip(b.brand, 60), btype: clip(b.btype, 60),
      appliance: clip(b.appliance, 80), fix: clip(b.fix, 80), story: clip(b.story, 4000),
      propDesc: clip(b.propDesc, 500), injDesc: clip(b.injDesc, 2000), elec: clip(b.elec, 120), lic: clip(b.lic, 60),
      display: clip(b.display, 10),
    };

    const missing = ["first", "last", "email", "street", "town", "state", "zip", "date", "freq", "brand", "appliance", "story", "display"]
      .filter((k) => !f[k as keyof typeof f]);
    if (missing.length) return json({ error: "Some required fields are empty: " + missing.join(", ") }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return json({ error: "Enter a valid email address." }, 400);
    if (!/^\d{5}$/.test(f.zip)) return json({ error: "Enter a 5-digit ZIP code." }, 400);
    if (!STATES[f.state as keyof typeof STATES]) return json({ error: "Choose a state from the list." }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return json({ error: "Enter the date of the trip." }, 400);
    if (!["initials", "anon"].includes(f.display)) return json({ error: "Choose how your name should appear." }, 400);
    if (b.consent !== true) return json({ error: "Check the contact consent box." }, 400);

    const [lat, lon] = geocode(f.town, f.state);

    await db.sql`
      INSERT INTO reports (
        first_name, last_name, email, phone, street, town, state, zip, lat, lon,
        trip_date, frequency, brand, breaker_type, appliance, fix, story,
        food_loss, property_loss, property_desc, injury, injury_desc,
        electrician, license, display_choice, consent, newsletter
      ) VALUES (
        ${f.first}, ${f.last}, ${f.email}, ${f.phone || null}, ${f.street}, ${f.town}, ${f.state}, ${f.zip}, ${lat}, ${lon},
        ${f.date}, ${f.freq}, ${f.brand}, ${f.btype || null}, ${f.appliance}, ${f.fix || null}, ${f.story},
        ${money(b.food)}, ${money(b.prop)}, ${f.propDesc || null}, ${b.injury === true}, ${f.injDesc || null},
        ${f.elec || null}, ${f.lic || null}, ${f.display}, ${true}, ${b.news === true}
      )`;

    return json({ ok: true }, 201);
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = { path: "/api/reports" };
