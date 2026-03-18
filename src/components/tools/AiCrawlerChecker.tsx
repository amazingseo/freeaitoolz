import { useState, useCallback, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type BotStatus = 'allowed' | 'blocked' | 'wildcard-allowed' | 'wildcard-blocked' | 'not-mentioned';
type BotPurpose = 'training' | 'search' | 'user-fetch' | 'other';
type RiskLevel = 'critical' | 'warning' | 'good' | 'info';

interface BotDef {
  agent: string;
  label: string;
  platform: string;
  platformIcon: string;
  purpose: BotPurpose;
  purposeLabel: string;
  respectsRobots: boolean;
  canBlockSafely: boolean; // can block without affecting AI search visibility
  docs: string;
  impact: string; // what blocking this means
}

interface BotResult extends BotDef {
  status: BotStatus;
  rule: string; // the matching rule that determined status
}

interface ParsedRobots {
  wildcard: { allow: string[]; disallow: string[] };
  agents: Record<string, { allow: string[]; disallow: string[] }>;
  raw: string;
}

// ─── Bot Database ─────────────────────────────────────────────────────────────
const BOT_DB: BotDef[] = [
  // ── OpenAI / ChatGPT ──
  {
    agent: 'GPTBot', label: 'GPTBot', platform: 'ChatGPT / OpenAI',
    platformIcon: '🤖', purpose: 'training', purposeLabel: 'Training Data',
    respectsRobots: true, canBlockSafely: true,
    docs: 'https://platform.openai.com/docs/gptbot',
    impact: 'Blocks future GPT model training from your content. Does NOT affect ChatGPT Search.',
  },
  {
    agent: 'OAI-SearchBot', label: 'OAI-SearchBot', platform: 'ChatGPT / OpenAI',
    platformIcon: '🤖', purpose: 'search', purposeLabel: 'ChatGPT Search',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://platform.openai.com/docs/plugins/bot',
    impact: 'Blocks your pages from appearing as citations in ChatGPT Search results.',
  },
  {
    agent: 'ChatGPT-User', label: 'ChatGPT-User', platform: 'ChatGPT / OpenAI',
    platformIcon: '🤖', purpose: 'user-fetch', purposeLabel: 'Live Browsing',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://platform.openai.com/docs/plugins/bot',
    impact: 'Blocks ChatGPT from fetching your page when a user explicitly asks it to browse your URL.',
  },
  // ── Anthropic / Claude ──
  {
    agent: 'ClaudeBot', label: 'ClaudeBot', platform: 'Claude / Anthropic',
    platformIcon: '✳️', purpose: 'training', purposeLabel: 'Training + Citations',
    respectsRobots: true, canBlockSafely: true,
    docs: 'https://support.anthropic.com/en/articles/8896518',
    impact: 'Blocks Claude from training on your content AND from citing your pages in responses.',
  },
  {
    agent: 'Claude-SearchBot', label: 'Claude-SearchBot', platform: 'Claude / Anthropic',
    platformIcon: '✳️', purpose: 'search', purposeLabel: 'Claude Search',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://support.anthropic.com/en/articles/8896518',
    impact: 'Blocks your content from appearing in Claude\'s search-based citations.',
  },
  {
    agent: 'Claude-User', label: 'Claude-User', platform: 'Claude / Anthropic',
    platformIcon: '✳️', purpose: 'user-fetch', purposeLabel: 'Live Fetch',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://support.anthropic.com/en/articles/8896518',
    impact: 'Blocks Claude from fetching your page on-demand during user conversations.',
  },
  {
    agent: 'anthropic-ai', label: 'anthropic-ai (Legacy)', platform: 'Claude / Anthropic',
    platformIcon: '✳️', purpose: 'training', purposeLabel: 'Legacy Training',
    respectsRobots: true, canBlockSafely: true,
    docs: 'https://support.anthropic.com/en/articles/8896518',
    impact: 'Deprecated legacy crawler. ClaudeBot replaced this in 2024. Still worth including for safety.',
  },
  // ── Perplexity ──
  {
    agent: 'PerplexityBot', label: 'PerplexityBot', platform: 'Perplexity AI',
    platformIcon: '🔍', purpose: 'search', purposeLabel: 'Search Index',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://docs.perplexity.ai/docs/perplexity-bot',
    impact: 'Blocks your site from being indexed and cited in Perplexity AI answers.',
  },
  {
    agent: 'Perplexity-User', label: 'Perplexity-User', platform: 'Perplexity AI',
    platformIcon: '🔍', purpose: 'user-fetch', purposeLabel: 'User Fetch',
    respectsRobots: false, canBlockSafely: false,
    docs: 'https://docs.perplexity.ai/docs/perplexity-bot',
    impact: 'Triggered by real users clicking Perplexity citations. May ignore robots.txt.',
  },
  // ── Google Gemini ──
  {
    agent: 'Google-Extended', label: 'Google-Extended', platform: 'Google Gemini',
    platformIcon: '✨', purpose: 'training', purposeLabel: 'Gemini Training',
    respectsRobots: true, canBlockSafely: true,
    docs: 'https://developers.google.com/search/docs/crawling-indexing/google-extended',
    impact: 'Blocks Google from using your content to train Gemini. Does NOT affect Google Search rankings.',
  },
  {
    agent: 'Gemini-Deep-Research', label: 'Gemini-Deep-Research', platform: 'Google Gemini',
    platformIcon: '✨', purpose: 'user-fetch', purposeLabel: 'Deep Research',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://ai.google.dev/gemini-api',
    impact: 'Blocks Gemini Deep Research from crawling your site during AI-powered research tasks.',
  },
  {
    agent: 'Google-NotebookLM', label: 'Google-NotebookLM', platform: 'Google Gemini',
    platformIcon: '✨', purpose: 'user-fetch', purposeLabel: 'NotebookLM',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://notebooklm.google.com',
    impact: 'Blocks NotebookLM from fetching your content when users add your URLs as sources.',
  },
  {
    agent: 'GoogleAgent-Mariner', label: 'Google Mariner Agent', platform: 'Google Gemini',
    platformIcon: '✨', purpose: 'user-fetch', purposeLabel: 'AI Agent',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://ai.google.dev',
    impact: 'Blocks Google\'s Mariner AI agent from interacting with your site on user\'s behalf.',
  },
  // ── Meta AI ──
  {
    agent: 'Meta-ExternalAgent', label: 'Meta-ExternalAgent', platform: 'Meta AI',
    platformIcon: '🌐', purpose: 'training', purposeLabel: 'Training + Search',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/',
    impact: 'Blocks Meta AI from training on and citing your content. May affect Meta AI Search visibility.',
  },
  {
    agent: 'Meta-ExternalFetcher', label: 'Meta-ExternalFetcher', platform: 'Meta AI',
    platformIcon: '🌐', purpose: 'user-fetch', purposeLabel: 'On-Demand Fetch',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/',
    impact: 'Blocks Meta AI from fetching your pages on demand during AI conversations.',
  },
  // ── Microsoft Copilot ──
  {
    agent: 'Bingbot', label: 'Bingbot (Copilot)', platform: 'Microsoft Copilot',
    platformIcon: '🪟', purpose: 'search', purposeLabel: 'Bing / Copilot Index',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://www.bing.com/webmaster/help/which-crawlers-does-bing-use-8c184ec0',
    impact: 'Blocks Bing Search AND Microsoft Copilot from indexing and citing your content.',
  },
  {
    agent: 'MicrosoftPreview', label: 'MicrosoftPreview', platform: 'Microsoft Copilot',
    platformIcon: '🪟', purpose: 'user-fetch', purposeLabel: 'Preview Fetch',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://www.bing.com/webmaster/help/which-crawlers-does-bing-use-8c184ec0',
    impact: 'Blocks Microsoft from generating previews of your pages in Copilot responses.',
  },
  // ── DeepSeek ──
  {
    agent: 'DeepSeekBot', label: 'DeepSeekBot', platform: 'DeepSeek',
    platformIcon: '🐳', purpose: 'training', purposeLabel: 'Training Data',
    respectsRobots: true, canBlockSafely: true,
    docs: 'https://www.deepseek.com/',
    impact: 'Blocks DeepSeek from training on your content.',
  },
  // ── Cohere ──
  {
    agent: 'cohere-ai', label: 'cohere-ai', platform: 'Cohere',
    platformIcon: '🧠', purpose: 'training', purposeLabel: 'Training Data',
    respectsRobots: true, canBlockSafely: true,
    docs: 'https://cohere.com',
    impact: 'Blocks Cohere from using your content in AI model training.',
  },
  // ── DuckAssist ──
  {
    agent: 'DuckAssistBot', label: 'DuckAssistBot', platform: 'DuckDuckGo',
    platformIcon: '🦆', purpose: 'search', purposeLabel: 'DuckAssist AI',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://help.duckduckgo.com/duckduckgo-help-pages/results/duckassist/',
    impact: 'Blocks DuckDuckGo\'s AI assistant from citing your content in DuckAssist answers.',
  },
  // ── You.com ──
  {
    agent: 'YouBot', label: 'YouBot', platform: 'You.com',
    platformIcon: '🔎', purpose: 'search', purposeLabel: 'You.com AI Search',
    respectsRobots: true, canBlockSafely: false,
    docs: 'https://you.com',
    impact: 'Blocks You.com AI search from indexing and citing your content.',
  },
  // ── Apple ──
  {
    agent: 'Applebot-Extended', label: 'Applebot-Extended', platform: 'Apple Intelligence',
    platformIcon: '🍎', purpose: 'training', purposeLabel: 'Apple AI Training',
    respectsRobots: true, canBlockSafely: true,
    docs: 'https://support.apple.com/en-us/111900',
    impact: 'Blocks Apple from using your content to train Apple Intelligence models.',
  },
  // ── Amazon ──
  {
    agent: 'Amazonbot', label: 'Amazonbot', platform: 'Amazon Alexa',
    platformIcon: '📦', purpose: 'training', purposeLabel: 'Alexa AI Training',
    respectsRobots: true, canBlockSafely: true,
    docs: 'https://developer.amazon.com/support/legal/da',
    impact: 'Blocks Amazon from using your content to train Alexa and Amazon AI.',
  },
  // ── Common Crawl ──
  {
    agent: 'CCBot', label: 'CCBot', platform: 'Common Crawl',
    platformIcon: '🗄️', purpose: 'training', purposeLabel: 'AI Training Archive',
    respectsRobots: true, canBlockSafely: true,
    docs: 'https://commoncrawl.org/ccbot',
    impact: 'Blocks Common Crawl — the open dataset used to train many smaller AI models and research projects.',
  },
  // ── ByteDance / TikTok ──
  {
    agent: 'Bytespider', label: 'Bytespider', platform: 'ByteDance / TikTok',
    platformIcon: '🎵', purpose: 'training', purposeLabel: 'AI Training',
    respectsRobots: true, canBlockSafely: true,
    docs: 'https://bytedance.com',
    impact: 'Blocks ByteDance from training TikTok AI models on your content.',
  },
];

// ─── Robots.txt Parser ────────────────────────────────────────────────────────
function parseRobotsTxt(text: string): ParsedRobots {
  const result: ParsedRobots = { wildcard: { allow: [], disallow: [] }, agents: {}, raw: text };
  const lines = text.split('\n');
  let currentAgents: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) { if (currentAgents.length > 0 && !rawLine.trim()) currentAgents = []; continue; }

    const lower = line.toLowerCase();
    if (lower.startsWith('user-agent:')) {
      const agent = line.substring('user-agent:'.length).trim();
      if (agent === '*') {
        currentAgents = ['*'];
      } else {
        if (currentAgents.includes('*') || currentAgents.length === 0) currentAgents = [];
        currentAgents.push(agent.toLowerCase());
      }
    } else if (lower.startsWith('allow:') || lower.startsWith('disallow:')) {
      const isAllow = lower.startsWith('allow:');
      const path = line.substring(lower.startsWith('allow:') ? 'allow:'.length : 'disallow:'.length).trim();
      for (const agent of currentAgents) {
        if (agent === '*') {
          if (isAllow) result.wildcard.allow.push(path);
          else result.wildcard.disallow.push(path);
        } else {
          if (!result.agents[agent]) result.agents[agent] = { allow: [], disallow: [] };
          if (isAllow) result.agents[agent].allow.push(path);
          else result.agents[agent].disallow.push(path);
        }
      }
    } else if (lower.startsWith('sitemap:') || lower.startsWith('crawl-delay:') || lower.startsWith('host:')) {
      currentAgents = [];
    }
  }
  return result;
}

function getBotStatus(parsed: ParsedRobots, agentName: string): { status: BotStatus; rule: string } {
  const key = agentName.toLowerCase();
  const specific = parsed.agents[key];

  if (specific) {
    const hasDisallowRoot = specific.disallow.some(p => p === '/' || p === '');
    const hasAllowRoot = specific.allow.some(p => p === '/');
    const hasAnyDisallow = specific.disallow.some(p => p && p !== '');
    const hasAnyAllow = specific.allow.length > 0;

    if (hasDisallowRoot && !hasAllowRoot) return { status: 'blocked', rule: `User-agent: ${agentName} → Disallow: /` };
    if (hasAllowRoot) return { status: 'allowed', rule: `User-agent: ${agentName} → Allow: /` };
    if (hasAnyDisallow && !hasAnyAllow) return { status: 'blocked', rule: `User-agent: ${agentName} → Disallow: ${specific.disallow[0]}` };
    if (hasAnyAllow) return { status: 'allowed', rule: `User-agent: ${agentName} → Allow: ${specific.allow[0]}` };
  }

  // Fall back to wildcard
  const wc = parsed.wildcard;
  const wcDisallowRoot = wc.disallow.some(p => p === '/' || p === '');
  const wcAllowRoot = wc.allow.some(p => p === '/');
  const wcHasAnyDisallow = wc.disallow.some(p => p && p !== '');

  if (wcDisallowRoot) return { status: 'wildcard-blocked', rule: `User-agent: * → Disallow: / (inherited)` };
  if (wcAllowRoot || wc.allow.length > 0) return { status: 'wildcard-allowed', rule: `User-agent: * → Allow: / (inherited)` };
  if (wcHasAnyDisallow) return { status: 'wildcard-blocked', rule: `User-agent: * → Disallow: ${wc.disallow[0]} (inherited)` };

  return { status: 'not-mentioned', rule: 'No rule found — defaults to allowed' };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  'allowed': { label: 'Explicitly Allowed', color: '#22c55e', bg: '#0f2a1a', border: '#166534', icon: '✓' },
  'blocked': { label: 'Explicitly Blocked', color: '#ef4444', bg: '#2a0f0f', border: '#991b1b', icon: '✗' },
  'wildcard-allowed': { label: 'Allowed (via *)', color: '#3b82f6', bg: '#0f1e2a', border: '#1e40af', icon: '∼' },
  'wildcard-blocked': { label: 'Blocked (via *)', color: '#f97316', bg: '#2a1a0f', border: '#c2410c', icon: '!' },
  'not-mentioned': { label: 'Not Mentioned', color: '#94a3b8', bg: '#0f172a', border: '#1e293b', icon: '?' },
};

const PURPOSE_CFG = {
  'training': { label: 'Training Data', color: '#8b5cf6' },
  'search': { label: 'Search Index', color: '#3b82f6' },
  'user-fetch': { label: 'Live Fetch', color: '#06b6d4' },
  'other': { label: 'Other', color: '#94a3b8' },
};

function getOverallRisk(results: BotResult[]): { level: RiskLevel; summary: string; score: number } {
  const searchBots = results.filter(r => r.purpose === 'search');
  const blockedSearch = searchBots.filter(r => r.status === 'blocked' || r.status === 'wildcard-blocked');
  const gptSearchBlocked = results.find(r => r.agent === 'OAI-SearchBot' && (r.status === 'blocked' || r.status === 'wildcard-blocked'));
  const perplexityBlocked = results.find(r => r.agent === 'PerplexityBot' && (r.status === 'blocked' || r.status === 'wildcard-blocked'));
  const claudeSearchBlocked = results.find(r => r.agent === 'Claude-SearchBot' && (r.status === 'blocked' || r.status === 'wildcard-blocked'));

  const criticalCount = [gptSearchBlocked, perplexityBlocked, claudeSearchBlocked].filter(Boolean).length;
  const score = Math.max(0, 100 - (criticalCount * 25) - (blockedSearch.length - criticalCount) * 10);

  if (criticalCount >= 2) return { level: 'critical', summary: `${criticalCount} major AI search platforms are blocked — your content is invisible to them`, score };
  if (criticalCount === 1) return { level: 'warning', summary: `1 major AI search platform is blocked — fix this to improve AI visibility`, score };
  if (blockedSearch.length > 0) return { level: 'warning', summary: `${blockedSearch.length} AI search crawlers are blocked`, score };
  return { level: 'good', summary: 'AI search crawlers can access your content', score };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AiCrawlerChecker() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<BotResult[] | null>(null);
  const [parsed, setParsed] = useState<ParsedRobots | null>(null);
  const [checkedUrl, setCheckedUrl] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'blocked' | 'allowed' | 'missing'>('all');
  const [showRaw, setShowRaw] = useState(false);
  const [showFix, setShowFix] = useState(false);
  const [fixCopied, setFixCopied] = useState(false);

  const normalizeUrl = (input: string) => {
    let u = input.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
    try {
      const parsed = new URL(u);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch { return u; }
  };

  const runCheck = useCallback(async () => {
    if (!url.trim()) { setError('Please enter a URL'); return; }
    const base = normalizeUrl(url);
    setError(''); setResults(null); setParsed(null); setLoading(true);

    const robotsUrl = `${base}/robots.txt`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(robotsUrl)}`;

    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`Could not fetch robots.txt (${res.status})`);
      const text = await res.text();
      if (!text || text.trim().length < 3) throw new Error('robots.txt is empty or not found');

      const p = parseRobotsTxt(text);
      const r: BotResult[] = BOT_DB.map(bot => {
        const { status, rule } = getBotStatus(p, bot.agent);
        return { ...bot, status, rule };
      });

      setParsed(p);
      setResults(r);
      setCheckedUrl(robotsUrl);
    } catch (err: any) {
      if (err.name === 'TimeoutError') setError('Request timed out. The server may be slow or blocking external requests.');
      else setError(err.message || 'Failed to fetch robots.txt. Check the URL and try again.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') runCheck(); };

  const filteredResults = useMemo(() => {
    if (!results) return [];
    if (activeFilter === 'blocked') return results.filter(r => r.status === 'blocked' || r.status === 'wildcard-blocked');
    if (activeFilter === 'allowed') return results.filter(r => r.status === 'allowed' || r.status === 'wildcard-allowed');
    if (activeFilter === 'missing') return results.filter(r => r.status === 'not-mentioned');
    return results;
  }, [results, activeFilter]);

  // Group by platform
  const grouped = useMemo(() => {
    const map = new Map<string, BotResult[]>();
    for (const r of filteredResults) {
      if (!map.has(r.platform)) map.set(r.platform, []);
      map.get(r.platform)!.push(r);
    }
    return map;
  }, [filteredResults]);

  const risk = useMemo(() => results ? getOverallRisk(results) : null, [results]);

  // Generate fix snippet
  const fixSnippet = useMemo(() => {
    if (!results) return '';
    const toAllow = results.filter(r =>
      !r.canBlockSafely && (r.status === 'blocked' || r.status === 'wildcard-blocked')
    );
    if (toAllow.length === 0) return '# ✅ No urgent fixes needed — search crawlers are accessible';
    let out = '# AI Crawler Fix — Add to your robots.txt\n# Generated by FreeAIToolz.com\n\n';
    const byPlatform: Record<string, BotDef[]> = {};
    for (const b of toAllow) {
      if (!byPlatform[b.platform]) byPlatform[b.platform] = [];
      byPlatform[b.platform].push(b);
    }
    for (const [plat, bots] of Object.entries(byPlatform)) {
      out += `# ${plat}\n`;
      for (const b of bots) out += `User-agent: ${b.agent}\nAllow: /\n\n`;
    }
    return out.trim();
  }, [results]);

  const copyFix = () => {
    navigator.clipboard.writeText(fixSnippet);
    setFixCopied(true); setTimeout(() => setFixCopied(false), 2000);
  };

  const counts = useMemo(() => {
    if (!results) return { blocked: 0, allowed: 0, missing: 0 };
    return {
      blocked: results.filter(r => r.status === 'blocked' || r.status === 'wildcard-blocked').length,
      allowed: results.filter(r => r.status === 'allowed' || r.status === 'wildcard-allowed').length,
      missing: results.filter(r => r.status === 'not-mentioned').length,
    };
  }, [results]);

  const riskColors = {
    critical: '#ef4444', warning: '#f59e0b', good: '#22c55e', info: '#3b82f6'
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", background: '#030b18', borderRadius: '16px', overflow: 'hidden', color: '#e2e8f0' }}>

      {/* ── Input Bar ── */}
      <div style={{ padding: '1.5rem', background: '#060d1a', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: '#475569' }}>🌐</span>
            <input
              type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={handleKey}
              placeholder="yourwebsite.com"
              disabled={loading}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                background: '#0a1628', border: '2px solid #1e293b',
                borderRadius: '10px', color: '#e2e8f0', fontSize: '0.9rem',
                outline: 'none', transition: 'border-color 0.2s',
                fontFamily: 'monospace',
              }}
              onFocus={e => (e.target.style.borderColor = '#3b82f6')}
              onBlur={e => (e.target.style.borderColor = '#1e293b')}
            />
          </div>
          <button onClick={runCheck} disabled={loading} style={{
            padding: '0.75rem 1.75rem', borderRadius: '10px', border: 'none',
            background: loading ? '#1e293b' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff', fontSize: '0.88rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 15px rgba(59,130,246,0.35)',
            whiteSpace: 'nowrap',
          }}>
            {loading ? '⏳ Checking...' : '🔍 Check AI Crawlers'}
          </button>
          {results && (
            <button onClick={() => { setResults(null); setParsed(null); setUrl(''); }} style={{
              padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #1e293b',
              background: 'transparent', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer',
            }}>✕ Clear</button>
          )}
        </div>
        {error && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#2a0f0f', border: '1px solid #dc2626', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem' }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* ── Empty State ── */}
      {!results && !loading && (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🤖</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>
            Is your site visible to AI search engines?
          </div>
          <div style={{ fontSize: '0.82rem', color: '#475569', maxWidth: '520px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
            Enter any URL to instantly check whether ChatGPT, Claude, Perplexity, Gemini, and 8 other AI platforms can crawl and cite your content — or are silently blocked by your robots.txt.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem', maxWidth: '560px', margin: '0 auto', textAlign: 'left' }}>
            {[
              { icon: '🤖', t: 'ChatGPT / OpenAI', d: 'GPTBot, OAI-SearchBot, ChatGPT-User' },
              { icon: '✳️', t: 'Claude / Anthropic', d: 'ClaudeBot, Claude-SearchBot, Claude-User' },
              { icon: '🔍', t: 'Perplexity AI', d: 'PerplexityBot, Perplexity-User' },
              { icon: '✨', t: 'Google Gemini', d: 'Google-Extended, Gemini-Deep-Research' },
              { icon: '🌐', t: 'Meta AI', d: 'Meta-ExternalAgent, Meta-ExternalFetcher' },
              { icon: '🪟', t: 'Microsoft Copilot', d: 'Bingbot, MicrosoftPreview' },
              { icon: '🐳', t: 'DeepSeek + More', d: 'DeepSeekBot, cohere-ai, Bytespider' },
              { icon: '🍎', t: '+ 5 More Platforms', d: 'Apple, Amazon, DuckDuckGo, You.com, CCBot' },
            ].map(f => (
              <div key={f.t} style={{ padding: '0.75rem', background: '#060d1a', border: '1px solid #1e293b', borderRadius: '10px' }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{f.icon}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>{f.t}</div>
                <div style={{ fontSize: '0.67rem', color: '#475569', marginTop: '0.15rem', fontFamily: 'monospace' }}>{f.d}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', fontSize: '0.72rem', color: '#334155' }}>
            Checks {BOT_DB.length} AI bot user agents across {new Set(BOT_DB.map(b => b.platform)).size} platforms · Zero signup · 100% free
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Fetching robots.txt and analyzing {BOT_DB.length} AI bot rules...</div>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Meta AI', 'Copilot'].map(p => (
              <div key={p} style={{ padding: '0.4rem 0.875rem', borderRadius: '20px', background: '#0a1628', border: '1px solid #1e293b', fontSize: '0.72rem', color: '#475569' }}>
                ⏳ {p}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {results && risk && (
        <div>
          {/* Risk summary header */}
          <div style={{
            padding: '1rem 1.25rem',
            background: `${riskColors[risk.level]}15`,
            borderBottom: `1px solid ${riskColors[risk.level]}30`,
            display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace', marginBottom: '0.25rem' }}>
                📄 {checkedUrl}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: riskColors[risk.level] }}>
                {risk.level === 'good' ? '✅' : risk.level === 'critical' ? '🚨' : '⚠️'} {risk.summary}
              </div>
            </div>

            {/* Score */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: riskColors[risk.level], lineHeight: 1 }}>{risk.score}</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Score</div>
            </div>

            {/* Quick counts */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { l: 'Blocked', v: counts.blocked, c: '#ef4444', filter: 'blocked' as const },
                { l: 'Allowed', v: counts.allowed, c: '#22c55e', filter: 'allowed' as const },
                { l: 'Not Set', v: counts.missing, c: '#94a3b8', filter: 'missing' as const },
              ].map(s => (
                <button key={s.l}
                  onClick={() => setActiveFilter(activeFilter === s.filter ? 'all' : s.filter)}
                  style={{
                    padding: '4px 10px', borderRadius: '20px', border: `1px solid ${s.c}30`,
                    background: activeFilter === s.filter ? `${s.c}20` : 'transparent',
                    cursor: 'pointer', fontSize: '0.75rem',
                  }}>
                  <b style={{ color: s.c }}>{s.v}</b> <span style={{ color: '#64748b' }}>{s.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: '#060d1a' }}>
            <button onClick={() => setActiveFilter('all')} style={{
              padding: '4px 12px', borderRadius: '6px', border: '1px solid #1e293b',
              background: activeFilter === 'all' ? '#3b82f6' : 'transparent',
              color: activeFilter === 'all' ? '#fff' : '#64748b',
              fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
            }}>All ({results.length})</button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
              <button onClick={() => setShowFix(p => !p)} style={{
                padding: '4px 12px', borderRadius: '6px', border: '1px solid #1e293b',
                background: showFix ? '#f59e0b' : 'transparent',
                color: showFix ? '#000' : '#64748b', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
              }}>🔧 Fix Generator</button>
              <button onClick={() => setShowRaw(p => !p)} style={{
                padding: '4px 12px', borderRadius: '6px', border: '1px solid #1e293b',
                background: showRaw ? '#3b82f6' : 'transparent',
                color: showRaw ? '#fff' : '#64748b', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
              }}>📄 Raw robots.txt</button>
            </div>
          </div>

          {/* Raw robots.txt */}
          {showRaw && parsed && (
            <div style={{ margin: '0', padding: '1rem 1.25rem', background: '#020810', borderBottom: '1px solid #1e293b' }}>
              <pre style={{
                fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace',
                maxHeight: '200px', overflowY: 'auto', margin: 0, lineHeight: 1.5,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{parsed.raw || '(empty)'}</pre>
            </div>
          )}

          {/* Fix generator */}
          {showFix && (
            <div style={{ margin: '0', padding: '1rem 1.25rem', background: '#0a1010', borderBottom: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>🔧 Recommended Fix — Add to your robots.txt</span>
                <button onClick={copyFix} style={{
                  padding: '3px 10px', borderRadius: '6px', border: '1px solid #22c55e',
                  background: fixCopied ? '#22c55e' : 'transparent',
                  color: fixCopied ? '#fff' : '#22c55e', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600,
                }}>{fixCopied ? '✓ Copied' : '📋 Copy'}</button>
              </div>
              <pre style={{
                fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace',
                maxHeight: '200px', overflowY: 'auto', margin: 0, lineHeight: 1.7,
                background: '#020810', padding: '0.75rem', borderRadius: '8px',
                border: '1px solid #1e293b',
              }}>{fixSnippet}</pre>
            </div>
          )}

          {/* Results by platform */}
          <div style={{ padding: '1rem 1.25rem' }}>
            {grouped.size === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#475569', fontSize: '0.85rem' }}>
                No crawlers match the current filter
              </div>
            ) : (
              Array.from(grouped.entries()).map(([platform, bots]) => (
                <div key={platform} style={{ marginBottom: '1rem', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Platform header */}
                  <div style={{ padding: '0.65rem 1rem', background: '#0a1628', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>{bots[0].platformIcon}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', flex: 1 }}>{platform}</span>
                    {/* Mini status dots */}
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {bots.map(b => {
                        const cfg = STATUS_CFG[b.status];
                        return <span key={b.agent} title={`${b.label}: ${cfg.label}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />;
                      })}
                    </div>
                  </div>

                  {/* Bot rows */}
                  {bots.map((bot, i) => {
                    const cfg = STATUS_CFG[bot.status];
                    const purp = PURPOSE_CFG[bot.purpose];
                    return (
                      <div key={bot.agent} style={{
                        padding: '0.75rem 1rem',
                        background: cfg.bg,
                        borderBottom: i < bots.length - 1 ? `1px solid #0f172a` : 'none',
                        borderLeft: `3px solid ${cfg.color}`,
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '0.5rem',
                        alignItems: 'start',
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                            <code style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace', background: '#0f172a', padding: '1px 6px', borderRadius: '4px' }}>
                              {bot.agent}
                            </code>
                            <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '10px', background: `${purp.color}20`, color: purp.color, fontWeight: 600 }}>
                              {bot.purposeLabel}
                            </span>
                            {!bot.respectsRobots && (
                              <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px', background: '#2a1f0a', color: '#f59e0b', fontWeight: 600 }}>
                                May ignore robots.txt
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.25rem', lineHeight: 1.4 }}>{bot.impact}</div>
                          <div style={{ fontSize: '0.67rem', color: '#334155', marginTop: '0.2rem', fontFamily: 'monospace' }}>{bot.rule}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            padding: '3px 9px', borderRadius: '20px',
                            background: `${cfg.color}20`, border: `1px solid ${cfg.color}40`,
                            fontSize: '0.71rem', fontWeight: 700, color: cfg.color,
                            whiteSpace: 'nowrap',
                          }}>
                            <span>{cfg.icon}</span>
                            <span>{cfg.label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Legend */}
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #1e293b', background: '#060d1a', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#475569' }}>
                <span style={{ fontWeight: 700, color: cfg.color }}>{cfg.icon}</span> {cfg.label}
              </span>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#334155' }}>
              Checked {results.length} AI bots across {new Set(results.map(r => r.platform)).size} platforms
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
