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
- **Echo back what was parsed, in every format.** Under the input the position
  is shown again as degrees and decimal minutes, degrees minutes seconds, and
  decimal degrees, each tagged. A transposed digit is the likeliest error in
  the whole app and that block is what catches it; it also means you can read
  back whichever form the person on the radio is using without converting
  anything by hand. The hemisphere letter carries the sign, so the number
  never does as well — no `-34.9705° S`.
- **The position is stamped with the time it was taken, not its age.** The
  field is an absolute instant; `ageMinutes()` derives the age from it every
  time `compute()` runs. Store an age in minutes instead and the whole answer
  goes stale the moment the app is left open or reopened an hour later — which
  is exactly when it's read. The instant is held in UTC internally and written
  into the field in whichever zone the clock toggle is showing, so flipping the
  toggle rewrites the same moment rather than moving it.
- **The place lists are folded shut, airfields first.** Settings is mostly
  things you set once, and sixty lines of coordinates sat between the cog and
  them. Both lists are `<details>` reset to closed on every open, not just the
  first, with the count in the summary so a shut fold still says how many. A
  closed `<details>` keeps its layout box — Chrome hides it with
  `content-visibility`, not `display: none` — so `offsetParent` and
  `getBoundingClientRect` both report it visible; test it with
  `checkVisibility()`.

- **The rings field takes no `inputmode`.** A numeric keypad on a phone has no
  comma, so a field holding "100, 80" can be emptied and then never refilled.
  Any field whose value is a list needs the full keyboard.
- **The ship is met on a range ring, nowhere else.** Rings default to 100 and
  80 nm — the outer limit and the range normally flown. Don't reintroduce a
  "meet her wherever the arithmetic lands" figure; it offers something that
  can't be flown.
- **The rings are around the airfield, not the port.** What decides whether we
  can reach her is the fuel radius from where we take off, so that's where the
  rings are centred. The port only decides where she's going. They're two
  separate saved places (`type: "port"` and `type: "airport"`) and two separate
  pickers, and the distinction is the whole point of the app — don't collapse
  them back into one list. Measuring the rings from the port put the crossing
  points ~9 nm outside the fuel radius on a Cape Town job.
- **Turning an airfield's rings off is a map setting, not an exclusion.**
  `hidden` on the place keeps it out of `fieldsShown`/`inRangeShown`, which is
  what the map and the strip under it draw from — but `fields` and `inRange`
  still hold everything, and the Calculate list still shows it. Decluttering a
  coast where two airfields are twenty miles apart must never quietly drop one
  from the reckoning.
- **Nothing picks an airfield.** `model.fields` holds every one, each with its
  own closest approach and its own ring crossings; `inRange` is those she
  actually reaches, soonest first, and that list *is* the answer. Don't
  reintroduce a "departure airfield" selector — the whole point is that the
  operator compares the options and decides, and a selector hides the one they
  might have picked.
- **A lift time needs no flying distance.** A crossing of an airfield's own
  ring is that ring's distance from it by definition, so the flight out is
  `ring / cruise speed` and the lift time is the crossing less that. It falls
  out of the geometry; don't compute a distance for it.
- **Airfields are offered in coastal order, not storage order.** `FIELD_ORDER`
  runs round the coast from Cape Town and back up the west side, and both the
  picker and the list sort by it, so an old saved list comes out in the same
  order as a fresh one. Anything without a known ICAO code sorts to the end.
  Adding an airfield in a later release means bumping `SEED_VERSION`, which
  adds the missing ones once — a plain "have we seeded" flag would never
  deliver them to anyone already using the app.
- **The places dialog is positioned by hand.** A browser centres a modal
  `<dialog>` with `margin: auto` against `inset: 0`, and the `* { margin: 0 }`
  reset at the top of the stylesheet takes that away — which pins it to the top
  left corner, half of it behind a phone's status bar. The rule sets
  `position: fixed; inset: 0; margin: auto` explicitly, and `dlgpos.js` checks
  it lands on screen and centred across six viewport shapes. Don't drop those
  properties on the assumption the default handles it.
- **Places live behind the cog, not in a tab.** They're set once and then left;
  giving them a third of the tab bar spent the app's most valuable space on its
  least used screen.
- **The airfield positions shipped with the app are unverified.** They are
  approximate ICAO reference points, flagged as such in the list and in the UI,
  and are editable. Never describe them as authoritative, and keep that warning
  visible.
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

The page the app opens on, built on the vendored Leaflet. It plots the destination, the range
rings as circles on the ground, her track in, the ring crossings and the ship
herself, and it's the quickest way to both check a position and set one.

- **Any leg can be bent, and a bend can be bent again.** `wayPts` is an
  ordered list, capped at four. Every leg carries a faint midpoint handle whose
  drag inserts a turning point *at that leg's index*, which is what lets you
  take her round a point and then up a coast; each existing turning point has
  its own handle that moves it. Handles for legs and bends already behind her
  aren't drawn.
- **Her track is a line with an optional bend in it.** A ship coming up the
  east coast rounds the peninsula before turning for the port, so a straight
  line to it runs over land and every figure taken off that line is wrong.
  The turning point is a vertex: distances, ETAs and ring crossings are all
  measured along the legs, and the arrival is the run round the bend, not the
  straight line the bend exists to avoid. Anything showing a distance to the
  destination uses `arrival.togo`, never `dist`.
- **The bend breaks the one-minimum assumption.** With a corner in the track,
  how far off an airfield she is can fall, rise and fall again, so a hill-climb
  settles in whichever dip it started in. `analyse()` samples the whole track
  and refines from the sampled minimum; `cuts()` takes every sign change rather
  than assuming one way in and one way out. Don't put the ternary search back.
- **The track is drawn leg by leg**, each sampled along its own great circle,
  so the turning point is a vertex on the drawn line rather than a corner cut
  by whichever sample landed nearest. A straight line between two points on a
  Mercator map is a different path again — don't "simplify" any of it to a
  two-point polyline.
- **The map never moves the ship.** Her position is transcribed from
  MarineTraffic on the Calculate tab and that is the only place it comes from.
  The one draggable thing is the open end of her track.
- **Grab areas are 30px square** with the marker drawn inside them. The hull
  and the track handle are about 13px, far too small for a finger — keep the
  wrappers.
- **The map renderer needs padding.** A 100 nm circle is larger than the
  screen at most useful zooms, and Leaflet only paints vectors within a small
  margin of the viewport — so rings reaching off the edge stayed blank until a
  zoom forced a repaint, which reads as "the rings only appear when I zoom".
  The map is built with `L.svg({ padding: 2 })`; don't remove it. `rings.js`
  counts the painted paths on a first draw with no zoom touched.
- **Two ring colours, neither of them the colour of the sea.** Aqua where her
  track comes inside, violet dashed where it never does. A blue-grey for the
  second kind vanished against OpenStreetMap's water, which is the one
  background most of these rings are drawn on.
- **Nothing on the map is drawn in one pass.** Every ring, her track and the
  run she's made since the position report all get a dark casing first and the
  colour on top. A line that skips it is only visible while the tiles are still
  dark and vanishes the moment they paint — which reads as "it appears when I
  zoom or when the tiles refresh", not as "it's the wrong colour". If you add
  an overlay, case it.
- **Every ring and her track is drawn twice**, a dark casing first and the
  colour on top, so they read over pale water and dark land alike rather than
  depending on what the tiles happen to be. The tile filter also pulls the
  saturation down, which takes the blue out of the sea. Test with
  `seatest.js`, which serves a solid tile in OSM's water and land colours —
  a blank stand-in tile hides exactly this class of problem.
- **Fit padding is proportional.** A fixed 160px swallowed nearly half the
  width of a phone and cost a whole zoom level. It's a percentage now, floored
  and capped.
- **The figures belong on the track.** Each ring crossing is labelled with the
  distance she runs to reach it and the time she gets there, and the end of the
  line carries the same for wherever it ends. That's the readout — the airfield
  markers are only identity now, and carry just their code.
- **Crossings that fall close together are stepped away from the line.** Two
  rings of one airfield are 20 nm apart, which is a few dozen pixels; labels
  alternate above and below and each pair moves 30px further out, so they sit
  in their own rows instead of one of them being dropped. `labelled()` takes a
  `lift` for this, and `faceLabel()` has to preserve it when it flips a label.
- **The end of the track is pinned.** Priority 1 is never hidden, never
  flipped and never slid into view: it sits at its marker and is sometimes
  half off the edge, which you pan to. A label that moves itself to stay
  readable is harder to follow than one that stays put, and the same figure is
  in the strip under the map regardless.
- **`dist` is never shown anywhere.** The straight line from her to the port
  is kept in the model because bearings and sanity checks want it, but every
  distance on screen and in the brief is `trackLen` — the run to the end of her
  track, round the turning points. Showing the straight line is how the map
  came to claim 157 nm for a 186 nm passage over a peninsula.
- **Only one run-in figure exists on the map, and it's on the end of the
  track.** The destination marker carries its name alone. A distance there
  would be the straight line to it — the very line the turning points exist to
  avoid, over land, and read as fact by anyone glancing at a screenshot.
- **Labels are decluttered by hand.** Zoomed out, permanent tooltips sit on
  each other and hang off the edge. `declutter()` keeps them in priority order
  — port, ring crossings, closest approach, track end, reported position — and
  hides whatever doesn't fit. Every figure it hides is in the strip below the
  map, so nothing is lost. Give any new label a priority.
- **Times on the map carry the day**, not just the clock. "15:49" alone doesn't
  say whether that's this afternoon or Tuesday, and these runs are often more
  than a day.

## Storage

Places and the last job typed live in `localStorage` under `shipeta.*`,
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
