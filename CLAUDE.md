# Ship ETA

A calculator for ship medivac jobs: given a ship's position off MarineTraffic
and her speed, when does she reach port, and when does she come inside the
ranges we can fly to? It replaces a manual routine of retyping coordinates
into Google Earth and measuring them with the ruler.

**This repo holds only this app.** It shares no code with anything else.

## Layout

Everything is `index.html` — UI, maths and storage in one file. Alongside it:
`sw.js`, `manifest.webmanifest`, and two icons. There is no build step and no
package manager.

## Conventions that matter

- **No dependencies, and no CDN scripts.** Nothing is fetched at runtime and
  nothing should be. The track diagram is hand-drawn on a `<canvas>` and must
  stay that way. The app is used on a phone, sometimes on bad signal, and a
  blocked or slow CDN would take the whole thing down for no gain.
- **Read the position the way it's written, not one canonical way.** The
  coordinate parser takes decimal degrees, degrees and decimal minutes, and
  degrees minutes seconds, with hemisphere letters before or after, symbols or
  no symbols, either order. It's typed by hand off a screen under time
  pressure — every format it rejects is a format someone has to retype.
  Anything it can't read says so plainly rather than guessing.
- **Echo back what was parsed.** The position is always shown again in
  degrees and decimal minutes under the input. A transposed digit is the most
  likely error in the whole app, and that line is what catches it.
- **The ship is met on a range ring, nowhere else.** Rings default to 100 and
  80 nm — the outer limit and the range normally flown. Don't reintroduce a
  "meet her wherever the arithmetic lands" figure; it offers something that
  can't be flown.
- **A lift time is her arrival at a ring less the flying time out to it.**
  Nothing is subtracted for getting the machine ready; that's worked out
  separately and deliberately isn't modelled here.
- **Every ETA assumes she holds her speed and steams straight at the port.**
  That assumption is stated in the app, next to the bearing, rather than
  hidden. When it breaks, the honest answer is a chart and a ruler, not a
  softer number — which is why there's no ship's-course input any more.
- **Distances are great-circle on a sphere.** That runs about 0.2% short of
  the WGS84 geodesic a Google Earth ruler measures — 0.2 nm on a 100 nm ring.
  Deliberate: the speed the job is worked from is a rounded estimate that
  swamps it. Don't "fix" it without being asked.
- **The seeded port positions are rounded harbour entrances**, not survey
  data, and are editable for that reason. Don't present them as authoritative.
- **Bump the version on every functional change**, in all four places at once:
  the `<title>`, the `.version` span, `CACHE` in `sw.js`, and *Current* in
  `README.md`. It's the only way to confirm a Pages deploy landed.

## Storage

Destinations and the last job typed live in `localStorage` under `shipeta.*`,
with an in-memory fallback if it's unavailable. There is no server and no
account. `index.html` carries a one-time migration from the `medivac.*` keys
the app used at its previous address — same host, so the data is still
readable. Leave it; it costs nothing and someone's corrected port positions
may still be behind it.

## Deploying

Push to `main`; `.github/workflows/pages.yml` publishes the repository root to
Pages at <https://rize17.github.io/ShipETA/>. Hard-refresh to beat the cache.
