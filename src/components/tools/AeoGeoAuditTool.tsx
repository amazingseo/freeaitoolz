import { useState, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuditData {
  url: string; domain: string; origin: string; brandName: string; fetchedAt: string;
  pageTitle: string; metaDescription: string; metaDescriptionLength: number;
  pageFetchError?: string;
  schemaTypes: string[];
  hasFaqSchema: boolean; hasArticleSchema: boolean; hasHowToSchema: boolean;
  hasBreadcrumbSchema: boolean; hasOrganizationSchema: boolean; hasWebSiteSchema: boolean; hasProductSchema: boolean;
  h1Count: number; h2Count: number; h3Count: number;
  questionHeadings: string[]; listCount: number; tableCount: number;
  hasAuthor: boolean; hasDate: boolean; hasAboutPage: boolean;
  hasCanonical: boolean; canonical: string;
  hasOgTags: boolean; hasTwitterCard: boolean;
  isHttps: boolean; hasSitemap: boolean; sitemapUrl: string;
  robots: { gptbot: string; claudebot: string; perplexitybot: string; googleExtended: string; ccbot: string; bingbot: string };
}

interface AICheckData {
  domain: string; brand: string; mentionCount: number; score: number; sentiment: string;
  results: { prompt: string; response: string; mentioned: boolean }[];
  error?: string; message?: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
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

// ─── Scoring ──────────────────────────────────────────────────────────────────
interface Check { id: string; label: string; description: string; pass: boolean; weight: number; impact: 'high'|'medium'|'low'; fix?: string; }

function computeAeoChecks(d: AuditData): Check[] {
  return [
    { id:'faq_schema', label:'FAQ Schema (FAQPage)', description:'JSON-LD FAQPage schema feeds Q&A directly to AI engines and featured snippets', pass: d.hasFaqSchema, weight: 20, impact:'high', fix:'Add FAQPage schema with question/answer pairs that match visible FAQ content on the page.' },
    { id:'article_schema', label:'Article Schema', description:'Article/BlogPosting schema tells AI engines this is authoritative written content', pass: d.hasArticleSchema, weight: 10, impact:'high', fix:'Add Article or BlogPosting schema with headline, author, datePublished, and description.' },
    { id:'howto_schema', label:'HowTo Schema', description:'HowTo schema structures instructional content for AI extraction and featured snippets', pass: d.hasHowToSchema, weight: 8, impact:'medium', fix:'For how-to content, add HowTo schema with step-by-step instructions.' },
    { id:'question_headings', label:'Question-Format Headings', description:`Headings phrased as questions (H2/H3 ending in ?) signal answer-ready content to AI. Found: ${d.questionHeadings.length}`, pass: d.questionHeadings.length >= 2, weight: 12, impact:'high', fix:'Rephrase at least 2–3 H2 or H3 headings as direct questions (e.g., "What is X?" or "How does Y work?").' },
    { id:'lists', label:'Lists & Structured Content', description:`Bulleted/numbered lists make content easily extractable by AI. Found: ${d.listCount} list(s)`, pass: d.listCount >= 2, weight: 8, impact:'medium', fix:'Add at least 2 ul/ol lists to structure key information — AI engines prefer list-formatted answers.' },
    { id:'meta_desc', label:'Meta Description Optimized', description:`Optimal length is 130–160 chars. Current: ${d.metaDescriptionLength} chars`, pass: d.metaDescriptionLength >= 120 && d.metaDescriptionLength <= 165, weight: 8, impact:'medium', fix:`${!d.metaDescription ? 'Add a meta description.' : d.metaDescriptionLength < 120 ? 'Expand your meta description to 130–160 characters.' : 'Shorten your meta description to under 165 characters.'}` },
    { id:'author', label:'Author / Byline Signal', description:'Author markup signals E-E-A-T (Experience, Expertise, Authoritativeness, Trust) to AI', pass: d.hasAuthor, weight: 8, impact:'high', fix:'Add a visible author byline with rel="author" or itemprop="author", and link to an author bio page.' },
    { id:'date', label:'Publication Date Present', description:'Dates help AI engines assess content freshness and recency', pass: d.hasDate, weight: 8, impact:'medium', fix:'Add a visible publication date with datePublished markup (<time datetime="..."> or schema.org).' },
    { id:'breadcrumb', label:'Breadcrumb Schema', description:'BreadcrumbList schema helps AI understand site structure and page context', pass: d.hasBreadcrumbSchema, weight: 5, impact:'low', fix:'Add BreadcrumbList schema to define the page hierarchy.' },
    { id:'tables', label:'Tables / Comparison Content', description:'Tables signal structured, citeable factual content to AI systems', pass: d.tableCount >= 1, weight: 4, impact:'low', fix:'Add at least one comparison table — AI systems favor structured tabular data when generating answers.' },
    { id:'og_tags', label:'Social / OG Meta Tags', description:'Open Graph tags help AI systems understand page context and purpose', pass: d.hasOgTags, weight: 5, impact:'low', fix:'Add og:title, og:description, og:type, and og:image meta tags.' },
    { id:'og_tags', label:'Product Schema', description:'Product schema signals commercial intent and helps AI recommend your offerings', pass: d.hasProductSchema, weight: 4, impact:'medium', fix:'For product or service pages, add Product schema with name, description, and offers.' },
  ];
}

function computeGeoChecks(d: AuditData): Check[] {
  const allBotsAllowed = Object.values(d.robots).filter(v => v === 'allowed').length;
  const noWildcardBlock = Object.values(d.robots).some(v => v === 'allowed') || Object.values(d.robots).every(v => v !== 'blocked');
  return [
    { id:'https', label:'HTTPS / Secure Connection', description:'HTTPS is a baseline trust signal. AI engines do not cite insecure HTTP pages', pass: d.isHttps, weight: 5, impact:'high', fix:'Migrate your site to HTTPS with a valid SSL certificate.' },
    { id:'sitemap', label:'XML Sitemap Present', description:'Sitemap helps AI crawlers discover all your pages and content', pass: d.hasSitemap, weight: 10, impact:'medium', fix:'Create and submit an XML sitemap at /sitemap.xml and reference it in robots.txt.' },
    { id:'org_schema', label:'Organization / WebSite Schema', description:'Entity schema establishes your brand identity for AI knowledge graphs', pass: d.hasOrganizationSchema || d.hasWebSiteSchema, weight: 10, impact:'high', fix:'Add Organization schema with name, url, logo, sameAs links (social profiles), and description.' },
    { id:'gptbot', label:'GPTBot Allowed (ChatGPT)', description:'ChatGPT crawls your site via GPTBot to include content in AI answers', pass: d.robots.gptbot !== 'blocked', weight: 18, impact:'high', fix:'Remove "Disallow: /" under "User-agent: GPTBot" in your robots.txt file.' },
    { id:'claudebot', label:'ClaudeBot Allowed (Claude AI)', description:'Claude crawls via ClaudeBot and anthropic-ai to index content for AI responses', pass: d.robots.claudebot !== 'blocked', weight: 15, impact:'high', fix:'Remove blocks for ClaudeBot and anthropic-ai in robots.txt.' },
    { id:'perplexitybot', label:'PerplexityBot Allowed', description:'Perplexity AI crawls your site to cite it in real-time AI search answers', pass: d.robots.perplexitybot !== 'blocked', weight: 12, impact:'high', fix:'Remove "Disallow: /" under "User-agent: PerplexityBot" in robots.txt.' },
    { id:'google_ext', label:'Google-Extended Allowed (Gemini)', description:'Google uses Google-Extended agent to crawl content for Gemini AI and AI Overviews', pass: d.robots.googleExtended !== 'blocked', weight: 10, impact:'high', fix:'Remove blocks for Google-Extended in robots.txt to allow Gemini/AI Overview citations.' },
    { id:'canonical', label:'Canonical URL Defined', description:'Canonical tags prevent duplicate content and direct AI crawlers to authoritative pages', pass: d.hasCanonical, weight: 5, impact:'medium', fix:'Add <link rel="canonical" href="..."> to every page pointing to its preferred URL.' },
    { id:'freshness', label:'Content Freshness Signals', description:'Publication dates tell AI engines your content is current and trustworthy', pass: d.hasDate, weight: 5, impact:'medium', fix:'Add visible dates with proper markup (datePublished, dateModified) to all content pages.' },
    { id:'about', label:'"About" Page Linked', description:'An About page establishes entity identity and E-E-A-T trust signals for AI systems', pass: d.hasAboutPage, weight: 5, impact:'medium', fix:'Create an /about page and link to it from your navigation. Include organization details, team, and mission.' },
    { id:'social', label:'Social Meta + Twitter Card', description:'Rich social meta signals help AI engines understand your content and brand', pass: d.hasOgTags && d.hasTwitterCard, weight: 5, impact:'low', fix:'Add both Open Graph tags and Twitter Card meta tags to all pages.' },
  ];
}

function computeScore(checks: Check[]): number {
  const maxPoints = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter(c => c.pass).reduce((s, c) => s + c.weight, 0);
  return Math.round((earned / maxPoints) * 100);
}

// ─── Score Arc ────────────────────────────────────────────────────────────────
function ScoreArc({ score, label, color, icon }: { score: number; label: string; color: string; icon: string }) {
  const size = 120, r = 48, circ = 2 * Math.PI * r;
  const dash = circ * (1 - score / 100);
  const bg = score >= 80 ? T.greenLight : score >= 60 ? T.amberLight : T.redLight;
  const border = score >= 80 ? T.greenMid : score >= 60 ? T.amberMid : T.redMid;
  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: bg, border: `1px solid ${border}`, borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />
      <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{icon}</div>
      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        <text x={size/2} y={size/2 - 4} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={24} fontWeight="900" fontFamily="Inter,system-ui,sans-serif">{score}</text>
        <text x={size/2} y={size/2 + 16} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={10} fontWeight="700" fontFamily="Inter,system-ui,sans-serif">/100</text>
      </svg>
      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: T.gray800, marginTop: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color, marginTop: '0.15rem' }}>
        {score >= 80 ? '✓ Strong' : score >= 60 ? '⚡ Moderate' : '⚠ Weak'}
      </div>
    </div>
  );
}

// ─── Check Row ────────────────────────────────────────────────────────────────
function CheckRow({ check }: { check: Check }) {
  const [open, setOpen] = useState(false);
  const ic = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' }[check.impact];
  return (
    <div style={{ borderBottom: `1px solid ${T.gray100}` }}>
      <div onClick={() => setOpen(p => !p)} onMouseEnter={e => (e.currentTarget.style.background = T.gray50)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1.25rem', cursor: 'pointer' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: check.pass ? T.greenMid : T.redMid, color: check.pass ? T.green : T.red, fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
          {check.pass ? '✓' : '✗'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.83rem', fontWeight: 600, color: T.gray800 }}>{check.label}</div>
          <div style={{ fontSize: '0.71rem', color: T.gray500, marginTop: '0.1rem' }}>{check.description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: '20px', background: `${ic}15`, color: ic, fontWeight: 700, textTransform: 'uppercase' }}>{check.impact}</span>
          {!check.pass && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>}
        </div>
      </div>
      {open && !check.pass && check.fix && (
        <div style={{ padding: '0 1.25rem 0.875rem 4rem' }}>
          <div style={{ padding: '0.625rem 0.875rem', background: T.amberLight, border: `1px solid ${T.amberMid}`, borderRadius: '8px', fontSize: '0.75rem', color: T.gray700, lineHeight: 1.5 }}>
            <b style={{ color: T.amber }}>💡 How to fix:</b> {check.fix}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function CheckSection({ title, icon, checks, color }: { title: string; icon: string; checks: Check[]; color: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const failed = checks.filter(c => !c.pass);
  const passed = checks.filter(c => c.pass);
  const pct = Math.round((passed.length / checks.length) * 100);
  return (
    <div style={{ border: `1px solid ${T.gray200}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '1rem', background: T.white, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div onClick={() => setCollapsed(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: T.gray50, cursor: 'pointer', borderBottom: collapsed ? 'none' : `1px solid ${T.gray100}` }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{icon}</div>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: T.gray800, flex: 1 }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {failed.length > 0 && <span style={{ fontSize: '0.67rem', padding: '2px 8px', borderRadius: '20px', background: T.redMid, color: T.red, fontWeight: 700 }}>{failed.length} failed</span>}
            {passed.length > 0 && <span style={{ fontSize: '0.67rem', padding: '2px 8px', borderRadius: '20px', background: T.greenMid, color: T.green, fontWeight: 700 }}>{passed.length} passed</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: '44px', height: '4px', background: T.gray200, borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
            </div>
            <span style={{ fontSize: '0.62rem', color: T.gray400, fontWeight: 600 }}>{pct}%</span>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth="2" style={{ transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>
      </div>
      {!collapsed && (
        <div>
          {failed.map(c => <CheckRow key={c.id + c.label} check={c} />)}
          {passed.map(c => <CheckRow key={c.id + c.label} check={c} />)}
        </div>
      )}
    </div>
  );
}

// ─── Bot Status Badge ─────────────────────────────────────────────────────────
function BotBadge({ name, logo, status }: { name: string; logo: string; status: string }) {
  const cfg = status === 'allowed' ? { bg: T.greenLight, border: T.greenMid, color: T.green, label: '✓ Allowed' }
            : status === 'blocked' ? { bg: T.redLight, border: T.redMid, color: T.red, label: '✗ Blocked' }
            : { bg: T.amberLight, border: T.amberMid, color: T.amber, label: '? Not Mentioned' };
  return (
    <div style={{ padding: '0.875rem', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.625rem', borderLeft: `3px solid ${cfg.color}` }}>
      <span style={{ fontSize: '1.2rem' }}>{logo}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: T.gray800 }}>{name}</div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: cfg.color, marginTop: '0.1rem' }}>{cfg.label}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AeoGeoAuditTool() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [aiData, setAiData] = useState<AICheckData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview'|'aeo'|'geo'|'ai'>('overview');
  const abortRef = useRef<AbortController | null>(null);

  // ── Daily limit ──────────────────────────────────────────────────────────
  const LIMIT = 5, LS_KEY = 'aeo_audit_usage';
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const getUsage = () => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : { date: '', count: 0 }; } catch { return { date: '', count: 0 }; } };
  const getRem = () => { const u = getUsage(); return u.date !== todayStr() ? LIMIT : Math.max(0, LIMIT - u.count); };
  const [remaining, setRemaining] = useState<number>(getRem);
  const incUsage = () => { const t = todayStr(), u = getUsage(), n = u.date === t ? u.count + 1 : 1; try { localStorage.setItem(LS_KEY, JSON.stringify({ date: t, count: n })); } catch {} setRemaining(Math.max(0, LIMIT - n)); };

  const normalize = (s: string) => { let u = s.trim(); if (!u.startsWith('http')) u = 'https://' + u; return u; };

  const runAudit = useCallback(async () => {
    if (getRem() <= 0) { setError('LIMIT_REACHED'); return; }
    if (!url.trim()) { setError('Please enter a URL'); return; }
    const target = normalize(url);
    try { new URL(target); } catch { setError('Please enter a valid URL'); return; }

    setError(''); setAuditData(null); setAiData(null); setLoading(true); setProgress(0); setActiveTab('overview');
    abortRef.current = new AbortController();

    const steps = [
      { msg: 'Fetching page HTML...', pct: 15 },
      { msg: 'Parsing schema markup & signals...', pct: 40 },
      { msg: 'Checking robots.txt for AI bots...', pct: 60 },
      { msg: 'Verifying sitemap...', pct: 80 },
      { msg: 'Computing AEO & GEO scores...', pct: 95 },
    ];
    let si = 0;
    const timer = setInterval(() => { if (si < steps.length) { setLoadingStep(steps[si].msg); setProgress(steps[si].pct); si++; } }, 1600);

    try {
      const res = await fetch(`/api/aeo-audit?url=${encodeURIComponent(target)}`, { signal: abortRef.current.signal });
      const data: AuditData = await res.json();
      if ((data as any).error) throw new Error((data as any).error);

      clearInterval(timer);
      incUsage();
      setProgress(100); setLoadingStep('Analysis complete!');
      setTimeout(() => { setAuditData(data); setLoading(false); }, 400);

      // Run AI check in background
      setAiLoading(true);
      try {
        const aiRes = await fetch(`/api/aeo-ai-check?domain=${encodeURIComponent(data.domain)}&brand=${encodeURIComponent(data.brandName)}`);
        const aiResult: AICheckData = await aiRes.json();
        setAiData(aiResult);
      } catch { setAiData({ domain: data.domain, brand: data.brandName, mentionCount: 0, score: 0, sentiment: 'error', results: [], error: 'failed' }); }
      setAiLoading(false);

    } catch (err: any) {
      clearInterval(timer); setLoading(false);
      if (err.name !== 'AbortError') setError(err.message || 'Audit failed. Please try again.');
    }
  }, [url]);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') runAudit(); };

  const aeoChecks = auditData ? computeAeoChecks(auditData) : [];
  const geoChecks = auditData ? computeGeoChecks(auditData) : [];
  const aeoScore = computeScore(aeoChecks);
  const geoScore = computeScore(geoChecks);

  const aeoCritical = aeoChecks.filter(c => !c.pass && c.impact === 'high');
  const geoCritical = geoChecks.filter(c => !c.pass && c.impact === 'high');
  const allCritical = [...aeoCritical, ...geoCritical];

  const TABS = [
    { id: 'overview', label: 'Overview', icon: '◎' },
    { id: 'aeo', label: 'AEO Checks', icon: '🔍' },
    { id: 'geo', label: 'GEO Checks', icon: '🤖' },
    { id: 'ai', label: 'AI Visibility', icon: '✨' },
  ] as const;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: T.gray800, background: T.white, borderRadius: '16px', border: `1px solid ${T.gray200}`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

      {/* ── Header ── */}
      <div style={{ background: `linear-gradient(135deg, ${T.gray950} 0%, #1e1b4b 100%)`, padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: T.emerald, boxShadow: `0 0 6px ${T.emerald}` }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AEO + GEO Audit · Real-time · Powered by Claude AI</span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.9rem' }}>🌐</span>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={handleKey}
              placeholder="https://yourwebsite.com" disabled={loading}
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 1rem 0.8rem 2.5rem', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', fontFamily: 'monospace', transition: 'border-color 0.15s' }}
              onFocus={e => (e.target.style.borderColor = `${T.blue}80`)}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
          </div>
          <button onClick={runAudit} disabled={loading || remaining === 0} style={{
            padding: '0.8rem 1.5rem', borderRadius: '10px', border: 'none',
            background: loading ? '#1e40af' : remaining === 0 ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${T.blue} 0%, ${T.violet} 100%)`,
            color: remaining === 0 ? '#475569' : T.white, fontSize: '0.88rem', fontWeight: 700,
            cursor: (loading || remaining === 0) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
            boxShadow: (loading || remaining === 0) ? 'none' : '0 4px 15px rgba(37,99,235,0.4)',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}>
            {loading ? <><span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Auditing...</> : remaining === 0 ? '🔒 Limit Reached' : '🚀 Run Audit'}
          </button>
          {auditData && <button onClick={() => { setAuditData(null); setAiData(null); setUrl(''); }} style={{ padding: '0.8rem 0.875rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}>✕</button>}
        </div>

        {loading && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{loadingStep}</span>
              <span style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${T.blue}, ${T.violet})`, borderRadius: '2px', transition: 'width 0.7s ease' }} />
            </div>
          </div>
        )}

        {/* Limit dots */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {Array.from({ length: LIMIT }).map((_, i) => (
                <div key={i} style={{ width: '20px', height: '4px', borderRadius: '2px', background: i < remaining ? T.emerald : 'rgba(255,255,255,0.12)', transition: 'background 0.3s' }} />
              ))}
            </div>
            <span style={{ fontSize: '0.68rem', color: remaining > 0 ? '#94a3b8' : '#f87171', fontWeight: 600 }}>
              {remaining > 0 ? `${remaining} of ${LIMIT} free audits remaining today` : 'Daily limit reached — resets at midnight'}
            </span>
            <div style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 600 }}>AI check cost:</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981' }}>~$0.0023</span>
              <span style={{ fontSize: '0.58rem', color: '#334155' }}>· ~525 tokens · Haiku 4.5</span>
            </div>
          </div>
        )}

        {error && error !== 'LIMIT_REACHED' && (
          <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', color: '#f87171', fontSize: '0.8rem' }}>
            ⚠️ {error}
          </div>
        )}
        {error === 'LIMIT_REACHED' && (
          <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '0.3rem' }}>🔒 Daily Limit Reached</div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>You've used all <b style={{ color: '#c4b5fd' }}>{LIMIT} free audits</b> today. Resets at midnight!</p>
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!auditData && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${T.gray100}` }}>
          {[
            { icon: '📄', title: 'Real HTML Analysis', sub: 'Fetches & parses your actual page', color: T.blue },
            { icon: '🤖', title: 'AI Bot Access Check', sub: 'GPTBot, ClaudeBot, Perplexity, Gemini', color: T.violet },
            { icon: '🧩', title: 'Schema Detection', sub: 'FAQ, Article, HowTo, Organization', color: T.emerald },
            { icon: '✨', title: 'Live AI Visibility', sub: 'Actually asks Claude if it knows you', color: T.amber },
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
      {auditData && (
        <div>
          {/* URL bar */}
          <div style={{ padding: '0.75rem 1.5rem', background: T.gray50, borderBottom: `1px solid ${T.gray100}`, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <code style={{ fontSize: '0.73rem', color: T.gray600, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{auditData.url}</code>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {auditData.pageFetchError && <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '20px', background: T.amberMid, color: T.amber, fontWeight: 700 }}>⚠ Partial data</span>}
              <span style={{ fontSize: '0.65rem', color: T.gray400 }}>{new Date(auditData.fetchedAt).toLocaleString()}</span>
              <button onClick={runAudit} style={{ fontSize: '0.7rem', padding: '3px 10px', border: `1px solid ${T.gray200}`, borderRadius: '20px', background: T.white, color: T.gray600, cursor: 'pointer', fontWeight: 600 }}>🔄 Re-run</button>
            </div>
          </div>

          {/* Score circles */}
          <div style={{ padding: '1.5rem', borderBottom: `1px solid ${T.gray100}` }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.gray400, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Your AEO + GEO Scores</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <ScoreArc score={aeoScore} label="AEO Score" icon="🎯" color={aeoScore >= 80 ? T.green : aeoScore >= 60 ? T.amber : T.red} />
              <ScoreArc score={geoScore} label="GEO Score" icon="🤖" color={geoScore >= 80 ? T.green : geoScore >= 60 ? T.amber : T.red} />
            </div>
            {/* Schema types found */}
            {auditData.schemaTypes.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.67rem', color: T.gray500, fontWeight: 600 }}>Schema found:</span>
                {auditData.schemaTypes.map(t => (
                  <span key={t} style={{ fontSize: '0.67rem', padding: '2px 8px', borderRadius: '20px', background: T.blueMid, color: T.blue, fontWeight: 700 }}>{t}</span>
                ))}
              </div>
            )}
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
                marginBottom: '-1px',
              }}><span style={{ fontSize: '0.75rem' }}>{icon}</span> {label}</button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '1.5rem' }}>

            {/* ── Overview ── */}
            {activeTab === 'overview' && (
              <div>
                {allCritical.length > 0 && (
                  <div style={{ border: `1px solid ${T.redMid}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '1.25rem', background: '#fff5f5' }}>
                    <div style={{ padding: '0.875rem 1.25rem', background: T.redMid, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>⚠️</div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: T.red }}>High-Impact Issues — Fix These First</div>
                        <div style={{ fontSize: '0.68rem', color: T.red, opacity: 0.8 }}>{allCritical.length} issues blocking your AI visibility</div>
                      </div>
                    </div>
                    {allCritical.slice(0, 6).map((c, i) => (
                      <div key={c.id + i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1.25rem', borderBottom: `1px solid ${T.redMid}` }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: T.redMid, color: T.red, fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>✗</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: T.gray800 }}>{c.label}</div>
                          {c.fix && <div style={{ fontSize: '0.7rem', color: T.gray500 }}>{c.fix.slice(0, 80)}...</div>}
                        </div>
                        <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: '10px', background: T.redMid, color: T.red, fontWeight: 700, whiteSpace: 'nowrap' }}>Fix needed</span>
                      </div>
                    ))}
                  </div>
                )}
                {allCritical.length === 0 && (
                  <div style={{ padding: '1.5rem', textAlign: 'center', background: T.greenLight, borderRadius: '14px', border: `1px solid ${T.greenMid}`, marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: T.green }}>No High-Impact Issues!</div>
                    <div style={{ fontSize: '0.75rem', color: T.gray600, marginTop: '0.25rem' }}>Your site passes all critical AEO/GEO checks</div>
                  </div>
                )}
                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                  {[
                    { label: 'AEO Score', value: `${aeoScore}/100`, color: aeoScore >= 70 ? T.green : T.amber, icon: '🎯' },
                    { label: 'GEO Score', value: `${geoScore}/100`, color: geoScore >= 70 ? T.green : T.amber, icon: '🤖' },
                    { label: 'Schemas Found', value: `${auditData.schemaTypes.length}`, color: auditData.schemaTypes.length >= 3 ? T.green : T.amber, icon: '🧩' },
                    { label: 'Question H2/H3', value: `${auditData.questionHeadings.length}`, color: auditData.questionHeadings.length >= 2 ? T.green : T.amber, icon: '❓' },
                    { label: 'AI Bot Access', value: `${Object.values(auditData.robots).filter(v => v === 'allowed').length}/4`, color: T.blue, icon: '🤖' },
                    { label: 'AEO Fixes Needed', value: `${aeoChecks.filter(c => !c.pass).length}`, color: T.red, icon: '🔧' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '1rem', border: `1px solid ${T.gray200}`, borderRadius: '12px', background: T.white, borderLeft: `3px solid ${s.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>{s.icon}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: T.gray500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── AEO Tab ── */}
            {activeTab === 'aeo' && (
              <div>
                <div style={{ padding: '0.875rem 1rem', background: T.blueLight, border: `1px solid ${T.blueMid}`, borderRadius: '12px', marginBottom: '1.25rem', fontSize: '0.78rem', color: T.gray700, lineHeight: 1.6 }}>
                  <b style={{ color: T.blue }}>💡 AEO</b> (Answer Engine Optimization) checks whether your content is structured for AI engines like ChatGPT, Perplexity, and Google AI Overviews to extract and cite you as a source.
                </div>
                <CheckSection title="Schema Markup" icon="🧩" color={T.blue}
                  checks={aeoChecks.filter(c => ['faq_schema','article_schema','howto_schema','breadcrumb'].includes(c.id))} />
                <CheckSection title="Content Structure" icon="📝" color={T.violet}
                  checks={aeoChecks.filter(c => ['question_headings','lists','tables'].includes(c.id))} />
                <CheckSection title="E-E-A-T & Trust Signals" icon="🏆" color={T.emerald}
                  checks={aeoChecks.filter(c => ['author','date','meta_desc','og_tags'].includes(c.id))} />
                {auditData.questionHeadings.length > 0 && (
                  <div style={{ border: `1px solid ${T.gray200}`, borderRadius: '12px', padding: '1rem', background: T.gray50 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: T.gray700, marginBottom: '0.5rem' }}>✅ Question-Format Headings Found ({auditData.questionHeadings.length})</div>
                    {auditData.questionHeadings.map((h, i) => (
                      <div key={i} style={{ fontSize: '0.72rem', color: T.gray600, padding: '0.2rem 0.5rem', borderLeft: `2px solid ${T.blue}`, marginBottom: '0.2rem' }}>"{h}"</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── GEO Tab ── */}
            {activeTab === 'geo' && (
              <div>
                <div style={{ padding: '0.875rem 1rem', background: T.violetLight, border: `1px solid #e9d5ff`, borderRadius: '12px', marginBottom: '1.25rem', fontSize: '0.78rem', color: T.gray700, lineHeight: 1.6 }}>
                  <b style={{ color: T.violet }}>🤖 GEO</b> (Generative Engine Optimization) checks if AI crawlers can access your site, if your brand entity is defined, and whether you're set up to be cited in AI-generated answers.
                </div>

                {/* AI Bot grid */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: T.gray500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>AI Bot Access (robots.txt)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                    <BotBadge name="GPTBot (ChatGPT)" logo="💬" status={auditData.robots.gptbot} />
                    <BotBadge name="ClaudeBot (Anthropic)" logo="🟣" status={auditData.robots.claudebot} />
                    <BotBadge name="PerplexityBot" logo="🔵" status={auditData.robots.perplexitybot} />
                    <BotBadge name="Google-Extended (Gemini)" logo="🔷" status={auditData.robots.googleExtended} />
                    <BotBadge name="CCBot (Common Crawl)" logo="📚" status={auditData.robots.ccbot} />
                    <BotBadge name="Bingbot (Copilot)" logo="🔷" status={auditData.robots.bingbot} />
                  </div>
                </div>

                <CheckSection title="Technical GEO Signals" icon="⚙️" color={T.violet}
                  checks={geoChecks.filter(c => ['https','sitemap','canonical','freshness','social'].includes(c.id))} />
                <CheckSection title="Entity & Brand Signals" icon="🏢" color={T.blue}
                  checks={geoChecks.filter(c => ['org_schema','about'].includes(c.id))} />
                <CheckSection title="AI Bot Permissions" icon="🤖" color={T.emerald}
                  checks={geoChecks.filter(c => ['gptbot','claudebot','perplexitybot','google_ext'].includes(c.id))} />
              </div>
            )}

            {/* ── AI Visibility Tab ── */}
            {activeTab === 'ai' && (
              <div>
                {/* Cost breakdown card */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', padding: '1rem', background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: '12px', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Model', value: 'Haiku 4.5', sub: 'claude-haiku-4-5', icon: '🤖', color: T.violet },
                    { label: 'API Calls', value: '3 prompts', sub: 'per check', icon: '📡', color: T.blue },
                    { label: 'Input tokens', value: '~75 tokens', sub: '$1 / 1M = $0.000075', icon: '📥', color: T.emerald },
                    { label: 'Output tokens', value: '~450 tokens', sub: '$5 / 1M = $0.00225', icon: '📤', color: T.amber },
                    { label: 'Total / check', value: '~$0.0023', sub: '~525 tokens total', icon: '💰', color: T.green },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '0.75rem', background: T.white, border: `1px solid ${T.gray200}`, borderRadius: '10px', borderLeft: `3px solid ${s.color}` }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: T.gray400, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                        {s.icon} {s.label}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.6rem', color: T.gray400, marginTop: '0.1rem', fontFamily: 'monospace' }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
                {aiLoading && (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <span style={{ display: 'inline-block', width: '32px', height: '32px', border: `3px solid ${T.blueMid}`, borderTopColor: T.blue, borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '1rem' }} />
                    <div style={{ fontSize: '0.88rem', color: T.gray600, fontWeight: 600 }}>Asking Claude AI about your brand...</div>
                    <div style={{ fontSize: '0.75rem', color: T.gray400, marginTop: '0.25rem' }}>Sending 3 real queries to Claude · May take 10–20 seconds</div>
                  </div>
                )}

                {!aiLoading && aiData && !aiData.error && (
                  <div>
                    {/* Score banner */}
                    <div style={{ padding: '1.25rem', background: aiData.score >= 70 ? T.greenLight : aiData.score >= 35 ? T.amberLight : T.redLight, border: `1px solid ${aiData.score >= 70 ? T.greenMid : aiData.score >= 35 ? T.amberMid : T.redMid}`, borderRadius: '14px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: 900, color: aiData.score >= 70 ? T.green : aiData.score >= 35 ? T.amber : T.red, lineHeight: 1 }}>{aiData.score}</div>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: T.gray800 }}>
                          {aiData.score >= 70 ? '✅ Your brand is known to Claude AI' : aiData.score >= 35 ? '⚠️ Partial AI visibility' : '❌ Brand not recognized by AI'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: T.gray600, marginTop: '0.2rem' }}>
                          Mentioned in {aiData.mentionCount} of 3 test queries · AI Visibility Score: {aiData.score}/100
                        </div>
                      </div>
                    </div>

                    {/* Query results */}
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: T.gray500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Live Claude API Query Results</div>
                    {aiData.results.map((r, i) => (
                      <div key={i} style={{ border: `1px solid ${T.gray200}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                        <div style={{ padding: '0.75rem 1rem', background: T.gray50, borderBottom: `1px solid ${T.gray100}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: r.mentioned ? T.greenMid : T.redMid, color: r.mentioned ? T.green : T.red, fontSize: '0.7rem', fontWeight: 800 }}>{r.mentioned ? '✓' : '✗'}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: T.gray700 }}>Query {i + 1}</span>
                          <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px', background: r.mentioned ? T.greenMid : T.redMid, color: r.mentioned ? T.green : T.red, fontWeight: 700, marginLeft: 'auto' }}>{r.mentioned ? 'Brand mentioned' : 'Not mentioned'}</span>
                        </div>
                        <div style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontSize: '0.72rem', color: T.gray500, marginBottom: '0.35rem', fontStyle: 'italic' }}>"{r.prompt}"</div>
                          <div style={{ fontSize: '0.78rem', color: T.gray700, lineHeight: 1.6, background: T.gray50, padding: '0.625rem', borderRadius: '8px', border: `1px solid ${T.gray100}` }}>{r.response || 'No response'}</div>
                        </div>
                      </div>
                    ))}

                    {aiData.score < 70 && (
                      <div style={{ padding: '1rem', background: T.blueLight, border: `1px solid ${T.blueMid}`, borderRadius: '12px', fontSize: '0.78rem', color: T.gray700, lineHeight: 1.6 }}>
                        <b style={{ color: T.blue }}>💡 How to improve AI visibility:</b> Publish original research and data. Get mentioned on high-authority sites (Forbes, G2, Capterra, Reddit). Add Organization schema with sameAs links. Create content that directly answers industry questions. Allow all AI crawlers in robots.txt.
                      </div>
                    )}
                  </div>
                )}

                {!aiLoading && aiData?.error === 'NO_KEY' && (
                  <div style={{ padding: '1.5rem', background: T.amberLight, border: `1px solid ${T.amberMid}`, borderRadius: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔑</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: T.amber, marginBottom: '0.5rem' }}>ANTHROPIC_API_KEY not configured</div>
                    <p style={{ fontSize: '0.75rem', color: T.gray700, lineHeight: 1.5, margin: 0 }}>
                      Add <code style={{ background: T.amberMid, padding: '2px 5px', borderRadius: '4px' }}>ANTHROPIC_API_KEY</code> to your Vercel environment variables to enable the live AI visibility test.
                    </p>
                  </div>
                )}

                {!aiLoading && !aiData && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: T.gray400 }}>Run an audit first to see AI visibility results</div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '0.875rem 1.5rem', borderTop: `1px solid ${T.gray100}`, background: T.gray50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', color: T.gray400 }}>Real-time AEO + GEO audit · Live HTML & robots.txt analysis · AI visibility via Claude API</span>
            <button onClick={runAudit} style={{ fontSize: '0.72rem', padding: '5px 14px', border: `1px solid ${T.blue}`, borderRadius: '20px', background: T.blueLight, color: T.blue, cursor: 'pointer', fontWeight: 700 }}>🔄 Re-run Audit</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
