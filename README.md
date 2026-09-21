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
| Closest approach | how near she gets to the airfield, and when |

**Position age** matters: the position on MarineTraffic is usually minutes
old, so put in how old and she's carried forward from it. Everything then
reads from now rather than from whenever the AIS message landed.

**No airfield is chosen for you.** Every one you've saved gets its rings drawn,
and every crossing she'll make of every ring is listed with its time, how far
she still has to run to it, the position, and the latest you could lift from
that airfield and still be there. Soonest first. You pick.

The **cog** in the top corner holds two lists you set once. **Ports** are where
she may be heading; **airfields** are where you fly from. Rings are measured
from each airfield, because that's what decides whether you can reach her.

*Reset built-in places to defaults* puts every one of them back to the position
it shipped with; anything you added yourself is left alone.

On the map the figures are on her track. Every ring she cuts is marked and
labelled with how far she runs to get there and when she gets there, and the
end of the line says the same for wherever it ends — the port, or wherever
you've dragged it to. Drag the end around and every crossing re-reads.

The airfields she comes into range of are drawn in aqua; the rest stay violet
and dashed so you can still see where they are.

Each airfield has a **Rings** switch. Turn it off to keep that one off the map
— useful where two are close enough that their rings sit on top of each other,
like Mossel Bay and George at nineteen miles apart. It stays in the list on the
Calculate tab either way, so nothing is dropped from the reckoning.

The seeded port positions are rounded harbour entrances. The seeded airfield
positions are approximate and **unverified** — check every one against the AIP
before anyone plans fuel on it, and correct it in the app.

Nothing is sent anywhere. The destinations and the last job you typed live in
the browser, and once it's loaded the page works with no signal at all.

## The map

The **Map** tab plots the whole picture: the port, your range rings as circles
on the ground, her track in, where she crosses each ring, and the ship herself.

**When the straight line runs over land** — a ship coming up from the east has
to round the peninsula before she can turn for the port — drag the middle of
her track onto the corner. A faint handle sits in the middle of every leg, so
drag one, then the next, and you have her round the point and up the coast.
Everything is then measured the way she'll actually steam: the run in, the ETA,
and every ring crossing. *Straighten* takes them all out.

**When she isn't coming in**, drag the open end of her track to where she's
actually heading — past the port and on up the coast, say. The rings stay where
they are, around the port you fly from, and you get when she crosses into each
one, how close she gets and when she's out of it again. *Track back to port*
undoes it.

Her position always comes off the Calculate tab, never off the map: the map
doesn't move the ship.

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

Current: **v4.0**. (v1.0 to v1.2 were built before the app moved to its own
repository.)
