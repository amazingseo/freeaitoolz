import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuditItem {
  id: string; title: string; description: string;
  score: number | null; displayValue?: string;
  scoreDisplayMode: string; details?: any;
}
interface LighthouseResult {
  categories: {
    performance?: { score: number };
    seo?: { score: number };
    accessibility?: { score: number };
    'best-practices'?: { score: number };
  };
  audits: Record<string, AuditItem>;
  fetchTime?: string; finalUrl?: string;
}
interface PSIResponse {
  lighthouseResult: LighthouseResult;
  loadingExperience?: { metrics?: {
    LARGEST_CONTENTFUL_PAINT_MS?: { percentile: number; category: string };
    CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile: number; category: string };
  }};
  error?: { code: number; message: string; errors?: { reason: string }[] };
}
interface AuditData { mobile: PSIResponse | null; desktop: PSIResponse | null; }

// ─── Design tokens (matching freeaitoolz.com exactly) ─────────────────────────
const T = {
  blue: '#2563eb', blueLight: '#eff6ff', blueMid: '#dbeafe',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  emerald: '#10b981', emeraldLight: '#ecfdf5',
  gray950: '#030712', gray900: '#111827', gray800: '#1f2937',
  gray700: '#374151', gray600: '#4b5563', gray500: '#6b7280',
  gray400: '#9ca3af', gray300: '#d1d5db', gray200: '#e5e7eb',
  gray100: '#f3f4f6', gray50: '#f9fafb', white: '#ffffff',
  red: '#dc2626', redLight: '#fef2f2', redMid: '#fee2e2',
  amber: '#d97706', amberLight: '#fffbeb', amberMid: '#fef9c3',
  green: '#16a34a', greenLight: '#f0fdf4', greenMid: '#dcfce7',
};

// ─── Score helpers ────────────────────────────────────────────────────────────
const scoreColor = (s: number | null) => s === null ? T.gray400 : s >= 0.9 ? T.green : s >= 0.5 ? T.amber : T.red;
const scoreBgColor = (s: number | null) => s === null ? T.gray50 : s >= 0.9 ? T.greenLight : s >= 0.5 ? T.amberLight : T.redLight;
const scoreBorderColor = (s: number | null) => s === null ? T.gray200 : s >= 0.9 ? T.greenMid : s >= 0.5 ? T.amberMid : T.redMid;
const scoreLabel = (s: number | null) => s === null ? 'N/A' : s >= 0.9 ? 'Good' : s >= 0.5 ? 'Needs Work' : 'Poor';
const cwvColor = (c: string) => c === 'FAST' ? T.green : c === 'AVERAGE' ? T.amber : T.red;
const cwvBg = (c: string) => c === 'FAST' ? T.greenLight : c === 'AVERAGE' ? T.amberLight : T.redLight;
const cwvBorder = (c: string) => c === 'FAST' ? T.greenMid : c === 'AVERAGE' ? T.amberMid : T.redMid;
const cwvCat = (s?: number | null) => s == null ? 'SLOW' : s >= 0.9 ? 'FAST' : s >= 0.5 ? 'AVERAGE' : 'SLOW';
const auditSt = (a: AuditItem): 'pass'|'warn'|'fail'|'info' => {
  if (['notApplicable','manual','informative'].includes(a.scoreDisplayMode)) return 'info';
  if (a.score === null) return 'info';
  return a.score >= 0.9 ? 'pass' : a.score >= 0.5 ? 'warn' : 'fail';
};
const fmtBytes = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(0)}KB` : `${(b/1048576).toFixed(1)}MB`;
const fmtMs = (ms: number) => ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms/1000).toFixed(1)}s`;

// ─── Animated Score Ring ──────────────────────────────────────────────────────
function ScoreRing({ score, label, animate = false }: { score: number|null; label: string; animate?: boolean }) {
  const [displayed, setDisplayed] = useState(0);
  const target = score !== null ? Math.round(score * 100) : 0;
  useEffect(() => {
    if (!animate || score === null) { setDisplayed(target); return; }
    let start = 0;
    const step = () => { start += 2; if (start >= target) { setDisplayed(target); return; } setDisplayed(start); requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, [target, animate]);

  const size = 96, r = 38, circ = 2 * Math.PI * r;
  const fill = score !== null ? score : 0;
  const dash = circ * (1 - fill);
  const color = scoreColor(score);
  const bg = scoreBgColor(score);
  const border = scoreBorderColor(score);

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.25rem 0.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle gradient overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${color}60, ${color})`, borderRadius: '16px 16px 0 0' }} />
      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={9} />
        {/* Progress */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
        {/* Center number */}
        <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={20} fontWeight="800" fontFamily="Inter,system-ui,sans-serif">
          {score !== null ? displayed : '—'}
        </text>
      </svg>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: T.gray700, marginTop: '0.5rem', letterSpacing: '-0.01em' }}>{label}</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', padding: '2px 8px', background: `${color}15`, borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700, color }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, display: 'inline-block' }} />
        {scoreLabel(score)}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'pass'|'warn'|'fail'|'info' }) {
  const cfg = {
    pass: { bg: T.greenMid, color: T.green, icon: '✓', label: 'Passed' },
    warn: { bg: T.amberMid, color: T.amber, icon: '!', label: 'Warning' },
    fail: { bg: T.redMid, color: T.red, icon: '✗', label: 'Failed' },
    info: { bg: T.blueMid, color: T.blue, icon: 'i', label: 'Info' },
  }[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: cfg.bg, color: cfg.color, fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>
      {cfg.icon}
    </span>
  );
}

// ─── CWV Card ─────────────────────────────────────────────────────────────────
function CWVCard({ label, abbr, value, status, field, lab }: { label: string; abbr: string; value: string; status: string; field?: string; lab?: string }) {
  const color = cwvColor(status);
  const bg = cwvBg(status);
  const border = cwvBorder(status);
  const icons = { FAST: '✓ Good', AVERAGE: '⚡ Moderate', SLOW: '✗ Poor' };
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: color }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{abbr}</span>
        <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: '20px', background: `${color}20`, color, fontWeight: 700 }}>{icons[status as keyof typeof icons] || '? Unknown'}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: T.gray600, marginTop: '0.3rem', fontWeight: 500 }}>{label}</div>
      {(field || lab) && (
        <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {field && <span style={{ fontSize: '0.62rem', color: T.gray500 }}>Field: <b style={{ color: T.gray700 }}>{field}</b></span>}
          {lab && <span style={{ fontSize: '0.62rem', color: T.gray500 }}>Lab: <b style={{ color: T.gray700 }}>{lab}</b></span>}
        </div>
      )}
    </div>
  );
}

// ─── Audit Groups ─────────────────────────────────────────────────────────────
const SEO_CHECKS = ['meta-description','document-title','hreflang','canonical','robots-txt','viewport','http-status-code','link-text','crawlable-anchors','is-crawlable','structured-data'];
const PERF_OPPS  = ['render-blocking-resources','unused-css-rules','unused-javascript','uses-optimized-images','uses-webp-images','uses-responsive-images','uses-text-compression','offscreen-images','unminified-css','unminified-javascript','uses-rel-preconnect','server-response-time','redirects'];
const A11Y       = ['image-alt','button-name','link-name','color-contrast','heading-order','label','html-has-lang','aria-required-attr'];
const BP         = ['is-on-https','no-vulnerable-libraries','errors-in-console','charset','deprecations','image-aspect-ratio'];

// ─── Audit Row ────────────────────────────────────────────────────────────────
function AuditRow({ audit, showSavings = false }: { audit: AuditItem; showSavings?: boolean }) {
  const [open, setOpen] = useState(false);
  const st = auditSt(audit);
  const savMs = audit.details?.overallSavingsMs;
  const savBytes = audit.details?.overallSavingsBytes;
  const hasDetails = audit.details?.items?.length > 0;
  return (
    <div style={{ borderBottom: `1px solid ${T.gray100}` }}>
      <div
        onClick={() => hasDetails && setOpen(p => !p)}
        onMouseEnter={e => { if (hasDetails) e.currentTarget.style.background = T.gray50; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.75rem 1.25rem', cursor: hasDetails ? 'pointer' : 'default', transition: 'background 0.1s' }}>
        <div style={{ marginTop: '1px' }}><StatusBadge status={st} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.83rem', fontWeight: 600, color: T.gray800, lineHeight: 1.4 }}>{audit.title}</div>
          {audit.displayValue && (
            <div style={{ fontSize: '0.72rem', color: T.gray500, marginTop: '0.1rem', fontFamily: 'monospace' }}>{audit.displayValue}</div>
          )}
          {showSavings && (savMs || savBytes) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', padding: '2px 7px', background: '#fef3c7', borderRadius: '20px', fontSize: '0.67rem', fontWeight: 700, color: '#b45309' }}>
              ⚡ {savMs ? `Save ~${fmtMs(savMs)}` : ''}{savBytes ? ` · ${fmtBytes(savBytes)}` : ''}
            </div>
          )}
        </div>
        {hasDetails && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth="2" style={{ flexShrink: 0, marginTop: '4px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>
      {open && (
        <div style={{ padding: '0 1.25rem 0.875rem 3.75rem' }}>
          {audit.description && <p style={{ fontSize: '0.75rem', color: T.gray600, margin: '0 0 0.5rem', lineHeight: 1.6 }}>{audit.description}</p>}
          {audit.details?.items?.slice(0, 5).map((item: any, i: number) => (
            <div key={i} style={{ fontSize: '0.71rem', color: T.gray600, padding: '0.25rem 0.5rem', borderRadius: '4px', background: T.gray50, marginBottom: '0.2rem', fontFamily: 'monospace', wordBreak: 'break-all', border: `1px solid ${T.gray200}` }}>
              {item.url || item.source?.url || item.node?.snippet || JSON.stringify(item).slice(0, 120)}
            </div>
          ))}
          {audit.details?.items?.length > 5 && <div style={{ fontSize: '0.68rem', color: T.gray400, marginTop: '0.3rem' }}>+{audit.details.items.length - 5} more items</div>}
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, icon, items, showSavings = false }: { title: string; icon: string; items: AuditItem[]; showSavings?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const failed = items.filter(a => auditSt(a) === 'fail');
  const warned  = items.filter(a => auditSt(a) === 'warn');
  const passed  = items.filter(a => auditSt(a) === 'pass');
  const passRate = items.length > 0 ? Math.round((passed.length / items.length) * 100) : 0;
  return (
    <div style={{ border: `1px solid ${T.gray200}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '1rem', background: T.white, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div onClick={() => setCollapsed(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: T.gray50, cursor: 'pointer', borderBottom: collapsed ? 'none' : `1px solid ${T.gray100}` }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: T.blueMid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{icon}</div>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: T.gray800, flex: 1 }}>{title}</span>
        {/* Pass rate bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {failed.length > 0 && <span style={{ fontSize: '0.67rem', padding: '2px 8px', borderRadius: '20px', background: T.redMid, color: T.red, fontWeight: 700 }}>{failed.length} failed</span>}
            {warned.length > 0 && <span style={{ fontSize: '0.67rem', padding: '2px 8px', borderRadius: '20px', background: T.amberMid, color: T.amber, fontWeight: 700 }}>{warned.length} warn</span>}
            {passed.length > 0 && <span style={{ fontSize: '0.67rem', padding: '2px 8px', borderRadius: '20px', background: T.greenMid, color: T.green, fontWeight: 700 }}>{passed.length} passed</span>}
          </div>
          {items.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '48px', height: '4px', background: T.gray200, borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${passRate}%`, background: passRate >= 80 ? T.green : passRate >= 50 ? T.amber : T.red, borderRadius: '2px' }} />
              </div>
              <span style={{ fontSize: '0.65rem', color: T.gray400, fontWeight: 600 }}>{passRate}%</span>
            </div>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth="2" style={{ transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {!collapsed && (
        <div>
          {failed.map(a => <AuditRow key={a.id} audit={a} showSavings={showSavings} />)}
          {warned.map(a => <AuditRow key={a.id} audit={a} showSavings={showSavings} />)}
          {passed.map(a => <AuditRow key={a.id} audit={a} />)}
          {items.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: T.gray400, fontSize: '0.8rem' }}>No data for this section</div>}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SeoAuditTool() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<AuditData | null>(null);
  const [error, setError] = useState('');
  const [device, setDevice] = useState<'mobile'|'desktop'>('mobile');
  const [activeTab, setActiveTab] = useState<'overview'|'seo'|'performance'|'accessibility'|'bestpractices'>('overview');
  const abortRef = useRef<AbortController | null>(null);
  const [animate, setAnimate] = useState(false);

  // ── Daily limit (5/day via localStorage) ──────────────────────────────────
  const LIMIT = 5;
  const LS_KEY = 'seo_audit_usage';
  const getUsage = (): { date: string; count: number } => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : { date: '', count: 0 };
    } catch { return { date: '', count: 0 }; }
  };
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const getRemainingChecks = (): number => {
    const usage = getUsage();
    if (usage.date !== todayStr()) return LIMIT;
    return Math.max(0, LIMIT - usage.count);
  };
  const [remaining, setRemaining] = useState<number>(getRemainingChecks);
  const incrementUsage = () => {
    const today = todayStr();
    const usage = getUsage();
    const newCount = usage.date === today ? usage.count + 1 : 1;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ date: today, count: newCount })); } catch {}
    setRemaining(Math.max(0, LIMIT - newCount));
  };

  const normalize = (s: string) => {
    let u = s.trim();
    if (!u.startsWith('http')) u = 'https://' + u;
    return u;
  };

  const runAudit = useCallback(async () => {
    if (getRemainingChecks() <= 0) { setError('LIMIT_REACHED'); return; }
    if (!url.trim()) { setError('Please enter a URL'); return; }
    const target = normalize(url);
    try { new URL(target); } catch { setError('Please enter a valid URL'); return; }
    setError(''); setData(null); setLoading(true); setProgress(0); setAnimate(false);
    abortRef.current = new AbortController();
    const steps = [
      { msg: 'Connecting to Google Lighthouse...', pct: 8 },
      { msg: 'Fetching mobile performance...', pct: 28 },
      { msg: 'Fetching desktop performance...', pct: 55 },
      { msg: 'Analyzing 40+ SEO factors...', pct: 78 },
      { msg: 'Generating audit report...', pct: 94 },
    ];
    let si = 0;
    const timer = setInterval(() => {
      if (si < steps.length) { setLoadingStep(steps[si].msg); setProgress(steps[si].pct); si++; }
    }, 1900);
    try {
      const [mr, dr] = await Promise.all([
        fetch(`/api/seo-audit?url=${encodeURIComponent(target)}&strategy=mobile`, { signal: abortRef.current.signal }),
        fetch(`/api/seo-audit?url=${encodeURIComponent(target)}&strategy=desktop`, { signal: abortRef.current.signal }),
      ]);
      const [md, dd]: [PSIResponse, PSIResponse] = await Promise.all([mr.json(), dr.json()]);
      const apiErr = md?.error || dd?.error;
      if (apiErr) {
        const code = apiErr.code;
        const reason = apiErr.errors?.[0]?.reason || '';
        if (code === 429 || reason === 'rateLimitExceeded') throw new Error('Google API quota exceeded. Please try again in a few minutes.');
        if (code === 400) throw new Error('Invalid URL — make sure the site is publicly accessible.');
        throw new Error(apiErr.message || 'Audit failed. Please try again.');
      }
      if (!md.lighthouseResult) throw new Error('No data returned. The URL may be unreachable.');
      clearInterval(timer);
      incrementUsage();
      setProgress(100);
      setLoadingStep('Audit complete!');
      setTimeout(() => { setData({ mobile: md, desktop: dd }); setLoading(false); setAnimate(true); }, 500);
    } catch (err: any) {
      clearInterval(timer);
      setLoading(false);
      if (err.name !== 'AbortError') setError(err.message || 'Audit failed. Please try again.');
    }
  }, [url]);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') runAudit(); };

  const current = data ? (device === 'mobile' ? data.mobile : data.desktop) : null;
  const lhr = current?.lighthouseResult;
  const audits = lhr?.audits || {};
  const cats = lhr?.categories || {};
  const cwvField = current?.loadingExperience?.metrics;
  const lcpField = cwvField?.LARGEST_CONTENTFUL_PAINT_MS;
  const clsField = cwvField?.CUMULATIVE_LAYOUT_SHIFT_SCORE;

  const lcpLab = audits['largest-contentful-paint'];
  const clsLab = audits['cumulative-layout-shift'];
  const tbtLab = audits['total-blocking-time'];
  const fcpLab = audits['first-contentful-paint'];
  const siLab  = audits['speed-index'];
  const ttiLab = audits['interactive'];

  const seoAudits  = SEO_CHECKS.map(id => audits[id]).filter(Boolean);
  const perfOpps   = PERF_OPPS.map(id => audits[id]).filter(Boolean).filter(a => a.score !== null && a.score < 1);
  const a11yAudits = A11Y.map(id => audits[id]).filter(Boolean);
  const bpAudits   = BP.map(id => audits[id]).filter(Boolean);

  const finalUrl  = lhr?.finalUrl || normalize(url);
  const fetchTime = lhr?.fetchTime ? new Date(lhr.fetchTime).toLocaleString() : '';
  const critFails = [...seoAudits,...perfOpps,...a11yAudits,...bpAudits].filter(a => auditSt(a) === 'fail');
  const totalWarn = [...seoAudits,...perfOpps,...a11yAudits,...bpAudits].filter(a => auditSt(a) === 'warn').length;

  // Overall health score
  const perfScore = cats['performance']?.score ?? null;
  const seoScore  = cats['seo']?.score ?? null;
  const avgScore  = (perfScore !== null && seoScore !== null) ? (perfScore + seoScore) / 2 : null;
  const healthLabel = avgScore === null ? '' : avgScore >= 0.9 ? 'Excellent' : avgScore >= 0.7 ? 'Good' : avgScore >= 0.5 ? 'Needs Work' : 'Poor';

  const TABS = [
    { id: 'overview', label: 'Overview', icon: '◎' },
    { id: 'seo', label: 'SEO', icon: '⌕' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'accessibility', label: 'Accessibility', icon: '♿' },
    { id: 'bestpractices', label: 'Best Practices', icon: '✔' },
  ] as const;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: T.gray800, background: T.white, borderRadius: '16px', border: `1px solid ${T.gray200}`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

      {/* ── Header input panel ── */}
      <div style={{ background: `linear-gradient(135deg, ${T.gray950} 0%, #1e1b4b 100%)`, padding: '1.75rem' }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: T.emerald, boxShadow: `0 0 6px ${T.emerald}` }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Google Lighthouse · Real-time Analysis</span>
        </div>

        {/* Device toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['mobile','desktop'] as const).map(d => (
            <button key={d} onClick={() => setDevice(d)} style={{
              padding: '0.45rem 1rem', borderRadius: '8px', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem',
              border: device === d ? `1.5px solid ${T.blue}` : '1.5px solid rgba(255,255,255,0.12)',
              background: device === d ? `${T.blue}20` : 'rgba(255,255,255,0.05)',
              color: device === d ? '#93c5fd' : '#94a3b8',
              transition: 'all 0.15s',
            }}>
              {d === 'mobile' ? '📱' : '🖥️'} {d === 'mobile' ? 'Mobile' : 'Desktop'}
            </button>
          ))}
        </div>

        {/* URL Input */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.9rem' }}>🌐</div>
            <input
              type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={handleKey}
              placeholder="https://yourwebsite.com" disabled={loading}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.8rem 1rem 0.8rem 2.5rem',
                background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: '10px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
                fontFamily: 'monospace', transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = `${T.blue}80`)}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>
          <button onClick={runAudit} disabled={loading || remaining === 0} style={{
            padding: '0.8rem 1.5rem', borderRadius: '10px', border: 'none',
            background: loading ? '#1e40af' : remaining === 0 ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${T.blue} 0%, ${T.violet} 100%)`,
            color: remaining === 0 ? '#475569' : T.white, fontSize: '0.88rem', fontWeight: 700,
            cursor: (loading || remaining === 0) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
            boxShadow: (loading || remaining === 0) ? 'none' : '0 4px 15px rgba(37,99,235,0.4)',
            display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s',
          }}>
            {loading ? (
              <><span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Auditing...</>
            ) : remaining === 0 ? (
              <>🔒 Limit Reached</>
            ) : (
              <>⚡ Run Audit</>
            )}
          </button>
          {data && (
            <button onClick={() => { setData(null); setUrl(''); }} style={{ padding: '0.8rem 0.875rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}>✕</button>
          )}
        </div>

        {/* Progress */}
        {loading && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{loadingStep}</span>
              <span style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${T.blue}, ${T.violet})`, borderRadius: '2px', transition: 'width 0.7s ease' }} />
            </div>
            {/* Step indicators */}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {['Mobile Audit','Desktop Audit','SEO Analysis','Performance','Report'].map((step, i) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '3px 8px', borderRadius: '20px', background: progress >= (i+1)*18 ? `${T.blue}25` : 'rgba(255,255,255,0.04)', border: `1px solid ${progress >= (i+1)*18 ? T.blue+'40' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.3s' }}>
                  <span style={{ fontSize: '0.55rem', color: progress >= (i+1)*18 ? '#93c5fd' : '#475569' }}>{progress >= (i+1)*18 ? '✓' : '○'}</span>
                  <span style={{ fontSize: '0.65rem', color: progress >= (i+1)*18 ? '#93c5fd' : '#475569', fontWeight: 600 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remaining checks indicator */}
        {!loading && (
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {Array.from({ length: LIMIT }).map((_, i) => (
                <div key={i} style={{ width: '20px', height: '4px', borderRadius: '2px', background: i < remaining ? T.emerald : 'rgba(255,255,255,0.12)', transition: 'background 0.3s' }} />
              ))}
            </div>
            <span style={{ fontSize: '0.68rem', color: remaining > 0 ? '#94a3b8' : '#f87171', fontWeight: 600 }}>
              {remaining > 0 ? `${remaining} of ${LIMIT} free audits remaining today` : 'Daily limit reached — resets at midnight'}
            </span>
          </div>
        )}

        {/* Error */}
        {error && error !== 'LIMIT_REACHED' && (
          <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span> {error}
          </div>
        )}
        {error === 'LIMIT_REACHED' && (
          <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '1rem' }}>🔒</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c4b5fd' }}>Daily Limit Reached</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              You've used all <b style={{ color: '#c4b5fd' }}>{LIMIT} free audits</b> for today. Your limit resets at midnight. Come back tomorrow for {LIMIT} more free audits!
            </p>
          </div>
        )}
      </div>

      {/* ── Feature icons (empty state) ── */}
      {!data && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${T.gray100}` }}>
          {[
            { icon: '🎯', title: 'Google Powered', sub: 'PageSpeed Insights API', color: T.blue },
            { icon: '📊', title: 'Core Web Vitals', sub: 'LCP, CLS, FCP, TBT, TTI', color: T.violet },
            { icon: '📱', title: 'Mobile + Desktop', sub: 'Both devices analyzed', color: T.emerald },
            { icon: '🔍', title: '40+ SEO Checks', sub: 'Meta, schema, crawl, perf', color: '#d97706' },
          ].map(f => (
            <div key={f.title} style={{ padding: '1.5rem 1rem', textAlign: 'center', borderRight: `1px solid ${T.gray100}` }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${f.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', margin: '0 auto 0.75rem' }}>{f.icon}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: T.gray800 }}>{f.title}</div>
              <div style={{ fontSize: '0.68rem', color: T.gray500, marginTop: '0.2rem' }}>{f.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {data && lhr && (
        <div>
          {/* Result header bar */}
          <div style={{ padding: '0.875rem 1.5rem', background: T.gray50, borderBottom: `1px solid ${T.gray100}`, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: device === 'mobile' ? T.blueLight : T.violetLight, color: device === 'mobile' ? T.blue : T.violet }}>
                  {device === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'}
                </span>
                <code style={{ fontSize: '0.73rem', color: T.gray600, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' }}>{finalUrl}</code>
              </div>
              {fetchTime && <div style={{ fontSize: '0.64rem', color: T.gray400, marginTop: '0.2rem' }}>Audited: {fetchTime}</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {avgScore !== null && (
                <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '20px', background: scoreBgColor(avgScore), color: scoreColor(avgScore), fontWeight: 700, border: `1px solid ${scoreBorderColor(avgScore)}` }}>
                  {healthLabel} Site
                </span>
              )}
              {critFails.length > 0 && <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: '20px', background: T.redMid, color: T.red, fontWeight: 700 }}>{critFails.length} issues</span>}
              {totalWarn > 0 && <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: '20px', background: T.amberMid, color: T.amber, fontWeight: 700 }}>{totalWarn} warnings</span>}
              <button onClick={runAudit} style={{ fontSize: '0.72rem', padding: '4px 12px', border: `1px solid ${T.gray200}`, borderRadius: '20px', background: T.white, color: T.gray600, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                🔄 Re-run
              </button>
            </div>
          </div>

          {/* Score rings */}
          <div style={{ padding: '1.5rem', borderBottom: `1px solid ${T.gray100}` }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.gray400, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Lighthouse Scores</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[{key:'performance',label:'Performance'},{key:'seo',label:'SEO'},{key:'accessibility',label:'Accessibility'},{key:'best-practices',label:'Best Practices'}].map(({ key, label }) => (
                <ScoreRing key={key} score={cats[key as keyof typeof cats]?.score ?? null} label={label} animate={animate} />
              ))}
            </div>
          </div>

          {/* Core Web Vitals */}
          <div style={{ padding: '1rem 1.5rem 1.5rem', borderBottom: `1px solid ${T.gray100}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.gray400, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Core Web Vitals</div>
              <a href="https://web.dev/vitals/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: T.blue, textDecoration: 'none', fontWeight: 600 }}>Learn more →</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '0.65rem' }}>
              <CWVCard abbr="LCP" label="Largest Contentful Paint" value={lcpLab?.displayValue||'—'} status={lcpField?.category||cwvCat(lcpLab?.score)} field={lcpField?`${lcpField.percentile}ms`:undefined} lab={lcpLab?.displayValue} />
              <CWVCard abbr="CLS" label="Cumulative Layout Shift" value={clsLab?.displayValue||'—'} status={clsField?.category||cwvCat(clsLab?.score)} lab={clsLab?.displayValue} />
              <CWVCard abbr="TBT" label="Total Blocking Time" value={tbtLab?.displayValue||'—'} status={cwvCat(tbtLab?.score)} lab={tbtLab?.displayValue} />
              <CWVCard abbr="FCP" label="First Contentful Paint" value={fcpLab?.displayValue||'—'} status={cwvCat(fcpLab?.score)} lab={fcpLab?.displayValue} />
              <CWVCard abbr="SI" label="Speed Index" value={siLab?.displayValue||'—'} status={cwvCat(siLab?.score)} lab={siLab?.displayValue} />
              <CWVCard abbr="TTI" label="Time to Interactive" value={ttiLab?.displayValue||'—'} status={cwvCat(ttiLab?.score)} lab={ttiLab?.displayValue} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.gray200}`, overflowX: 'auto', paddingLeft: '0.5rem', background: T.white }}>
            {TABS.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                padding: '0.8rem 1.1rem', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                color: activeTab === id ? T.blue : T.gray500,
                borderBottom: `2px solid ${activeTab === id ? T.blue : 'transparent'}`,
                marginBottom: '-1px', transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: '0.75rem' }}>{icon}</span> {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '1.5rem' }}>
            {activeTab === 'overview' && (
              <div>
                {/* Priority fixes */}
                {critFails.length > 0 && (
                  <div style={{ border: `1px solid ${T.redMid}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '1.25rem', background: '#fff5f5', boxShadow: '0 1px 3px rgba(220,38,38,0.08)' }}>
                    <div style={{ padding: '0.875rem 1.25rem', background: T.redMid, display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: `1px solid ${T.redMid}` }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>⚠️</div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: T.red }}>Critical Issues — Fix These First</div>
                        <div style={{ fontSize: '0.68rem', color: T.red, opacity: 0.8 }}>{critFails.length} issues directly impacting your rankings</div>
                      </div>
                    </div>
                    {critFails.slice(0, 8).map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.7rem 1.25rem', borderBottom: `1px solid ${T.redMid}` }}>
                        <StatusBadge status="fail" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: T.gray800 }}>{a.title}</div>
                          {a.displayValue && <div style={{ fontSize: '0.7rem', color: T.gray500, marginTop: '0.1rem' }}>{a.displayValue}</div>}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: T.red, fontWeight: 700, padding: '2px 7px', background: T.redMid, borderRadius: '10px', whiteSpace: 'nowrap' }}>Fix needed</span>
                      </div>
                    ))}
                    {critFails.length > 8 && <div style={{ padding: '0.6rem 1.25rem', fontSize: '0.72rem', color: T.red, fontWeight: 600 }}>+{critFails.length - 8} more issues — check individual tabs above</div>}
                  </div>
                )}
                {critFails.length === 0 && (
                  <div style={{ padding: '1.5rem', textAlign: 'center', background: T.greenLight, borderRadius: '14px', border: `1px solid ${T.greenMid}`, marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🎉</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: T.green }}>No Critical Issues Found!</div>
                    <div style={{ fontSize: '0.75rem', color: T.gray600, marginTop: '0.25rem' }}>Your site passed all critical SEO and performance checks</div>
                  </div>
                )}
                {/* Quick metric summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  {[
                    { label: 'SEO Health', value: seoScore !== null ? `${Math.round(seoScore * 100)}/100` : '—', color: scoreColor(seoScore), icon: '🔍' },
                    { label: 'Performance', value: perfScore !== null ? `${Math.round(perfScore * 100)}/100` : '—', color: scoreColor(perfScore), icon: '⚡' },
                    { label: 'Issues Found', value: `${critFails.length}`, color: critFails.length > 0 ? T.red : T.green, icon: '⚠️' },
                    { label: 'Warnings', value: `${totalWarn}`, color: totalWarn > 0 ? T.amber : T.green, icon: '!' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '1rem 1.1rem', border: `1px solid ${T.gray200}`, borderRadius: '12px', background: T.white, borderLeft: `3px solid ${s.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.9rem' }}>{s.icon}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.gray500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'seo' && <Section title="SEO Checks" icon="🔍" items={seoAudits} />}
            {activeTab === 'performance' && (
              <div>
                <Section title="Performance Opportunities" icon="⚡" items={perfOpps} showSavings />
                <Section title="All Performance Diagnostics" icon="🔧" items={PERF_OPPS.map(id => audits[id]).filter(Boolean).filter(a => auditSt(a) !== 'fail')} />
              </div>
            )}
            {activeTab === 'accessibility' && <Section title="Accessibility Checks" icon="♿" items={a11yAudits} />}
            {activeTab === 'bestpractices' && <Section title="Best Practices" icon="✔️" items={bpAudits} />}
          </div>

          {/* Footer */}
          <div style={{ padding: '0.875rem 1.5rem', borderTop: `1px solid ${T.gray100}`, background: T.gray50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', color: T.gray400 }}>Powered by</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: T.blue }}>Google PageSpeed Insights</span>
              <span style={{ fontSize: '0.65rem', color: T.gray400 }}>· Lighthouse v12 · {device} · {fetchTime}</span>
            </div>
            <button onClick={runAudit} style={{ fontSize: '0.72rem', padding: '5px 14px', border: `1px solid ${T.blue}`, borderRadius: '20px', background: T.blueLight, color: T.blue, cursor: 'pointer', fontWeight: 700 }}>
              🔄 Re-run Audit
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
