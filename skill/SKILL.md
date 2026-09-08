---
name: arcade
description: Register a Big Head Club game with the arcade (the fleet registry + analytics hub) and deploy it to Fly. Use when asked to register a game, add it to the rack or hundred-carts, wire up analytics, publish a game, or when a prompt says "register with the arcade".
---

# Register a game with the arcade

The arcade is one always-on service at https://bhc-arcade.fly.dev. It reads a
`cart.json` from every game repo in the Big-Head-Club org, counts plays through
one script tag, probes each game's URL, and serves a ranked feed that the rack
(hundred-carts) reads. Registering a game means: a manifest in the repo, the
tag on the page, and a deploy. The push does the rest.

Do these steps in order. Do not ask the user questions that the steps answer.
Ask only about family (step 2) when it is not obvious.

## 1. Write cart.json at the repo root

```json
{
  "slug": "salt-flats",
  "name": "SALT FLATS",
  "designers": ["gustavo"],
  "started": "2026-09-16",
  "tags": ["Daily", "Web", "Racing"],
  "family": "salt-flats",
  "variant": "",
  "url": "https://salt-flats.fly.dev",
  "repo": "Big-Head-Club/salt-flats",
  "plate": "art/plate.png",
  "state": "none",
  "platform": "both"
}
```

Fill it from git, not from questions:

- `slug`: the repo name, lower-case, letters, digits and dashes.
- `name`: the game's title as the page shows it, upper-case as the rack prints it.
- `designers`: ids from `people.json` in the arcade repo (mack, gustavo, daniel, jim), chosen by who wrote the commits (`git shortlog -sn`). Add the current user if they are building it.
- `started`: the first commit date, `git log --reverse --format=%as | head -1`.
- `tags`: two to four words from this list where they fit: Daily, Solo, Multiplayer, Web, Telegram, Discord, Puzzle, Guessing, Hidden object, Racing, Strategy, Builder, Text, Exploration, Collection, Tool. Add one specific tag of your own if none fits.
- `family`: the slug, unless this is a version of an existing game. If the user says "this is my version of X" or the game is clearly a variant of another repo, set `family` to that game's slug and `variant` to a short label such as "Mack's" or "Gustavo's". If unsure, ask this one question.
- `url`: the game's public URL. Leave it out until the deploy in step 4 gives you one, then fill it in.
- `repo`: the GitHub repo as `Big-Head-Club/<name>`.
- `plate`: path to a 4:3 image in the repo that shows the game, if one exists (a screenshot, key art). Leave it out otherwise; the arcade shoots one.
- `state`: `volume` if the server writes files it must keep (a save file, SQLite). Otherwise `none`.
- `platform`: `mobile`, `desktop`, or `both`. Decide from the game itself: touch controls and a portrait layout mean mobile; keyboard, mouse, or a wide canvas mean desktop; a responsive layout that plays well on either means both. Always set it.
- Optional: `shell` picks the cartridge colour (whale, galaxy, fish, crown, arch, tower, hare, scarab, moth, lighthouse); `probe` is a string the live page contains if the title does not; `description` is one sentence; `hidden: true` keeps it off the rack.

If one repo ships two versions of the game (two branches, two routes), make
cart.json a list of manifests, one per version, each with its own slug and
URL and the same `family`.

## 2. Add the analytics tag

In the page's HTML, before `</body>` (in the shared layout for a framework):

```html
<script defer src="https://bhc-arcade.fly.dev/t.js"></script>
```

That is the entire analytics integration. It records pageviews, clicks by
button text, time on page, and JS errors, keyed by the page's hostname, which
must match the `url` in cart.json. Local dev traffic is ignored automatically.

If the repo already loads a vendored tally (`/t.js` from its own server),
leave it; the two do not conflict. Do not add `data-site` unless the hostname
would be wrong.

Then name the moments that matter, guarded so the page never breaks:

```js
window.tally && tally('start');                       // a run or level begins
window.tally && tally('win', { level, seconds });     // and 'lose'
window.tally && tally('share');                       // share or copy-link
```

`start` is what the rack ranks on after visitors, so always send it.

## 3. Make it deployable on Fly

If the repo has no Dockerfile, add one that fits the app (a Node server, or
nginx for a static folder). If it has no fly.toml, add:

```toml
app = "<slug>"
primary_region = "ewr"

[build]

[http_service]
  internal_port = 3000          # match the app
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"
```

If `state` is `volume`, add:

```toml
[env]
  DATA_DIR = "/data"
[[mounts]]
  source = "data"
  destination = "/data"
```

and make the app write under `DATA_DIR`. A game that already deploys
somewhere else (Railway, a custom host) keeps its URL; skip this step and
step 4 and put the existing URL in cart.json.

## 4. Deploy

```
fly launch --copy-config --no-deploy --name <slug> --org bigheadclub --region ewr --yes
fly volumes create data --size 1 --region ewr --app <slug> --yes   # only if state is volume
fly deploy --app <slug> --ha=false
```

If the app name is taken, use `<slug>-bhc`. Wait for the URL to answer, then
write it into cart.json.

## 5. Commit and push

Commit cart.json, the tag, and the deploy files to the default branch and
push. The arcade's webhook picks up the manifest within seconds; the prober
marks it live once the page answers with the game's name.

## 6. Verify and report

- `https://bhc-arcade.fly.dev/api/games/<slug>.json` returns the game with `"status": "live"` (allow up to ten minutes for the prober).
- Load the game once and confirm the pageview shows in the arcade's analytics dashboard (the user has the link) or that `plays` in the feed moves.

Report in a few lines: the play URL, the family if set, and anything left out.
