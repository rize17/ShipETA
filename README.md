# Ship ETA

Works out when a ship reaches port, and when she comes inside the ranges you
can fly to, from a position copied off MarineTraffic.

**Live at <https://rize17.github.io/ShipETA/>**

It replaces writing coordinates down by hand and measuring them in Google
Earth: MarineTraffic won't let you select its coordinates and has no ruler, so
the only way to get a distance was to retype the figures somewhere else.

## Using it

Type the ship's position however MarineTraffic prints it — `33.6833° S,
10.1050° E`, degrees and minutes, or degrees minutes seconds, with or without
the symbols — add her speed, and you get:

| | |
|---|---|
| Distance and ETA to the port | and to each range ring |
| The position she'll be at when she crosses a ring | the figure you pass to the crew |
| Lift times | the latest you can be off the ground and still meet her there |

**Position age** matters: the position on MarineTraffic is usually minutes
old, so put in how old and she's carried forward from it. Everything then
reads from now rather than from whenever the AIS message landed.

The **Destinations** tab holds the ports you use, seeded with the South
African ones. Those seeded positions are rounded harbour entrances — check
them against your own chart and correct them here.

Nothing is sent anywhere. The destinations and the last job you typed live in
the browser, and once it's loaded the page works with no signal at all.

## The map

The **Map** tab plots the whole picture: the port, your range rings as circles
on the ground, her track in, where she crosses each ring, and the ship herself.

You can set her position from it rather than typing anything — **drag the ship**
to where she is, or press **Tap map to place ship** and tap the spot. Either way
it's taken as where she is *now*, so the position age is cleared.

The tiles come from OpenStreetMap and are the one thing the app fetches from the
network. With no signal you lose the coastline and nothing else: the rings,
track and positions still draw, and every figure is still exact.

## What it assumes

Distances are great-circle in nautical miles. Every ETA assumes she holds the
speed you entered and steams straight at the destination. If she plainly
isn't, none of it applies and the chart and a ruler are still the answer.

A range ring is measured from the destination, not from where you're flying
out of, unless you pick the same place for both.

## What's here

```
index.html            the whole app — UI, maths and storage in one file
sw.js                 service worker, so it works offline
manifest.webmanifest  home-screen install metadata
icon-192.png icon-512.png
vendor/               Leaflet, committed rather than loaded from a CDN
```

No build step and no package manager — open `index.html` and it runs. Leaflet
is the only library, and it's in the repo, so nothing has to be fetched for the
app to start.

## Deploying

Push to `main` — that's all. Pages is set to **Deploy from a branch** (`main`,
root), so GitHub publishes the repository root itself. There's no workflow and
no build step; `.nojekyll` keeps the files from being run through Jekyll on the
way out.

Hard-refresh to beat the cache; `?v=<version>` on the URL forces it.

Bump the version on every functional change, in all four places at once: the
`<title>`, the `.version` span, `CACHE` in `sw.js`, and *Current* below. It's
the only way to confirm a deploy actually landed.

Current: **v1.4**. (v1.0 to v1.2 were built before the app moved to its own
repository.)
