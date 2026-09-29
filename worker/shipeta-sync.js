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
const KEYKEY = "auth:key";

/* The shared secret, preferring a real runtime secret and falling back to a
   value in KV.
   
   The fallback earned its place: this worker was first deployed, by accident,
   as a static-assets site, and Cloudflare then refused runtime variables on
   it - "Variables cannot be added to a Worker that only has static assets" -
   even once the script was running. KV bindings still worked, because those
   come from wrangler.toml, but a secret can never come from the repo, so the
   key went into KV by hand.
   
   That restriction has since cleared and the key is a proper secret again.
   The fallback stays: it costs a KV read only when the secret is missing,
   and it is the way back in if this ever happens a second time. */
async function sharedKey(env) {
  if (env.SHIPETA_KEY) return { key: env.SHIPETA_KEY, from: "runtime secret" };
  const k = await env.SHIPS.get(KEYKEY);
  return k ? { key: k, from: "KV" } : { key: null, from: null };
}

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

    /* Plain text, and deliberately before the key check. Safari on iOS will
       not render application/json inline - it shows a blank page - so a
       phone had no way to tell a broken deploy from a working one. This says
       what is wired up without saying what the key is. */
    if (new URL(req.url).pathname.replace(/\/+$/, "") === "/health") {
      const kv = !!env.SHIPS;
      const sk = kv ? await sharedKey(env) : { key: null, from: null };
      /* The count, because a worker cannot report which namespace it is bound
         to and the dashboard has more than one answer. Hold this against the
         KV count in the dashboard: if they disagree, the binding points at a
         namespace other than the one being looked at. A bare number gives
         nothing away - no names, no positions. */
      let stored = "?";
      if (kv) {
        try {
          const cur = await load(env);
          stored = String((cur.ships || []).length);
        } catch (_) { stored = "unreadable"; }
      }
      return new Response(
        "shipeta-sync is running\n" +
        "KV bound:    " + (kv ? "yes" : "NO - bind the namespace as SHIPS") + "\n" +
        "secret set:  " + (sk.key ? "yes, from " + sk.from
                                  : "NO - put the key in KV under " + KEYKEY) + "\n" +
        "ships held:  " + stored + "\n",
        { headers: { "Content-Type": "text/plain; charset=utf-8",
                     "Cache-Control": "no-store", ...CORS } });
    }

    /* An unset secret must fail shut. Treating "no key configured" as "no key
       required" is how a private list quietly becomes a public one. */
    if (!env.SHIPS) return json({ error: "no KV namespace bound as SHIPS" }, 503);
    const sk = await sharedKey(env);
    if (!sk.key) return json({ error: "no key configured on the worker" }, 503);

    if (!sameKey(req.headers.get("X-API-Key") || "", sk.key))
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
