export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { businessName, category, location, website, phone, description } = body as {
      businessName: string;
      category: string;
      location: string;
      website?: string;
      phone?: string;
      description?: string;
    };

    if (!businessName || !category || !location) {
      return new Response(
        JSON.stringify({ error: 'MISSING_FIELDS', message: 'Business name, category and location are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = import.meta.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'NO_KEY', message: 'ANTHROPIC_API_KEY not configured.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are an AEO (Answer Engine Optimization) expert helping local businesses get found in ChatGPT, Perplexity, Google AI Overviews, and Claude.

Generate exactly 10 FAQ question-and-answer pairs for this local business:

Business Name: ${businessName}
Category: ${category}
Location: ${location}
${website ? `Website: ${website}` : ''}
${phone ? `Phone: ${phone}` : ''}
${description ? `Description: ${description}` : ''}

Rules for the questions:
1. Questions must be EXACTLY what real customers type into ChatGPT or Google ("best ${category} in ${location}", "how much does ${category} cost", "emergency ${category} near me", etc.)
2. Mix question types: 5 location-specific ("...in ${location}"), 3 service/pricing, 2 about this specific business
3. Each answer must be 60–120 words — short enough for AI to extract, long enough to be useful
4. Answers must mention "${businessName}" and "${location}" naturally
5. Answers should establish trust: mention experience, licensing/certifications if applicable, service area, response time
6. NO generic answers — every answer must be specific to this business type and location

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{
  "faqs": [
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." }
  ],
  "seoTitle": "A 60-char page title for an FAQ page on their website",
  "seoDescription": "A 150-char meta description for an FAQ page on their website"
}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await r.json();
    const raw = data.content?.[0]?.text || '';

    let parsed: { faqs: { question: string; answer: string }[]; seoTitle: string; seoDescription: string };
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return new Response(
        JSON.stringify({ error: 'PARSE_ERROR', message: 'Failed to parse AI response. Please try again.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build FAQPage JSON-LD schema
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: parsed.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };

    // Build LocalBusiness JSON-LD schema
    const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const localBusinessSchema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: businessName,
      description: description || `${businessName} is a trusted ${category} serving ${location} and surrounding areas.`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: location.split(',')[0]?.trim() || location,
        addressRegion: location.split(',')[1]?.trim() || '',
        addressCountry: 'US',
      },
      areaServed: {
        '@type': 'GeoCircle',
        geoMidpoint: {
          '@type': 'GeoCoordinates',
          description: location,
        },
        geoRadius: '30 miles',
      },
      knowsAbout: [category],
    };

    if (website) localBusinessSchema.url = website.startsWith('http') ? website : `https://${website}`;
    if (phone) localBusinessSchema.telephone = phone;

    return new Response(
      JSON.stringify({
        businessName,
        category,
        location,
        website: website || null,
        faqs: parsed.faqs,
        seoTitle: parsed.seoTitle,
        seoDescription: parsed.seoDescription,
        faqSchema,
        localBusinessSchema,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'SERVER_ERROR', message: err.message || 'Unknown error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
