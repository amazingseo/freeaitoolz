export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { businessType, location, website } = body as { businessType: string; location: string; website?: string };

    if (!businessType || !location) {
      return new Response(JSON.stringify({ error: 'MISSING_FIELDS', message: 'Business type and location are required.' }), { status: 400 });
    }

    const apiKey = import.meta.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) return new Response(JSON.stringify({ error: 'NO_KEY' }), { status: 200 });

    // Fetch website if provided to check existing content
    let siteContent = '';
    if (website) {
      try {
        const url = website.startsWith('http') ? website : `https://${website}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IntentMapBot/1.0)' } });
        const html = await r.text();
        // Extract headings and visible text
        const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 30);
        const faqSchema = html.includes('FAQPage');
        const hasLocalBiz = html.includes('LocalBusiness');
        siteContent = `Existing headings on site: ${headings.join(' | ')}\nHas FAQPage schema: ${faqSchema}\nHas LocalBusiness schema: ${hasLocalBiz}`;
      } catch {}
    }

    const prompt = `You are an AEO (Answer Engine Optimization) expert creating an AI Search Intent Map for a local business.

Business Type: ${businessType}
Location: ${location}
${siteContent ? `\nWebsite Analysis:\n${siteContent}` : ''}

Generate exactly 18 search intents that real customers use when searching for this type of business in AI engines like ChatGPT, Perplexity, and Google AI Overviews.

Cover all 5 intent categories (at least 3 per category):
1. INFORMATIONAL - "how much does X cost", "what is X", "how long does X take"
2. LOCAL - "best X in [location]", "X near me [location]", "top rated X [location]"  
3. EMERGENCY - "emergency X [location]", "24/7 X near me", "urgent X help"
4. COMPARISON - "X vs Y", "best X companies", "licensed X contractor checklist"
5. TRUST - "is X insured in [state]", "how to verify X license", "X reviews [location]"

For each intent, also determine:
- The best content format to answer it (FAQ, How-To, Service Page, About Page, Blog Post, Landing Page)
- The schema type that would help get cited (FAQPage, HowTo, LocalBusiness, Article, Service, Review)
- AI citation potential (High / Medium / Low)
${website ? '- Coverage status on their site (Covered / Partial / Missing) based on the headings analysis above' : ''}

Respond ONLY with valid JSON, no markdown:
{
  "intents": [
    {
      "query": "exact search query",
      "category": "INFORMATIONAL|LOCAL|EMERGENCY|COMPARISON|TRUST",
      "contentFormat": "FAQ|How-To|Service Page|About Page|Blog Post|Landing Page",
      "schemaType": "FAQPage|HowTo|LocalBusiness|Article|Service|Review",
      "citationPotential": "High|Medium|Low",
      "citationReason": "one sentence why AI engines would cite this",
      ${website ? '"coverage": "Covered|Partial|Missing",' : ''}
      "priority": 1-18
    }
  ],
  "topOpportunities": ["3 highest-impact actions the business should take first"],
  "estimatedTimeToVisibility": "realistic timeframe e.g. 2-4 weeks for FAQPage schema"
}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await r.json();
    const raw = data.content?.[0]?.text || '';
    let parsed: any;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch { return new Response(JSON.stringify({ error: 'PARSE_ERROR', message: 'Failed to parse response. Please try again.' }), { status: 200 }); }

    return new Response(JSON.stringify({
      businessType, location, website: website || null,
      intents: parsed.intents || [],
      topOpportunities: parsed.topOpportunities || [],
      estimatedTimeToVisibility: parsed.estimatedTimeToVisibility || '2–8 weeks',
      hasSiteAnalysis: !!siteContent,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'SERVER_ERROR', message: err.message }), { status: 500 });
  }
}
