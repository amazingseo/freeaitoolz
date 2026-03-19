export const prerender = false;

export async function GET({ url }: { url: URL }) {
  const target = url.searchParams.get('url');
  const strategy = url.searchParams.get('strategy') || 'mobile';

  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url param' }), { status: 400 });
  }

  const apiKey = import.meta.env.PAGESPEED_API_KEY || '';
  const keyParam = apiKey ? `&key=${apiKey}` : '';

  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(target)}&strategy=${strategy}&category=performance&category=seo&category=accessibility&category=best-practices${keyParam}`;

  try {
    const res = await fetch(apiUrl);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Fetch failed' }), { status: 500 });
  }
}
