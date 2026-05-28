// Card visuals + deck logic for Bridge Probability Simulator
const SUITS = [
  { key: "S", name: "Spades", glyph: "♠", color: "black" },
  { key: "H", name: "Hearts", glyph: "♥", color: "red" },
  { key: "D", name: "Diamonds", glyph: "♦", color: "red" },
  { key: "C", name: "Clubs", glyph: "♣", color: "black" },
];

const RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
const RANK_NAMES = {
  A: "Ace", K: "King", Q: "Queen", J: "Jack",
  "10": "Ten", "9": "Nine", "8": "Eight", "7": "Seven",
  "6": "Six", "5": "Five", "4": "Four", "3": "Three", "2": "Two",
};

function cardKey(c) { return c.rank + c.suit; }
function suitMeta(s) { return SUITS.find((x) => x.key === s); }
function cardName(c) {
  const sm = suitMeta(c.suit);
  return RANK_NAMES[c.rank] + " of " + sm.name;
}

// Returns the "pip count" for center positioning
function PipLayout({ rank, glyph, isRed }) {
  // For A render single big center pip. For 2-10 render proper pip grid.
  // For face cards render large glyph w/ rank letter overlay.
  const color = isRed ? "var(--red)" : "var(--ink)";
  const isFace = rank === "J" || rank === "Q" || rank === "K";
  if (isFace) {
    return (
      <div className="card-center" style={{ color, position: "relative", flexDirection: "column", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 72, fontFamily: "Sora, sans-serif", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em" }}>{rank}</div>
        <div style={{ fontSize: 32, marginTop: 4 }}>{glyph}</div>
      </div>
    );
  }
  if (rank === "A") {
    return (
      <div className="card-center" style={{ color }}>
        <span style={{ fontSize: 92 }}>{glyph}</span>
      </div>
    );
  }
  // Pip grid
  const count = parseInt(rank, 10);
  // Use a 3-column 5-row grid; place pips in canonical positions
  const positions = {
    2: [[1,0],[1,4]],
    3: [[1,0],[1,2],[1,4]],
    4: [[0,0],[2,0],[0,4],[2,4]],
    5: [[0,0],[2,0],[1,2],[0,4],[2,4]],
    6: [[0,0],[2,0],[0,2],[2,2],[0,4],[2,4]],
    7: [[0,0],[2,0],[1,1],[0,2],[2,2],[0,4],[2,4]],
    8: [[0,0],[2,0],[1,1],[0,2],[2,2],[1,3],[0,4],[2,4]],
    9: [[0,0],[2,0],[0,1.5],[2,1.5],[1,2],[0,2.5],[2,2.5],[0,4],[2,4]],
    10: [[0,0],[2,0],[1,0.7],[0,1.5],[2,1.5],[0,2.5],[2,2.5],[1,3.3],[0,4],[2,4]],
  };
  const pips = positions[count] || [];
  return (
    <div className="card-center" style={{ color, position: "relative", width: "100%", height: "100%" }}>
      <svg viewBox="0 0 60 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        {pips.map(([cx, cy], i) => {
          const flip = cy > 2; // invert glyph for bottom half (traditional)
          const px = 10 + cx * 20;
          const py = 14 + cy * 18;
          return (
            <text
              key={i}
              x={px} y={py}
              fontSize="22"
              fill={color}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={flip ? `rotate(180 ${px} ${py})` : undefined}
              style={{ fontFamily: "sans-serif" }}
            >{glyph}</text>
          );
        })}
      </svg>
    </div>
  );
}

function CardFace({ card, dealing }) {
  if (!card) {
    return (
      <div className="card-wrap">
        <div className="card-shadow"></div>
        <div className="card-inner">
          <div className="card-face" style={{
            background: "repeating-linear-gradient(45deg, #1e3a8a 0 8px, #1e40af 8px 16px), #1e3a8a",
          }}>
            <div style={{
              position: "absolute", inset: 10, borderRadius: 8,
              border: "2px solid rgba(255,255,255,0.22)",
              background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 50%), repeating-linear-gradient(-45deg, transparent 0 6px, rgba(255,255,255,0.06) 6px 7px)",
            }}></div>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 64,
              textShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}>♠</div>
          </div>
        </div>
      </div>
    );
  }
  const sm = suitMeta(card.suit);
  const isRed = sm.color === "red";
  return (
    <div className="card-wrap">
      <div className="card-shadow"></div>
      <div className={"card-inner" + (dealing ? " card-deal" : "")}>
        <div className={"card-face card-front" + (isRed ? " red" : "")}>
          <div className="corner corner-top">
            <div className="corner-rank">{card.rank}</div>
            <div className="corner-suit">{sm.glyph}</div>
          </div>
          <PipLayout rank={card.rank} glyph={sm.glyph} isRed={isRed} />
          <div className="corner corner-bot">
            <div className="corner-rank">{card.rank}</div>
            <div className="corner-suit">{sm.glyph}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Build a deck from filters and bias
function buildDeck({ decks, suits, ranks }) {
  const out = [];
  for (let d = 0; d < decks; d++) {
    for (const s of SUITS) {
      if (!suits[s.key]) continue;
      for (const r of RANKS) {
        if (!ranks[r]) continue;
        out.push({ rank: r, suit: s.key, deckId: d });
      }
    }
  }
  return out;
}

// Weighted draw: bias 0 = uniform, bias 1 = strongly favor higher ranks
// (and slightly favor spades; this gives the "weighted probability" knob meaning)
function weightOf(card, bias) {
  if (bias <= 0) return 1;
  const rankIdx = RANKS.indexOf(card.rank); // 0=A...12=2
  const rankWeight = 1 + bias * (12 - rankIdx) / 12 * 2.5; // higher ranks weighted up
  const suitWeight = card.suit === "S" ? (1 + bias * 0.4) : 1;
  return rankWeight * suitWeight;
}

function drawFrom(deck, bias) {
  if (deck.length === 0) return null;
  if (bias <= 0) return deck[Math.floor(Math.random() * deck.length)];
  const weights = deck.map((c) => weightOf(c, bias));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < deck.length; i++) {
    r -= weights[i];
    if (r <= 0) return deck[i];
  }
  return deck[deck.length - 1];
}

window.BridgeCards = {
  SUITS, RANKS, RANK_NAMES,
  cardKey, suitMeta, cardName,
  CardFace,
  buildDeck, drawFrom, weightOf,
};
