import { useState, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuditItem {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  scoreDisplayMode: string;
  details?: any;
  numericValue?: number;
}

interface LighthouseResult {
  categories: {
    performance?: { score: number };
    seo?: { score: number };
    accessibility?: { score: number };
    'best-practices'?: { score: number };
  };
  audits: Record<string, AuditItem>;
  fetchTime?: string;
  finalUrl?: string;
}

interface PSIResponse {
  lighthouseResult: LighthouseResult;
  loadingExperience?: {
    metrics?: {
      LARGEST_CONTENTFUL_PAINT_MS?: { percentile: number; category: string };
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile: number; category: string };
    };
  };
  error?: { code: number; message: string; errors?: { reason: string }[] };
}

interface AuditData {
  mobile: PSIResponse | null;
  desktop: PSIResponse | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(score: number | null) {
  if (score === null) return '#94a3b8';
  if (score >= 0.9) return '#16a34a';
  if (score >= 0.5) return '#d97706';
  return '#dc2626';
}
function scoreBg(score: number | null) {
  if (score === null) return '#f8fafc';
  if (score >= 0.9) return '#f0fdf4';
  if (score >= 0.5) return '#fffbeb';
  return '#fef2f2';
}
function scoreLabel(score: number | null) {
  if (score === null) return 'N/A';
  if (score >= 0.9) return 'Good';
  if (score >= 0.5) return 'Needs Work';
  return 'Poor';
}
function cwvColor(cat: string) {
  if (cat === 'FAST') return '#16a34a';
  if (cat === 'AVERAGE') return '#d97706';
  return '#dc2626';
}
function cwvBg(cat: string) {
  if (cat === 'FAST') return '#f0fdf4';
  if (cat === 'AVERAGE') return '#fffbeb';
  return '#fef2f2';
}
function auditStatus(a: AuditItem): 'pass' | 'warn' | 'fail' | 'info' {
  if (['notApplicable','manual','informative'].includes(a.scoreDisplayMode)) return 'info';
  if (a.score === null) return 'info';
  if (a.score >= 0.9) return 'pass';
  if (a.score >= 0.5) return 'warn';
  return 'fail';
}
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(0)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}
function fmtMs(ms: number) {
  return ms < 1000 ? `${ms.toFixed(0)} ms` : `${(ms/1000).toFixed(1)} s`;
}
function cwvCat(score: number | null | undefined): string {
  if (score == null) return 'SLOW';
  if (score >= 0.9) return 'FAST';
  if (score >= 0.5) return 'AVERAGE';
  return 'SLOW';
}

// ─── Score Ring (light version) ───────────────────────────────────────────────
function ScoreRing({ score, label }: { score: number | null; label: string }) {
  const size = 90;
  const r = 35;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - (score ?? 0));
  const color = scoreColor(score);
  const bg = scoreBg(score);
  return (
    <div style={{ textAlign: 'center', padding: '1.25rem 0.75rem', background: bg, borderRadius: '12px', border: `1px solid ${color}30` }}>
      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={18} fontWeight="800" fontFamily="inherit">
          {score !== null ? Math.round(score * 100) : '—'}
        </text>
      </svg>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginTop: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, color, marginTop: '0.15rem' }}>{scoreLabel(score)}</div>
    </div>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: 'pass' | 'warn' | 'fail' | 'info' }) {
  const cfg = {
    pass: { bg: '#dcfce7', color: '#16a34a', icon: '✓' },
    warn: { bg: '#fef9c3', color: '#d97706', icon: '!' },
    fail: { bg: '#fee2e2', color: '#dc2626', icon: '✗' },
    info: { bg: '#dbeafe', color: '#2563eb', icon: 'i' },
  }[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: cfg.bg, color: cfg.color, fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>
      {cfg.icon}
    </span>
  );
}

// ─── CWV Card ─────────────────────────────────────────────────────────────────
function CWVCard({ label, value, status, field, lab }: { label: string; value: string; status: string; field?: string; lab?: string }) {
  const color = cwvColor(status);
  const bg = cwvBg(status);
  return (
    <div style={{ padding: '1rem', background: bg, border: `1px solid ${color}40`, borderRadius: '10px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      {(field || lab) && (
        <div style={{ marginTop: '0.35rem', fontSize: '0.67rem', color: '#6b7280' }}>
          {field && <span>Field: <b>{field}</b> </span>}
          {lab && <span>Lab: <b>{lab}</b></span>}
        </div>
      )}
      <div style={{ fontSize: '0.67rem', fontWeight: 700, color, marginTop: '0.2rem' }}>
        {status === 'FAST' ? '✓ Good' : status === 'AVERAGE' ? '⚠ Needs Work' : '✗ Poor'}
      </div>
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
  const st = auditStatus(audit);
  const savMs = audit.details?.overallSavingsMs;
  const savBytes = audit.details?.overallSavingsBytes;
  return (
    <div style={{ borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.65rem 1rem', cursor: 'pointer', transition: 'background 0.1s' }}
        onClick={() => setOpen(p => !p)}
        onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <StatusDot status={st} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>{audit.title}</div>
          {audit.displayValue && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.1rem' }}>{audit.displayValue}</div>}
          {showSavings && (savMs || savBytes) && (
            <div style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '0.1rem', fontWeight: 600 }}>
              {savMs ? `Save ~${fmtMs(savMs)}` : ''}{savBytes ? ` · ${fmtBytes(savBytes)}` : ''}
            </div>
          )}
        </div>
        {audit.details?.items?.length > 0 && (
          <span style={{ fontSize: '0.68rem', color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▼</span>
        )}
      </div>
      {open && (
        <div style={{ padding: '0 1rem 0.75rem 3.25rem' }}>
          {audit.description && <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.4rem', lineHeight: 1.5 }}>{audit.description}</p>}
          {audit.details?.items?.slice(0, 5).map((item: any, i: number) => (
            <div key={i} style={{ fontSize: '0.72rem', color: '#6b7280', padding: '0.2rem 0', borderTop: '1px solid #f3f4f6', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {item.url || item.source?.url || item.node?.snippet || JSON.stringify(item).slice(0, 100)}
            </div>
          ))}
          {audit.details?.items?.length > 5 && <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.25rem' }}>+{audit.details.items.length - 5} more</div>}
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, icon, items, showSavings = false }: { title: string; icon: string; items: AuditItem[]; showSavings?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const failed = items.filter(a => auditStatus(a) === 'fail');
  const warned  = items.filter(a => auditStatus(a) === 'warn');
  const passed  = items.filter(a => auditStatus(a) === 'pass');
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.875rem 1rem', background: '#f9fafb', cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid #e5e7eb' }} onClick={() => setCollapsed(p => !p)}>
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', flex: 1 }}>{title}</span>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {failed.length > 0 && <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>{failed.length} failed</span>}
          {warned.length > 0 && <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px', background: '#fef9c3', color: '#d97706', fontWeight: 700 }}>{warned.length} warn</span>}
          {passed.length > 0 && <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', fontWeight: 700 }}>{passed.length} passed</span>}
        </div>
        <span style={{ fontSize: '0.68rem', color: '#9ca3af', display: 'inline-block', transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }}>▼</span>
      </div>
      {!collapsed && (
        <div>
          {failed.map(a => <AuditRow key={a.id} audit={a} showSavings={showSavings} />)}
          {warned.map(a => <AuditRow key={a.id} audit={a} showSavings={showSavings} />)}
          {passed.map(a => <AuditRow key={a.id} audit={a} />)}
          {items.length === 0 && <div style={{ padding: '1.25rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>No data for this section</div>}
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
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [activeTab, setActiveTab] = useState<'overview' | 'seo' | 'performance' | 'accessibility' | 'bestpractices'>('overview');
  const abortRef = useRef<AbortController | null>(null);

  const normalize = (input: string) => {
    let u = input.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
    return u;
  };

  const runAudit = useCallback(async () => {
    if (!url.trim()) { setError('Please enter a URL'); return; }
    const target = normalize(url);
    try { new URL(target); } catch { setError('Please enter a valid URL'); return; }

    setError(''); setData(null); setLoading(true); setProgress(0);
    abortRef.current = new AbortController();

    const steps = [
      { msg: 'Connecting to Google Lighthouse...', pct: 10 },
      { msg: 'Running mobile audit...', pct: 30 },
      { msg: 'Running desktop audit...', pct: 60 },
      { msg: 'Analyzing SEO signals...', pct: 80 },
      { msg: 'Compiling report...', pct: 95 },
    ];
    let si = 0;
    const timer = setInterval(() => {
      if (si < steps.length) { setLoadingStep(steps[si].msg); setProgress(steps[si].pct); si++; }
    }, 1800);

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
      setProgress(100);
      setLoadingStep('Done!');
      setTimeout(() => { setData({ mobile: md, desktop: dd }); setLoading(false); }, 400);
    } catch (err: any) {
      clearInterval(timer);
      setLoading(false);
      if (err.name !== 'AbortError') setError(err.message || 'Audit failed. Please try again.');
    }
  }, [url]);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') runAudit(); };

  const current = data ? (device === 'mobile' ? data.mobile : data.desktop) : null;
  const lhr     = current?.lighthouseResult;
  const audits  = lhr?.audits || {};
  const cats    = lhr?.categories || {};
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
  const totalFail = [...seoAudits,...perfOpps,...a11yAudits,...bpAudits].filter(a => auditStatus(a) === 'fail').length;
  const totalWarn = [...seoAudits,...perfOpps,...a11yAudits,...bpAudits].filter(a => auditStatus(a) === 'warn').length;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", color: '#111827', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>

      {/* ── Input section (matches speed checker card style) ── */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #f3f4f6' }}>

        {/* Device type toggle */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>Device Type</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['mobile', 'desktop'] as const).map(d => (
              <button key={d} onClick={() => setDevice(d)} style={{
                padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                border: device === d ? '2px solid #2563eb' : '2px solid #e5e7eb',
                background: device === d ? '#eff6ff' : '#fff',
                color: device === d ? '#2563eb' : '#6b7280',
                transition: 'all 0.15s',
              }}>
                {d === 'mobile' ? '📱' : '🖥️'} {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* URL input + button */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={handleKey}
            placeholder="https://yourwebsite.com" disabled={loading}
            style={{
              flex: 1, padding: '0.75rem 1rem',
              border: '1px solid #d1d5db', borderRadius: '8px',
              fontSize: '0.9rem', color: '#111827', background: '#fff',
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.target.style.borderColor = '#2563eb')}
            onBlur={e => (e.target.style.borderColor = '#d1d5db')}
          />
          <button onClick={runAudit} disabled={loading} style={{
            padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none',
            background: loading ? '#93c5fd' : '#2563eb',
            color: '#fff', fontSize: '0.88rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap', transition: 'background 0.15s',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}>
            {loading ? '⏳ Auditing...' : '⚡ Run Audit'}
          </button>
          {data && (
            <button onClick={() => { setData(null); setUrl(''); }} style={{
              padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb',
              background: '#fff', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer',
            }}>✕</button>
          )}
        </div>

        {/* Progress bar */}
        {loading && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{loadingStep}</span>
              <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ height: '5px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#2563eb', borderRadius: '3px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.8rem' }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* ── Feature icons (matches speed checker) ── */}
      {!data && !loading && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', borderBottom: '1px solid #f3f4f6' }}>
            {[
              { icon: '🎯', title: 'Google Powered', sub: 'PageSpeed Insights API' },
              { icon: '📊', title: 'Core Web Vitals', sub: 'LCP, CLS, FCP, TBT' },
              { icon: '📱', title: 'Mobile + Desktop', sub: 'Test both devices' },
              { icon: '🔒', title: 'Private', sub: '40+ SEO checks' },
            ].map(f => (
              <div key={f.title} style={{ padding: '1.5rem 1rem', textAlign: 'center', borderRight: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{f.icon}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>{f.title}</div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.15rem' }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {data && lhr && (
        <div>
          {/* Audited URL bar */}
          <div style={{ padding: '0.75rem 1.5rem', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {device === 'mobile' ? '📱' : '🖥️'} {device.charAt(0).toUpperCase()+device.slice(1)} Results for <b style={{ color: '#111827' }}>{finalUrl}</b>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {totalFail > 0 && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>{totalFail} issues</span>}
              {totalWarn > 0 && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#fef9c3', color: '#d97706', fontWeight: 700 }}>{totalWarn} warnings</span>}
              <button onClick={runAudit} style={{ fontSize: '0.72rem', padding: '3px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', color: '#6b7280', cursor: 'pointer' }}>🔄 Re-run</button>
            </div>
          </div>

          {/* Score rings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', padding: '1.5rem', borderBottom: '1px solid #f3f4f6' }}>
            {[
              { key: 'performance', label: 'Performance' },
              { key: 'seo', label: 'SEO' },
              { key: 'accessibility', label: 'Accessibility' },
              { key: 'best-practices', label: 'Best Practices' },
            ].map(({ key, label }) => (
              <ScoreRing key={key} score={cats[key as keyof typeof cats]?.score ?? null} label={label} />
            ))}
          </div>

          {/* Core Web Vitals */}
          <div style={{ padding: '1rem 1.5rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Core Web Vitals</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.65rem' }}>
              <CWVCard label="LCP" value={lcpLab?.displayValue||'—'} status={lcpField?.category||cwvCat(lcpLab?.score)} field={lcpField?`${lcpField.percentile}ms`:undefined} lab={lcpLab?.displayValue} />
              <CWVCard label="CLS" value={clsLab?.displayValue||'—'} status={clsField?.category||cwvCat(clsLab?.score)} lab={clsLab?.displayValue} />
              <CWVCard label="TBT" value={tbtLab?.displayValue||'—'} status={cwvCat(tbtLab?.score)} lab={tbtLab?.displayValue} />
              <CWVCard label="FCP" value={fcpLab?.displayValue||'—'} status={cwvCat(fcpLab?.score)} lab={fcpLab?.displayValue} />
              <CWVCard label="Speed Index" value={siLab?.displayValue||'—'} status={cwvCat(siLab?.score)} lab={siLab?.displayValue} />
              <CWVCard label="TTI" value={ttiLab?.displayValue||'—'} status={cwvCat(ttiLab?.score)} lab={ttiLab?.displayValue} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', overflowX: 'auto', paddingLeft: '1rem' }}>
            {([
              ['overview', '📊 Overview'],
              ['seo', '🔍 SEO'],
              ['performance', '⚡ Performance'],
              ['accessibility', '♿ Accessibility'],
              ['bestpractices', '✔️ Best Practices'],
            ] as const).map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '0.7rem 1rem', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
                color: activeTab === tab ? '#2563eb' : '#6b7280',
                borderBottom: `2px solid ${activeTab === tab ? '#2563eb' : 'transparent'}`,
                marginBottom: '-1px',
              }}>{label}</button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '1.25rem 1.5rem' }}>

            {activeTab === 'overview' && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                <div style={{ padding: '0.75rem 1rem', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>Critical Issues to Fix</span>
                </div>
                {[...seoAudits,...perfOpps,...a11yAudits].filter(a => auditStatus(a) === 'fail').slice(0,10).map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderBottom: '1px solid #f9fafb' }}>
                    <StatusDot status="fail" />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{a.title}</div>
                      {a.displayValue && <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{a.displayValue}</div>}
                    </div>
                  </div>
                ))}
                {[...seoAudits,...perfOpps,...a11yAudits].filter(a => auditStatus(a) === 'fail').length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#16a34a', fontSize: '0.88rem', fontWeight: 600 }}>✅ No critical issues found!</div>
                )}
              </div>
            )}

            {activeTab === 'seo' && <Section title="SEO Checks" icon="🔍" items={seoAudits} />}
            {activeTab === 'performance' && (
              <div>
                <Section title="Performance Opportunities" icon="⚡" items={perfOpps} showSavings />
                <Section title="All Performance Diagnostics" icon="🔧" items={PERF_OPPS.map(id => audits[id]).filter(Boolean).filter(a => auditStatus(a) !== 'fail')} />
              </div>
            )}
            {activeTab === 'accessibility' && <Section title="Accessibility Checks" icon="♿" items={a11yAudits} />}
            {activeTab === 'bestpractices' && <Section title="Best Practices" icon="✔️" items={bpAudits} />}
          </div>

          {/* Footer */}
          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid #f3f4f6', fontSize: '0.68rem', color: '#9ca3af', textAlign: 'center' }}>
            Powered by Google PageSpeed Insights (Lighthouse v12) · {device} · {fetchTime}
          </div>
        </div>
      )}
    </div>
  );
}
