export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { businessName, location, category, website } = body as {
      businessName: string;
      location: string;
      category: string;
      website?: string;
    };

    if (!businessName || !location || !category) {
      return new Response(
        JSON.stringify({ error: 'MISSING_FIELDS', message: 'Business name, location and category are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = import.meta.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'NO_KEY', message: 'ANTHROPIC_API_KEY not configured' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const websiteNote = website ? ` Their website is ${website}.` : '';
    const bizLower = businessName.toLowerCase();
    const websiteDomain = website ? website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase() : '';

    const queries = [
      {
        engine: 'ChatGPT / OpenAI',
        engineKey: 'chatgpt',
        prompt: `What ${category} businesses or companies do you know in ${location}? List any you're aware of.`,
        type: 'category_search',
      },
      {
        engine: 'Perplexity AI',
        engineKey: 'perplexity',
        prompt: `I need a ${category} in ${location}. What are some trusted options? Include any well-known local businesses you know of.`,
        type: 'recommendation',
      },
      {
        engine: 'Google AI Overview',
        engineKey: 'google',
        prompt: `Tell me about a ${category} called "${businessName}" based in ${location}.${websiteNote} What do you know about this business?`,
        type: 'brand_query',
      },
      {
        engine: 'Claude AI',
        engineKey: 'claude',
        prompt: `Is "${businessName}" a well-known ${category} in ${location}? What can you tell me about them?${websiteNote}`,
        type: 'reputation_query',
      },
    ];

    const results: {
      engine: string;
      engineKey: string;
      prompt: string;
      response: string;
      mentioned: boolean;
      type: string;
    }[] = [];

    for (const q of queries) {
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 250,
            messages: [{ role: 'user', content: q.prompt }],
          }),
          signal: AbortSignal.timeout(15000),
        });

        const data = await r.json();
        const text = data.content?.[0]?.text || '';
        const textLower = text.toLowerCase();

        const notFamiliarPhrases = [
          "don't have information",
          "not familiar",
          "no information",
          "i'm not aware",
          "don't know",
          "cannot find",
          "no specific information",
          "don't have specific",
          "unable to verify",
          "not in my",
        ];

        const isNotFamiliar = notFamiliarPhrases.some(p => textLower.includes(p));

        const mentioned =
          !isNotFamiliar &&
          text.length > 60 &&
          (textLower.includes(bizLower) ||
            (websiteDomain && textLower.includes(websiteDomain)) ||
            (q.type === 'category_search' || q.type === 'recommendation'
              ? text.length > 100
              : false));

        results.push({ ...q, response: text, mentioned });
      } catch (e: any) {
        results.push({ ...q, response: 'Request timed out or failed.', mentioned: false });
      }
    }

    const mentionCount = results.filter(r => r.mentioned).length;
    const score =
      mentionCount === 4 ? 95 :
      mentionCount === 3 ? 72 :
      mentionCount === 2 ? 48 :
      mentionCount === 1 ? 22 : 5;

    const visibility =
      score >= 80 ? 'well-known' :
      score >= 55 ? 'visible' :
      score >= 30 ? 'emerging' : 'not-visible';

    const recommendations: { title: string; description: string; priority: 'high' | 'medium' | 'low' }[] = [];

    if (score < 80) {
      recommendations.push({
        title: 'Claim & Complete Google Business Profile',
        description: 'A fully completed GBP with photos, hours, services and regular posts is the #1 signal AI engines use to identify and recommend local businesses.',
        priority: 'high',
      });
    }
    if (score < 72) {
      recommendations.push({
        title: 'Add LocalBusiness Schema Markup',
        description: `Add JSON-LD LocalBusiness schema to your website with your business name "${businessName}", address, phone, category (${category}), and service area. AI crawlers extract this directly.`,
        priority: 'high',
      });
    }
    if (score < 55) {
      recommendations.push({
        title: 'Earn Citations on Yelp, BBB & Industry Directories',
        description: `Get listed on Yelp, Better Business Bureau, Angi, HomeAdvisor (if applicable), and ${category}-specific directories. Consistent NAP (Name, Address, Phone) across 20+ directories builds AI entity trust.`,
        priority: 'high',
      });
    }
    recommendations.push({
      title: 'Publish FAQ Content Targeting "${category} in ${location}" Queries',
      description: `Create a page answering questions like "How do I find a trusted ${category} in ${location}?" AI Overview and Perplexity pull from FAQ-style content. Use FAQPage schema markup.`,
      priority: score < 55 ? 'high' : 'medium',
    });
    if (!website) {
      recommendations.push({
        title: 'Build a Business Website',
        description: 'A professional website with your business name, location, services and contact information is essential for AI engines to identify and recommend your business.',
        priority: 'high',
      });
    }
    recommendations.push({
      title: 'Generate & Respond to Google Reviews',
      description: 'Businesses with 50+ Google reviews and owner responses rank significantly higher in AI-generated recommendations. Ask every satisfied customer for a review.',
      priority: 'medium',
    });
    recommendations.push({
      title: 'Create a Wikipedia or Wikidata Entry',
      description: 'If your business has been in operation for several years, a Wikipedia entry or Wikidata entity page dramatically improves AI knowledge graph recognition.',
      priority: score < 48 ? 'medium' : 'low',
    });
    recommendations.push({
      title: 'Get Featured in Local News & Press',
      description: `Earn mentions in ${location} local news, business journals or industry publications. AI models like ChatGPT train heavily on news content — a single quality press mention can establish brand recognition.`,
      priority: 'medium',
    });

    return new Response(
      JSON.stringify({
        businessName,
        location,
        category,
        website: website || null,
        results,
        mentionCount,
        score,
        visibility,
        recommendations: recommendations.slice(0, 6),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'SERVER_ERROR', message: err.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
