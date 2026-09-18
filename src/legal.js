// Terms and privacy, served from the arcade and linked from every site we run.
// Adapted from the Merchants of Play documents; the privacy policy describes what
// this fleet actually does, which is far less than most sites do.

export const LEGAL = {
  entity: 'Merchants of Play Inc.',
  short: 'Big Head Club',
  email: 'officialstuff@merchantsofplay.com',
  law: 'British Columbia, Canada',
  courts: 'Vancouver, British Columbia, Canada',
  updated: 'September 18, 2026',
  sites: ['bhc-arcade.fly.dev', 'bhc-rack.fly.dev', 'bhc-hundred-days.fly.dev'],
};

const TERMS = [
  ['Agreement to these terms', [
    `These terms apply to your use of the games, websites, and services published by ${LEGAL.entity} under the name ${LEGAL.short} ("we", "us", "our"). That includes ${LEGAL.sites.join(', ')}, every game listed on those pages whatever address it is served from, and any version of a game running inside Telegram, Discord, or another host (together, the "Services").`,
    'By using the Services you accept these terms and our privacy policy. If you do not agree to them, do not use the Services.',
    'If you use the Services for a company or other organisation, you confirm you may bind that organisation to these terms, and "you" means that organisation.',
  ]],
  ['Changes to these terms and to the Services', [
    'We may change these terms. We will post the change on this page and update the date at the top.',
    'We publish a new game most days and change or retire old ones without notice. A game may stop working, move address, or disappear. We do not promise that any game will keep running.',
    'If you keep using the Services after a change takes effect, you accept the revised terms.',
  ]],
  ['Playing the games', [
    'The Services are free. We may introduce fees for some part of the Services in future, on thirty days’ notice, and nothing you have already played would become paid without that notice.',
    'Most games need no account. Some ask for a name, a room code, or an email address, and a few run inside Telegram and use the identifiers Telegram gives us. Where a game has an account, keep your credentials to yourself and tell us if you think someone else has them. You are responsible for what happens under your account.',
    'We may suspend or remove access for anyone who breaks these terms, abuses other players, or attacks the Services.',
  ]],
  ['What you may not do', [
    'Do not use the Services to break the law, to harass or abuse anyone, to post content that is unlawful, hateful, obscene, or infringing, or to send spam or unauthorised advertising.',
    'Do not attack, overload, or probe the Services, scrape them at a volume that degrades them for other people, or work around any limit we set.',
    'Do not copy, modify, reverse engineer, decompile, or redistribute the Services or any part of them without our written permission, except where the law says you may or where we have published the code under an open licence.',
  ]],
  ['What you put in', [
    'You keep all rights in anything you type into a game: a name, a message, a drawing, a room code, a score.',
    'You give us a non-exclusive, royalty-free, worldwide licence to store and display that content as needed to run the game you put it in, including showing it to other players in the same game, and to use it in our own marketing and community channels.',
    'You confirm you have the right to whatever you submit, and that it does not infringe anyone else’s rights.',
    'You may withdraw this licence by writing to us, after which we will stop using the content except where we must keep it to meet a legal obligation or where it survives in a public archive outside our control.',
  ]],
  ['Our content', [
    `The games, the artwork, the cartridge images, the code we have not released openly, and the ${LEGAL.short} name belong to us or to our licensors.`,
    'Some of our code is published under open licences on GitHub. Where it is, that licence governs it and these terms do not narrow it.',
  ]],
  ['Other platforms', [
    'Some games run on or link to services we do not control: Telegram, Discord, YouTube, and the hosts that serve our sites. Their terms and their data practices are their own. We are not responsible for them.',
  ]],
  ['Accessibility', [
    `We want the games to be playable by as many people as possible, and we know we do not always get there. Write to ${LEGAL.email} with "Accessibility" in the subject if something is unusable and we will look at it.`,
  ]],
  ['Copyright complaints', [
    `If you believe something on the Services infringes your rights, write to ${LEGAL.email} with your contact details, a description of the work, where the infringing content is, a statement that you believe in good faith that the use is not authorised, and a statement that you may act for the rights holder.`,
  ]],
  ['No warranty, and the limit of what we owe you', [
    'THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY KIND, EXPRESS, IMPLIED, OR STATUTORY.',
    'TO THE FULLEST EXTENT THE LAW ALLOWS, WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR LOST SAVED PROGRESS, EVEN IF WE WERE TOLD SUCH DAMAGES WERE POSSIBLE.',
    'These games are experiments and we do not back up your saved progress. Treat anything you build in one of them as temporary.',
    'Nothing here limits liability that the law does not allow us to limit.',
  ]],
  ['You cover claims that come from your use', [
    'You agree to defend and indemnify us against claims, damages, and costs, including reasonable legal fees, arising from what you submit, your breach of these terms, or your use of the Services.',
  ]],
  ['Export and sanctions', [
    'You must follow the export laws that apply to you. The Services are not available in sanctioned countries or to people on restricted-party lists.',
  ]],
  ['Governing law', [
    `These terms are governed by the laws of ${LEGAL.law}. Disputes about these terms or the Services will be heard in the courts of ${LEGAL.courts}, and both sides submit to that jurisdiction.`,
  ]],
  ['Contact', [`Write to us at ${LEGAL.email}.`]],
];

const PRIVACY = [
  ['In short', [
    'We count how many people play each game. We do it with our own software on our own servers. We set no cookies, we do not store your IP address, we do not follow you between sites, and we do not sell or share anything with advertisers.',
    'The rest of this page says the same thing at length, and tells you how to opt out.',
  ]],
  ['Who this covers', [
    `${LEGAL.entity} ("we", "us", "our"), publishing as ${LEGAL.short}, operates ${LEGAL.sites.join(', ')} and the games listed on those pages.`,
    'It applies wherever you are. We aim to meet the Personal Information Protection and Electronic Documents Act in Canada, the General Data Protection Regulation in the European Union and the United Kingdom, and the California Consumer Privacy Act.',
  ]],
  ['What we collect automatically', [
    'Every page of ours loads one small script that reports to our own analytics service. For each visit it records: which game, which page, the hostname that linked you to us, any campaign tag in the link, your screen size, whether you are using a touch screen or a mouse, and your browser’s language.',
    'It also records what you do: clicks on buttons and links, named by the words on them; how long the page was open and visible; any JavaScript error the page throws; and events the game itself reports, such as starting a run, winning, losing, or sharing.',
    'To tell one visitor from another we take your IP address and browser user-agent string, mix them with the game’s name and a secret that changes every day, and keep only the resulting short hash. The IP address and user-agent are never written down. The hash cannot be turned back into them, and tomorrow the same person produces a different hash, so we cannot follow you from one day to the next or from one game to another.',
    'We drop traffic that identifies itself as a bot or crawler, and the script does not run in an automated browser.',
  ]],
  ['What we do not collect', [
    'We set no cookies of our own.',
    'We do not store IP addresses.',
    'We do not build profiles, and we have no advertising, no ad network, no tracking pixels, and no third-party analytics.',
    'We do not know your name unless a game asked you for one and you typed it.',
  ]],
  ['What your browser keeps', [
    'Some of our pages store small values in your own browser. They stay on your device, we never receive them, and clearing your site data removes them.',
    '"tally_ignore" remembers that you asked us not to count your visits. "tally_ab" remembers which version of a page you were shown, so you keep seeing the same one.',
    'On the cartridge rack, "carts.stream" remembers which games you kept and "carts.view" remembers whether you were looking at all carts or only yours. The tray inside a game stores "carts.sub." values for the same reason.',
    'Individual games may save your progress in your browser in the same way. Each game’s own page is the place that tells you what it saves.',
  ]],
  ['What you give us', [
    'A few games ask you to type something: a display name, a room code, a message to another player, and in one or two cases an email address. We store what you type for as long as that game needs it to work.',
    'Games that run inside Telegram receive the account identifiers Telegram passes to them, and we store those to keep your progress attached to you. Telegram’s own privacy policy governs what Telegram does.',
  ]],
  ['Why we use it', [
    'To see which games people play, so we know which ones to keep working on.',
    'To find and fix faults, which is what the error reports are for.',
    'To run the game in front of you, including saving progress and connecting you to other players.',
    'To keep the Services working and to stop abuse.',
    'Where the law requires a legal basis, ours is our legitimate interest in understanding and improving games we give away, and, for anything you type into a game, performing the service you asked for.',
  ]],
  ['Who else sees it', [
    'Nobody buys it, and we do not share it with advertisers or data brokers.',
    'Our analytics data sits on our own servers. The companies that host those servers can necessarily store it for us: Fly.io and Railway, in the United States. Some games keep saved data in a hosted Postgres database (Neon).',
    'The hundred-days calendar loads a web font from Google Fonts, so Google receives your IP address when that page loads. The arcade and the calendar load an embedded YouTube player only after you press play, at which point YouTube may set its own cookies. Both are governed by Google’s privacy policy, not ours.',
    'We may disclose information if the law requires it, or to protect our rights or someone’s safety.',
  ]],
  ['Cookies', [
    'We set none. There is nothing to consent to and no banner to dismiss.',
    'A third party can still set one: press play on an embedded YouTube video and YouTube will. Your browser settings control that.',
  ]],
  ['How long we keep it', [
    'Analytics events are kept indefinitely at present, because they are counts attached to a hash that stops being meaningful after a day. We will say so here if that changes.',
    'Data a game saves for you lasts as long as that game runs. These are experiments; many will be retired, and their data goes with them.',
  ]],
  ['Opting out', [
    'Open any of our pages with ?tally=ignore on the end of the address and we will stop counting that browser. It is remembered on your device. Use ?tally=track to turn counting back on.',
    'A browser set to "do not track" or an ad blocker will usually stop the script loading at all, and we do not work around either.',
  ]],
  ['Your rights', [
    'Depending on where you live you may ask us for a copy of what we hold about you, ask us to correct or delete it, object to or restrict how we use it, withdraw consent, or ask for it in a portable form.',
    'We will be straight with you about a limit here: because the visitor hash cannot be reversed, we usually cannot find "your" analytics rows from an email address. Where a game holds something identifiable, such as a Telegram account or an email address, we can find it and act on it.',
    `Write to ${LEGAL.email}. We answer within thirty days. If you are not satisfied, you may complain to your data protection authority, or in Canada to the Office of the Privacy Commissioner.`,
  ]],
  ['Children', [
    'The Services are not directed at children under 13, or under 16 where local law sets that age, and we do not knowingly collect their personal information.',
    `If you believe a child has given us personal information, write to ${LEGAL.email} and we will delete it.`,
  ]],
  ['Security', [
    'Our sites are served over HTTPS, analytics data is stored on servers we control, and access to it is limited to the people who run the fleet.',
    'No system is perfectly secure, and we cannot guarantee that these ones are.',
  ]],
  ['Where the data goes', [
    'Our servers are in the United States and the company is in Canada, so your information is processed outside your country if you live elsewhere. Where the law requires a transfer mechanism, we rely on the European Commission’s standard contractual clauses.',
  ]],
  ['Changes', [
    'We will post any change here and update the date at the top. Keep an eye on it, or write to us and ask.',
  ]],
  ['Contact', [`${LEGAL.entity}. Write to ${LEGAL.email}.`]],
];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function page(title, intro, sections, other) {
  const body = sections.map(([h, ps]) =>
    `<section><h2>${esc(h)}</h2>${ps.map((p) => `<p>${esc(p)}</p>`).join('')}</section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — ${esc(LEGAL.short)}</title><meta name="description" content="${esc(intro)}">
<style>body{margin:0;background:#1c1a17;color:#e8e2d8;font:16px/1.65 ui-monospace,Menlo,monospace;padding:32px 20px 80px}
main{max-width:720px;margin:0 auto}a{color:#f2812f}
h1{font-size:22px;margin:0 0 4px}.date{color:#9a9184;font-size:13px;margin:0 0 28px}
h2{font-size:15px;margin:32px 0 8px;letter-spacing:.02em}
p{margin:0 0 12px}section:first-of-type p{color:#c9c2b6}
nav{margin:0 0 24px;font-size:13px;color:#9a9184}
footer{margin-top:44px;border-top:1px solid #3a352f;padding-top:16px;font-size:13px;color:#9a9184}</style></head>
<body><main>
<nav><a href="/">← the arcade</a></nav>
<h1>${esc(title)}</h1><p class="date">Last updated ${esc(LEGAL.updated)} · ${esc(LEGAL.entity)}, publishing as ${esc(LEGAL.short)}</p>
${body}
<footer><a href="${esc(other.href)}">${esc(other.label)}</a> · <a href="mailto:${esc(LEGAL.email)}">${esc(LEGAL.email)}</a></footer>
</main></body></html>`;
}

export const termsPage = () => page('Terms of Service',
  `The terms you agree to by playing a ${LEGAL.short} game.`, TERMS, { href: '/privacy', label: 'Privacy policy' });

export const privacyPage = () => page('Privacy Policy',
  'We count plays with our own software. No cookies, no stored IP addresses, no advertisers.', PRIVACY, { href: '/terms', label: 'Terms of service' });
