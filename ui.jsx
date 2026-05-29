const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* Lucide-style 1.75 stroke icons. 24×24 unless size overridden. */
function Icon({ name, size = 24, stroke = 1.75, className = '', style = {} }) {
  const s = { width: size, height: size, ...style };
  const common = {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
    width: size, height: size, className, style: s,
  };
  switch (name) {
    case 'search':       return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'arrow-left':   return <svg {...common}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>;
    case 'arrow-right':  return <svg {...common}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
    case 'home':         return <svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg>;
    case 'wallet':       return <svg {...common}><path d="M3 7v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9H5a2 2 0 0 1-2-2Z"/><path d="M3 7a2 2 0 0 1 2-2h11v4"/><circle cx="17" cy="14" r="1.2" fill="currentColor" stroke="none"/></svg>;
    case 'sparkles':     return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>;
    case 'settings':     return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>;
    case 'backspace':    return <svg {...common}><path d="M21 5H8L3 12l5 7h13a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z"/><path d="m12 9 6 6M18 9l-6 6"/></svg>;
    case 'check':        return <svg {...common}><path d="M5 12.5 10 17 20 7"/></svg>;
    case 'check-circle': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>;
    case 'plus':         return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'x':            return <svg {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>;
    case 'chevron-right':return <svg {...common}><path d="m9 6 6 6-6 6"/></svg>;
    case 'chevron-down': return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>;
    case 'sun':          return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case 'moon':         return <svg {...common}><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z"/></svg>;
    case 'coffee':       return <svg {...common}><path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M7 4v2M11 4v2"/></svg>;
    case 'store':        return <svg {...common}><path d="M3 9 5 4h14l2 5"/><path d="M3 9v11h18V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>;
    case 'utensils':     return <svg {...common}><path d="M7 3v8a2 2 0 0 0 4 0V3"/><path d="M9 11v10"/><path d="M17 3c-1.5 0-3 1.5-3 4v5h3v9"/></svg>;
    case 'shopping-cart':return <svg {...common}><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 4h2l2.7 12.4a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.7L21 8H6"/></svg>;
    case 'film':         return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>;
    case 'bus':          return <svg {...common}><rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16M8 17v2M16 17v2"/><circle cx="8.5" cy="14.5" r=".8" fill="currentColor" stroke="none"/><circle cx="15.5" cy="14.5" r=".8" fill="currentColor" stroke="none"/></svg>;
    case 'tag':          return <svg {...common}><path d="M12 3H5a2 2 0 0 0-2 2v7l9 9 9-9-9-9Z"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/></svg>;
    case 'truck':        return <svg {...common}><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 5v4h-7V8Z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
    case 'globe':        return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M2 12h20"/><path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>;
    case 'fuel':         return <svg {...common}><path d="M3 22V7l6-4 6 4v15"/><path d="M3 11h12"/><path d="M9 22v-5h4v5"/><path d="M15 7h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M19 14v4"/></svg>;
    case 'bell':         return <svg {...common}><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>;
    case 'lock':         return <svg {...common}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></svg>;
    case 'help':         return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none"/></svg>;
    case 'trash':        return <svg {...common}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/></svg>;
    case 'sliders':      return <svg {...common}><path d="M3 6h13M3 12h7M3 18h11"/><circle cx="19" cy="6" r="2"/><circle cx="14" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
    case 'trending-up':  return <svg {...common}><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>;
    case 'flame':        return <svg {...common}><path d="M12 3c1 4 5 5 5 10a5 5 0 1 1-10 0c0-2 1-3 2-4-1 3 1 4 2 4-1-3 0-7 1-10Z"/></svg>;
    case 'card':         return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>;
    case 'log-out':      return <svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
    case 'user':         return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M3 20c0-4.4 4-8 9-8s9 3.6 9 8"/></svg>;
    case 'chevron-left': return <svg {...common}><path d="m15 18-6-6 6-6"/></svg>;
    default:             return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

/* ─── 카드 네트워크 로고 ─────────────────────────────────────────────────── */
function NetworkLogo({ network, size }) {
  const lg = size === 'lg';
  const pos = {
    position: 'absolute',
    bottom: lg ? 7 : 4,
    right: lg ? 8 : 5,
  };
  if (network === 'visa') return (
    <span style={{
      ...pos,
      fontFamily: '"Times New Roman", Georgia, serif',
      fontStyle: 'italic',
      fontSize: lg ? 11 : 8,
      fontWeight: 900,
      color: 'rgba(255,255,255,.88)',
      letterSpacing: '.02em',
      textShadow: '0 1px 3px rgba(0,0,0,.45)',
    }}>VISA</span>
  );
  if (network === 'master') return (
    <div style={pos}>
      <svg width={lg ? 22 : 15} height={lg ? 14 : 9} viewBox="0 0 22 14">
        <circle cx="8"  cy="7" r="7" fill="#EB001B" opacity=".92"/>
        <circle cx="14" cy="7" r="7" fill="#F79E1B" opacity=".92"/>
        <path d="M11 1.5a7 7 0 0 1 0 11A7 7 0 0 1 11 1.5z" fill="#FF5F00" opacity=".85"/>
      </svg>
    </div>
  );
  if (network === 'amex') return (
    <span style={{
      ...pos,
      fontSize: lg ? 7 : 5,
      fontWeight: 800,
      color: 'rgba(255,255,255,.82)',
      letterSpacing: '.08em',
      textShadow: '0 1px 2px rgba(0,0,0,.35)',
    }}>AMEX</span>
  );
  if (network === 'bc') return (
    <span style={{
      ...pos,
      fontSize: lg ? 8 : 6,
      fontWeight: 800,
      color: 'rgba(255,255,255,.82)',
      letterSpacing: '.04em',
      textShadow: '0 1px 2px rgba(0,0,0,.35)',
    }}>BC</span>
  );
  return null;
}

/* ─── 카드 아트 (EMV 칩 + 네트워크 로고) ────────────────────────────────── */
function CardArt({ brand, short, network = 'visa', size = 'md', className = '' }) {
  const d = {
    sm: { w: 44,  h: 28,  fs: 9,  chipW: 0,  chipH: 0  },
    md: { w: 64,  h: 40,  fs: 11, chipW: 14, chipH: 10 },
    lg: { w: 96,  h: 60,  fs: 13, chipW: 20, chipH: 14 },
  }[size] || { w: 64, h: 40, fs: 11, chipW: 14, chipH: 10 };

  return (
    <div
      className={`card-art card-${brand} ${className}`}
      style={{ width: d.w, height: d.h, display: 'block' }}
    >
      {/* EMV 칩 */}
      {size !== 'sm' && (
        <div style={{
          position: 'absolute',
          top: size === 'lg' ? 10 : 6,
          left: size === 'lg' ? 10 : 7,
          width: d.chipW, height: d.chipH,
          borderRadius: size === 'lg' ? 3 : 2,
          background: 'linear-gradient(135deg,#cba84a 0%,#f0d060 40%,#d4af37 65%,#b8900a 100%)',
          border: '0.5px solid rgba(0,0,0,.22)',
          boxShadow: '0 1px 2px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.3)',
        }}>
          {/* 칩 내부 선 */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '1px 2px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ height: 1, background: 'rgba(0,0,0,.18)', borderRadius: 1 }} />
            ))}
          </div>
        </div>
      )}
      {/* 발급사 약칭 — 좌하단 */}
      <span style={{
        position: 'absolute',
        bottom: size === 'lg' ? 8 : 5,
        left: size === 'lg' ? 10 : 7,
        fontSize: d.fs,
        fontWeight: 800,
        opacity: 0.95,
        textShadow: '0 1px 3px rgba(0,0,0,.4)',
        letterSpacing: '-.02em',
        lineHeight: 1,
      }}>{short}</span>
      {/* 네트워크 로고 — 우하단 */}
      {size !== 'sm' && <NetworkLogo network={network} size={size} />}
    </div>
  );
}

function formatKRW(n) {
  if (n == null || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ko-KR');
}

function CountUp({ to, duration = 600, className = '', suffix = '' }) {
  const [v, setV] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span className={`tnum ${className}`}>{formatKRW(v)}{suffix}</span>;
}

function Progress({ value, max, tone }) {
  const ratio = Math.max(0, Math.min(1, value / max));
  const auto = ratio >= .9 ? 'danger' : ratio >= .7 ? 'accent' : 'success';
  const t = tone || auto;
  const color = t === 'danger' ? 'var(--danger)' : t === 'accent' ? 'var(--accent)' : 'var(--success)';
  return (
    <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
      <div
        className="progress-fill"
        style={{ height: '100%', background: color, borderRadius: 999, width: '100%', '--p': ratio }}
      />
    </div>
  );
}

function Pill({ children, tone = 'neutral', className = '' }) {
  const map = {
    neutral: { bg: 'var(--surface-2)', fg: 'var(--ink-2)' },
    accent:  { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
    success: { bg: 'var(--success-soft)', fg: 'var(--success)' },
    danger:  { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
    ink:     { bg: 'var(--ink)', fg: 'var(--bg)' },
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      style={{ background: map.bg, color: map.fg, height: 24, padding: '0 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}
    >{children}</span>
  );
}

function Sheet({ open, onClose, title, children, height = '78%' }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50">
      <div
        className="absolute inset-0 overlay-in"
        onClick={onClose}
        style={{ background: 'rgba(0,0,0,.42)' }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 sheet-in shadow-sheet"
        style={{ height, background: 'var(--surface)', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
      >
        <div className="flex justify-center pt-3"><div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--line)' }} /></div>
        {title && (
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="t-h2 text-ink">{title}</h2>
            <button className="press text-ink-2" onClick={onClose} style={{ padding: 6 }}><Icon name="x" size={22} /></button>
          </div>
        )}
        <div className="overflow-y-auto no-scrollbar" style={{ height: 'calc(100% - 64px)' }}>{children}</div>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, icon }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className="press w-full flex items-center justify-center gap-2"
      style={{
        height: 56, borderRadius: 16,
        background: disabled ? 'var(--surface-2)' : 'var(--ink)',
        color: disabled ? 'var(--ink-3)' : 'var(--bg)',
        fontWeight: 700, fontSize: 16, letterSpacing: '-.01em',
        transition: 'background 200ms ease, color 200ms ease',
      }}
    >
      {children}
      {icon && <Icon name={icon} size={18} stroke={2.2} />}
    </button>
  );
}

Object.assign(window, { Icon, CardArt, NetworkLogo, formatKRW, CountUp, Progress, Pill, Sheet, PrimaryButton });
