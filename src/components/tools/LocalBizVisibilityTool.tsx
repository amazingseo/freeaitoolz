import { useState, useEffect, useRef } from 'react';

// ─── Design tokens (exact match to freeaitoolz.com / SeoAuditTool) ──────────
const T = {
  blue: '#2563eb',
  blueLight: '#eff6ff',
  blueMid: '#dbeafe',
  violet: '#7c3aed',
  violetLight: '#f5f3ff',
  emerald: '#10b981',
  emeraldLight: '#ecfdf5',
  emeraldMid: '#d1fae5',
  gray950: '#030712',
  gray900: '#111827',
  gray800: '#1f2937',
  gray700: '#374151',
  gray600: '#4b5563',
  gray500: '#6b7280',
  gray400: '#9ca3af',
  gray300: '#d1d5db',
  gray200: '#e5e7eb',
  gray100: '#f3f4f6',
  gray50: '#f9fafb',
  white: '#ffffff',
  red: '#dc2626',
  redLight: '#fef2f2',
  redMid: '#fee2e2',
  amber: '#d97706',
  amberLight: '#fffbeb',
  amberMid: '#fef9c3',
  green: '#16a34a',
  greenLight: '#f0fdf4',
  greenMid: '#dcfce7',
};

const ENGINE_COLOR: Record<string, string> = {
  chatgpt: '#10a37f',
  perplexity: '#20b2aa',
  google: '#4285f4',
  claude: '#d97706',
};

const ENGINE_ICON: Record<string, string> = {
  chatgpt: '🔎',
  perplexity: '🔷',
  google: '🌐',
  claude: '✨',
};

const CATEGORIES = [
  'HVAC & Heating', 'Plumbing', 'Electrical', 'Roofing',
  'Landscaping & Lawn Care', 'General Contractor', 'Home Cleaning Service',
  'Pest Control', 'Painting', 'Flooring', 'Windows & Doors',
  'Pool & Spa Service', 'Solar Installation', 'Real Estate Agency',
  'Property Management', 'Mortgage Broker', 'Home Inspection',
  'Restaurant', 'Bakery & Cafe', 'Catering', 'Dental Office',
  'Medical Clinic / Doctor', 'Chiropractor', 'Physical Therapy',
  'Veterinary Clinic', 'Auto Repair', 'Auto Dealership', 'Car Detailing',
  'Law Firm', 'Accounting & Tax', 'Insurance Agency', 'Financial Advisor',
  'Gym & Fitness', 'Beauty Salon', 'Spa & Massage', 'Barbershop',
  'Daycare & Childcare', 'Tutoring & Education', 'IT Support & Tech',
  'Marketing Agency', 'Photography', 'Event Planning',
  'Moving Company', 'Storage Facility', 'Retail Store', 'Other',
];

type LocationSuggestion = { display: string; city: string; state: string };

type Result = {
  engine: string;
  engineKey: string;
  prompt: string;
  response: string;
  mentioned: boolean;
  type: string;
};

type Rec = {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
};

type ApiData = {
  businessName: string;
  location: string;
  category: string;
  website: string | null;
  results: Result[];
  mentionCount: number;
  score: number;
  visibility: string;
  recommendations: Rec[];
};

// ─── Visibility helpers ──────────────────────────────────────────────────────
const visColor = (v: string) =>
  v === 'well-known' ? T.green : v === 'visible' ? T.blue : v === 'emerging' ? T.amber : T.red;
const visBg = (v: string) =>
  v === 'well-known' ? T.greenLight : v === 'visible' ? T.blueLight : v === 'emerging' ? T.amberLight : T.redLight;
const visBorder = (v: string) =>
  v === 'well-known' ? T.greenMid : v === 'visible' ? T.blueMid : v === 'emerging' ? T.amberMid : T.redMid;
const visLabel = (v: string) =>
  v === 'well-known' ? 'Well Known' : v === 'visible' ? 'Visible' : v === 'emerging' ? 'Emerging' : 'Not Visible';
const priorityColor = (p: string) =>
  p === 'high' ? T.red : p === 'medium' ? T.amber : T.gray500;
const priorityBg = (p: string) =>
  p === 'high' ? T.redMid : p === 'medium' ? T.amberMid : T.gray100;

// ─── Score Ring (matches SeoAuditTool exactly) ───────────────────────────────
function ScoreRing({ score, label, animate }: { score: number; label: string; animate: boolean }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (!animate) { setDisplayed(score); return; }
    let cur = 0;
    const step = () => {
      cur += 2;
      if (cur >= score) { setDisplayed(score); return; }
      setDisplayed(cur);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [score, animate]);

  const r = 38, circ = 2 * Math.PI * r;
  const dash = circ * (1 - score / 100);
  const color = score >= 80 ? T.green : score >= 55 ? T.blue : score >= 25 ? T.amber : T.red;
  const bg    = score >= 80 ? T.greenLight : score >= 55 ? T.blueLight : score >= 25 ? T.amberLight : T.redLight;
  const bord  = score >= 80 ? T.greenMid  : score >= 55 ? T.blueMid   : score >= 25 ? T.amberMid   : T.redMid;
  const lbl   = score >= 80 ? 'Well Known' : score >= 55 ? 'Visible' : score >= 25 ? 'Emerging' : 'Not Visible';

  return (
    <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: '16px', padding: '1.25rem 0.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${color}60, ${color})`, borderRadius: '16px 16px 0 0' }} />
      <svg width="96" height="96" style={{ display: 'block', margin: '0 auto' }}>
        <circle cx="48" cy="48" r={r} fill="none" stroke={`${color}20`} strokeWidth="9" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <text x="48" y="49" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={20} fontWeight="800" fontFamily="Inter,system-ui,sans-serif">
          {displayed}
        </text>
      </svg>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: T.gray700, marginTop: '0.5rem', letterSpacing: '-0.01em' }}>{label}</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', padding: '2px 8px', background: `${color}15`, borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700, color }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, display: 'inline-block' }} />
        {lbl}
      </div>
    </div>
  );
}

// ─── Clickable Visibility Hook ───────────────────────────────────────────────
function VisibilityHook({ score }: { score: number }) {
  const hooks = [
    { min: 0,  max: 24, text: 'Not showing up in AI search?',         cta: 'Let us fix that →',            color: T.red,   bg: T.redLight,   border: T.redMid   },
    { min: 25, max: 54, text: 'AI engines barely know you exist.',     cta: 'Get fully visible →',          color: T.amber, bg: T.amberLight, border: T.amberMid },
    { min: 55, max: 79, text: "Good start — but you're missing leads.", cta: 'Automate the rest →',          color: T.blue,  bg: T.blueLight,  border: T.blueMid  },
    { min: 80, max: 100, text: 'Strong visibility! Keep the momentum.', cta: 'Scale with AI automation →',   color: T.green, bg: T.greenLight, border: T.greenMid },
  ];
  const h = hooks.find(h => score >= h.min && score <= h.max) || hooks[0];
  return (
    <a
      href="https://www.ai2flows.com"
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.875rem 1.25rem', background: h.bg, border: `1px solid ${h.border}`, borderRadius: '12px', marginBottom: '1.25rem', textDecoration: 'none', transition: 'all 0.15s', cursor: 'pointer' }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'none'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: h.color, flexShrink: 0, boxShadow: `0 0 6px ${h.color}` }} />
        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: h.color }}>{h.text}</span>
      </div>
      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: h.color, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        {h.cta}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={h.color} strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </span>
    </a>
  );
}

// ─── Recommendation Row (collapsible like SeoAuditTool) ──────────────────────
function RecRow({ rec, idx }: { rec: Rec; idx: number }) {
  const [open, setOpen] = useState(false);
  const color = priorityColor(rec.priority);
  const bg    = priorityBg(rec.priority);
  return (
    <div style={{ border: `1px solid ${T.gray200}`, borderRadius: '12px', overflow: 'hidden', background: T.white, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div
        onClick={() => setOpen(p => !p)}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = T.gray50; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = T.white; }}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.875rem 1.25rem', cursor: 'pointer', transition: 'background 0.1s' }}
      >
        <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color }}>{idx + 1}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: T.gray800 }}>{rec.title}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', background: bg, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {rec.priority}
            </span>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth="2"
          style={{ flexShrink: 0, marginTop: '4px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div style={{ padding: '0.75rem 1.25rem 0.875rem 3.75rem', borderTop: `1px solid ${T.gray100}` }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: T.gray600, lineHeight: 1.65 }}>{rec.description}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LocalBizVisibilityTool() {
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation]         = useState('');
  const [category, setCategory]         = useState('');
  const [website, setWebsite]           = useState('');
  const [loading, setLoading]           = useState(false);
  const [loadingStep, setLoadingStep]   = useState('');
  const [progress, setProgress]         = useState(0);
  const [data, setData]                 = useState<ApiData | null>(null);
  const [error, setError]               = useState('');
  const [activeTab, setActiveTab]       = useState<'overview' | 'responses' | 'recommendations'>('overview');
  const [animate, setAnimate]           = useState(false);

  // ── Location autocomplete ─────────────────────────────────────────────────
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions]         = useState(false);
  const [locationLoading, setLocationLoading]         = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);
  const resultsRef  = useRef<HTMLDivElement>(null);

  const fetchLocationSuggestions = async (query: string) => {
    if (query.length < 2) { setLocationSuggestions([]); return; }
    setLocationLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&countrycodes=us,ca`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const items = await res.json();
      const seen = new Set<string>();
      const suggestions: LocationSuggestion[] = items
        .filter((item: any) => item.address?.city || item.address?.town || item.address?.village || item.address?.county)
        .map((item: any) => {
          const city = item.address?.city || item.address?.town || item.address?.village || item.address?.county || '';
          const iso = item.address?.['ISO3166-2-lvl4'] || '';
          const stateCode = iso.includes('-') ? iso.split('-')[1] : (item.address?.state || '');
          const countryCode = item.address?.country_code?.toUpperCase();
          const display = countryCode === 'CA'
            ? `${city}, ${item.address?.state || stateCode}`
            : `${city}, ${stateCode}`;
          return { display, city, state: stateCode };
        })
        .filter((s: LocationSuggestion) => {
          if (!s.city || !s.state) return false;
          if (seen.has(s.display)) return false;
          seen.add(s.display);
          return true;
        });
      setLocationSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch {
      setLocationSuggestions([]);
    } finally {
      setLocationLoading(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced location fetch — 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (location.length >= 2) fetchLocationSuggestions(location);
      else { setLocationSuggestions([]); setShowSuggestions(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [location]);

  // ── Daily limit (5 / day via localStorage) ────────────────────────────────
  const LIMIT   = 5;
  const LS_KEY  = 'lbv_usage';
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const getUsage = () => {
    try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : { date: '', count: 0 }; }
    catch { return { date: '', count: 0 }; }
  };
  const getRemaining = () => { const u = getUsage(); return u.date !== todayStr() ? LIMIT : Math.max(0, LIMIT - u.count); };
  const [remaining, setRemaining] = useState<number>(() => { try { return getRemaining(); } catch { return LIMIT; } });
  const incrementUsage = () => {
    const today = todayStr(); const u = getUsage();
    const n = u.date === today ? u.count + 1 : 1;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ date: today, count: n })); } catch {}
    setRemaining(Math.max(0, LIMIT - n));
  };

  // ── Run check ────────────────────────────────────────────────────────────
  const runCheck = async () => {
    if (getRemaining() <= 0)    { setError('LIMIT_REACHED'); return; }
    if (!businessName.trim())   { setError('Please enter your business name.'); return; }
    if (!location.trim())       { setError('Please enter your city and state / province.'); return; }
    if (!category)              { setError('Please select a business category.'); return; }

    setError('');
    setData(null);
    setLoading(true);
    setProgress(0);
    setAnimate(false);
    setShowSuggestions(false);

    const steps = [
      { msg: 'Running category discovery query...', pct: 15 },
      { msg: 'Running recommendation query...',     pct: 38 },
      { msg: 'Running brand recognition query...',  pct: 62 },
      { msg: 'Running reputation check query...',   pct: 82 },
      { msg: 'Generating visibility report...',     pct: 95 },
    ];
    let si = 0;
    const timer = setInterval(() => {
      if (si < steps.length) { setLoadingStep(steps[si].msg); setProgress(steps[si].pct); si++; }
    }, 2000);

    try {
      const res = await fetch('/api/local-biz-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          location:     location.trim(),
          category,
          website: website.trim() || undefined,
        }),
      });
      const json = await res.json();
      clearInterval(timer);
      if (json.error) { setError(json.message || 'An error occurred.'); setLoading(false); return; }
      incrementUsage();
      setProgress(100);
      setLoadingStep('Visibility report ready!');
      setTimeout(() => {
        setData(json);
        setLoading(false);
        setAnimate(true);
        setActiveTab('overview');
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }, 500);
    } catch {
      clearInterval(timer);
      setError('Request failed. Please try again.');
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null); setBusinessName(''); setLocation(''); setCategory(''); setWebsite('');
    setError(''); setLocationSuggestions([]); setShowSuggestions(false);
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '0.8rem 1rem 0.8rem 2.5rem',
    background: 'rgba(255,255,255,0.07)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    borderRadius: '10px', color: '#f1f5f9', fontSize: '0.9rem',
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem',
  };

  const TABS = [
    { id: 'overview'         as const, label: 'Overview',                                                   icon: '◎' },
    { id: 'responses'        as const, label: 'AI Responses',                                               icon: '⌕' },
    { id: 'recommendations'  as const, label: `Recommendations${data ? ` (${data.recommendations.length})` : ''}`, icon: '✔' },
  ];

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: T.gray800, background: T.white, borderRadius: '16px', border: `1px solid ${T.gray200}`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

      {/* ── Header / input panel ─────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg, ${T.gray950} 0%, #1e1b4b 100%)`, padding: '1.75rem' }}>

        {/* Status label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: T.emerald, boxShadow: `0 0 6px ${T.emerald}` }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Local AI Visibility &middot; USA &amp; Canada &middot; Live Test
          </span>
        </div>

        {/* Business name */}
        <div style={{ marginBottom: '0.875rem' }}>
          <label style={labelStyle}>Business Name</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.9rem' }}>🏢</div>
            <input
              type="text" value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runCheck()}
              placeholder="e.g. Mike's HVAC Services"
              disabled={loading} style={inputStyle}
              onFocus={e => (e.target.style.borderColor = `${T.blue}80`)}
              onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>
        </div>

        {/* Location + Category row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.875rem' }}>

          {/* Location with autocomplete */}
          <div>
            <label style={labelStyle}>City &amp; State / Province</label>
            <div ref={locationRef} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '13px', color: '#64748b', fontSize: '0.9rem', zIndex: 1 }}>📍</div>
              {locationLoading && (
                <div style={{ position: 'absolute', right: '12px', top: '13px', zIndex: 1 }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
              )}
              <input
                type="text" value={location}
                onChange={e => { setLocation(e.target.value); setShowSuggestions(true); }}
                onKeyDown={e => {
                  if (e.key === 'Escape') setShowSuggestions(false);
                  if (e.key === 'Enter' && !showSuggestions) runCheck();
                }}
                onFocus={e => {
                  e.target.style.borderColor = `${T.blue}80`;
                  if (location.length >= 2 && locationSuggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                placeholder="Type city name..."
                disabled={loading} autoComplete="off"
                style={{ ...inputStyle, paddingRight: '2rem', borderRadius: showSuggestions && locationSuggestions.length > 0 ? '10px 10px 0 0' : '10px' }}
              />

              {/* Dropdown suggestions */}
              {showSuggestions && locationSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1740', border: '1.5px solid rgba(99,102,241,0.5)', borderTop: 'none', borderRadius: '0 0 10px 10px', zIndex: 100, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  {locationSuggestions.map((s, i) => (
                    <div
                      key={i}
                      onMouseDown={e => {
                        e.preventDefault();
                        setLocation(s.display);
                        setShowSuggestions(false);
                        setLocationSuggestions([]);
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.25)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                      style={{ padding: '0.6rem 1rem', fontSize: '0.84rem', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: i < locationSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'background 0.1s' }}
                    >
                      <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>📍</span>
                      <span>{s.display}</span>
                    </div>
                  ))}
                  <div style={{ padding: '0.35rem 1rem', fontSize: '0.63rem', color: '#475569', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                    Powered by OpenStreetMap
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Business Category</label>
            <div style={{ position: 'relative' }}>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={loading}
                style={{ ...inputStyle, paddingLeft: '1rem', cursor: 'pointer', appearance: 'none', color: category ? '#f1f5f9' : '#64748b' }}
                onFocus={e => (e.target.style.borderColor = `${T.blue}80`)}
                onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
              >
                <option value="" disabled>Select category...</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c} style={{ background: '#1e1b4b', color: '#f1f5f9' }}>{c}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Website + Button row */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>
              Website{' '}
              <span style={{ color: '#475569', fontWeight: 500, textTransform: 'none', fontSize: '0.72rem' }}>(optional — improves accuracy)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.9rem' }}>🌐</div>
              <input
                type="text" value={website}
                onChange={e => setWebsite(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runCheck()}
                placeholder="e.g. mikeshvac.com"
                disabled={loading}
                style={{ ...inputStyle, fontFamily: 'monospace' }}
                onFocus={e => (e.target.style.borderColor = `${T.blue}80`)}
                onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
            </div>
          </div>
          <button
            onClick={runCheck}
            disabled={loading || remaining === 0}
            style={{ padding: '0.8rem 1.5rem', borderRadius: '10px', border: 'none', background: loading ? '#1e40af' : remaining === 0 ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${T.blue} 0%, ${T.violet} 100%)`, color: remaining === 0 ? '#475569' : T.white, fontSize: '0.88rem', fontWeight: 700, cursor: (loading || remaining === 0) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', boxShadow: (loading || remaining === 0) ? 'none' : '0 4px 15px rgba(37,99,235,0.4)', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
          >
            {loading ? (
              <><span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Checking...</>
            ) : remaining === 0 ? <>&#128274; Limit Reached</>
            : <>&#128269; Check AI Visibility</>}
          </button>
          {data && (
            <button onClick={reset} style={{ padding: '0.8rem 0.875rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}>&#10005;</button>
          )}
        </div>

        {/* Progress bar */}
        {loading && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{loadingStep}</span>
              <span style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${T.blue}, ${T.violet})`, borderRadius: '2px', transition: 'width 0.7s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {['Category Query', 'Recommendation', 'Brand Query', 'Reputation Check', 'Report'].map((step, i) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '3px 8px', borderRadius: '20px', background: progress >= (i + 1) * 18 ? `${T.blue}25` : 'rgba(255,255,255,0.04)', border: `1px solid ${progress >= (i + 1) * 18 ? T.blue + '40' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.3s' }}>
                  <span style={{ fontSize: '0.55rem', color: progress >= (i + 1) * 18 ? '#93c5fd' : '#475569' }}>{progress >= (i + 1) * 18 ? '✓' : '○'}</span>
                  <span style={{ fontSize: '0.65rem', color: progress >= (i + 1) * 18 ? '#93c5fd' : '#475569', fontWeight: 600 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remaining checks bar */}
        {!loading && (
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {Array.from({ length: LIMIT }).map((_, i) => (
                <div key={i} style={{ width: '20px', height: '4px', borderRadius: '2px', background: i < remaining ? T.emerald : 'rgba(255,255,255,0.12)', transition: 'background 0.3s' }} />
              ))}
            </div>
            <span style={{ fontSize: '0.68rem', color: remaining > 0 ? '#94a3b8' : '#f87171', fontWeight: 600 }}>
              {remaining > 0 ? `${remaining} of ${LIMIT} free checks remaining today` : 'Daily limit reached — resets at midnight'}
            </span>
          </div>
        )}

        {/* Errors */}
        {error && error !== 'LIMIT_REACHED' && (
          <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            &#9888;&#65039; {error}
          </div>
        )}
        {error === 'LIMIT_REACHED' && (
          <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              &#128274; <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c4b5fd' }}>Daily Limit Reached</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              You&apos;ve used all <b style={{ color: '#c4b5fd' }}>{LIMIT} free checks</b> for today. Resets at midnight.
            </p>
          </div>
        )}
      </div>

      {/* ── Empty state feature strip ─────────────────────────────────────── */}
      {!data && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${T.gray100}` }}>
          {[
            { icon: '📊', title: '4 Query Types', sub: 'Category, Recommendation, Brand, Reputation', color: T.blue   },
            { icon: '🗺️', title: 'USA & Canada',  sub: 'Smart city autocomplete included',            color: T.violet },
            { icon: '🔎', title: 'Live AI Test',  sub: 'Real Claude API calls, honest results',       color: T.emerald },
            { icon: '✅', title: 'Action Plan',   sub: 'Prioritized fix recommendations',             color: '#d97706' },
          ].map(f => (
            <div key={f.title} style={{ padding: '1.5rem 1rem', textAlign: 'center', borderRight: `1px solid ${T.gray100}` }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${f.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', margin: '0 auto 0.75rem' }}>{f.icon}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: T.gray800 }}>{f.title}</div>
              <div style={{ fontSize: '0.68rem', color: T.gray500, marginTop: '0.2rem' }}>{f.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {data && !loading && (
        <div ref={resultsRef}>

          {/* Result header bar */}
          <div style={{ padding: '0.875rem 1.5rem', background: T.gray50, borderBottom: `1px solid ${T.gray100}`, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: T.blueLight, color: T.blue }}>📍 Local Business</span>
                <code style={{ fontSize: '0.73rem', color: T.gray600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                  {data.businessName} &bull; {data.location}
                </code>
              </div>
              <div style={{ fontSize: '0.64rem', color: T.gray400, marginTop: '0.2rem' }}>
                {data.category}{data.website ? ` · ${data.website}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '20px', background: visBg(data.visibility), color: visColor(data.visibility), fontWeight: 700, border: `1px solid ${visBorder(data.visibility)}` }}>
                {visLabel(data.visibility)}
              </span>
              <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: '20px', background: T.gray100, color: T.gray600, fontWeight: 700 }}>
                {data.mentionCount}/4 queries matched
              </span>
              <button onClick={runCheck} style={{ fontSize: '0.72rem', padding: '4px 12px', border: `1px solid ${T.gray200}`, borderRadius: '20px', background: T.white, color: T.gray600, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                &#128260; Re-run
              </button>
            </div>
          </div>

          {/* Score rings */}
          <div style={{ padding: '1.5rem', borderBottom: `1px solid ${T.gray100}` }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.gray400, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>AI Visibility Score</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <ScoreRing score={data.score} label="Overall Score" animate={animate} />
              {data.results.map(r => {
                const color  = ENGINE_COLOR[r.engineKey] || T.blue;
                const bg     = r.mentioned ? `${color}10` : T.gray50;
                const bord   = r.mentioned ? `${color}33` : T.gray200;
                return (
                  <div key={r.engineKey} style={{ background: bg, border: `1px solid ${bord}`, borderRadius: '16px', padding: '1.25rem 0.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: r.mentioned ? color : T.gray200, borderRadius: '16px 16px 0 0' }} />
                    <div style={{ fontSize: '1.8rem', margin: '0 0 0.4rem' }}>{ENGINE_ICON[r.engineKey]}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.gray700, marginBottom: '0.4rem' }}>{r.engine}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '2px 8px', background: r.mentioned ? `${color}15` : T.gray100, borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700, color: r.mentioned ? color : T.gray500 }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: r.mentioned ? color : T.gray300, display: 'inline-block' }} />
                      {r.mentioned ? 'Matched' : 'No Match'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visibility scale bar */}
          <div style={{ padding: '1rem 1.5rem 1.5rem', borderBottom: `1px solid ${T.gray100}` }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.gray400, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>Visibility Scale</div>
            <div style={{ position: 'relative', height: '8px', background: `linear-gradient(to right, ${T.red}, ${T.amber}, ${T.blue}, ${T.green})`, borderRadius: '4px' }}>
              <div style={{ position: 'absolute', top: '-5px', left: `${Math.min(Math.max(data.score, 2), 97)}%`, width: '18px', height: '18px', borderRadius: '50%', background: T.white, border: `3px solid ${visColor(data.visibility)}`, transform: 'translateX(-50%)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', transition: 'left 1s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              {['Not Visible', 'Emerging', 'Visible', 'Well Known'].map(l => (
                <span key={l} style={{ fontSize: '0.65rem', color: T.gray400 }}>{l}</span>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.gray200}`, overflowX: 'auto', paddingLeft: '0.5rem', background: T.white }}>
            {TABS.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{ padding: '0.8rem 1.1rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem', color: activeTab === id ? T.blue : T.gray500, borderBottom: `2px solid ${activeTab === id ? T.blue : 'transparent'}`, marginBottom: '-1px', transition: 'all 0.15s' }}>
                <span style={{ fontSize: '0.75rem' }}>{icon}</span> {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '1.5rem' }}>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div>
                {/* Alert banner */}
                {data.mentionCount < 2 && (
                  <div style={{ border: `1px solid ${T.redMid}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '1.25rem', background: '#fff5f5', boxShadow: '0 1px 3px rgba(220,38,38,0.08)' }}>
                    <div style={{ padding: '0.875rem 1.25rem', background: T.redMid, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>&#9888;&#65039;</div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: T.red }}>Low AI Visibility — Action Required</div>
                        <div style={{ fontSize: '0.68rem', color: T.red, opacity: 0.8 }}>Only {data.mentionCount}/4 AI queries matched your business</div>
                      </div>
                    </div>
                    <div style={{ padding: '0.875rem 1.25rem' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: T.gray600, lineHeight: 1.6 }}>
                        When customers ask AI engines for a {data.category.toLowerCase()} in {data.location}, your business is not being found or recommended. See the Recommendations tab for a prioritized action plan.
                      </p>
                    </div>
                  </div>
                )}
                {data.mentionCount >= 3 && (
                  <div style={{ padding: '1.5rem', textAlign: 'center', background: T.greenLight, borderRadius: '14px', border: `1px solid ${T.greenMid}`, marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>&#127881;</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: T.green }}>Strong AI Visibility!</div>
                    <div style={{ fontSize: '0.75rem', color: T.gray600, marginTop: '0.25rem' }}>{data.mentionCount}/4 AI query types matched your business</div>
                  </div>
                )}

                {/* Clickable hook — score-aware CTA */}
                <VisibilityHook score={data.score} />

                {/* Per-engine cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {data.results.map(r => {
                    const color = ENGINE_COLOR[r.engineKey] || T.blue;
                    return (
                      <div key={r.engineKey} style={{ background: r.mentioned ? `${color}08` : T.gray50, border: `1px solid ${r.mentioned ? color + '33' : T.gray200}`, borderRadius: '12px', padding: '1rem 1.1rem', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: r.mentioned ? color : T.gray200 }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.9rem' }}>{ENGINE_ICON[r.engineKey]}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: T.gray800 }}>{r.engine}</span>
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: r.mentioned ? `${color}18` : T.gray100, color: r.mentioned ? color : T.gray500 }}>
                            {r.mentioned ? '✓ Matched' : '✗ No Match'}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: T.gray500, lineHeight: 1.5 }}>
                          {r.type === 'category_search'  && 'Simulates: "What [category] businesses are in [location]?"'}
                          {r.type === 'recommendation'   && 'Simulates: "Recommend a trusted [category] near me"'}
                          {r.type === 'brand_query'      && 'Simulates: "Tell me about [business name]"'}
                          {r.type === 'reputation_query' && 'Simulates: "Is [business name] well known?"'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  {[
                    { label: 'Visibility Score',    value: `${data.score}/100`,                                                                   color: visColor(data.visibility), icon: '📊' },
                    { label: 'AI Status',           value: visLabel(data.visibility),                                                             color: visColor(data.visibility), icon: '🌐' },
                    { label: 'Queries Matched',     value: `${data.mentionCount} of 4`,                                                          color: data.mentionCount >= 3 ? T.green : data.mentionCount >= 2 ? T.amber : T.red, icon: '🔎' },
                    { label: 'High Priority Fixes', value: `${data.recommendations.filter(r => r.priority === 'high').length} items`,            color: T.red, icon: '⚡' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '1rem 1.1rem', border: `1px solid ${T.gray200}`, borderRadius: '12px', background: T.white, borderLeft: `3px solid ${s.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.9rem' }}>{s.icon}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.gray500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI RESPONSES TAB */}
            {activeTab === 'responses' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: T.gray500 }}>
                  These are the actual Claude AI responses to each query type. A match means your business name or website appeared in the response.
                </p>
                {data.results.map(r => {
                  const color = ENGINE_COLOR[r.engineKey] || T.blue;
                  return (
                    <div key={r.engineKey} style={{ border: `1px solid ${r.mentioned ? color + '33' : T.gray200}`, borderRadius: '14px', overflow: 'hidden', background: T.white, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <div style={{ padding: '0.875rem 1.25rem', background: T.gray50, borderBottom: `1px solid ${T.gray100}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1rem' }}>{ENGINE_ICON[r.engineKey]}</span>
                          <div>
                            <span style={{ fontSize: '0.83rem', fontWeight: 700, color: T.gray800 }}>{r.engine}</span>
                            <div style={{ fontSize: '0.65rem', color: T.gray400, marginTop: '1px', textTransform: 'capitalize' }}>{r.type.replace('_', ' ')}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', background: r.mentioned ? `${color}18` : T.gray100, color: r.mentioned ? color : T.gray500 }}>
                          {r.mentioned ? '✓ Business Matched' : '✗ No Match Found'}
                        </span>
                      </div>
                      <div style={{ padding: '1rem 1.25rem' }}>
                        <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', color: T.gray500, background: T.gray50, borderRadius: '6px', padding: '0.5rem 0.75rem', fontStyle: 'italic', border: `1px solid ${T.gray100}` }}>
                          Query: &ldquo;{r.prompt}&rdquo;
                        </p>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: T.gray700, lineHeight: 1.65 }}>{r.response}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* RECOMMENDATIONS TAB */}
            {activeTab === 'recommendations' && (
              <div>
                <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: T.gray600 }}>
                  Based on your AI visibility score of{' '}
                  <strong style={{ color: visColor(data.visibility) }}>{data.score}/100</strong>,
                  here are prioritized steps to improve how AI engines find and recommend your business. Click each item to expand.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {data.recommendations.map((rec, i) => <RecRow key={i} rec={rec} idx={i} />)}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '0.875rem 1.5rem', borderTop: `1px solid ${T.gray100}`, background: T.gray50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', color: T.gray400 }}>Powered by</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: T.blue }}>Claude Haiku 4.5</span>
              <span style={{ fontSize: '0.65rem', color: T.gray400 }}>&middot; 4 query simulations &middot; {data.mentionCount}/4 matched</span>
            </div>
            <button onClick={reset} style={{ fontSize: '0.72rem', padding: '5px 14px', border: `1px solid ${T.blue}`, borderRadius: '20px', background: T.blueLight, color: T.blue, cursor: 'pointer', fontWeight: 700 }}>
              &#8592; Check Another Business
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
