import { useState } from 'react';

interface LinkSuggestion {
  title: string;
  url: string;
  matchedKeywords: string[];
  relevanceScore: number;
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a','an','the','and','or','but','in','on','at','to','for','of','with',
    'by','from','is','are','was','were','be','been','being','have','has',
    'had','do','does','did','will','would','could','should','may','might',
    'how','what','when','where','why','who','which','that','this','these',
    'those','i','you','he','she','we','they','it','its','my','your','our',
    'their','free','best','top','using','use','get','make','your','more'
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
}

function scoreMatch(newKeywords: string[], existingTitle: string): { score: number; matched: string[] } {
  const existingKeywords = extractKeywords(existingTitle);
  const matched: string[] = [];
  for (const kw of newKeywords) {
    if (existingKeywords.some(ek => ek.includes(kw) || kw.includes(ek))) {
      if (!matched.includes(kw)) matched.push(kw);
    }
  }
  return { score: matched.length, matched };
}

export default function InternalLinkSuggester() {
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [existingPages, setExistingPages] = useState('');
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [error, setError] = useState('');

  const analyze = () => {
    setError('');
    if (!newTitle.trim()) { setError('Please enter your new article title.'); return; }
    if (!existingPages.trim()) { setError('Please paste your existing article titles/URLs.'); return; }

    const newKeywords = extractKeywords(newTitle);
    if (newKeywords.length === 0) { setError('Could not extract keywords from title. Try a more descriptive title.'); return; }

    const lines = existingPages.split('\n').map(l => l.trim()).filter(Boolean);
    const results: LinkSuggestion[] = [];

    for (const line of lines) {
      const parts = line.split(/[\t,|]/).map(p => p.trim());
      const title = parts[0] || line;
      const url = parts[1] || '#';
      const { score, matched } = scoreMatch(newKeywords, title);
      if (score > 0) {
        results.push({ title, url, matchedKeywords: matched, relevanceScore: score });
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    setSuggestions(results);
    setAnalyzed(true);
  };

  const reset = () => {
    setNewTitle(''); setNewUrl(''); setExistingPages('');
    setSuggestions([]); setAnalyzed(false); setError('');
  };

  const copyAll = () => {
    const text = suggestions.map(s =>
      `${s.title}\n  URL: ${s.url}\n  Keywords: ${s.matchedKeywords.join(', ')}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">New Article Title</label>
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="e.g. How to Use AI for SEO in 2026"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">New Article URL (optional)</label>
          <input
            type="text"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="e.g. /blog/ai-for-seo-2026"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Existing Article Titles & URLs
          <span className="font-normal text-gray-500 ml-2">— one per line, format: Title, URL (URL optional)</span>
        </label>
        <textarea
          value={existingPages}
          onChange={e => setExistingPages(e.target.value)}
          placeholder={`How to Write Better Blog Posts, /blog/write-better-posts\nSEO Tips for Beginners, /blog/seo-tips\nContent Marketing Strategy 2026, /blog/content-strategy\nAI Tools for Content Creators, /blog/ai-tools-content`}
          className="w-full min-h-[200px] px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-y"
        />
        <p className="text-xs text-gray-500 mt-1">Tip: Paste as many articles as possible for better results. Export your sitemap titles for best coverage.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          onClick={analyze}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-sm text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Find Link Opportunities
        </button>
        {analyzed && (
          <button onClick={reset} className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-5 py-3 rounded-xl transition-all text-sm">
            Reset
          </button>
        )}
      </div>

      {analyzed && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-5 py-4 flex items-center justify-between border-b border-gray-200">
            <div>
              <h3 className="font-bold text-gray-900">
                {suggestions.length > 0
                  ? `${suggestions.length} Link Opportunit${suggestions.length === 1 ? 'y' : 'ies'} Found`
                  : 'No Matches Found'}
              </h3>
              {suggestions.length > 0 && (
                <p className="text-sm text-gray-500 mt-0.5">Articles that mention keywords from your new post</p>
              )}
            </div>
            {suggestions.length > 0 && (
              <button onClick={copyAll} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all">
                Copy All
              </button>
            )}
          </div>

          {suggestions.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-gray-500 text-sm">No keyword matches found. Try adding more articles or using a more specific title for your new post.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {suggestions.map((s, i) => (
                <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{s.title}</p>
                      <p className="text-xs text-blue-600 mt-0.5 truncate">{s.url}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {s.matchedKeywords.map(kw => (
                          <span key={kw} className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                        s.relevanceScore >= 3 ? 'bg-green-100 text-green-700' :
                        s.relevanceScore === 2 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {s.relevanceScore >= 3 ? 'High' : s.relevanceScore === 2 ? 'Medium' : 'Low'} Match
                      </span>
                    </div>
                  </div>
                  {newUrl && (
                    <p className="text-xs text-gray-400 mt-2">
                      → Add a link to <span className="font-medium text-gray-600">{newUrl || 'your new article'}</span> inside this page
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
