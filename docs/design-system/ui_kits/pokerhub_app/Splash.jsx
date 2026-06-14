/* PokerHub UI kit — Splash screen (abertura do app)
   Lockup da marca sob a "lâmpada" (--tv-bg), naipes como loader discreto.
   Toque em qualquer lugar para pular. Respeita prefers-reduced-motion. */

const phSplashCss = `
  .ph-splash {
    position: absolute; inset: 0; z-index: 80;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: var(--tv-bg);
    cursor: pointer;
    opacity: 1; transition: opacity 0.45s var(--ease-out);
  }
  .ph-splash--leave { opacity: 0; pointer-events: none; }

  .ph-splash__lockup {
    display: flex; flex-direction: column; align-items: center; gap: 18px;
    transform: translateY(10px); /* compensa visualmente o loader no rodapé */
  }
  .ph-splash__mark {
    width: 76px; height: 76px; border-radius: 22px;
    background: linear-gradient(160deg, var(--gold-400), var(--gold-600));
    display: flex; align-items: center; justify-content: center;
    color: var(--primary-foreground); font-size: 40px; line-height: 1;
    box-shadow: var(--glow-gold);
    animation: ph-splash-in 0.5s var(--ease-out) both;
  }
  .ph-splash__word {
    font-family: var(--font-display); font-weight: 800;
    font-size: 30px; letter-spacing: -0.03em; color: var(--foreground);
    animation: ph-splash-in 0.5s var(--ease-out) 0.12s both;
  }
  .ph-splash__word .hub { color: var(--gold-400); }

  .ph-splash__suits {
    position: absolute; bottom: calc(36px + var(--safe-bottom, 0px));
    display: flex; gap: 16px;
    font-size: 15px; line-height: 1;
    animation: ph-splash-in 0.5s var(--ease-out) 0.3s both;
  }
  .ph-splash__suits span {
    color: var(--suit-dark); opacity: 0.25;
    animation: ph-splash-suit 1.3s ease-in-out infinite;
  }
  .ph-splash__suits span.red { color: var(--suit-red); }
  .ph-splash__suits span:nth-child(2) { animation-delay: 0.16s; }
  .ph-splash__suits span:nth-child(3) { animation-delay: 0.32s; }
  .ph-splash__suits span:nth-child(4) { animation-delay: 0.48s; }

  @keyframes ph-splash-in {
    from { opacity: 0; transform: translateY(10px) scale(0.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes ph-splash-suit {
    0%, 100% { opacity: 0.25; }
    30%      { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ph-splash__mark, .ph-splash__word, .ph-splash__suits, .ph-splash__suits span { animation: none; opacity: 1; }
    .ph-splash__suits span { opacity: 0.45; }
  }
`;

function PHSplash({ onDone }) {
  const [leaving, setLeaving] = React.useState(false);
  const leavingRef = React.useRef(false);

  const leave = React.useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    setTimeout(() => { if (onDone) onDone(); }, 460);
  }, [onDone]);

  React.useEffect(() => {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(leave, reduced ? 1100 : 2100);
    return () => clearTimeout(t);
  }, [leave]);

  return (
    <div className={'ph-splash' + (leaving ? ' ph-splash--leave' : '')} onClick={leave} role="presentation" aria-hidden="true">
      <style>{phSplashCss}</style>
      <div className="ph-splash__lockup">
        <div className="ph-splash__mark">♠</div>
        <div className="ph-splash__word">Poker<span className="hub">Hub</span></div>
      </div>
      <div className="ph-splash__suits">
        <span>♠</span><span className="red">♥</span><span className="red">♦</span><span>♣</span>
      </div>
    </div>
  );
}

window.PHSplash = PHSplash;
