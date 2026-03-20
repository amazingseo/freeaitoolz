import { useState, useRef } from 'react';

// ─── Design tokens (exact match to AeoGeoAuditTool) ─────────────────────────
const T = {
  blue: '#2563eb', blueLight: '#eff6ff', blueMid: '#dbeafe',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  emerald: '#10b981', emeraldLight: '#ecfdf5', emeraldMid: '#a7f3d0',
  gray950: '#030712', gray900: '#111827', gray800: '#1f2937',
  gray700: '#374151', gray600: '#4b5563', gray500: '#6b7280',
  gray400: '#9ca3af', gray300: '#d1d5db', gray200: '#e5e7eb',
  gray100: '#f3f4f6', gray50: '#f9fafb', white: '#ffffff',
  red: '#dc2626', redLight: '#fef2f2', redMid: '#fee2e2',
  amber: '#d97706', amberLight: '#fffbeb', amberMid: '#fef9c3',
  green: '#16a34a', greenLight: '#f0fdf4', greenMid: '#dcfce7',
};

const CATEGORIES = [
  'HVAC & Heating','Plumbing','Electrical','Roofing',
  'Landscaping & Lawn Care','General Contractor','Home Cleaning Service',
  'Pest Control','Painting','Flooring','Windows & Doors',
  'Pool & Spa Service','Solar Installation','Real Estate Agency',
  'Property Management','Mortgage Broker','Home Inspection',
  'Restaurant','Bakery & Cafe','Catering','Dental Office',
  'Medical Clinic / Doctor','Chiropractor','Physical Therapy',
  'Veterinary Clinic','Auto Repair','Auto Dealership','Car Detailing',
  'Law Firm','Accounting & Tax','Insurance Agency','Financial Advisor',
  'Gym & Fitness','Beauty Salon','Spa & Massage','Barbershop',
  'Daycare & Childcare','Tutoring & Education','IT Support & Tech',
  'Marketing Agency','Photography','Event Planning',
  'Moving Company','Storage Facility','Retail Store','Other',
];

type FAQ = { question: string; answer: string };

type ApiResult = {
  businessName: string;
  category: string;
  location: string;
  website: string | null;
  faqs: FAQ[];
  seoTitle: string;
  seoDescription: string;
  faqSchema: object;
  localBusinessSchema: object;
};

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch { const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${copied ? T.emerald : T.gray200}`, background: copied ? T.greenLight : T.white, color: copied ? T.green : T.gray600, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}>
      {copied ? '✓ Copied!' : `📋 ${label}`}
    </button>
  );
}

// ─── Schema code block ────────────────────────────────────────────────────────
function SchemaBlock({ schema, title, description }: { schema: object; title: string; description: string }) {
  const code = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
  return (
    <div style={{ border: `1px solid ${T.gray200}`, borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', background: T.gray50, borderBottom: `1px solid ${T.gray100}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: T.gray800 }}>{title}</div>
          <div style={{ fontSize: '0.72rem', color: T.gray500, marginTop: '0.15rem' }}>{description}</div>
        </div>
        <CopyBtn text={code} label="Copy Schema" />
      </div>
      <pre style={{ margin: 0, padding: '1rem 1.25rem', background: '#0d1117', color: '#e6edf3', fontSize: '0.72rem', lineHeight: 1.7, overflowX: 'auto', fontFamily: 'monospace', maxHeight: '380px', overflowY: 'auto' }}>
        {code}
      </pre>
    </div>
  );
}

// ─── FAQ card ─────────────────────────────────────────────────────────────────
function FaqCard({ faq, idx }: { faq: FAQ; idx: number }) {
  const [open, setOpen] = useState(idx < 3);
  return (
    <div style={{ border: `1px solid ${T.gray200}`, borderRadius: '12px', overflow: 'hidden', background: T.white, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div
        onClick={() => setOpen(p => !p)}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = T.gray50; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = T.white; }}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.875rem 1.25rem', cursor: 'pointer', transition: 'background 0.1s' }}
      >
        <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: T.blueMid, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: T.blue }}>{idx + 1}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 600, color: T.gray800, lineHeight: 1.4 }}>{faq.question}</div>
          {!open && <div style={{ fontSize: '0.74rem', color: T.gray400, marginTop: '0.2rem' }}>Click to see AI-optimized answer</div>}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth="2"
          style={{ flexShrink: 0, marginTop: '4px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div style={{ padding: '0 1.25rem 1rem 3.875rem', borderTop: `1px solid ${T.gray100}`, paddingTop: '0.875rem' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: T.gray700, lineHeight: 1.7 }}>{faq.answer}</p>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px', background: T.greenMid, color: T.green, fontWeight: 700 }}>✓ AI-extractable length</span>
            <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px', background: T.blueMid, color: T.blue, fontWeight: 700 }}>✓ Location mentioned</span>
            <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px', background: T.amberMid, color: T.amber, fontWeight: 700 }}>✓ Business name included</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LocalFaqSchemaGenerator() {
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'faqs' | 'faqschema' | 'bizschema' | 'howto'>('faqs');
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Daily limit ────────────────────────────────────────────────────────────
  const LIMIT = 5;
  const LS_KEY = 'faq_gen_usage';
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const getUsage = () => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : { date: '', count: 0 }; } catch { return { date: '', count: 0 }; } };
  const getRemaining = () => { const u = getUsage(); return u.date !== todayStr() ? LIMIT : Math.max(0, LIMIT - u.count); };
  const [remaining, setRemaining] = useState<number>(() => { try { return getRemaining(); } catch { return LIMIT; } });
  const incrementUsage = () => {
    const today = todayStr(); const u = getUsage(); const n = u.date === today ? u.count + 1 : 1;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ date: today, count: n })); } catch {}
    setRemaining(Math.max(0, LIMIT - n));
  };

  const generate = async () => {
    if (getRemaining() <= 0) { setError('LIMIT_REACHED'); return; }
    if (!businessName.trim()) { setError('Please enter your business name.'); return; }
    if (!category) { setError('Please select a business category.'); return; }
    if (!location.trim()) { setError('Please enter your city and state.'); return; }

    setError(''); setResult(null); setLoading(true); setProgress(0);

    const steps = [
      { msg: 'Analyzing your business type and market...', pct: 12 },
      { msg: 'Researching what customers ask AI engines...', pct: 28 },
      { msg: 'Writing 10 AI-optimized Q&A pairs...', pct: 55 },
      { msg: 'Building FAQPage JSON-LD schema...', pct: 78 },
      { msg: 'Building LocalBusiness schema...', pct: 92 },
    ];
    let si = 0;
    const timer = setInterval(() => {
      if (si < steps.length) { setLoadingStep(steps[si].msg); setProgress(steps[si].pct); si++; }
    }, 2200);

    try {
      const res = await fetch('/api/local-faq-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: businessName.trim(), category, location: location.trim(), website: website.trim() || undefined, phone: phone.trim() || undefined, description: description.trim() || undefined }),
      });
      const json = await res.json();
      clearInterval(timer);
      if (json.error) { setError(json.message || 'Generation failed.'); setLoading(false); return; }
      incrementUsage();
      setProgress(100);
      setLoadingStep('Done! Your FAQ schema is ready.');
      setTimeout(() => {
        setResult(json);
        setLoading(false);
        setActiveTab('faqs');
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }, 500);
    } catch {
      clearInterval(timer);
      setError('Request failed. Please try again.');
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setBusinessName(''); setCategory(''); setLocation(''); setWebsite(''); setPhone(''); setDescription(''); setError(''); };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    padding: '0.8rem 1rem 0.8rem 2.5rem',
    background: 'rgba(255,255,255,0.07)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    borderRadius: '10px', color: '#f1f5f9', fontSize: '0.9rem',
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
  };
  const labelStyle = { display: 'block' as const, fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.5rem' };

  const TABS = [
    { id: 'faqs' as const, label: '10 FAQ Questions', icon: '❓' },
    { id: 'faqschema' as const, label: 'FAQPage Schema', icon: '🧩' },
    { id: 'bizschema' as const, label: 'LocalBusiness Schema', icon: '🏢' },
    { id: 'howto' as const, label: 'How to Add', icon: '📋' },
  ];

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: T.gray800, background: T.white, borderRadius: '16px', border: `1px solid ${T.gray200}`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg, ${T.gray950} 0%, #1e1b4b 100%)`, padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: T.emerald, boxShadow: `0 0 6px ${T.emerald}` }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            FAQ &amp; Schema Generator &middot; AEO Optimized &middot; Powered by Claude Sonnet
          </span>
        </div>

        {/* Row 1: Business name */}
        <div style={{ marginBottom: '0.875rem' }}>
          <label style={labelStyle}>Business Name</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🏢</span>
            <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="e.g. Mike's HVAC Services" disabled={loading} style={inputStyle}
              onFocus={e => (e.target.style.borderColor = `${T.blue}80`)} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
          </div>
        </div>

        {/* Row 2: Category + Location */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.875rem' }}>
          <div>
            <label style={labelStyle}>Business Category</label>
            <div style={{ position: 'relative' }}>
              <select value={category} onChange={e => setCategory(e.target.value)} disabled={loading}
                style={{ ...inputStyle, paddingLeft: '1rem', cursor: 'pointer', appearance: 'none', color: category ? '#f1f5f9' : '#64748b' }}
                onFocus={e => (e.target.style.borderColor = `${T.blue}80`)} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}>
                <option value="" disabled>Select category...</option>
                {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1e1b4b', color: '#f1f5f9' }}>{c}</option>)}
              </select>
              <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>
          <div>
            <label style={labelStyle}>City &amp; State / Province</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>📍</span>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()}
                placeholder="e.g. Austin, TX" disabled={loading} style={inputStyle}
                onFocus={e => (e.target.style.borderColor = `${T.blue}80`)} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
            </div>
          </div>
        </div>

        {/* Row 3: Website + Phone (optional) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.875rem' }}>
          <div>
            <label style={labelStyle}>Website <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🌐</span>
              <input type="text" value={website} onChange={e => setWebsite(e.target.value)}
                placeholder="mikeshvac.com" disabled={loading} style={{ ...inputStyle, fontFamily: 'monospace' }}
                onFocus={e => (e.target.style.borderColor = `${T.blue}80`)} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Phone <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>📞</span>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(512) 555-0123" disabled={loading} style={inputStyle}
                onFocus={e => (e.target.style.borderColor = `${T.blue}80`)} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
            </div>
          </div>
        </div>

        {/* Row 4: Description (optional) + Generate button */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Short Description <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none' }}>(optional — improves accuracy)</span></label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '13px', color: '#64748b' }}>✏️</span>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()}
                placeholder="e.g. 24/7 emergency HVAC, licensed & insured, 15 years experience"
                disabled={loading} style={inputStyle}
                onFocus={e => (e.target.style.borderColor = `${T.blue}80`)} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
            </div>
          </div>
          <button onClick={generate} disabled={loading || remaining === 0}
            style={{ padding: '0.8rem 1.5rem', borderRadius: '10px', border: 'none', background: loading ? '#1e40af' : remaining === 0 ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${T.blue} 0%, ${T.violet} 100%)`, color: remaining === 0 ? '#475569' : T.white, fontSize: '0.88rem', fontWeight: 700, cursor: (loading || remaining === 0) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', boxShadow: (loading || remaining === 0) ? 'none' : '0 4px 15px rgba(37,99,235,0.4)', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
            {loading
              ? <><span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Generating...</>
              : remaining === 0 ? <>&#128274; Limit Reached</>
              : <>&#10024; Generate FAQ Schema</>}
          </button>
          {result && <button onClick={reset} style={{ padding: '0.8rem 0.875rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}>&#10005;</button>}
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
              {['Market Research', 'Writing Q&A', 'Optimizing', 'FAQPage Schema', 'LocalBusiness Schema'].map((step, i) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '3px 8px', borderRadius: '20px', background: progress >= (i + 1) * 18 ? `${T.blue}25` : 'rgba(255,255,255,0.04)', border: `1px solid ${progress >= (i + 1) * 18 ? T.blue + '40' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.3s' }}>
                  <span style={{ fontSize: '0.55rem', color: progress >= (i + 1) * 18 ? '#93c5fd' : '#475569' }}>{progress >= (i + 1) * 18 ? '✓' : '○'}</span>
                  <span style={{ fontSize: '0.65rem', color: progress >= (i + 1) * 18 ? '#93c5fd' : '#475569', fontWeight: 600 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remaining checks + cost */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {Array.from({ length: LIMIT }).map((_, i) => (
                <div key={i} style={{ width: '20px', height: '4px', borderRadius: '2px', background: i < remaining ? T.emerald : 'rgba(255,255,255,0.12)', transition: 'background 0.3s' }} />
              ))}
            </div>
            <span style={{ fontSize: '0.68rem', color: remaining > 0 ? '#94a3b8' : '#f87171', fontWeight: 600 }}>
              {remaining > 0 ? `${remaining} of ${LIMIT} free generations today` : 'Daily limit reached — resets at midnight'}
            </span>
            <div style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 600 }}>Cost per generation:</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: T.emerald }}>~$0.008</span>
              <span style={{ fontSize: '0.58rem', color: '#334155' }}>· Claude Sonnet · ~2000 tokens</span>
            </div>
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
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>You&apos;ve used all <b style={{ color: '#c4b5fd' }}>{LIMIT} free generations</b> today. Resets at midnight.</p>
          </div>
        )}
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!result && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${T.gray100}` }}>
          {[
            { icon: '❓', title: '10 AEO-Optimized FAQs', sub: 'Questions real customers ask AI engines', color: T.blue },
            { icon: '🧩', title: 'FAQPage Schema', sub: 'Ready-to-paste JSON-LD for featured snippets', color: T.violet },
            { icon: '🏢', title: 'LocalBusiness Schema', sub: 'Entity markup for AI knowledge graphs', color: T.emerald },
            { icon: '📋', title: 'Step-by-Step Guide', sub: 'Exactly where & how to add each schema', color: '#d97706' },
          ].map(f => (
            <div key={f.title} style={{ padding: '1.5rem 1rem', textAlign: 'center', borderRight: `1px solid ${T.gray100}` }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${f.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', margin: '0 auto 0.75rem' }}>{f.icon}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: T.gray800 }}>{f.title}</div>
              <div style={{ fontSize: '0.68rem', color: T.gray500, marginTop: '0.2rem' }}>{f.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {result && !loading && (
        <div ref={resultsRef}>
          {/* Result header bar */}
          <div style={{ padding: '0.875rem 1.5rem', background: T.gray50, borderBottom: `1px solid ${T.gray100}`, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: T.greenMid, color: T.green }}>✓ {result.faqs.length} FAQs Generated</span>
                <code style={{ fontSize: '0.73rem', color: T.gray600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                  {result.businessName} &bull; {result.location}
                </code>
              </div>
              <div style={{ fontSize: '0.64rem', color: T.gray400, marginTop: '0.2rem' }}>{result.category}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: '20px', background: T.blueMid, color: T.blue, fontWeight: 700 }}>FAQPage Schema ✓</span>
              <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: '20px', background: T.greenMid, color: T.green, fontWeight: 700 }}>LocalBusiness Schema ✓</span>
            </div>
          </div>

          {/* SEO meta suggestion */}
          <div style={{ margin: '1rem 1.5rem 0', padding: '0.875rem 1.1rem', background: T.blueLight, border: `1px solid ${T.blueMid}`, borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>Suggested FAQ Page Title</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: T.gray800 }}>{result.seoTitle}</div>
              <div style={{ fontSize: '0.7rem', color: T.gray500, marginTop: '0.3rem' }}>{result.seoDescription}</div>
            </div>
            <CopyBtn text={result.seoTitle} label="Copy Title" />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.gray200}`, overflowX: 'auto', paddingLeft: '0.5rem', background: T.white, marginTop: '1rem' }}>
            {TABS.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{ padding: '0.8rem 1.1rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem', color: activeTab === id ? T.blue : T.gray500, borderBottom: `2px solid ${activeTab === id ? T.blue : 'transparent'}`, marginBottom: '-1px', transition: 'all 0.15s' }}>
                <span style={{ fontSize: '0.75rem' }}>{icon}</span> {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '1.5rem' }}>

            {/* FAQ QUESTIONS TAB */}
            {activeTab === 'faqs' && (
              <div>
                <div style={{ padding: '0.75rem 1rem', background: T.blueLight, border: `1px solid ${T.blueMid}`, borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.78rem', color: T.gray700, lineHeight: 1.6 }}>
                  <b style={{ color: T.blue }}>💡 What to do with these:</b> Add each question as an H2 or H3 heading on your FAQ page, followed by the answer as a paragraph. Then paste the FAQPage schema (tab 2) into your page&apos;s &lt;head&gt;.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: T.gray700 }}>{result.faqs.length} AI-Optimized Questions</span>
                  <CopyBtn text={result.faqs.map((f, i) => `Q${i+1}: ${f.question}\nA: ${f.answer}`).join('\n\n')} label="Copy All Q&A" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {result.faqs.map((faq, i) => <FaqCard key={i} faq={faq} idx={i} />)}
                </div>
              </div>
            )}

            {/* FAQPAGE SCHEMA TAB */}
            {activeTab === 'faqschema' && (
              <div>
                <div style={{ padding: '0.75rem 1rem', background: T.blueLight, border: `1px solid ${T.blueMid}`, borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.78rem', color: T.gray700, lineHeight: 1.6 }}>
                  <b style={{ color: T.blue }}>💡 Where to paste this:</b> Copy the entire code block and paste it inside the <code style={{ background: T.blueMid, padding: '1px 5px', borderRadius: '4px' }}>&lt;head&gt;</code> section of your FAQ page HTML. In WordPress, use a plugin like RankMath, Yoast, or WPCode. In Wix/Squarespace, use the custom code injection tool.
                </div>
                <SchemaBlock
                  schema={result.faqSchema}
                  title="FAQPage JSON-LD Schema"
                  description={`${result.faqs.length} Q&A pairs structured for ChatGPT, Perplexity & Google AI Overviews`}
                />
                <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
                  {[
                    { icon: '✓', label: 'ChatGPT extraction ready', color: T.green },
                    { icon: '✓', label: 'Google featured snippet eligible', color: T.green },
                    { icon: '✓', label: 'Perplexity citation ready', color: T.green },
                    { icon: '✓', label: `${result.faqs.length} Q&A pairs included`, color: T.blue },
                  ].map(b => (
                    <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.875rem', background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: b.color }}>{b.icon}</span>
                      <span style={{ fontSize: '0.73rem', color: T.gray700, fontWeight: 500 }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LOCALBUSINESS SCHEMA TAB */}
            {activeTab === 'bizschema' && (
              <div>
                <div style={{ padding: '0.75rem 1rem', background: T.greenLight, border: `1px solid ${T.greenMid}`, borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.78rem', color: T.gray700, lineHeight: 1.6 }}>
                  <b style={{ color: T.green }}>💡 Where to paste this:</b> Add this to every page of your website inside the <code style={{ background: T.greenMid, padding: '1px 5px', borderRadius: '4px' }}>&lt;head&gt;</code> tag — especially your homepage. This schema defines your business entity to AI knowledge graphs so ChatGPT, Claude and Perplexity can identify who you are.
                </div>
                <SchemaBlock
                  schema={result.localBusinessSchema}
                  title="LocalBusiness JSON-LD Schema"
                  description="Entity markup that establishes your business in AI knowledge graphs"
                />
                <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: T.amberLight, border: `1px solid ${T.amberMid}`, borderRadius: '10px', fontSize: '0.78rem', color: T.gray700, lineHeight: 1.6 }}>
                  <b style={{ color: T.amber }}>📌 Recommended additions:</b> Add <code style={{ background: T.amberMid, padding: '1px 4px', borderRadius: '3px' }}>sameAs</code> links pointing to your Google Business Profile, Yelp page, LinkedIn, and social profiles. Add <code style={{ background: T.amberMid, padding: '1px 4px', borderRadius: '3px' }}>openingHours</code> and <code style={{ background: T.amberMid, padding: '1px 4px', borderRadius: '3px' }}>priceRange</code> for richer AI citations.
                </div>
              </div>
            )}

            {/* HOW TO ADD TAB */}
            {activeTab === 'howto' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div style={{ padding: '0.75rem 1rem', background: T.blueLight, border: `1px solid ${T.blueMid}`, borderRadius: '10px', fontSize: '0.78rem', color: T.gray700, lineHeight: 1.6 }}>
                  Adding FAQPage and LocalBusiness schema to your website can get your content cited by ChatGPT, appear in Google AI Overviews, and surface in Perplexity answers. Here&apos;s exactly how to add it for every major platform.
                </div>
                {[
                  { platform: 'WordPress (RankMath / Yoast)', icon: '📝', steps: ['Install RankMath or Yoast SEO plugin', 'Edit the page where you want FAQ schema', 'Find the Schema tab in the editor sidebar', 'Select FAQPage schema type and add your Q&A', 'For LocalBusiness schema: go to RankMath → Titles & Meta → Local SEO'] },
                  { platform: 'WordPress (Manual Code)', icon: '⚙️', steps: ['Install "Insert Headers and Footers" plugin or WPCode', 'Go to the plugin settings', 'Paste the FAQPage schema code in the Footer section of specific pages', 'Paste LocalBusiness schema in the Header section of all pages', 'Save and verify with Google Rich Results Test'] },
                  { platform: 'Wix', icon: '🔷', steps: ['Open your Wix Editor', 'Go to Settings → Advanced → Custom Code', 'Click + Add Custom Code', 'Paste your schema in the code box', 'Set placement to "Head" and apply to relevant pages'] },
                  { platform: 'Squarespace', icon: '⬛', steps: ['Go to Website → Pages → select your FAQ page', 'Click the gear icon (Page Settings)', 'Click Advanced → Header Code Injection', 'Paste your FAQPage schema there', 'For all pages: Settings → Advanced → Code Injection → Header'] },
                  { platform: 'Shopify', icon: '🛍️', steps: ['Go to Online Store → Themes → Edit Code', 'Open theme.liquid file', 'Paste LocalBusiness schema just before </head>', 'For FAQ pages, create a page.faq.liquid template and add schema there'] },
                  { platform: 'HTML Website', icon: '🖥️', steps: ['Open your HTML file in a code editor', 'Find the <head> section (before </head>)', 'Paste both schema blocks there', 'Upload the updated file to your server', 'Test with: search.google.com/test/rich-results'] },
                ].map(item => (
                  <div key={item.platform} style={{ border: `1px solid ${T.gray200}`, borderRadius: '12px', overflow: 'hidden', background: T.white }}>
                    <div style={{ padding: '0.875rem 1.25rem', background: T.gray50, borderBottom: `1px solid ${T.gray100}`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: T.gray800 }}>{item.platform}</span>
                    </div>
                    <div style={{ padding: '0.875rem 1.25rem' }}>
                      <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {item.steps.map((step, i) => (
                          <li key={i} style={{ fontSize: '0.78rem', color: T.gray700, lineHeight: 1.5 }}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
                <div style={{ padding: '1rem 1.25rem', background: T.greenLight, border: `1px solid ${T.greenMid}`, borderRadius: '12px', fontSize: '0.78rem', color: T.gray700, lineHeight: 1.6 }}>
                  <b style={{ color: T.green }}>✓ Verify your schema:</b> After adding, test it at <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" style={{ color: T.blue }}>search.google.com/test/rich-results</a>. Then come back and run the <a href="/tools/aeo-geo-audit" style={{ color: T.blue }}>AEO &amp; GEO Audit Tool</a> to confirm your FAQPage schema is detected.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '0.875rem 1.5rem', borderTop: `1px solid ${T.gray100}`, background: T.gray50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', color: T.gray400 }}>Powered by</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: T.blue }}>Claude Sonnet 4</span>
              <span style={{ fontSize: '0.65rem', color: T.gray400 }}>&middot; {result.faqs.length} FAQs &middot; 2 schema types generated</span>
            </div>
            <button onClick={reset} style={{ fontSize: '0.72rem', padding: '5px 14px', border: `1px solid ${T.blue}`, borderRadius: '20px', background: T.blueLight, color: T.blue, cursor: 'pointer', fontWeight: 700 }}>
              &#8592; Generate for Another Business
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
