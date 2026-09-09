#!/usr/bin/env node
// One image prompt per game, for the label art. Paste into Midjourney (or the ChatGPT image
// tool with the same words and no --flags). Save the pick as art/label.png in the game's
// repo and name it in cart.json as "label": "art/label.png"; the arcade prints it.
//
//   node tools/label-prompts.mjs [slug ...] > prompts.md
const ARCADE = process.env.ARCADE_URL || 'https://bhc-arcade.fly.dev';
const only = new Set(process.argv.slice(2));
const feed = await (await fetch(`${ARCADE}/api/games.json?all=1`)).json();

// Locked suffix, in the spirit of the cart prompt: only the subject and the title vary.
const SUFFIX = 'illustrated key art for a 1990s handheld video game cartridge label, painted airbrush illustration, bold hand-lettered title logo integrated into the picture, saturated limited palette, faint halftone screen-print texture, slightly faded ink, portrait composition filling the frame, no border, no console, no cartridge, no photograph --ar 3:4 --style raw';

const subject = (g) => {
  const tags = (g.tags || []).filter((t) => !/^(web|solo|daily|telegram|discord|app|tool|multiplayer|head-to-head|group)$/i.test(t));
  const what = g.description || (tags.length ? tags.join(', ').toLowerCase() : 'a small strange game');
  return `${what}`;
};

console.log(`# Label art prompts\n\nFrom the arcade on ${new Date().toISOString().slice(0, 10)}. Prefix each prompt with a unique word so a feed can be mapped back to its game.\n`);
for (const g of feed.games) {
  if (only.size && !only.has(g.slug)) continue;
  const word = g.slug.replace(/-/g, '') + 'label.';
  console.log(`## ${g.name}  (${g.slug})\n`);
  console.log('```');
  console.log(`${word} ${subject(g)}, the title "${g.name}" as a chunky retro logo across the bottom, ${SUFFIX}`);
  console.log('```\n');
}
