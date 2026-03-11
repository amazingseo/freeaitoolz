export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  try {
    const reqUrl = new URL(request.url);
    const url = reqUrl.searchParams.get('url');
    const strategy = reqUrl.searchParams.get('strategy') || 'mobile';

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const PAGESPEED_API_KEY = import.meta.env.PAGESPEED_API_KEY;

    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo`;

    if (PAGESPEED_API_KEY) {
      apiUrl += `&key=${PAGESPEED_API_KEY}`;
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message || 'Could not analyze this URL.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lh = data.lighthouseResult;
    const categories = lh.categories;
    const audits = lh.audits;

    const result = {
      url,
      strategy,
      scores: {
        performance: Math.round((categories.performance?.score || 0) * 100),
        accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100),
      },
      metrics: {
        fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
        lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
        tbt: audits['total-blocking-time']?.displayValue || 'N/A',
        cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
        si: audits['speed-index']?.displayValue || 'N/A',
        tti: audits['interactive']?.displayValue || 'N/A',
      },
      opportunities: Object.values(audits)
        .filter((a: any) => a.details?.type === 'opportunity' && a.score !== null && a.score < 1)
        .sort((a: any, b: any) => (a.score || 0) - (b.score || 0))
        .slice(0, 6)
        .map((a: any) => ({
          title: a.title,
          description: a.description,
          savings: a.details?.overallSavingsMs ? `${Math.round(a.details.overallSavingsMs)}ms` : ''
        })),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to analyze website. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
