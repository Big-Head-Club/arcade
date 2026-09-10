// What kind of play a game is. Seven buckets, one per game, chosen so a visitor
// browsing the rack can answer "what do I want to do right now".
//
// A game declares its own in cart.json (`category`). The map below is the answer
// for every game registered before the field existed; a manifest always wins.

export const CATEGORIES = [
  { id: 'spot', label: 'Spot it', blurb: 'Find the one, find the difference, remember what moved' },
  { id: 'guess', label: 'Guess', blurb: 'Work it out from clues' },
  { id: 'arcade', label: 'Arcade', blurb: 'Reflexes, running, dodging, exploring' },
  { id: 'strategy', label: 'Strategy', blurb: 'Plan it, place it, solve the board' },
  { id: 'versus', label: 'Head-to-head', blurb: 'Against one or two other people' },
  { id: 'party', label: 'Party', blurb: 'Three or more, or a group chat' },
  { id: 'toys', label: 'Toys & tools', blurb: 'Collections, creatures, and things that are not a contest' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const labelOf = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? '';

/** Read from each game's own words on 2026-09-10. A manifest `category` overrides it. */
export const ASSIGNED = {
  // Spot it
  asymmetry: 'spot', 'frankies-finder': 'spot', 'grandmas-watching': 'spot', housekeeping: 'spot',
  'kims-game': 'spot', newphonewhodis: 'spot', nextdoor: 'spot', 'patient-zero': 'spot',
  pawsoff: 'spot', ringer: 'spot', spotted: 'spot', 'spotted-3d': 'spot',
  // Guess
  'am-i-dev-now': 'guess', 'daily-lineup': 'guess', 'detective-zombie': 'guess', emojivas: 'guess',
  gruk: 'guess', rundown: 'guess', 'telegram-dailies': 'guess',
  // Arcade
  'daily-maze': 'arcade', 'first-year': 'arcade', flashpoint: 'arcade', flicker: 'arcade',
  'hole-in-zero': 'arcade', rolland: 'arcade', saehrimnir: 'arcade', 'salmon-run': 'arcade',
  'vine-drop': 'arcade',
  // Strategy
  'barred-mama': 'strategy', 'chess-royale': 'strategy', 'crown-run': 'strategy',
  'dice-rolling-roguelite': 'strategy', 'fort-pong': 'strategy', glowdrop: 'strategy',
  glyphsmith: 'strategy', 'heist-board': 'strategy', 'mammoth-hunt': 'strategy',
  'night-desk': 'strategy', nimbrek: 'strategy', sheepenomics: 'strategy', 'slime-tide': 'strategy',
  'storm-the-fort-2': 'strategy', 'winter-quarters': 'strategy',
  // Head-to-head
  atalanta: 'versus', 'blast-golf': 'versus', boneyard: 'versus', detritus: 'versus',
  dissolve: 'versus', 'flip-duel': 'versus', gorgon: 'versus', 'hex-smash': 'versus',
  'lore-wars': 'versus', pirates: 'versus', 'rps-grid': 'versus', windline: 'versus',
  // Party
  breach: 'party', 'daily-boss': 'party', flock: 'party', machine: 'party', 'raid-run': 'party',
  'zoo-york': 'party',
  // Toys & tools
  'corvid-yard': 'toys', 'daily-garden': 'toys', 'fantasy-animals': 'toys', horngate: 'toys',
  'left-on-red': 'toys', pandas: 'toys', 'rachels-app': 'toys', tidbits: 'toys', 'trail-off': 'toys',
};

/** The category for a game: its own, else the map, else nothing. */
export function categoryOf(m) {
  if (m.category && CATEGORY_IDS.includes(m.category)) return m.category;
  return ASSIGNED[m.slug] || '';
}
