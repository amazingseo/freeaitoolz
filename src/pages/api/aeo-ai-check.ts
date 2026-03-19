export const prerender = false;

export async function GET({ url }: { url: URL }) {
  const domain = url.searchParams.get('domain') || '';
  const brand = url.searchParams.get('brand') || domain.split('.')[0];

  const apiKey = import.meta.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) return new Response(JSON.stringify({ error: 'NO_KEY', message: 'ANTHROPIC_API_KEY not configured' }), { status: 200 });

  const prompts = [
    `What is ${domain}? Answer in 2–3 sentences. Be factual.`,
    `What does the brand or website "${brand}" do or offer? Brief answer only.`,
    `Have you heard of a company or website called "${brand}" (${domain})? What do you know about it?`,
  ];

  const results: { prompt: string; response: string; mentioned: boolean }[] = [];
  const domainRoot = domain.replace(/^www\./, '').split('.')[0].toLowerCase();
  const brandLower = brand.toLowerCase();

  for (const prompt of prompts) {
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
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await r.json();
      const text = data.content?.[0]?.text || '';
      const mentioned = text.toLowerCase().includes(domainRoot) || text.toLowerCase().includes(brandLower) ||
                        !text.toLowerCase().includes("don't") && !text.toLowerCase().includes("not aware") &&
                        !text.toLowerCase().includes("no information") && !text.toLowerCase().includes("i'm not familiar") &&
                        !text.toLowerCase().includes("don't have") && text.length > 50;
      results.push({ prompt, response: text, mentioned });
    } catch (e: any) {
      results.push({ prompt, response: 'Error: ' + (e.message || 'timeout'), mentioned: false });
    }
  }

  const mentionCount = results.filter(r => r.mentioned).length;
  const score = mentionCount === 3 ? 100 : mentionCount === 2 ? 70 : mentionCount === 1 ? 35 : 0;
  const sentiment = score >= 70 ? 'known' : score >= 35 ? 'partial' : 'unknown';

  return new Response(JSON.stringify({ domain, brand, results, mentionCount, score, sentiment }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
