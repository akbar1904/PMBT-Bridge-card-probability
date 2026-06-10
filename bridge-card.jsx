// Card visuals + deck logic — complete rewrite with correct pip rendering
const SUITS = [
  { key: "S", name: "Spades",   glyph: "♠", color: "black" },
  { key: "H", name: "Hearts",   glyph: "♥", color: "red"   },
  { key: "D", name: "Diamonds", glyph: "♦", color: "red"   },
  { key: "C", name: "Clubs",    glyph: "♣", color: "black" },
];

const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
const RANK_NAMES = {
  A:"Ace", K:"King", Q:"Queen", J:"Jack",
  "10":"Ten","9":"Nine","8":"Eight","7":"Seven",
  "6":"Six","5":"Five","4":"Four","3":"Three","2":"Two",
};

function cardKey(c)  { return c.rank + c.suit; }
function suitMeta(s) { return SUITS.find((x) => x.key === s); }
function cardName(c) { return RANK_NAMES[c.rank] + " of " + suitMeta(c.suit).name; }

// ─── Standard pip positions [left%, top%] in the center area ─────────────────
// Canonical playing-card layout (ISO 7813 inspired)
const PIP_POSITIONS = {
  2:  [[50,18],[50,82]],
  3:  [[50,15],[50,50],[50,85]],
  4:  [[27,20],[73,20],[27,80],[73,80]],
  5:  [[27,20],[73,20],[50,50],[27,80],[73,80]],
  6:  [[27,18],[73,18],[27,50],[73,50],[27,82],[73,82]],
  7:  [[27,18],[73,18],[50,34],[27,50],[73,50],[27,82],[73,82]],
  8:  [[27,18],[73,18],[50,32],[27,50],[73,50],[50,68],[27,82],[73,82]],
  9:  [[27,14],[73,14],[27,37],[73,37],[50,50],[27,63],[73,63],[27,86],[73,86]],
  10: [[27,14],[73,14],[50,27],[27,40],[73,40],[27,60],[73,60],[50,73],[27,86],[73,86]],
};

function pipFontSize(n) {
  if (n <= 2) return 30;
  if (n <= 4) return 26;
  if (n <= 6) return 22;
  if (n <= 8) return 19;
  return 16;
}

// ─── Face-card crown / hat illustrations ─────────────────────────────────────
function KingCrown({ color }) {
  return (
    <svg width="64" height="38" viewBox="0 0 64 38" style={{ display:"block" }}>
      <polygon points="4,36 4,14 17,27 32,4 47,27 60,14 60,36" fill={color} />
      <rect x="2" y="32" width="60" height="6" rx="3" fill={color} />
      <circle cx="32" cy="5.5" r="4"   fill="#f59e0b" />
      <circle cx="17" cy="28"  r="2.5" fill="#f59e0b" />
      <circle cx="47" cy="28"  r="2.5" fill="#f59e0b" />
    </svg>
  );
}

function QueenCrown({ color }) {
  return (
    <svg width="64" height="38" viewBox="0 0 64 38" style={{ display:"block" }}>
      <path d="M4,36 L4,20 Q9,4 18,18 Q24,6 32,18 Q40,6 46,18 Q55,4 60,20 L60,36 Z" fill={color} />
      <rect x="2" y="32" width="60" height="6" rx="3" fill={color} />
      <circle cx="32" cy="15" r="3.5" fill="#f59e0b" />
      <circle cx="17" cy="19" r="2.5" fill="#f59e0b" />
      <circle cx="47" cy="19" r="2.5" fill="#f59e0b" />
    </svg>
  );
}

function JackHat({ color }) {
  return (
    <svg width="64" height="38" viewBox="0 0 64 38" style={{ display:"block" }}>
      <path d="M10,36 Q10,18 22,12 Q28,8 32,9 Q36,8 42,12 Q54,18 54,36 Z" fill={color} />
      <rect x="2" y="30" width="60" height="8" rx="4" fill={color} />
      {/* feather */}
      <path d="M48,12 Q58,5 60,0 Q55,7 51,14" stroke={color}   strokeWidth="3"   fill="none" strokeLinecap="round" />
      <path d="M49,12 Q59,4 61,0 Q56,6 52,14" stroke="#f59e0b" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

// ─── Face card body (J / Q / K) ───────────────────────────────────────────────
function FaceCardBody({ rank, glyph, isRed }) {
  const color = isRed ? "var(--red)" : "var(--ink)";
  const svgColor = isRed ? "#d4344a" : "#0f172a";
  const bg = isRed
    ? "linear-gradient(160deg, #fff8f8 0%, #ffe6e6 100%)"
    : "linear-gradient(160deg, #f2f5ff 0%, #e4eaff 100%)";
  const Crown = rank === "K" ? KingCrown : rank === "Q" ? QueenCrown : JackHat;

  return (
    <div style={{
      width:"100%", height:"100%",
      background: bg,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      gap: 4,
    }}>
      <Crown color={svgColor} />
      <div style={{
        fontSize: 50, fontWeight: 800,
        fontFamily: "Sora, sans-serif",
        color, lineHeight: 1,
        letterSpacing: "-0.05em",
      }}>{rank}</div>
      <div style={{ fontSize: 28, color, lineHeight: 1 }}>{glyph}</div>
    </div>
  );
}

// ─── Pip grid for number cards ────────────────────────────────────────────────
function PipGrid({ rank, glyph, isRed }) {
  const color = isRed ? "var(--red)" : "var(--ink)";

  // Ace: single large centered symbol
  if (rank === "A") {
    return (
      <div style={{
        width:"100%", height:"100%",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <span style={{
          fontSize: 80, color, lineHeight: 1, userSelect:"none",
          filter: "drop-shadow(0 2px 1px rgba(0,0,0,0.10))",
        }}>{glyph}</span>
      </div>
    );
  }

  const count = parseInt(rank, 10);
  const pips  = PIP_POSITIONS[count] || [];
  const size  = pipFontSize(count);

  return (
    <div style={{ position:"relative", width:"100%", height:"100%" }}>
      {pips.map(([lp, tp], i) => (
        <div key={i} style={{
          position:  "absolute",
          left:      `${lp}%`,
          top:       `${tp}%`,
          transform: `translate(-50%,-50%)${tp > 50 ? " rotate(180deg)" : ""}`,
          fontSize:  size,
          color,
          lineHeight: 1,
          userSelect: "none",
        }}>{glyph}</div>
      ))}
    </div>
  );
}

// ─── Unified card center dispatcher ─────────────────────────────────────────
function CardCenter({ card }) {
  const sm    = suitMeta(card.suit);
  const isRed = sm.color === "red";
  if (["K","Q","J"].includes(card.rank)) {
    return <FaceCardBody rank={card.rank} glyph={sm.glyph} isRed={isRed} />;
  }
  return <PipGrid rank={card.rank} glyph={sm.glyph} isRed={isRed} />;
}

// ─── Full card component ──────────────────────────────────────────────────────
function CardFace({ card, dealing }) {
  // Empty / placeholder → show card back
  if (!card) {
    return (
      <div className="card-wrap">
        <div className="card-shadow"></div>
        <div className="card-inner">
          <div className="card-face" style={{
            background: "repeating-linear-gradient(45deg,#1e3a8a 0 8px,#1e40af 8px 16px),#1e3a8a",
            position: "relative",
          }}>
            <div style={{
              position:"absolute", inset:10, borderRadius:8,
              border:"2px solid rgba(255,255,255,0.22)",
              background:"radial-gradient(circle at 30% 30%,rgba(255,255,255,0.08),transparent 50%),repeating-linear-gradient(-45deg,transparent 0 6px,rgba(255,255,255,0.06) 6px 7px)",
            }}></div>
            <div style={{
              position:"absolute", top:"50%", left:"50%",
              transform:"translate(-50%,-50%)",
              color:"rgba(255,255,255,0.88)",
              fontSize:68, textShadow:"0 2px 10px rgba(0,0,0,0.35)",
            }}>♠</div>
          </div>
        </div>
      </div>
    );
  }

  const sm    = suitMeta(card.suit);
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
          <CardCenter card={card} />
          <div className="corner corner-bot">
            <div className="corner-rank">{card.rank}</div>
            <div className="corner-suit">{sm.glyph}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Deck helpers ─────────────────────────────────────────────────────────────
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

function weightOf(card, bias) {
  if (bias <= 0) return 1;
  const rankIdx    = RANKS.indexOf(card.rank);
  const rankWeight = 1 + bias * ((12 - rankIdx) / 12) * 2.5;
  const suitWeight = card.suit === "S" ? (1 + bias * 0.4) : 1;
  return rankWeight * suitWeight;
}

function drawFrom(deck, bias) {
  if (deck.length === 0) return null;
  if (bias <= 0) return deck[Math.floor(Math.random() * deck.length)];
  const weights = deck.map((c) => weightOf(c, bias));
  const total   = weights.reduce((a, b) => a + b, 0);
  let   r       = Math.random() * total;
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
