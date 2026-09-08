# arcade

The Big Head Club fleet's one always-on service: analytics hub, game
registry, and plates. Every game lives in its own repo and deploys wherever it
likes. This is the thing that knows about all of them.

Live at https://bhc-arcade.fly.dev.

## What it serves

| | |
|---|---|
| `/t.js`, `/i` | the analytics tag and ingest, from [tally](https://github.com/Big-Head-Club/tally). Every game loads the tag; sites are keyed by hostname. |
| `/api/games.json` | every live game, most played first. `?sort=started` for start order, `?all=1` to include workshop and down games. |
| `/api/games/<slug>.json` | one game |
| `/api/carts.json` | the four-field list hundred-carts reads (`s`, `n`, `u`, `a`) plus `plate`, `rank`, `plays`, `family`, `variant` |
| `/plates/<slug>` | the label image: the repo's own plate if the manifest names one, else a nightly screenshot, else a placeholder |
| `/hooks/github` | org webhook; a push to a default branch re-reads that repo's `cart.json` |
| `/admin/analytics/<token>` | the tally dashboard, with a fleet table |
| `/admin/registry/<token>` | every row with probe status; `POST .../rescan`, `.../probe`, `.../shoot` run the jobs now |
| `/` | the plainest rack: every live game with its plate, most played first |

## How a game gets in

A `cart.json` at the root of its repo, or a list of them when one repo ships several variants. The skill in `skill/` writes it; the
format is documented there. The registry reads manifests three ways: the
webhook on push, a full scan of the org once a day, and a `rescan` from the
admin page. Seed rows from Mack's carts list and the build ledger fill the
gaps until a repo ships its own manifest, and never override one that does.

Every ten minutes the prober fetches each URL and checks the page mentions
the game's name (a 200 from an unclaimed Railway subdomain is not live).
Status is `workshop` (no URL), `live`, or `down`.

Each game carries a `platform` of mobile, desktop, or both; the feed reports `unknown` when the manifest has none.

Rank is `plays.week`: the number of `start` events in 7 days when the game
sends them (one per run), otherwise engaged visitors (clicked, started, or
stayed ten seconds; crawlers never do). Then 30-day engaged, plain visitors,
and start date. `plays.by` says which kind of count it is.

## Running it

```
npm install
npm start                   # ./data, prints the dashboard and registry URLs
npm test
```

Environment: `DATA_DIR` (volume), `GITHUB_TOKEN` (fine-grained, contents
read on the org's repos; without it only public repos are read),
`WEBHOOK_SECRET`, `TALLY_TOKEN` (admin token; generated if unset),
`PUBLIC_URL`, `CHROME_PATH` (for plates), `TZ`.

## Deploy

```
fly deploy
```

Fly app `bhc-arcade`, region ewr, one shared-1x with 1 GB and a 1 GB volume.
Always on. The Dockerfile brings Chromium for plates.

## The line for a prompt

```
When it's playable, register it with the arcade skill.
```

Install the skill with `cp -r skill ~/.claude/skills/arcade`, or point the
prompt at https://raw.githubusercontent.com/Big-Head-Club/arcade/main/skill/SKILL.md.
