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

- **No CDN scripts.** Leaflet is the one library, and it's committed to
  `vendor/` rather than loaded from a CDN — a blocked or slow CDN must never be
  able to stop the app booting. Don't add a second library, and don't "tidy"
  this one into a CDN link. The track strip on the Calculate page is still
  hand-drawn on a `<canvas>` and stays that way.
- **The map's tiles are the only thing fetched at runtime, and they're
  optional.** They come from OpenStreetMap. When they fail — no signal, a
  filter, a tile server having a bad day — Leaflet fires `tileerror`, the map
  says so, and every drawn thing (rings, track, positions, crossings) still
  renders and is still exact. The service worker deliberately leaves
  cross-origin requests alone so a missing tile stays a missing tile rather
  than becoming a page error. Everything else the app needs is in the cache and
  works with no signal at all. Keep it that way: no part of the arithmetic may
  ever depend on the network.
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
- **Her track and the rings are separate things.** She's assumed to steam
  straight at the destination until a track is set on the map, for the case
  where she's only passing — coming by the port and clipping a ring rather than
  coming in. The rings stay centred on the destination either way, because that
  is where the aircraft flies from. With a track set there's no arrival time at
  all, only a closest approach: don't invent one.
- **Ring crossings are solved numerically, not algebraically.** Distance from
  the port along her track falls to a closest approach and climbs again, so the
  crossings are a ternary search for the bottom and a bisection either side of
  it. With no track set this reduces exactly to `distance - ring`, which is
  worth keeping true — it's the test that says the solver hasn't drifted.
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

## The map

A third tab, built on the vendored Leaflet. It plots the destination, the range
rings as circles on the ground, her track in, the ring crossings and the ship
herself, and it's the quickest way to both check a position and set one.

- **The track is drawn as a great circle**, sampled at 64 points along the same
  path the ETAs are worked on. A straight line between two points on a Mercator
  map is a different path — don't "simplify" it to a two-point polyline.
- **The map never moves the ship.** Her position is transcribed from
  MarineTraffic on the Calculate tab and that is the only place it comes from.
  The one draggable thing is the open end of her track.
- **Grab areas are 30px square** with the marker drawn inside them. The hull
  and the track handle are about 13px, far too small for a finger — keep the
  wrappers.
- **Labels are decluttered by hand.** Zoomed out, permanent tooltips sit on
  each other and hang off the edge. `declutter()` keeps them in priority order
  — port, ring crossings, closest approach, track end, reported position — and
  hides whatever doesn't fit. Every figure it hides is in the strip below the
  map, so nothing is lost. Give any new label a priority.
- **Times on the map carry the day**, not just the clock. "15:49" alone doesn't
  say whether that's this afternoon or Tuesday, and these runs are often more
  than a day.

## Storage

Destinations and the last job typed live in `localStorage` under `shipeta.*`,
with an in-memory fallback if it's unavailable. There is no server and no
account. `index.html` carries a one-time migration from the `medivac.*` keys
the app used at its previous address — same host, so the data is still
readable. Leave it; it costs nothing and someone's corrected port positions
may still be behind it.

## Deploying

Push to `main`. Pages serves the repository root straight from the branch —
no workflow, no build step — at <https://rize17.github.io/ShipETA/>. Keep
`.nojekyll`: without it GitHub runs the files through Jekyll, which is a
needless risk for a hand-written page. Hard-refresh to beat the cache.
