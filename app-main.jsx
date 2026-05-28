// Main Bridge Probability Simulator app
const { useState, useEffect, useMemo, useRef, useCallback, Fragment } = React;
const {
  SUITS, RANKS, RANK_NAMES,
  cardKey, suitMeta, cardName,
  CardFace,
  buildDeck, drawFrom,
} = window.BridgeCards;
const { BarChart, ConvergenceChart, Heatmap, fmtPct } = window.BridgeCharts;
const {
  useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle,
  TweakRadio, TweakSelect, TweakColor,
} = window;

// --- Sound effect (synthesized, no asset needed) ---
function makeSound() {
  let ctx = null;
  return () => {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(620, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.16);
    } catch (e) {}
  };
}

// --- Icons (inline SVG) ---
const Icon = {
  Reset: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>,
  Save: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Chart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="10" width="4" height="11"/><rect x="10" y="4" width="4" height="17"/><rect x="17" y="14" width="4" height="7"/></svg>,
  SoundOn: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>,
  SoundOff: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>,
  Moon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Sun: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  Help: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Full: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 4 20 10 20"/><polyline points="20 10 20 4 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
  Empty: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="14" height="18" rx="2"/><rect x="7" y="1" width="14" height="18" rx="2"/></svg>,
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2563eb",
  "cardStyle": "classic",
  "soundOn": false,
  "autoLogLimit": 200
}/*EDITMODE-END*/;

// --- Top tabs ---
const TOP_TABS = [
  { key: "single",   label: "Single Card",    glyph: "🂡" },
  { key: "multiple", label: "Multiple Cards", glyph: "🂢" },
  { key: "deck",     label: "Deck",           glyph: "🂠" },
  { key: "poker",    label: "Poker Hand",     glyph: "♠" },
  { key: "stats",    label: "Statistics",     glyph: "Σ" },
];

const RESULT_TABS = ["Log", "Table", "Bar Chart", "Convergence", "Heatmap"];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // ---- Theme ----
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.body.classList.toggle("dark", dark);
  }, [dark]);

  // Apply accent override
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", t.accent);
  }, [t.accent]);

  // ---- Top tabs ----
  const [topTab, setTopTab] = useState("single");
  const [resultTab, setResultTab] = useState("Log");

  // ---- Settings ----
  const [decks, setDecks] = useState(1);
  const [suitFilter, setSuitFilter] = useState({ S: true, H: true, D: true, C: true });
  const [rankFilter, setRankFilter] = useState(() =>
    Object.fromEntries(RANKS.map((r) => [r, true]))
  );
  const [bias, setBias] = useState(0);
  const [handSize, setHandSize] = useState(5); // for multiple cards / poker

  // ---- State ----
  const [history, setHistory] = useState([]); // [{cards: [card], t: ts}]
  const [current, setCurrent] = useState(null); // last drawn card (single)
  const [dealing, setDealing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const playSound = useRef(makeSound()).current;

  // ---- Deck & validity ----
  const deck = useMemo(
    () => buildDeck({ decks, suits: suitFilter, ranks: rankFilter }),
    [decks, suitFilter, rankFilter]
  );
  const deckEmpty = deck.length === 0;

  // ---- Stats over history ----
  const stats = useMemo(() => {
    const counts = {};
    const suitCounts = { S: 0, H: 0, D: 0, C: 0 };
    const rankCounts = Object.fromEntries(RANKS.map((r) => [r, 0]));
    let total = 0;
    const flat = history.flatMap((h) => h.cards);
    for (const c of flat) {
      total++;
      counts[cardKey(c)] = (counts[cardKey(c)] || 0) + 1;
      suitCounts[c.suit]++;
      rankCounts[c.rank]++;
    }
    return { counts, suitCounts, rankCounts, total, flat };
  }, [history]);

  // ---- Target for convergence (probability of drawing an Ace by default) ----
  const [target, setTarget] = useState({ kind: "rank", value: "A" });
  const theoretical = useMemo(() => {
    if (deck.length === 0) return 0;
    let match = 0;
    for (const c of deck) {
      if (target.kind === "rank" && c.rank === target.value) match++;
      if (target.kind === "suit" && c.suit === target.value) match++;
      if (target.kind === "card" && c.rank === target.value.r && c.suit === target.value.s) match++;
    }
    return match / deck.length;
  }, [deck, target]);

  const convergence = useMemo(() => {
    let m = 0;
    return stats.flat.map((c, i) => {
      let hit = false;
      if (target.kind === "rank") hit = c.rank === target.value;
      if (target.kind === "suit") hit = c.suit === target.value;
      if (target.kind === "card") hit = c.rank === target.value.r && c.suit === target.value.s;
      if (hit) m++;
      return m / (i + 1);
    });
  }, [stats.flat, target]);

  const targetLabel = useMemo(() => {
    if (target.kind === "rank") return `${RANK_NAMES[target.value]}s`;
    if (target.kind === "suit") return suitMeta(target.value).name;
    return `${target.value.r}${suitMeta(target.value.s).glyph}`;
  }, [target]);

  // ---- Draw actions ----
  const doDraw = useCallback((n) => {
    if (deckEmpty || busy) return;
    const drawnGroups = [];
    if (topTab === "multiple" || topTab === "poker") {
      // Draw n hands of handSize cards (without replacement within a hand)
      for (let i = 0; i < n; i++) {
        const pool = deck.slice();
        const hand = [];
        for (let j = 0; j < handSize && pool.length; j++) {
          const idx = pool.findIndex((c, k) => c === drawFrom(pool, bias));
          // Find the index of the drawn card object; simpler: pick index directly
          const card = drawFrom(pool, bias);
          const cIdx = pool.indexOf(card);
          if (cIdx >= 0) pool.splice(cIdx, 1);
          hand.push(card);
        }
        drawnGroups.push({ cards: hand, t: Date.now() + i });
      }
    } else {
      for (let i = 0; i < n; i++) {
        const c = drawFrom(deck, bias);
        drawnGroups.push({ cards: [c], t: Date.now() + i });
      }
    }
    const last = drawnGroups[drawnGroups.length - 1];
    if (t.soundOn) playSound();
    // animation only for small n
    if (n <= 10) {
      setDealing(true);
      setCurrent(last.cards[0]);
      setTimeout(() => setDealing(false), 480);
    } else {
      setBusy(true);
      setCurrent(last.cards[0]);
      setTimeout(() => setBusy(false), 60);
    }
    setHistory((h) => [...h, ...drawnGroups]);
    if (n > 10) {
      setToast({ msg: `Drew ${n} ${n === 1 ? "card" : "cards"}`, t: Date.now() });
    }
  }, [deck, deckEmpty, busy, bias, topTab, handSize, t.soundOn, playSound]);

  // Auto-clear toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  const reset = () => {
    setHistory([]);
    setCurrent(null);
    setToast({ msg: "Simulation reset", t: Date.now() });
  };

  const saveResults = () => {
    const data = {
      meta: { topTab, decks, bias, suits: suitFilter, ranks: rankFilter, total: stats.total },
      stats: {
        suitCounts: stats.suitCounts,
        rankCounts: stats.rankCounts,
        cardCounts: stats.counts,
      },
      history: stats.flat.map((c) => ({ rank: c.rank, suit: c.suit })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bridge-simulation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ msg: "Results saved", t: Date.now() });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === " " || e.key === "1") { e.preventDefault(); doDraw(1); }
      if (e.key === "2") doDraw(10);
      if (e.key === "3") doDraw(100);
      if (e.key === "4") doDraw(1000);
      if (e.key === "r" || e.key === "R") reset();
      if (e.key === "?" ) setShowHelp(true);
      if (e.key === "Escape") setShowHelp(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doDraw]);

  // ---- Computed: special-hand probabilities (poker) ----
  const handStats = useMemo(() => {
    if (topTab !== "poker" && topTab !== "multiple") return null;
    let pair = 0, twoPair = 0, threeKind = 0, flush = 0, straight = 0, fullHouse = 0;
    for (const h of history) {
      const hand = h.cards;
      const r = {}; for (const c of hand) r[c.rank] = (r[c.rank] || 0) + 1;
      const s = {}; for (const c of hand) s[c.suit] = (s[c.suit] || 0) + 1;
      const counts = Object.values(r).sort((a,b)=>b-a);
      const hasPair = counts[0] >= 2;
      const hasTwoPair = counts[0] >= 2 && counts[1] >= 2;
      const has3 = counts[0] >= 3;
      const hasFlush = Object.values(s).some((x) => x >= 5);
      const idxs = hand.map((c) => RANKS.indexOf(c.rank)).sort((a,b)=>a-b);
      let hasStraight = false;
      if (hand.length >= 5) {
        const uniq = [...new Set(idxs)];
        for (let i = 0; i + 4 < uniq.length; i++) {
          if (uniq[i+4] - uniq[i] === 4) { hasStraight = true; break; }
        }
      }
      const isFullHouse = counts[0] >= 3 && counts[1] >= 2;
      if (hasPair) pair++;
      if (hasTwoPair) twoPair++;
      if (has3) threeKind++;
      if (hasFlush) flush++;
      if (hasStraight) straight++;
      if (isFullHouse) fullHouse++;
    }
    const n = history.length;
    return { n, pair, twoPair, threeKind, flush, straight, fullHouse };
  }, [history, topTab]);

  // ---- Render ----
  const isPokerLike = topTab === "multiple" || topTab === "poker";

  return (
    <div className="app">
      {/* HEADER */}
      <div className="header">
        <div className="brand">
          <div className="brand-mark">♠</div>
          <div>
            <span className="brand-title">Bridge</span>{" "}
            <span className="brand-accent">Probability Simulator</span>
          </div>
        </div>
        <div className="tabs">
          {TOP_TABS.map((tt) => (
            <button key={tt.key}
              className={"tab" + (topTab === tt.key ? " active" : "")}
              onClick={() => setTopTab(tt.key)}>
              <span className="tab-icon">{tt.glyph}</span>
              {tt.label}
            </button>
          ))}
        </div>
        <div className="util">
          <button className="util-btn" title="Reset (R)" onClick={reset}><Icon.Reset /></button>
          <button className="util-btn" title="Save results" onClick={saveResults}><Icon.Save /></button>
          <button className="util-btn" title="Bar chart" onClick={() => setResultTab("Bar Chart")}><Icon.Chart /></button>
          <button className="util-btn" title="Sound" onClick={() => setTweak("soundOn", !t.soundOn)}>
            {t.soundOn ? <Icon.SoundOn /> : <Icon.SoundOff />}
          </button>
          <button className="util-btn" title="Dark mode" onClick={() => setDark(!dark)}>
            {dark ? <Icon.Sun /> : <Icon.Moon />}
          </button>
          <button className="util-btn" title="Help (?)" onClick={() => setShowHelp(true)}><Icon.Help /></button>
          <button className="util-btn primary" title="Fullscreen" onClick={toggleFullscreen}><Icon.Full /></button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid">
        {/* ===== LEFT: STAGE + SETTINGS ===== */}
        <div>
          <div className="panel" style={{ overflow: "hidden", marginBottom: 18 }}>
            <div className="stage">
              {/* Multi-card display */}
              {isPokerLike && current ? (
                <MultiCardStrip history={history} handSize={handSize} dealing={dealing} />
              ) : (
                <CardFace card={current} dealing={dealing} />
              )}
              <div className="card-label">
                {current ? cardName(current) : "Awaiting first draw"}
                {isPokerLike && history.length > 0 ? (
                  <div className="card-label-sub" style={{ marginTop: 4 }}>
                    Hand #{history.length} · {history[history.length-1].cards.length} cards
                  </div>
                ) : (
                  <div className="card-label-sub" style={{ marginTop: 4 }}>
                    {deck.length} cards in deck · P(target) = {fmtPct(theoretical)}
                  </div>
                )}
              </div>
            </div>
            <div className="controls">
              <div className="draw-row">
                <button className="draw-btn primary" disabled={deckEmpty || busy} onClick={() => doDraw(1)}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
                  Draw 1
                </button>
                <button className="draw-btn" disabled={deckEmpty || busy} onClick={() => doDraw(10)}>×10</button>
                <button className="draw-btn" disabled={deckEmpty || busy} onClick={() => doDraw(100)}>×100</button>
                <button className="draw-btn" disabled={deckEmpty || busy} onClick={() => doDraw(1000)}>×1000</button>
              </div>
              <div className="trial-row">
                <span className="trial-tag">{stats.total} trial{stats.total === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="panel panel-pad settings">
            <div>
              <div className="setting-label">Number of decks</div>
              <div className="chip-row">
                {[1, 2, 4, 6].map((n) => (
                  <button key={n}
                    className={"chip" + (decks === n ? " on" : "")}
                    onClick={() => setDecks(n)}>
                    {n} {n === 1 ? "deck" : "decks"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="setting-label">Suit filter</div>
              <div className="chip-row">
                {SUITS.map((s) => {
                  const on = suitFilter[s.key];
                  const isRed = s.color === "red";
                  return (
                    <button key={s.key}
                      className={"chip" + (on ? (isRed ? " suit-on red" : " on") : "")}
                      onClick={() => setSuitFilter((f) => ({ ...f, [s.key]: !f[s.key] }))}>
                      <span className="chip-suit-glyph" style={{ color: isRed && !on ? "var(--red)" : undefined }}>{s.glyph}</span>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="setting-label">Rank filter</div>
              <div className="chip-row">
                {RANKS.map((r) => (
                  <button key={r}
                    className={"chip" + (rankFilter[r] ? " on" : "")}
                    style={{ minWidth: 36, justifyContent: "center" }}
                    onClick={() => setRankFilter((f) => ({ ...f, [r]: !f[r] }))}>
                    {r}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button className="chip" onClick={() => setRankFilter(Object.fromEntries(RANKS.map((r) => [r, true])))}>All</button>
                <button className="chip" onClick={() => setRankFilter(Object.fromEntries(RANKS.map((r) => [r, false])))}>None</button>
                <button className="chip" onClick={() => setRankFilter(Object.fromEntries(RANKS.map((r) => [r, ["A","K","Q","J"].includes(r)])))}>Faces+A</button>
              </div>
            </div>
            <div>
              <div className="setting-label">Probability bias</div>
              <div className="slider-row">
                <input type="range" className="slider"
                  min={0} max={1} step={0.01}
                  value={bias}
                  onChange={(e) => setBias(parseFloat(e.target.value))} />
                <span className="slider-value">{bias === 0 ? "fair" : bias.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, fontFamily: "JetBrains Mono, monospace" }}>
                fair shuffle ←→ favor high ranks
              </div>
            </div>
            {isPokerLike && (
              <div>
                <div className="setting-label">Hand size</div>
                <div className="slider-row">
                  <input type="range" className="slider"
                    min={2} max={13} step={1}
                    value={handSize}
                    onChange={(e) => setHandSize(parseInt(e.target.value))} />
                  <span className="slider-value">{handSize} cards</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT: RESULTS ===== */}
        <div className="panel">
          <div className="results-head">
            <div className="result-tabs">
              {RESULT_TABS.map((rt) => (
                <button key={rt}
                  className={"result-tab" + (resultTab === rt ? " active" : "")}
                  onClick={() => setResultTab(rt)}>
                  {rt}
                </button>
              ))}
            </div>
            <div className="result-meta">
              target: <b>{targetLabel}</b> · P = <b>{fmtPct(theoretical)}</b>
            </div>
          </div>
          <div className="results-body">
            <ResultsBody
              tab={resultTab}
              history={history}
              stats={stats}
              deck={deck}
              target={target}
              setTarget={setTarget}
              theoretical={theoretical}
              convergence={convergence}
              isPokerLike={isPokerLike}
              handStats={handStats}
              topTab={topTab}
              autoLogLimit={t.autoLogLimit}
            />
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="toast" key={toast.t}>
          <span className="toast-icon">✓</span>
          {toast.msg}
        </div>
      )}

      {/* HELP MODAL */}
      {showHelp && (
        <div className="modal-bg" onClick={() => setShowHelp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Bridge Probability Simulator</h3>
            <p>
              Draw cards from one or more 52-card decks and watch the empirical
              probability converge on the theoretical value. Configure the deck
              with the suit, rank, and bias controls on the left.
            </p>
            <p style={{ fontSize: 12.5 }}>
              <kbd>Space</kbd> or <kbd>1</kbd> draw 1 · <kbd>2</kbd> draw 10 · <kbd>3</kbd> draw 100 · <kbd>4</kbd> draw 1000 · <kbd>R</kbd> reset · <kbd>?</kbd> help
            </p>
            <button className="modal-close" onClick={() => setShowHelp(false)}>Got it</button>
          </div>
        </div>
      )}

      {/* TWEAKS PANEL */}
      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakColor label="Accent"
          value={t.accent}
          options={["#2563eb", "#0ea5e9", "#7c3aed", "#0d9488", "#d4344a"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakToggle label="Sound effects"
          value={t.soundOn}
          onChange={(v) => setTweak("soundOn", v)} />
        <TweakSection label="Behavior" />
        <TweakSlider label="Log cap" value={t.autoLogLimit}
          min={50} max={1000} step={50} unit=" rows"
          onChange={(v) => setTweak("autoLogLimit", v)} />
      </TweaksPanel>
    </div>
  );
}

// Multi-card row for "Multiple Cards" / "Poker Hand" modes — shows the most recent hand
function MultiCardStrip({ history, handSize, dealing }) {
  const last = history.length ? history[history.length-1].cards : [];
  if (!last.length) {
    return <CardFace card={null} />;
  }
  // Overlap fan
  const N = last.length;
  const cardW = 86;
  const overlap = Math.min(60, Math.max(28, cardW - 8 - N * 2));
  const totalW = cardW + overlap * (N - 1);
  return (
    <div style={{ position: "relative", width: totalW, height: 168 }}>
      {last.map((c, i) => {
        const sm = suitMeta(c.suit);
        const isRed = sm.color === "red";
        return (
          <div key={i} style={{
            position: "absolute",
            left: i * overlap,
            top: 0,
            width: cardW,
            height: 168,
            transform: `rotate(${(i - (N-1)/2) * 4}deg)`,
            transformOrigin: "bottom center",
            animation: dealing ? `deal 0.45s ${i * 60}ms cubic-bezier(0.2, 0.8, 0.3, 1.0) both` : undefined,
          }}>
            <div style={{
              width: "100%", height: "100%",
              background: "linear-gradient(180deg, #fff 0%, #f5f7fb 100%)",
              borderRadius: 10,
              boxShadow: "0 10px 24px rgba(15,23,42,0.18), 0 2px 4px rgba(15,23,42,0.08), inset 0 0 0 1px rgba(255,255,255,0.6)",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
              padding: "6px 8px",
              color: isRed ? "var(--red)" : "var(--ink)",
              fontFamily: "Sora, sans-serif",
              fontWeight: 700,
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                <div style={{ fontSize: 16, letterSpacing: "-0.02em" }}>{c.rank}</div>
                <div style={{ fontSize: 13 }}>{sm.glyph}</div>
              </div>
              <div style={{ display: "grid", placeItems: "center", fontSize: 38 }}>{sm.glyph}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1, transform: "rotate(180deg)" }}>
                <div style={{ fontSize: 16, letterSpacing: "-0.02em" }}>{c.rank}</div>
                <div style={{ fontSize: 13 }}>{sm.glyph}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== Results body =====
function ResultsBody({ tab, history, stats, deck, target, setTarget, theoretical, convergence, isPokerLike, handStats, topTab, autoLogLimit }) {
  if (history.length === 0 && tab !== "Heatmap") {
    return (
      <div className="log-empty">
        <Icon.Empty />
        <div>No draws yet. Press <b>Draw 1</b> to begin your simulation.</div>
      </div>
    );
  }

  if (tab === "Log") {
    const rows = stats.flat.slice(-autoLogLimit).reverse();
    return (
      <div className="log">
        {rows.map((c, i) => {
          const sm = suitMeta(c.suit);
          const idx = stats.flat.length - i;
          return (
            <div className="log-row" key={idx}>
              <span className="log-idx">#{idx}</span>
              <span className={"log-suit" + (sm.color === "red" ? " red" : "")}>{sm.glyph}</span>
              <span className="log-name">{cardName(c)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (tab === "Table") {
    // Per-rank table
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 8 }}>By rank</div>
            <table className="dt">
              <thead><tr><th>Rank</th><th>Count</th><th>Actual</th><th>Theory</th><th>Δ</th></tr></thead>
              <tbody>
                {RANKS.map((r) => {
                  const c = stats.rankCounts[r] || 0;
                  const a = stats.total ? c / stats.total : 0;
                  const ranksInDeck = new Set(deck.map((d) => d.rank));
                  const th = ranksInDeck.has(r) ? 1 / ranksInDeck.size : 0;
                  const delta = a - th;
                  return (
                    <tr key={r}>
                      <td style={{ color: "var(--ink)", fontWeight: 700 }}>{r}</td>
                      <td>{c}</td>
                      <td>{fmtPct(a)}</td>
                      <td>{fmtPct(th)}</td>
                      <td className={delta >= 0 ? "pos" : "neg"}>{(delta >= 0 ? "+" : "") + (delta * 100).toFixed(2) + "%"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 8 }}>By suit</div>
            <table className="dt">
              <thead><tr><th>Suit</th><th>Count</th><th>Actual</th><th>Theory</th><th>Δ</th></tr></thead>
              <tbody>
                {SUITS.map((s) => {
                  const c = stats.suitCounts[s.key] || 0;
                  const a = stats.total ? c / stats.total : 0;
                  const suitsInDeck = new Set(deck.map((d) => d.suit));
                  const th = suitsInDeck.has(s.key) ? 1 / suitsInDeck.size : 0;
                  const delta = a - th;
                  return (
                    <tr key={s.key}>
                      <td style={{ color: "var(--ink)", fontWeight: 700 }}>
                        <span className={"dt-suit" + (s.color === "red" ? " red" : "")}>{s.glyph}</span>{" "}
                        {s.name}
                      </td>
                      <td>{c}</td>
                      <td>{fmtPct(a)}</td>
                      <td>{fmtPct(th)}</td>
                      <td className={delta >= 0 ? "pos" : "neg"}>{(delta >= 0 ? "+" : "") + (delta * 100).toFixed(2) + "%"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 8 }}>
            Probability highlights
          </div>
          <div className="stat-grid">
            <StatCard label="Total draws" val={stats.total} sub={`${Object.keys(stats.counts).length} unique cards seen`} />
            <StatCard label="P(Ace)" val={fmtPct(stats.total ? stats.rankCounts["A"]/stats.total : 0)} sub={`theory: ${fmtPct(deck.length ? deck.filter(d=>d.rank==="A").length/deck.length : 0)}`} />
            <StatCard label="P(♠ or ♣)" val={fmtPct(stats.total ? (stats.suitCounts.S + stats.suitCounts.C)/stats.total : 0)} sub="theory: 50%" />
            <StatCard label="P(face card)" val={fmtPct(stats.total ? (stats.rankCounts.J + stats.rankCounts.Q + stats.rankCounts.K)/stats.total : 0)} sub="theory: 23.08%" />
          </div>
          {isPokerLike && handStats && handStats.n > 0 && (
            <>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 8, marginTop: 8 }}>
                Hand frequencies ({handStats.n} hands)
              </div>
              <div className="stat-grid">
                <StatCard label="Pair" val={fmtPct(handStats.pair / handStats.n)} sub={`${handStats.pair} / ${handStats.n}`} />
                <StatCard label="Two pair" val={fmtPct(handStats.twoPair / handStats.n)} sub={`${handStats.twoPair} / ${handStats.n}`} />
                <StatCard label="Three of a kind" val={fmtPct(handStats.threeKind / handStats.n)} sub={`${handStats.threeKind} / ${handStats.n}`} />
                <StatCard label="Full house" val={fmtPct(handStats.fullHouse / handStats.n)} sub={`${handStats.fullHouse} / ${handStats.n}`} />
                <StatCard label="Straight" val={fmtPct(handStats.straight / handStats.n)} sub={`${handStats.straight} / ${handStats.n}`} />
                <StatCard label="Flush" val={fmtPct(handStats.flush / handStats.n)} sub={`${handStats.flush} / ${handStats.n}`} />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (tab === "Bar Chart") {
    const ranksInDeck = new Set(deck.map((d) => d.rank));
    const suitsInDeck = new Set(deck.map((d) => d.suit));
    const rankData = RANKS.filter((r) => ranksInDeck.has(r)).map((r) => ({
      label: r,
      actual: stats.total ? (stats.rankCounts[r] || 0) / stats.total : 0,
      theoretical: 1 / ranksInDeck.size,
      color: "var(--accent)",
    }));
    const suitData = SUITS.filter((s) => suitsInDeck.has(s.key)).map((s) => ({
      label: s.glyph,
      actual: stats.total ? stats.suitCounts[s.key] / stats.total : 0,
      theoretical: 1 / suitsInDeck.size,
      color: s.color === "red" ? "var(--red)" : "var(--accent)",
    }));
    return (
      <div>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 6 }}>
            Rank distribution
          </div>
          <BarChart data={rankData} mode="rank" />
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 6 }}>
            Suit distribution
          </div>
          <BarChart data={suitData} mode="suit" />
        </div>
      </div>
    );
  }

  if (tab === "Convergence") {
    return (
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-2)", alignSelf: "center", marginRight: 4 }}>target</span>
          {RANKS.map((r) => (
            <button key={"r"+r}
              className={"chip" + (target.kind === "rank" && target.value === r ? " on" : "")}
              onClick={() => setTarget({ kind: "rank", value: r })}>{r}</button>
          ))}
          {SUITS.map((s) => (
            <button key={"s"+s.key}
              className={"chip" + (target.kind === "suit" && target.value === s.key ? (s.color === "red" ? " suit-on red" : " on") : "")}
              onClick={() => setTarget({ kind: "suit", value: s.key })}>
              <span className="chip-suit-glyph" style={{ color: s.color === "red" ? "var(--red)" : undefined }}>{s.glyph}</span>
            </button>
          ))}
        </div>
        <ConvergenceChart series={convergence} target={targetText(target)} theoretical={theoretical} />
      </div>
    );
  }

  if (tab === "Heatmap") {
    return (
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-2)", marginBottom: 8 }}>
          Card hit count · 13 ranks × 4 suits
        </div>
        <Heatmap counts={stats.counts} total={stats.total} />
        <div style={{ marginTop: 14, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
          Hover any cell for hit count and probability. Empty cells mean the card hasn't been drawn yet (or is filtered out of the deck).
        </div>
      </div>
    );
  }

  return null;
}

function targetText(target) {
  if (target.kind === "rank") return target.value;
  if (target.kind === "suit") return suitMeta(target.value).glyph;
  return `${target.value.r}${suitMeta(target.value.s).glyph}`;
}

function StatCard({ label, val, sub }) {
  return (
    <div className="stat">
      <div className="stat-key">{label}</div>
      <div className="stat-val">{val}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ===== Mount =====
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
