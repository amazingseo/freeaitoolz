export const prerender = false;

function checkBotInRobots(robotsTxt: string, botPatterns: string[]): 'allowed' | 'blocked' | 'unknown' {
  if (!robotsTxt?.trim()) return 'unknown';
  const lower = (s: string) => s.toLowerCase();
  const bots = botPatterns.map(lower);
  const sections = robotsTxt.split(/(?:\r?\n){2,}/);

  let foundSpecific = false, specificBlocked = false, wildcardBlocked = false;

  for (const section of sections) {
    const lines = section.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (!lines.length) continue;
    const agents = lines.filter(l => lower(l).startsWith('user-agent:')).map(l => lower(l.split(':').slice(1).join(':').trim()));
    const isWildcard = agents.includes('*');
    const isSpecific = agents.some(a => bots.some(b => a === b || a.includes(b.replace('bot', ''))));
    if (!isWildcard && !isSpecific) continue;
    const blocked = lines.some(l => lower(l).startsWith('disallow:') && l.split(':').slice(1).join(':').trim() === '/');
    if (isSpecific) { foundSpecific = true; specificBlocked = blocked; }
    if (isWildcard) wildcardBlocked = blocked;
  }
  if (foundSpecific) return specificBlocked ? 'blocked' : 'allowed';
  if (wildcardBlocked) return 'blocked';
  return 'allowed';
}

export async function GET({ url }: { url: URL }) {
  const target = url.searchParams.get('url');
  if (!target) return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400 });

  let parsedUrl: URL;
  try { parsedUrl = new URL(target); } catch { return new Response(JSON.stringify({ error: 'Invalid URL' }), { status: 400 }); }

  const origin = parsedUrl.origin;
  const domain = parsedUrl.hostname;
  const isHttps = parsedUrl.protocol === 'https:';

  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; AEOAuditBot/1.0; +https://freeaitoolz.com)', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' };
  const timeout = (ms: number) => AbortSignal.timeout(ms);

  // Fetch page HTML
  let html = '';
  let pageFetchError = '';
  try {
    const r = await fetch(target, { headers, signal: timeout(12000) });
    html = await r.text();
  } catch (e: any) { pageFetchError = e.message || 'Failed to fetch page'; }

  // Fetch robots.txt
  let robotsTxt = '';
  try {
    const r = await fetch(`${origin}/robots.txt`, { headers, signal: timeout(6000) });
    if (r.ok) robotsTxt = await r.text();
  } catch {}

  // Check sitemap
  let hasSitemap = false, sitemapUrl = `${origin}/sitemap.xml`;
  try {
    const r = await fetch(sitemapUrl, { headers, signal: timeout(6000), method: 'HEAD' });
    hasSitemap = r.ok;
    // Also check robots.txt for sitemap directive
    if (!hasSitemap) {
      const sitemapLine = robotsTxt.split('\n').find(l => l.toLowerCase().startsWith('sitemap:'));
      if (sitemapLine) { hasSitemap = true; sitemapUrl = sitemapLine.split(':').slice(1).join(':').trim(); }
    }
  } catch {}

  // ── Parse HTML ────────────────────────────────────────────────────────────
  const extractText = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  // JSON-LD
  const jsonLdBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemas: any[] = [];
  for (const b of jsonLdBlocks) {
    try { const p = JSON.parse(b[1].trim()); if (Array.isArray(p)) schemas.push(...p); else schemas.push(p); } catch {}
  }
  // Also flatten @graph
  const allSchemas: any[] = [];
  for (const s of schemas) {
    if (s['@graph']) allSchemas.push(...s['@graph']);
    else allSchemas.push(s);
  }
  const getTypes = (s: any): string[] => { const t = s['@type']; return t ? (Array.isArray(t) ? t : [t]) : []; };
  const schemaTypes = allSchemas.flatMap(getTypes).filter(Boolean);

  // Meta
  const title = extractText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const metaDesc = html.match(/<meta\s+(?:[^>]*\s)?name=["']description["']\s+(?:[^>]*\s)?content=["']([^"']*)["']/i)?.[1] ||
                   html.match(/<meta\s+(?:[^>]*\s)?content=["']([^"']*)["']\s+(?:[^>]*\s)?name=["']description["']/i)?.[1] || '';

  // Headings
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => extractText(m[1]));
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => extractText(m[1]));
  const h3s = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(m => extractText(m[1]));
  const questionHeadings = [...h2s, ...h3s].filter(h => h.trim().endsWith('?'));

  // Content
  const listCount = (html.match(/<[uo]l[\s>]/gi) || []).length;
  const tableCount = (html.match(/<table[\s>]/gi) || []).length;
  const hasAuthor = /class=["'][^"']*author[^"']*["']|rel=["']author["']|itemprop=["']author["']|<span[^>]*>(?:by|author)[:\s]/i.test(html);
  const hasDate = /datePublished|dateModified|<time\s[^>]*datetime|class=["'][^"']*date[^"']*["']|itemprop=["']datePublished["']/i.test(html);
  const hasAboutPage = /href=["'][^"']*\/about(?:[-/]|["'])/i.test(html);
  const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html);
  const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] ||
                    html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i)?.[1] || '';
  const hasOgTags = /<meta[^>]*property=["']og:/i.test(html);
  const hasTwitterCard = /<meta[^>]*name=["']twitter:card["']/i.test(html);
  const hasFaqSchema = schemaTypes.some(t => t === 'FAQPage');
  const hasArticleSchema = schemaTypes.some(t => ['Article','BlogPosting','NewsArticle','TechArticle'].includes(t));
  const hasHowToSchema = schemaTypes.some(t => t === 'HowTo');
  const hasBreadcrumbSchema = schemaTypes.some(t => t === 'BreadcrumbList');
  const hasOrganizationSchema = schemaTypes.some(t => ['Organization','LocalBusiness','Corporation'].includes(t));
  const hasWebSiteSchema = schemaTypes.some(t => t === 'WebSite');
  const hasProductSchema = schemaTypes.some(t => t === 'Product');

  // Brand name from Organization schema
  let brandName = domain.replace(/^www\./, '').split('.')[0];
  const orgSchema = allSchemas.find(s => getTypes(s).some(t => ['Organization','LocalBusiness','WebSite'].includes(t)));
  if (orgSchema?.name) brandName = orgSchema.name;

  // Robots
  const robots = {
    gptbot: checkBotInRobots(robotsTxt, ['gptbot', 'oai-searchbot']),
    claudebot: checkBotInRobots(robotsTxt, ['claudebot', 'anthropic-ai', 'claude-web']),
    perplexitybot: checkBotInRobots(robotsTxt, ['perplexitybot', 'perplexity']),
    googleExtended: checkBotInRobots(robotsTxt, ['google-extended']),
    ccbot: checkBotInRobots(robotsTxt, ['ccbot']),
    bingbot: checkBotInRobots(robotsTxt, ['bingbot']),
  };

  return new Response(JSON.stringify({
    url: target, domain, origin, brandName, fetchedAt: new Date().toISOString(),
    pageTitle: title, metaDescription: metaDesc, metaDescriptionLength: metaDesc.length,
    pageFetchError,
    schemaTypes: [...new Set(schemaTypes)],
    hasFaqSchema, hasArticleSchema, hasHowToSchema, hasBreadcrumbSchema,
    hasOrganizationSchema, hasWebSiteSchema, hasProductSchema,
    h1Count: h1s.length, h2Count: h2s.length, h3Count: h3s.length,
    questionHeadings: questionHeadings.slice(0, 10),
    listCount, tableCount,
    hasAuthor, hasDate, hasAboutPage, hasCanonical, canonical,
    hasOgTags, hasTwitterCard,
    isHttps, hasSitemap, sitemapUrl, robots,
  }), { headers: { 'Content-Type': 'application/json' } });
}
