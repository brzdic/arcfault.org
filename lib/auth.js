import { createHash, timingSafeEqual } from "node:crypto";

// The admin password lives in Netlify as the ADMIN_PASSWORD environment variable,
// never in the code. The admin page sends it in the Authorization header.
export function isAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (expected.length < 12) return false; // refuse to run with a missing or weak password
  const header = req.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
