import { useState, useMemo } from 'react';

interface Tool { name: string; desc: string; tier: string; url: string; category: string; }

const TOOL_DB: Tool[] = [
  // Frontend / App Builders
  { name: 'Bolt.new', desc: 'AI full-stack app builder in browser', tier: 'Free tier + $20/mo', url: 'https://bolt.new', category: 'frontend' },
  { name: 'Vercel + Next.js', desc: 'Production-grade React framework with free hosting', tier: 'Free tier (100GB)', url: 'https://vercel.com', category: 'frontend' },
  { name: 'Lovable (GPT Engineer)', desc: 'AI-generated React apps from natural language', tier: 'Free tier available', url: 'https://lovable.dev', category: 'frontend' },
  { name: 'Replit', desc: 'Cloud IDE with AI coding assistant', tier: 'Free tier + $25/mo', url: 'https://replit.com', category: 'frontend' },
  { name: 'Cloudflare Pages', desc: 'Free static site hosting with global CDN', tier: 'Free (unlimited bandwidth)', url: 'https://pages.cloudflare.com', category: 'hosting' },
  // Backend / Database
  { name: 'Supabase', desc: 'Open-source Firebase alternative (Postgres + Auth + Storage)', tier: 'Free: 500MB DB, 50K MAU', url: 'https://supabase.com', category: 'database' },
  { name: 'Neon', desc: 'Serverless Postgres with branching', tier: 'Free: 512MB storage', url: 'https://neon.tech', category: 'database' },
  { name: 'PlanetScale', desc: 'Serverless MySQL with branching', tier: 'Hobby plan free', url: 'https://planetscale.com', category: 'database' },
  { name: 'Firebase', desc: 'Google BaaS (Firestore, Auth, Functions)', tier: 'Free: Spark plan generous', url: 'https://firebase.google.com', category: 'database' },
  { name: 'Convex', desc: 'Reactive backend with real-time sync', tier: 'Free: hobby usage', url: 'https://convex.dev', category: 'database' },
  // Auth
  { name: 'Clerk', desc: 'Drop-in auth components (social login, MFA)', tier: 'Free: 10K MAU', url: 'https://clerk.com', category: 'auth' },
  { name: 'Auth.js (NextAuth)', desc: 'Open-source auth for Next.js', tier: 'Free (open source)', url: 'https://authjs.dev', category: 'auth' },
  { name: 'Supabase Auth', desc: 'Built-in auth with Supabase', tier: 'Free: 50K MAU', url: 'https://supabase.com/auth', category: 'auth' },
  // Payments
  { name: 'Stripe', desc: 'Payment processing + subscriptions', tier: '2.9% + 30¢ per transaction', url: 'https://stripe.com', category: 'payments' },
  { name: 'Lemon Squeezy', desc: 'Merchant of record (handles tax)', tier: '5% + 50¢ per transaction', url: 'https://lemonsqueezy.com', category: 'payments' },
  // Mobile
  { name: 'Expo + React Native', desc: 'Cross-platform mobile apps', tier: 'Free (open source)', url: 'https://expo.dev', category: 'mobile' },
  { name: 'FlutterFlow', desc: 'Visual Flutter app builder', tier: 'Free tier available', url: 'https://flutterflow.io', category: 'mobile' },
  // AI
  { name: 'OpenAI API', desc: 'GPT-4, GPT-4o-mini for AI features', tier: '$0.15-$30 per 1M tokens', url: 'https://platform.openai.com', category: 'ai' },
  { name: 'Anthropic Claude API', desc: 'Claude for advanced reasoning', tier: '$3-$15 per 1M tokens', url: 'https://console.anthropic.com', category: 'ai' },
  { name: 'Groq', desc: 'Ultra-fast LLM inference (Llama, Mixtral)', tier: 'Free: 14K tokens/min', url: 'https://groq.com', category: 'ai' },
  // Email
  { name: 'Resend', desc: 'Modern email API for developers', tier: 'Free: 3K emails/month', url: 'https://resend.com', category: 'email' },
  { name: 'Loops', desc: 'Email marketing for SaaS', tier: 'Free: 1K contacts', url: 'https://loops.so', category: 'email' },
  // Analytics
  { name: 'PostHog', desc: 'Product analytics, session replays, A/B tests', tier: 'Free: 1M events/mo', url: 'https://posthog.com', category: 'analytics' },
  { name: 'Plausible', desc: 'Privacy-first web analytics', tier: '$9/mo (or self-host free)', url: 'https://plausible.io', category: 'analytics' },
  // Automation
  { name: 'n8n', desc: 'Open-source workflow automation', tier: 'Free (self-host) or $20/mo', url: 'https://n8n.io', category: 'automation' },
  { name: 'Trigger.dev', desc: 'Background jobs for Next.js', tier: 'Free: 50K runs/mo', url: 'https://trigger.dev', category: 'automation' },
];

const NEED_KEYWORDS: Record<string, string[]> = {
  frontend: ['website', 'web app', 'landing page', 'dashboard', 'ui', 'frontend', 'react', 'app'],
  database: ['database', 'store data', 'users', 'backend', 'api', 'crud', 'postgres', 'data'],
  auth: ['login', 'signup', 'auth', 'user accounts', 'social login', 'register', 'password'],
  payments: ['payment', 'billing', 'subscription', 'charge', 'stripe', 'checkout', 'saas pricing'],
  mobile: ['mobile', 'ios', 'android', 'native app', 'phone', 'cross-platform'],
  ai: ['ai', 'chatbot', 'gpt', 'llm', 'openai', 'claude', 'machine learning', 'generate'],
  email: ['email', 'newsletter', 'transactional', 'notification', 'mail'],
  analytics: ['analytics', 'tracking', 'metrics', 'dashboard', 'a/b test'],
  hosting: ['deploy', 'host', 'cdn', 'static site'],
  automation: ['automate', 'workflow', 'cron', 'background job', 'schedule'],
};

export default function VibeCodingStackSuggester() {
  const [idea, setIdea] = useState('');
  const [stack, setStack] = useState<{ category: string; tools: Tool[] }[] | null>(null);

  const suggest = () => {
    const lower = idea.toLowerCase();
    const detectedNeeds = new Set<string>();

    // Always need frontend
    detectedNeeds.add('frontend');
    detectedNeeds.add('hosting');

    for (const [category, keywords] of Object.entries(NEED_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k))) detectedNeeds.add(category);
    }

    // Smart defaults
    if (detectedNeeds.has('database') || detectedNeeds.has('auth') || lower.includes('saas') || lower.includes('platform')) {
      detectedNeeds.add('database');
      detectedNeeds.add('auth');
    }
    if (lower.includes('saas') || lower.includes('subscription') || lower.includes('paid')) {
      detectedNeeds.add('payments');
    }

    const result: { category: string; tools: Tool[] }[] = [];
    const categoryNames: Record<string, string> = {
      frontend: '🖥️ Frontend / App Builder',
      hosting: '☁️ Hosting',
      database: '🗄️ Database / Backend',
      auth: '🔐 Authentication',
      payments: '💳 Payments',
      mobile: '📱 Mobile',
      ai: '🤖 AI / LLM',
      email: '📧 Email',
      analytics: '📊 Analytics',
      automation: '⚡ Automation',
    };

    for (const need of detectedNeeds) {
      const tools = TOOL_DB.filter(t => t.category === need);
      if (tools.length > 0) {
        result.push({ category: categoryNames[need] || need, tools: tools.slice(0, 3) });
      }
    }

    setStack(result);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Describe Your App Idea</label>
        <textarea value={idea} onChange={e => setIdea(e.target.value)}
          placeholder="e.g., I want to build a SaaS tool where users can sign up, upload documents, and chat with them using AI. It needs billing and a mobile-friendly dashboard."
          className="w-full min-h-[120px] p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-y text-base leading-relaxed" />
      </div>

      <div className="flex flex-wrap gap-2">
        {['SaaS with AI chatbot', 'E-commerce store', 'Mobile app with auth', 'Blog with newsletter', 'Dashboard with analytics'].map(p => (
          <button key={p} onClick={() => setIdea(p)} className="text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-600">{p}</button>
        ))}
      </div>

      <button onClick={suggest} disabled={!idea.trim()} className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-lg transition-all">
        🚀 Suggest My Stack
      </button>

      {stack && (
        <div className="space-y-6 pt-4">
          <h3 className="text-xl font-extrabold text-gray-900">Your Recommended "Vibe Coding" Stack</h3>
          {stack.map(s => (
            <div key={s.category}>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">{s.category}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {s.tools.map((t, i) => (
                  <a key={t.name} href={t.url} target="_blank" rel="noopener"
                    className={`block p-4 rounded-xl border-2 transition-all hover:shadow-md ${i === 0 ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    {i === 0 && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Recommended</span>}
                    <p className="text-sm font-bold text-gray-900 mt-1">{t.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
                    <p className="text-xs font-bold text-emerald-600 mt-2">{t.tier}</p>
                  </a>
                ))}
              </div>
            </div>
          ))}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800"><strong>💡 Pro tip:</strong> Start with the "Recommended" option in each category. You can always switch later. Most of these have generous free tiers — your total monthly cost for an MVP could be <strong>$0-$20/month</strong>.</p>
          </div>
        </div>
      )}
    </div>
  );
}
