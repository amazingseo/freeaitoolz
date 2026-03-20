export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { businessName, category, location, description, phone, website, services } = body as {
      businessName: string; category: string; location: string;
      description: string; phone?: string; website?: string; services?: string;
    };

    if (!businessName || !category || !location || !description) {
      return new Response(JSON.stringify({ error: 'MISSING_FIELDS', message: 'Business name, category, location and description are required.' }), { status: 400 });
    }

    const apiKey = import.meta.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) return new Response(JSON.stringify({ error: 'NO_KEY' }), { status: 200 });

    const prompt = `You are an AEO (Answer Engine Optimization) expert scoring and rewriting Google Business Profile descriptions for maximum AI search visibility in 2026.

Business Details:
- Name: ${businessName}
- Category: ${category}
- Location: ${location}
- Current GBP Description: ${description}
${phone ? `- Phone: ${phone}` : ''}
${website ? `- Website: ${website}` : ''}
${services ? `- Services: ${services}` : ''}

TASK 1 — Score the current description on these 10 AEO criteria (0-10 each):
1. Entity clarity (does it clearly name the business and what it does?)
2. Location signals (city, state, service area mentioned?)
3. Service specificity (specific services listed, not just vague category?)
4. Trust signals (years experience, licensed, insured, certified?)
5. Keyword alignment (does it match how customers search AI engines?)
6. Call to action (does it encourage next step: call, visit, book?)
7. Differentiator (what makes them different from competitors?)
8. Natural language (reads naturally for AI extraction, not keyword stuffed?)
9. Response time / availability (hours, emergency, same-day?)
10. Review/social proof signals (awards, rating, customer count?)

TASK 2 — Write a rewritten GBP description (750 chars max) that scores 9-10 on all criteria.

TASK 3 — Generate 10 weekly GBP post ideas specifically designed to improve AI visibility (AI engines increasingly read GBP posts for recency signals).

TASK 4 — List the top 8 GBP attributes this business type should have filled in (not generic — specific to ${category} businesses).

Respond ONLY with valid JSON:
{
  "scores": {
    "entityClarity": 0-10,
    "locationSignals": 0-10,
    "serviceSpecificity": 0-10,
    "trustSignals": 0-10,
    "keywordAlignment": 0-10,
    "callToAction": 0-10,
    "differentiator": 0-10,
    "naturalLanguage": 0-10,
    "availability": 0-10,
    "socialProof": 0-10
  },
  "scoreReasons": {
    "entityClarity": "brief reason",
    "locationSignals": "brief reason",
    "serviceSpecificity": "brief reason",
    "trustSignals": "brief reason",
    "keywordAlignment": "brief reason",
    "callToAction": "brief reason",
    "differentiator": "brief reason",
    "naturalLanguage": "brief reason",
    "availability": "brief reason",
    "socialProof": "brief reason"
  },
  "rewrittenDescription": "the full rewritten GBP description under 750 chars",
  "characterCount": number,
  "postIdeas": [
    { "title": "post title", "content": "50-word post content", "type": "Update|Offer|Event|Product" }
  ],
  "missingAttributes": [
    { "attribute": "attribute name", "why": "why this matters for AI visibility", "priority": "High|Medium|Low" }
  ]
}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await r.json();
    const raw = data.content?.[0]?.text || '';
    let parsed: any;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch { return new Response(JSON.stringify({ error: 'PARSE_ERROR', message: 'Failed to parse response. Please try again.' }), { status: 200 }); }

    const scores = parsed.scores || {};
    const total = Object.values(scores).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
    const overallScore = Math.round((total / 100) * 100);

    return new Response(JSON.stringify({
      businessName, category, location,
      originalDescription: description,
      overallScore,
      scores: parsed.scores,
      scoreReasons: parsed.scoreReasons,
      rewrittenDescription: parsed.rewrittenDescription,
      characterCount: parsed.characterCount || parsed.rewrittenDescription?.length || 0,
      postIdeas: parsed.postIdeas || [],
      missingAttributes: parsed.missingAttributes || [],
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'SERVER_ERROR', message: err.message }), { status: 500 });
  }
}
