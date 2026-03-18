import { useState, useCallback, useRef } from 'react';

// ─── Read API key baked in by Astro/Vercel at build time ──────────────────────
const ENV_API_KEY: string = typeof import.meta !== 'undefined'
  ? ((import.meta as any).env?.PUBLIC_PAGESPEED_API_KEY ?? '')
  : '';

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
  warnings?: string[];
}

interface LighthouseResult {
  categories: {
    performance?: { score: number; title: string };
    seo?: { score: number; title: string };
    accessibility?: { score: number; title: string };
    'best-practices'?: { score: number; title: string };
  };
  audits: Record<string, AuditItem>;
  configSettings?: { formFactor: string };
  fetchTime?: string;
  finalUrl?: string;
}

interface PSIResponse {
  lighthouseResult: LighthouseResult;
  loadingExperience?: {
    metrics?: {
      LARGEST_CONTENTFUL_PAINT_MS?: { percentile: number; category: string };
      FIRST_INPUT_DELAY_MS?: { percentile: number; category: string };
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile: number; category: string };
      INTERACTION_TO_NEXT_PAINT?: { percentile: number; category: string };
    };
    overall_category?: string;
  };
  id?: string;
}

interface AuditData {
  mobile: PSIResponse | null;
  desktop: PSIResponse | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(score: number | null): string {
  if (score === null) return '#94a3b8';
  if (score >= 0.9) return '#22c55e';
  if (score >= 0.5) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(score: number | null): string {
  if (score === null) return 'N/A';
  if (score >= 0.9) return 'Good';
  if (score >= 0.5) return 'Needs Work';
  return 'Poor';
}

function cwvColor(category: string): string {
  if (category === 'FAST') return '#22c55e';
  if (category === 'AVERAGE') return '#f59e0b';
  return '#ef4444';
}

function auditScore(a: AuditItem): 'pass' | 'warn' | 'fail' | 'info' {
  if (a.scoreDisplayMode === 'notApplicable' || a.scoreDisplayMode === 'manual') return 'info';
  if (a.scoreDisplayMode === 'informative') return 'info';
  if (a.score === null) return 'info';
  if (a.score >= 0.9) return 'pass';
  if (a.score >= 0.5) return 'warn';
  return 'fail';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, label, size = 80 }: { score: number | null; label: string; size?: number }) {
  const pct = score !== null ? score : 0;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct);
  const color = scoreColor(score);
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={size === 80 ? 17 : 14} fontWeight="800" fontFamily="inherit">
          {score !== null ? Math.round(score * 100) : '—'}
        </text>
      </svg>
      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '0.68rem', color, fontWeight: 700, marginTop: '0.1rem' }}>{scoreLabel(score)}</div>
    </div>
  );
}

// ─── Status Icon ──────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: 'pass' | 'warn' | 'fail' | 'info' }) {
  const cfg = {
    pass: { icon: '✓', bg: '#dcfce7', color: '#16a34a' },
    warn: { icon: '!', bg: '#fef9c3', color: '#ca8a04' },
    fail: { icon: '✗', bg: '#fee2e2', color: '#dc2626' },
    info: { icon: 'i', bg: '#dbeafe', color: '#2563eb' },
  }[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '20px', height: '20px', borderRadius: '50%',
      background: cfg.bg, color: cfg.color,
      fontSize: '0.72rem', fontWeight: 800, flexShrink: 0,
    }}>{cfg.icon}</span>
  );
}

// ─── CWV Metric ───────────────────────────────────────────────────────────────
function CWVMetric({ label, value, status, field, lab }: { label: string; value: string; status: string; field?: string; lab?: string }) {
  const color = cwvColor(status);
  const bg = status === 'FAST' ? '#0f2a1a' : status === 'AVERAGE' ? '#2a1f0a' : '#2a0f0f';
  return (
    <div style={{ padding: '1rem', background: bg, border: `1px solid ${color}30`, borderRadius: '10px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      {(field || lab) && (
        <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {field && <span style={{ fontSize: '0.67rem', color: '#64748b' }}>Field: <b style={{ color: '#94a3b8' }}>{field}</b></span>}
          {lab && <span style={{ fontSize: '0.67rem', color: '#64748b' }}>Lab: <b style={{ color: '#94a3b8' }}>{lab}</b></span>}
        </div>
      )}
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color, marginTop: '0.25rem', textTransform: 'uppercase' }}>{status.replace('_', ' ')}</div>
    </div>
  );
}

// ─── SEO Audit Groups ─────────────────────────────────────────────────────────
const SEO_CHECKS = [
  'meta-description', 'document-title', 'hreflang', 'canonical', 'robots-txt',
  'viewport', 'http-status-code', 'link-text', 'crawlable-anchors', 'is-crawlable', 'structured-data',
];
const PERFORMANCE_OPPS = [
  'render-blocking-resources', 'unused-css-rules', 'unused-javascript',
  'uses-optimized-images', 'uses-webp-images', 'uses-responsive-images',
  'uses-text-compression', 'efficient-animated-content', 'offscreen-images',
  'unminified-css', 'unminified-javascript', 'uses-rel-preconnect',
  'server-response-time', 'redirects', 'uses-http2',
];
const ACCESSIBILITY_CHECKS = [
  'image-alt', 'button-name', 'link-name', 'color-contrast', 'document-title',
  'frame-title', 'heading-order', 'label', 'list-item', 'listitem',
  'html-has-lang', 'html-lang-valid', 'input-image-alt', 'aria-required-attr',
];
const BEST_PRACTICE_CHECKS = [
  'is-on-https', 'no-vulnerable-libraries', 'csp-xss', 'geolocation-on-start',
  'notification-on-start', 'uses-http2', 'errors-in-console', 'inspector-issues',
  'valid-source-maps', 'charset', 'deprecations', 'image-aspect-ratio',
];

// ─── Audit Row ────────────────────────────────────────────────────────────────
function AuditRow({ audit, showSavings = false }: { audit: AuditItem; showSavings?: boolean }) {
  const [open, setOpen] = useState(false);
  const status = auditScore(audit);
  const savings = audit.details?.overallSavingsMs || audit.details?.overallSavingsBytes;
  const hasSavings = savings && savings > 0;
  return (
    <div style={{ borderBottom: '1px solid #1e293b' }}>
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.7rem 0.875rem', cursor: 'pointer', transition: 'background 0.1s' }}
        onClick={() => setOpen(p => !p)}
        onMouseEnter={e => (e.currentTarget.style.background = '#0f172a')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <StatusIcon status={status} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.3 }}>{audit.title}</div>
          {audit.displayValue && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>{audit.displayValue}</div>}
          {showSavings && hasSavings && (
            <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.15rem', fontWeight: 600 }}>
              {audit.details?.overallSavingsMs ? `Save ~${formatMs(audit.details.overallSavingsMs)}` : ''}
              {audit.details?.overallSavingsBytes ? ` · ${formatBytes(audit.details.overallSavingsBytes)}` : ''}
            </div>
          )}
        </div>
        {audit.details?.items?.length > 0 && (
          <span style={{ fontSize: '0.7rem', color: '#475569', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
        )}
      </div>
      {open && audit.description && (
        <div style={{ padding: '0 0.875rem 0.75rem 3rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem', lineHeight: 1.5 }}>{audit.description}</p>
          {audit.details?.items?.slice(0, 5).map((item: any, i: number) => (
            <div key={i} style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '0.25rem 0', borderTop: '1px solid #1e293b', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {item.url || item.source?.url || item.node?.snippet || JSON.stringify(item).slice(0, 120)}
            </div>
          ))}
          {audit.details?.items?.length > 5 && (
            <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.25rem' }}>+{audit.details.items.length - 5} more items</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, icon, items, showSavings = false }: {
  title: string; icon: string; items: AuditItem[]; showSavings?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const failed = items.filter(a => auditScore(a) === 'fail');
  const warned = items.filter(a => auditScore(a) === 'warn');
  const passed = items.filter(a => auditScore(a) === 'pass');
  return (
    <div style={{ border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: '#0a1628', cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid #1e293b' }}
        onClick={() => setCollapsed(p => !p)}
      >
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', flex: 1 }}>{title}</span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {failed.length > 0 && <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>{failed.length} failed</span>}
          {warned.length > 0 && <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '10px', background: '#fef9c3', color: '#ca8a04', fontWeight: 700 }}>{warned.length} warn</span>}
          {passed.length > 0 && <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', fontWeight: 700 }}>{passed.length} passed</span>}
        </div>
        <span style={{ fontSize: '0.72rem', color: '#475569', transition: 'transform 0.2s', display: 'inline-block', transform: collapsed ? 'none' : 'rotate(180deg)' }}>▼</span>
      </div>
      {!collapsed && (
        <div style={{ background: '#060d1a' }}>
          {failed.map(a => <AuditRow key={a.id} audit={a} showSavings={showSavings} />)}
          {warned.map(a => <AuditRow key={a.id} audit={a} showSavings={showSavings} />)}
          {passed.map(a => <AuditRow key={a.id} audit={a} />)}
          {items.length === 0 && (
            <div style={{ padding: '1.25rem', textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>No data available for this section</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SeoAuditTool() {
  const [url, setUrl] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(ENV_API_KEY);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<AuditData | null>(null);
  const [error, setError] = useState('');
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [activeTab, setActiveTab] = useState<'overview' | 'seo' | 'performance' | 'accessibility' | 'bestpractices'>('overview');
  const abortRef = useRef<AbortController | null>(null);

  const normalizeUrl = (input: string): string => {
    let u = input.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
    return u;
  };

  const runAudit = useCallback(async () => {
    if (!url.trim()) { setError('Please enter a URL'); return; }
    const target = normalizeUrl(url);
    try { new URL(target); } catch { setError('Please enter a valid URL'); return; }

    setError('');
    setData(null);
    setLoading(true);
    setProgress(0);
    abortRef.current = new AbortController();

    const steps = [
      { msg: 'Connecting to Google Lighthouse...', pct: 10 },
      { msg: 'Running mobile audit...', pct: 30 },
      { msg: 'Running desktop audit...', pct: 60 },
      { msg: 'Analyzing SEO signals...', pct: 80 },
      { msg: 'Compiling report...', pct: 95 },
    ];

    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      if (stepIdx < steps.length) {
        setLoadingStep(steps[stepIdx].msg);
        setProgress(steps[stepIdx].pct);
        stepIdx++;
      }
    }, 1800);

    try {
      const keyParam = apiKeyInput.trim() ? `&key=${encodeURIComponent(apiKeyInput.trim())}` : '';
      const base = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(target)}&category=performance&category=seo&category=accessibility&category=best-practices${keyParam}`;

      const [mobileRes, desktopRes] = await Promise.all([
        fetch(`${base}&strategy=mobile`, { signal: abortRef.current.signal }),
        fetch(`${base}&strategy=desktop`, { signal: abortRef.current.signal }),
      ]);

      const [mobileData, desktopData] = await Promise.all([mobileRes.json(), desktopRes.json()]);

      const apiErr = mobileData?.error || desktopData?.error;
      if (apiErr) {
        const code = apiErr.code;
        const reason = apiErr.errors?.[0]?.reason || '';
        if (code === 429 || reason === 'rateLimitExceeded' || reason === 'RATE_LIMIT_EXCEEDED') {
          throw new Error('QUOTA_EXCEEDED');
        }
        if (code === 400) throw new Error('Invalid URL — make sure the site is publicly accessible.');
        if (code === 403) throw new Error('API key is invalid or missing required permissions.');
        throw new Error(apiErr.message || 'Audit failed. Please try again.');
      }

      if (!mobileData.lighthouseResult) throw new Error('No audit data returned. The URL may be unreachable or blocked.');

      clearInterval(stepTimer);
      setProgress(100);
      setLoadingStep('Done!');

      setTimeout(() => {
        setData({ mobile: mobileData, desktop: desktopData });
        setLoading(false);
      }, 400);

    } catch (err: any) {
      clearInterval(stepTimer);
      setLoading(false);
      if (err.name !== 'AbortError') setError(err.message || 'Audit failed. Please try again.');
    }
  }, [url, apiKeyInput]);

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
  const siLab = audits['speed-index'];
  const ttiLab = audits['interactive'];

  const seoAudits = SEO_CHECKS.map(id => audits[id]).filter(Boolean);
  const perfOpps = PERFORMANCE_OPPS.map(id => audits[id]).filter(Boolean).filter(a => a.score !== null && a.score < 1);
  const a11yAudits = ACCESSIBILITY_CHECKS.map(id => audits[id]).filter(Boolean);
  const bpAudits = BEST_PRACTICE_CHECKS.map(id => audits[id]).filter(Boolean);

  const finalUrl = lhr?.finalUrl || normalizeUrl(url);
  const fetchTime = lhr?.fetchTime ? new Date(lhr.fetchTime).toLocaleString() : '';

  const totalIssues = [...seoAudits, ...perfOpps, ...a11yAudits, ...bpAudits].filter(a => auditScore(a) === 'fail').length;
  const totalWarnings = [...seoAudits, ...perfOpps, ...a11yAudits, ...bpAudits].filter(a => auditScore(a) === 'warn').length;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", color: '#e2e8f0', background: '#030b18', borderRadius: '16px', overflow: 'hidden' }}>

      {/* ── URL Input Bar ── */}
      <div style={{ padding: '1.5rem', background: '#060d1a', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: '#475569' }}>🌐</span>
            <input
              type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={handleKey}
              placeholder="https://yourwebsite.com" disabled={loading}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                background: '#0a1628', border: '2px solid #1e293b',
                borderRadius: '10px', color: '#e2e8f0',
                fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s',
                fontFamily: 'monospace',
              }}
              onFocus={e => (e.target.style.borderColor = '#3b82f6')}
              onBlur={e => (e.target.style.borderColor = '#1e293b')}
            />
          </div>
          <button onClick={runAudit} disabled={loading} style={{
            padding: '0.75rem 1.75rem', borderRadius: '10px', border: 'none',
            background: loading ? '#1e293b' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff', fontSize: '0.88rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
            boxShadow: loading ? 'none' : '0 4px 15px rgba(59,130,246,0.4)',
          }}>
            {loading ? '⏳ Auditing...' : '⚡ Run Audit'}
          </button>
          {data && (
            <button onClick={() => { setData(null); setUrl(''); }} style={{
              padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #1e293b',
              background: 'transparent', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer',
            }}>✕ Clear</button>
          )}
        </div>

        {/* Loading progress */}
        {loading && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{loadingStep}</span>
              <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: '2px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}

        {/* API Key input — only shown when env key NOT set */}
        {!ENV_API_KEY && (
          <div style={{ marginTop: '0.75rem' }}>
            <button onClick={() => setShowApiKey(p => !p)} style={{
              fontSize: '0.72rem', color: '#475569', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
            }}>
              {showApiKey ? '▲ Hide' : '▼ Add free Google API key (fixes quota errors)'}
            </button>
            {apiKeyInput && <span style={{ fontSize: '0.68rem', color: '#22c55e', marginLeft: '0.5rem' }}>✓ Key set</span>}
          </div>
        )}
        {!ENV_API_KEY && showApiKey && (
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy... paste your free API key here"
              style={{
                flex: 1, minWidth: '260px', padding: '0.5rem 0.75rem',
                background: '#0a1628', border: '1px solid #1e293b',
                borderRadius: '8px', color: '#e2e8f0', fontSize: '0.78rem',
                outline: 'none', fontFamily: 'monospace',
              }}
              onFocus={e => (e.target.style.borderColor = '#3b82f6')}
              onBlur={e => (e.target.style.borderColor = '#1e293b')}
            />
            <a href="https://developers.google.com/speed/docs/insights/v5/get-started#key"
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.72rem', color: '#3b82f6', alignSelf: 'center', whiteSpace: 'nowrap' }}>
              Get free key →
            </a>
          </div>
        )}

        {/* Error display */}
        {error === 'QUOTA_EXCEEDED' ? (
          <div style={{ marginTop: '0.75rem', padding: '1rem', background: '#1a1200', border: '1px solid #f59e0b', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.5rem' }}>
              ⚠️ Google API Daily Quota Exceeded
            </div>
            <p style={{ fontSize: '0.78rem', color: '#92400e', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
              The shared anonymous Google PageSpeed quota has been exhausted for today. This resets at midnight UTC.
              To fix immediately, add a free personal API key:
            </p>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#78350f', lineHeight: 1.8 }}>
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: '#f59e0b' }}>console.cloud.google.com/apis/credentials</a></li>
              <li>Click <b>Create Credentials → API Key</b></li>
              <li>Enable the <b>PageSpeed Insights API</b> in your project</li>
              <li>Add it as <code style={{ background: '#2a1800', padding: '1px 4px', borderRadius: '3px' }}>PUBLIC_PAGESPEED_API_KEY</code> in Vercel env vars and redeploy</li>
            </ol>
            <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#78350f' }}>
              💡 Your own free key gives you 25,000 audits per day at zero cost.
            </div>
          </div>
        ) : error ? (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#2a0f0f', border: '1px solid #dc2626', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem' }}>
            ⚠️ {error}
          </div>
        ) : null}
      </div>

      {/* ── Empty State ── */}
      {!data && !loading && (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔍</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>Real-time SEO audit powered by Google Lighthouse</div>
          <div style={{ fontSize: '0.82rem', color: '#475569', maxWidth: '500px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Enter any URL above to get a comprehensive SEO, performance, accessibility, and best practices report — the same data Google uses to rank your site.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', maxWidth: '480px', margin: '0 auto', textAlign: 'left' }}>
            {[
              { icon: '📊', t: 'Performance Score', d: 'LCP, CLS, FID, TBT, FCP, TTI' },
              { icon: '🔍', t: 'SEO Checks', d: 'Title, meta, canonical, robots, schema' },
              { icon: '♿', t: 'Accessibility', d: 'WCAG compliance, alt text, contrast' },
              { icon: '⚡', t: 'Opportunities', d: 'Specific fixes with time/size savings' },
            ].map(f => (
              <div key={f.t} style={{ padding: '0.875rem', background: '#060d1a', border: '1px solid #1e293b', borderRadius: '10px' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.3rem' }}>{f.icon}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>{f.t}</div>
                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.2rem' }}>{f.d}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: '1.25rem', fontSize: '0.73rem', color: '#334155' }}>
            Powered by Google PageSpeed Insights API · 100% free
          </p>
        </div>
      )}

      {/* ── Results ── */}
      {data && lhr && (
        <div>
          {/* Header bar */}
          <div style={{ padding: '0.875rem 1.25rem', background: '#060d1a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#475569', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{finalUrl}</div>
              {fetchTime && <div style={{ fontSize: '0.65rem', color: '#334155', marginTop: '0.15rem' }}>Audited: {fetchTime}</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {totalIssues > 0 && <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>{totalIssues} issues</span>}
              {totalWarnings > 0 && <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: '#fef9c3', color: '#ca8a04', fontWeight: 700 }}>{totalWarnings} warnings</span>}
            </div>
            {/* Device toggle */}
            <div style={{ display: 'flex', background: '#1e293b', borderRadius: '8px', padding: '2px', gap: '1px' }}>
              {(['mobile', 'desktop'] as const).map(d => (
                <button key={d} onClick={() => setDevice(d)} style={{
                  padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '0.76rem', fontWeight: 600,
                  background: device === d ? '#3b82f6' : 'transparent',
                  color: device === d ? '#fff' : '#64748b',
                }}>
                  {d === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'}
                </button>
              ))}
            </div>
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', overflowX: 'auto', background: '#060d1a' }}>
            {([
              ['overview', '📊 Overview'],
              ['seo', '🔍 SEO'],
              ['performance', '⚡ Performance'],
              ['accessibility', '♿ Accessibility'],
              ['bestpractices', '✔️ Best Practices'],
            ] as const).map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '0.65rem 1.1rem', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '0.79rem', fontWeight: 600, whiteSpace: 'nowrap',
                color: activeTab === tab ? '#3b82f6' : '#64748b',
                borderBottom: `2px solid ${activeTab === tab ? '#3b82f6' : 'transparent'}`,
                marginBottom: '-1px',
              }}>{label}</button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '1.25rem' }}>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    { key: 'performance', label: 'Performance' },
                    { key: 'seo', label: 'SEO' },
                    { key: 'accessibility', label: 'Accessibility' },
                    { key: 'best-practices', label: 'Best Practices' },
                  ].map(({ key, label }) => (
                    <div key={key} style={{ padding: '1.25rem 0.5rem', background: '#060d1a', border: '1px solid #1e293b', borderRadius: '12px', textAlign: 'center' }}>
                      <ScoreRing score={cats[key as keyof typeof cats]?.score ?? null} label={label} />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Core Web Vitals</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.65rem' }}>
                    <CWVMetric label="Largest Contentful Paint" value={lcpLab?.displayValue || '—'}
                      status={lcpField?.category || (lcpLab?.score != null ? (lcpLab.score >= 0.9 ? 'FAST' : lcpLab.score >= 0.5 ? 'AVERAGE' : 'SLOW') : 'SLOW')}
                      field={lcpField ? `${lcpField.percentile}ms` : undefined} lab={lcpLab?.displayValue} />
                    <CWVMetric label="Cumulative Layout Shift" value={clsLab?.displayValue || '—'}
                      status={clsField?.category || (clsLab?.score != null ? (clsLab.score >= 0.9 ? 'FAST' : clsLab.score >= 0.5 ? 'AVERAGE' : 'SLOW') : 'SLOW')}
                      lab={clsLab?.displayValue} />
                    <CWVMetric label="Total Blocking Time" value={tbtLab?.displayValue || '—'}
                      status={tbtLab?.score != null ? (tbtLab.score >= 0.9 ? 'FAST' : tbtLab.score >= 0.5 ? 'AVERAGE' : 'SLOW') : 'SLOW'}
                      lab={tbtLab?.displayValue} />
                    <CWVMetric label="First Contentful Paint" value={fcpLab?.displayValue || '—'}
                      status={fcpLab?.score != null ? (fcpLab.score >= 0.9 ? 'FAST' : fcpLab.score >= 0.5 ? 'AVERAGE' : 'SLOW') : 'SLOW'}
                      lab={fcpLab?.displayValue} />
                    <CWVMetric label="Speed Index" value={siLab?.displayValue || '—'}
                      status={siLab?.score != null ? (siLab.score >= 0.9 ? 'FAST' : siLab.score >= 0.5 ? 'AVERAGE' : 'SLOW') : 'SLOW'}
                      lab={siLab?.displayValue} />
                    <CWVMetric label="Time to Interactive" value={ttiLab?.displayValue || '—'}
                      status={ttiLab?.score != null ? (ttiLab.score >= 0.9 ? 'FAST' : ttiLab.score >= 0.5 ? 'AVERAGE' : 'SLOW') : 'SLOW'}
                      lab={ttiLab?.displayValue} />
                  </div>
                </div>

                <div style={{ background: '#060d1a', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #1e293b' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>Critical Issues to Fix</span>
                  </div>
                  {[...seoAudits, ...perfOpps, ...a11yAudits].filter(a => auditScore(a) === 'fail').slice(0, 8).map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', borderBottom: '1px solid #0f172a' }}>
                      <StatusIcon status="fail" />
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{a.title}</div>
                        {a.displayValue && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{a.displayValue}</div>}
                      </div>
                    </div>
                  ))}
                  {[...seoAudits, ...perfOpps, ...a11yAudits].filter(a => auditScore(a) === 'fail').length === 0 && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#22c55e', fontSize: '0.85rem' }}>
                      ✅ No critical issues found!
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'seo' && <Section title="SEO Checks" icon="🔍" items={seoAudits} />}

            {activeTab === 'performance' && (
              <div>
                <Section title="Performance Opportunities" icon="⚡" items={perfOpps} showSavings />
                <Section title="All Performance Diagnostics" icon="🔧" items={
                  PERFORMANCE_OPPS.map(id => audits[id]).filter(Boolean).filter(a => auditScore(a) !== 'fail')
                } />
              </div>
            )}

            {activeTab === 'accessibility' && <Section title="Accessibility Checks" icon="♿" items={a11yAudits} />}

            {activeTab === 'bestpractices' && <Section title="Best Practices" icon="✔️" items={bpAudits} />}
          </div>

          {/* Footer */}
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.68rem', color: '#334155' }}>Google PageSpeed Insights (Lighthouse v12) · {device} · {fetchTime}</span>
            <button onClick={runAudit} style={{ padding: '4px 12px', border: '1px solid #1e293b', borderRadius: '6px', background: 'transparent', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer' }}>
              🔄 Re-run Audit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
