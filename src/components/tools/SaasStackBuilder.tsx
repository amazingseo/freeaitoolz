import { useState } from 'react';

const PROJECT_TYPES = [
  { id: 'saas', label: 'SaaS App', icon: '🚀', desc: 'Web-based software product' },
  { id: 'mobile', label: 'Mobile App', icon: '📱', desc: 'iOS or Android app' },
  { id: 'blog', label: 'Blog / Content', icon: '📝', desc: 'Content site or newsletter' },
  { id: 'startup', label: 'Startup / MVP', icon: '⚡', desc: 'Quick launch, all-in-one' },
];

interface StackTool {
  name: string;
  category: string;
  icon: string;
  description: string;
  freeLimit: string;
  url: string;
  tag?: string;
}

const STACKS: Record<string, StackTool[]> = {
  saas: [
    { name: 'Vercel', category: 'Hosting', icon: '▲', description: 'Deploy frontend and API routes', freeLimit: '100GB bandwidth/mo, unlimited deployments', url: 'https://vercel.com', tag: 'Recommended' },
    { name: 'Supabase', category: 'Database', icon: '🟢', description: 'Postgres database with REST & realtime', freeLimit: '500MB storage, 50,000 monthly active users', url: 'https://supabase.com', tag: 'Recommended' },
    { name: 'Clerk', category: 'Auth', icon: '🔐', description: 'User authentication & management', freeLimit: '10,000 monthly active users', url: 'https://clerk.com', tag: 'Recommended' },
    { name: 'Resend', category: 'Email', icon: '📧', description: 'Transactional email API', freeLimit: '3,000 emails/mo, 1 custom domain', url: 'https://resend.com' },
    { name: 'Upstash', category: 'Redis / Queue', icon: '⚡', description: 'Serverless Redis for caching & rate limiting', freeLimit: '10,000 requests/day', url: 'https://upstash.com' },
    { name: 'Sentry', category: 'Error Tracking', icon: '🐛', description: 'Error monitoring and performance', freeLimit: '5,000 errors/mo, 1 user', url: 'https://sentry.io' },
    { name: 'Cloudflare', category: 'CDN / DNS', icon: '🌐', description: 'CDN, DNS, and DDoS protection', freeLimit: 'Unlimited bandwidth, free SSL', url: 'https://cloudflare.com' },
    { name: 'Stripe', category: 'Payments', icon: '💳', description: 'Accept payments online', freeLimit: 'No monthly fee, 2.9% + 30¢ per transaction', url: 'https://stripe.com' },
  ],
  mobile: [
    { name: 'Expo', category: 'Framework', icon: '📱', description: 'Build React Native apps for iOS & Android', freeLimit: 'Unlimited builds, free tier plan', url: 'https://expo.dev', tag: 'Recommended' },
    { name: 'Supabase', category: 'Database & Auth', icon: '🟢', description: 'Database, auth, and storage', freeLimit: '500MB storage, 50,000 monthly active users', url: 'https://supabase.com', tag: 'Recommended' },
    { name: 'Firebase', category: 'Push Notifications', icon: '🔥', description: 'Cloud Messaging for push notifications', freeLimit: 'Unlimited push notifications free', url: 'https://firebase.google.com' },
    { name: 'RevenueCat', category: 'In-App Purchases', icon: '💰', description: 'Subscription management for apps', freeLimit: 'Free up to $2,500 monthly tracked revenue', url: 'https://revenuecat.com' },
    { name: 'Sentry', category: 'Error Tracking', icon: '🐛', description: 'Mobile crash reporting', freeLimit: '5,000 errors/mo', url: 'https://sentry.io' },
    { name: 'Resend', category: 'Email', icon: '📧', description: 'Transactional emails', freeLimit: '3,000 emails/mo', url: 'https://resend.com' },
    { name: 'Cloudflare', category: 'CDN / API', icon: '🌐', description: 'API hosting with Workers', freeLimit: '100,000 requests/day free', url: 'https://cloudflare.com' },
  ],
  blog: [
    { name: 'Vercel', category: 'Hosting', icon: '▲', description: 'Host your Astro, Next.js, or static site', freeLimit: '100GB bandwidth/mo, custom domain', url: 'https://vercel.com', tag: 'Recommended' },
    { name: 'Cloudflare Pages', category: 'Alternative Hosting', icon: '🌐', description: 'Fast global static site hosting', freeLimit: 'Unlimited bandwidth, 500 builds/mo', url: 'https://pages.cloudflare.com', tag: 'Recommended' },
    { name: 'ConvertKit', category: 'Email Newsletter', icon: '📧', description: 'Email newsletter and automation', freeLimit: 'Up to 1,000 subscribers free', url: 'https://convertkit.com' },
    { name: 'Supabase', category: 'Database', icon: '🟢', description: 'Store posts, comments, user data', freeLimit: '500MB storage', url: 'https://supabase.com' },
    { name: 'Cloudflare', category: 'CDN / DNS', icon: '☁️', description: 'Free CDN and SSL certificate', freeLimit: 'Unlimited bandwidth, free SSL', url: 'https://cloudflare.com' },
    { name: 'Google Analytics', category: 'Analytics', icon: '📊', description: 'Website traffic analytics', freeLimit: 'Free forever (GA4)', url: 'https://analytics.google.com' },
    { name: 'Giscus', category: 'Comments', icon: '💬', description: 'GitHub-powered comments system', freeLimit: 'Completely free, open source', url: 'https://giscus.app' },
  ],
  startup: [
    { name: 'Vercel', category: 'Hosting', icon: '▲', description: 'Deploy your MVP instantly', freeLimit: '100GB bandwidth/mo', url: 'https://vercel.com', tag: 'Start Here' },
    { name: 'Supabase', category: 'Database + Auth', icon: '🟢', description: 'All-in-one backend for MVPs', freeLimit: '500MB, 50k users, auth + storage included', url: 'https://supabase.com', tag: 'Start Here' },
    { name: 'Resend', category: 'Email', icon: '📧', description: 'Send welcome and transactional emails', freeLimit: '3,000 emails/mo', url: 'https://resend.com' },
    { name: 'Stripe', category: 'Payments', icon: '💳', description: 'Start charging customers', freeLimit: 'No monthly fee, pay per transaction', url: 'https://stripe.com' },
    { name: 'Cloudflare', category: 'CDN + DNS', icon: '🌐', description: 'Free CDN, DNS management, SSL', freeLimit: 'Unlimited bandwidth free', url: 'https://cloudflare.com' },
    { name: 'Notion', category: 'Docs + Wiki', icon: '📋', description: 'Team docs, roadmap, and planning', freeLimit: 'Unlimited blocks for individuals', url: 'https://notion.so' },
    { name: 'Linear', category: 'Issue Tracking', icon: '📌', description: 'Project and issue management', freeLimit: 'Free for up to 250 issues', url: 'https://linear.app' },
    { name: 'Plausible / Umami', category: 'Analytics', icon: '📊', description: 'Privacy-friendly analytics', freeLimit: 'Umami: self-host free forever', url: 'https://umami.is' },
  ]
};

export default function SaasStackBuilder() {
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const stack = selected ? STACKS[selected] : null;

  const copyStack = () => {
    if (!stack) return;
    const text = stack.map(t =>
      `${t.category}: ${t.name}\n  Free: ${t.freeLimit}\n  URL: ${t.url}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Select Your Project Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PROJECT_TYPES.map(pt => (
            <button
              key={pt.id}
              onClick={() => setSelected(pt.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selected === pt.id
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-2xl">{pt.icon}</span>
              <p className={`font-semibold text-sm mt-2 ${selected === pt.id ? 'text-blue-700' : 'text-gray-900'}`}>{pt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{pt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {stack && (
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Your Free Stack</h3>
              <p className="text-sm text-gray-500 mt-0.5">{stack.length} tools — all with free tiers</p>
            </div>
            <button
              onClick={copyStack}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all"
            >
              {copied ? '✓ Copied!' : 'Copy Stack'}
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {stack.map((tool, i) => (
              <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xl shrink-0 mt-0.5">{tool.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">{tool.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tool.category}</span>
                        {tool.tag && (
                          <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">{tool.tag}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{tool.description}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        <span className="text-gray-400">Free:</span> {tool.freeLimit}
                      </p>
                    </div>
                  </div>
                  
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                  >
                    {'Visit →'}
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 px-5 py-4 border-t border-blue-100">
            <p className="text-xs text-blue-700">
              <span className="font-semibold">💡 Tip:</span> Start with the "Recommended" tools first. Only upgrade when you exceed the free limits — most MVPs launch and get first customers without paying anything.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
