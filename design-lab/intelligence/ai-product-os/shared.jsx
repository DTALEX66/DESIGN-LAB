// ── Prototyping Kit — design tokens + shared primitives ─────────────────
const isFigma = typeof window !== 'undefined' && window.isFigma;

const T = {
  // Brand / Accents (Indigo focus)
  brand: '#6366f1',
  brand2: '#818cf8',
  brand3: '#c7d2fe',
  
  // Backgrounds
  bg: '#FFFFFF',
  bg2: '#F9FAFB',
  card: '#FFFFFF',
  fill3: 'rgba(0,0,0,0.03)',
  
  // Borders
  warmBorder: 'rgba(0,0,0,0.08)',
  cardStroke: 'rgba(0,0,0,0.06)',
  inputStroke: '#e5e7eb',
  sep: 'rgba(0,0,0,0.06)',
  sepN: 'rgba(0,0,0,0.08)',

  // Gradients
  accentGrad: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
  
  // Typography Colors
  label: '#111827',
  label2: '#4b5563',
  label3: '#9ca3af',
  
  // Semantic tints
  green: '#10b981',
  greenTint: '#ecfdf5',
  amberText: '#d97706',
  amberTint: '#fffbeb',
  red: '#ef4444',
  redTint: '#fef2f2',
  
  // Typography families
  font: "'Geist', -apple-system, system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
  
  // Premium shadows (indigo-tinted soft shadows)
  xs: isFigma ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: isFigma ? 'none' : '0 2px 8px rgba(99,102,241,0.04), 0 1px 2px rgba(0,0,0,0.03)',
  md: isFigma ? 'none' : '0 4px 20px rgba(99,102,241,0.08), 0 2px 6px rgba(0,0,0,0.04)',
  lg: isFigma ? 'none' : '0 10px 30px rgba(99,102,241,0.12), 0 4px 12px rgba(0,0,0,0.06)',
};

const SAFE_TOP = 12;
const NAV_H = 84;

// App navigation / overlay context
const AppCtx = React.createContext(null);
const useApp = () => React.useContext(AppCtx);

// Custom Phosphor/Lucide-style Inline SVG helper component
function Ph({ n, size = 20, color = 'currentColor', style }) {
  // Basic path mappings for prototype icons
  const paths = {
    'arrow-left': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
    'arrow-up-right': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />,
    'chevron-right': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />,
    'magnifying-glass': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    'bell': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    'user': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    'home': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    'settings': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke={color} style={{ width: size, height: size, display: 'block', ...style }}>
      {paths[n] || <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />}
    </svg>
  );
}

// Common Top Bar Component
function TopBar({ title, onBack, right, center = false, shadow = false }) {
  return (
    <div style={{
      paddingTop: SAFE_TOP, paddingLeft: 16, paddingRight: 16, paddingBottom: 12,
      flexShrink: 0, background: T.bg, borderBottom: `1px solid ${T.sep}`,
      boxShadow: shadow ? T.sm : 'none',
      transition: 'box-shadow 0.18s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36 }}>
        {onBack && (
          <button className="press-sm" onClick={onBack} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ph n="arrow-left" size={20} color={T.brand} />
          </button>
        )}
        <div style={{
          flex: 1,
          fontSize: 16,
          fontWeight: 600,
          color: T.label,
          textAlign: center ? 'center' : 'left',
          paddingRight: center && onBack ? 36 : 0,
        }}>{title}</div>
        {right && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{right}</div>}
      </div>
    </div>
  );
}

// Core Buttons
function PrimaryBtn({ children, onClick, disabled, style }) {
  return (
    <button className="press" onClick={onClick} disabled={disabled} style={{
      width: '100%', height: 50, borderRadius: 25,
      background: disabled ? T.bg2 : T.accentGrad, color: disabled ? T.label3 : '#FFFFFF',
      fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, boxShadow: disabled ? 'none' : T.xs, ...style,
    }}>{children}</button>
  );
}

function OutlineBtn({ children, onClick, style }) {
  return (
    <button className="press" onClick={onClick} style={{
      width: '100%', height: 48, borderRadius: 24, background: 'transparent',
      color: T.brand, border: `1.5px solid ${T.brand}`, fontWeight: 600, fontSize: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...style,
    }}>{children}</button>
  );
}

// Card Wrapper
function Card({ children, onClick, style, pad = 16 }) {
  return (
    <div className={onClick ? 'press' : ''} onClick={onClick} style={{
      background: T.card, border: `1px solid ${T.cardStroke}`, boxShadow: T.xs, borderRadius: 16, padding: pad, ...style,
    }}>{children}</div>
  );
}

// Hook for scroll-sensitive shadows on headers
function useStickyHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const onScroll = React.useCallback(e => setScrolled(e.currentTarget.scrollTop > 4), []);
  return { scrolled, onScroll };
}

Object.assign(window, {
  T, SAFE_TOP, NAV_H, AppCtx, useApp, Ph, TopBar, PrimaryBtn, OutlineBtn, Card, useStickyHeader,
});
