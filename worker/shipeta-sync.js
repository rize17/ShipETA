/* Ship ETA sync — Cloudflare Worker.
 *
 * Holds the shared ship list so nobody re-enters a vessel someone else has
 * already set up. One shared secret in the X-API-Key header; there are no
 * accounts and no roles, because the list is AIS data anyone can look up.
 *
 * The header rather than the query string keeps the key out of Cloudflare's
 * request logs and out of browser history.
 *
 * Bindings this expects, both set in the dashboard:
 *   SHIPS        KV namespace
 *   SHIPETA_KEY  secret
 *
 * Note there is deliberately NO endpoint that replaces the whole list. Every
 * write names one ship, and the Worker merges it into the stored list itself.
 * A client that PUT the entire list would silently revert every other ship to
 * whatever its own copy held - which, for a tab left open since breakfast, is
 * hours of other people's work. Keeping that endpoint out of existence is
 * cheaper than remembering not to call it.
 */

const STORE = "ships:v1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  "Access-Control-Max-Age": "86400"
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS }
  });

/* Constant time, so the response can't be timed to guess the key a character
   at a time. Length is allowed to leak; it tells an attacker nothing useful. */
function sameKey(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function load(env) {
  const raw = await env.SHIPS.get(STORE);
  if (!raw) return { ships: [], updated: 0 };
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v.ships) ? v : { ships: [], updated: 0 };
  } catch (_) {
    return { ships: [], updated: 0 };
  }
}

async function save(env, ships) {
  const out = { ships, updated: Date.now() };
  await env.SHIPS.put(STORE, JSON.stringify(out));
  return out;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    /* An unset secret must fail shut. Treating "no key configured" as "no key
       required" is how a private list quietly becomes a public one. */
    if (!env.SHIPETA_KEY) return json({ error: "no key configured on the worker" }, 503);
    if (!env.SHIPS) return json({ error: "no KV namespace bound as SHIPS" }, 503);

    if (!sameKey(req.headers.get("X-API-Key") || "", env.SHIPETA_KEY))
      return json({ error: "bad or missing key" }, 401);

    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    const one = path.startsWith("/ships/")
      ? decodeURIComponent(path.slice("/ships/".length)) : null;

    if (path === "/ships" && req.method === "GET") return json(await load(env));

    if (one && (req.method === "PUT" || req.method === "DELETE")) {
      if (!one.trim() || one.length > 80) return json({ error: "bad ship name" }, 400);

      const cur = await load(env);
      // Names are matched case-insensitively: the app saves a ship by name,
      // and "Blue Marlin" and "blue marlin" are the same vessel.
      const at = cur.ships.findIndex(s =>
        s && typeof s.name === "string" && s.name.toLowerCase() === one.toLowerCase());

      if (req.method === "DELETE") {
        if (at < 0) return json(cur);                 // already gone; not an error
        cur.ships.splice(at, 1);
        return json(await save(env, cur.ships));
      }

      let ship;
      try { ship = await req.json(); } catch (_) { return json({ error: "bad json" }, 400); }
      if (!ship || typeof ship !== "object" || Array.isArray(ship))
        return json({ error: "expected a ship object" }, 400);
      ship.name = one;
      if (JSON.stringify(ship).length > 8000) return json({ error: "ship too large" }, 413);
      if (at >= 0) cur.ships[at] = ship;
      else if (cur.ships.length >= 100) return json({ error: "too many ships" }, 413);
      else cur.ships.push(ship);

      cur.ships.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      return json(await save(env, cur.ships));
    }

    return json({ error: "not found" }, 404);
  }
};
