export const prerender = false;

export async function GET({ url }: { url: URL }) {
  const target = url.searchParams.get('url');
  if (!target) return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400 });

  let parsedUrl: URL;
  try { parsedUrl = new URL(target); } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), { status: 400 });
  }

  const apiKey = import.meta.env.ANTHROPIC_API_KEY || '';
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; SchemaValidatorBot/1.0; +https://freeaitoolz.com)', 'Accept': 'text/html' };

  // Fetch page
  let html = '';
  let fetchError = '';
  try {
    const r = await fetch(target, { headers, signal: AbortSignal.timeout(12000) });
    html = await r.text();
  } catch (e: any) { fetchError = e.message; }

  // Extract all JSON-LD blocks with positions
  const blocks: { raw: string; parsed: any; lineStart: number; index: number }[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    const lineStart = html.substring(0, match.index).split('\n').length;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item['@graph']) {
          for (const g of item['@graph']) blocks.push({ raw: JSON.stringify(g, null, 2), parsed: g, lineStart, index: blocks.length });
        } else {
          blocks.push({ raw: JSON.stringify(item, null, 2), parsed: item, lineStart, index: blocks.length });
        }
      }
    } catch (e: any) {
      blocks.push({ raw, parsed: null, lineStart, index: blocks.length });
    }
  }

  if (!apiKey || blocks.length === 0) {
    return new Response(JSON.stringify({
      url: target, domain: parsedUrl.hostname, fetchError,
      blocks: blocks.map(b => ({ ...b, errors: b.parsed === null ? [{ field: 'root', message: 'Invalid JSON — cannot be parsed', severity: 'error' }] : [], warnings: [], fixed: null, valid: b.parsed !== null })),
      totalBlocks: blocks.length, totalErrors: blocks.filter(b => !b.parsed).length, totalWarnings: 0,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Validate + fix each block with Claude
  const REQUIRED: Record<string, string[]> = {
    FAQPage: ['mainEntity'], Question: ['name', 'acceptedAnswer'], Answer: ['text'],
    LocalBusiness: ['name', 'address'], PostalAddress: ['addressLocality'],
    Article: ['headline', 'author', 'datePublished'], BlogPosting: ['headline', 'author', 'datePublished'],
    Organization: ['name'], WebSite: ['name', 'url'],
    BreadcrumbList: ['itemListElement'], ListItem: ['position', 'name'],
    HowTo: ['name', 'step'], HowToStep: ['text'],
    Product: ['name'], Review: ['reviewRating', 'author'],
    Event: ['name', 'startDate', 'location'], VideoObject: ['name', 'description', 'thumbnailUrl', 'uploadDate'],
  };

  const RECOMMENDED: Record<string, string[]> = {
    LocalBusiness: ['telephone', 'url', 'openingHours', 'description'],
    Organization: ['url', 'logo', 'sameAs', 'description'],
    Article: ['description', 'image', 'publisher'],
    Product: ['description', 'image', 'offers'],
    FAQPage: [],
  };

  const validated = await Promise.all(blocks.map(async (block) => {
    const errors: { field: string; message: string; severity: 'error' | 'warning' }[] = [];
    const warnings: { field: string; message: string; severity: 'error' | 'warning' }[] = [];

    if (!block.parsed) {
      errors.push({ field: 'root', message: 'Invalid JSON — cannot be parsed', severity: 'error' });
      return { ...block, errors, warnings, fixed: null, valid: false };
    }

    const p = block.parsed;
    const type = Array.isArray(p['@type']) ? p['@type'][0] : p['@type'];

    if (!p['@context']) errors.push({ field: '@context', message: 'Missing @context (should be "https://schema.org")', severity: 'error' });
    if (!p['@type']) errors.push({ field: '@type', message: 'Missing @type — schema type is required', severity: 'error' });

    if (type && REQUIRED[type]) {
      for (const field of REQUIRED[type]) {
        if (!p[field]) errors.push({ field, message: `Missing required field "${field}" for ${type} schema`, severity: 'error' });
      }
    }
    if (type && RECOMMENDED[type]) {
      for (const field of RECOMMENDED[type]) {
        if (!p[field]) warnings.push({ field, message: `Recommended field "${field}" missing — improves AI citation quality`, severity: 'warning' });
      }
    }

    // FAQPage specific: check mainEntity structure
    if (type === 'FAQPage' && p.mainEntity) {
      if (!Array.isArray(p.mainEntity)) errors.push({ field: 'mainEntity', message: 'mainEntity must be an array of Question objects', severity: 'error' });
      else {
        p.mainEntity.forEach((q: any, i: number) => {
          if (q['@type'] !== 'Question') errors.push({ field: `mainEntity[${i}].@type`, message: `Item ${i} must have @type: "Question"`, severity: 'error' });
          if (!q.name) errors.push({ field: `mainEntity[${i}].name`, message: `Question ${i} missing "name" (the question text)`, severity: 'error' });
          if (!q.acceptedAnswer?.text) errors.push({ field: `mainEntity[${i}].acceptedAnswer.text`, message: `Question ${i} missing acceptedAnswer.text`, severity: 'error' });
        });
      }
    }

    // LocalBusiness: check address object
    if (type === 'LocalBusiness' && p.address && typeof p.address === 'string') {
      errors.push({ field: 'address', message: 'address must be a PostalAddress object, not a plain string', severity: 'error' });
    }

    const hasErrors = errors.length > 0;
    let fixed: string | null = null;

    if (hasErrors && apiKey) {
      try {
        const fixPrompt = `You are a schema.org JSON-LD expert. Fix this broken schema and return ONLY the corrected JSON-LD (no markdown, no explanation):

Schema type: ${type}
Errors found:
${errors.map(e => `- ${e.field}: ${e.message}`).join('\n')}

Original schema:
${block.raw}

Rules:
1. Fix all errors listed above
2. Keep all existing valid data
3. Add missing required fields with placeholder values like "Your Business Name", "Your City", etc
4. Return ONLY the raw JSON object, no \`\`\`json wrapper`;

        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, messages: [{ role: 'user', content: fixPrompt }] }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await r.json();
        const text = data.content?.[0]?.text || '';
        const clean = text.replace(/```json|```/g, '').trim();
        JSON.parse(clean); // validate it's valid JSON
        fixed = `<script type="application/ld+json">\n${JSON.stringify(JSON.parse(clean), null, 2)}\n</script>`;
      } catch {}
    }

    return { ...block, errors, warnings, fixed, valid: errors.length === 0 };
  }));

  const totalErrors = validated.reduce((s, b) => s + b.errors.length, 0);
  const totalWarnings = validated.reduce((s, b) => s + b.warnings.length, 0);

  return new Response(JSON.stringify({
    url: target, domain: parsedUrl.hostname, fetchError,
    blocks: validated, totalBlocks: validated.length, totalErrors, totalWarnings,
  }), { headers: { 'Content-Type': 'application/json' } });
}
