// Crypto-tuned sentiment. Pure functions, no io.
//
// Why not an off-the-shelf model: general sentiment scorers rate "rug", "jeet", "dev sold" and
// "exit liquidity" as roughly neutral, because in ordinary English they are. In this domain they
// are among the strongest negative signals that exist. A generic scorer applied here does not
// produce a slightly worse number, it produces a wrong one -- so the vocabulary is the feature.

const NEG = {
  rug:-3, rugged:-3, rugpull:-3, 'rug pull':-3, scam:-3, honeypot:-3, exitscam:-3,
  'exit liquidity':-3, 'dev sold':-3, 'dev dumped':-3, dumping:-2.5, dumped:-2.5, dump:-2,
  jeet:-2, jeeted:-2, jeets:-2, botted:-2.5, 'insider':-2, 'sniped':-1.5, snipers:-1.5,
  ngmi:-2, rekt:-2.5, bagholder:-2, bagholding:-2, 'holding bags':-2, 'down bad':-2,
  dead:-2, dying:-2, 'no volume':-2, illiquid:-2, 'cant sell':-3, "can't sell":-3,
  crash:-2, crashed:-2, crashing:-2, bleeding:-2, tanking:-2, plummet:-2, nuked:-2.5,
  ponzi:-3, fake:-2, fud:-1, sketchy:-2, avoid:-2, careful:-1.5, warning:-1.5,
  overbought:-1, distribution:-1.5, 'top signal':-2, 'get out':-2.5, selling:-1.5, sold:-1.5,
  'lost':-1.5, loss:-1.5, down:-1, red:-1, weak:-1.5, disappointed:-1.5, 'slow rug':-3,
};
const POS = {
  moon:2, mooning:2.5, 'moonshot':2, pump:1.5, pumping:2, pumped:1.5, sending:2, sent:1.5,
  bullish:2.5, bull:1.5, gmi:2, wagmi:2, lfg:2, 'lets go':1.5, ath:2, breakout:2,
  accumulating:2, accumulate:1.5, buying:1.5, bought:1.5, aped:1.5, 'aping':1.5, loaded:1.5,
  holding:1, hodl:1.5, diamond:1.5, conviction:2, undervalued:1.5, gem:2, early:1.5,
  strong:1.5, solid:1.5, based:1.5, clean:1.5, legit:2, safe:1.5, locked:1.5, burned:1.5,
  green:1, up:1, gains:2, profit:2, winning:2, 'easy money':1.5, runner:2, 'sending it':2,
  volume:1, momentum:1.5, breaking:1.5, 'all time high':2.5, parabolic:2,
};
const NEGATORS = new Set(['not','no','never','isnt',"isn't",'aint',"ain't",'dont',"don't",'wont',"won't",'cant',"can't",'stop','without','barely','hardly']);
const INTENSIFY = { very:1.4, really:1.35, super:1.4, extremely:1.5, insanely:1.5, absolutely:1.4, so:1.2, massively:1.5, hugely:1.4 };
const DAMPEN = { slightly:0.6, kinda:0.6, kind:0.6, somewhat:0.6, maybe:0.6, might:0.6, probably:0.75, bit:0.6 };

const PHRASES = Object.keys({ ...NEG, ...POS }).filter((k) => k.includes(' '));

function tokenize(text) {
  let t = String(text || '').toLowerCase();
  t = t.replace(/https?:\/\/\S+/g, ' ');           // links carry no tone
  t = t.replace(/[\u{1F300}-\u{1FAFF}]/gu, (m) => ` ${m} `);
  for (const p of PHRASES) t = t.replace(new RegExp(p, 'g'), p.replace(/ /g, '_'));
  return t.split(/[^a-z0-9_'$]+/).filter(Boolean);
}

const EMOJI_POS = ['🚀','🌙','💎','🔥','📈','💰','🤑','🟢','✅'];
const EMOJI_NEG = ['📉','💀','🩸','🤡','😭','⚠️','🔴','❌','🐻'];

// Returns a score in [-1, 1] plus the terms that drove it, so any score can be explained.
function score(text) {
  const raw = String(text || '');
  const toks = tokenize(raw);
  let sum = 0, hits = [];
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i].replace(/_/g, ' ');
    let v = NEG[w] ?? POS[w] ?? 0;
    if (!v) continue;
    let mult = 1;
    for (let j = Math.max(0, i - 3); j < i; j++) {
      const p = toks[j];
      if (NEGATORS.has(p)) mult *= -0.8;          // negation flips and softens
      if (INTENSIFY[p]) mult *= INTENSIFY[p];
      if (DAMPEN[p]) mult *= DAMPEN[p];
    }
    sum += v * mult;
    hits.push({ term: w, value: +(v * mult).toFixed(2) });
  }
  for (const e of EMOJI_POS) if (raw.includes(e)) { sum += 0.8; hits.push({ term: e, value: 0.8 }); }
  for (const e of EMOJI_NEG) if (raw.includes(e)) { sum -= 1.0; hits.push({ term: e, value: -1.0 }); }
  if (/[A-Z]{4,}/.test(raw) && sum !== 0) sum *= 1.15;        // shouting amplifies whatever it is
  if (/\?\s*$/.test(raw.trim())) sum *= 0.7;                  // questions assert less

  const norm = Math.tanh(sum / 4);                            // squash to [-1,1], no hard clipping
  return {
    score: +norm.toFixed(3),
    magnitude: Math.abs(sum),
    hits: hits.slice(0, 8),
    // A post with no vocabulary hits is unscored, not neutral. Averaging in fabricated zeros
    // is how a sentiment index drifts toward meaningless.
    scored: hits.length > 0,
  };
}
module.exports = { score, NEG, POS };
