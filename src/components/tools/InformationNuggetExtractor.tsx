import { useState } from 'react';

interface Nugget {
  type: 'fact' | 'statistic' | 'definition' | 'insight';
  text: string;
}

interface Result {
  nuggets: Nugget[];
  score: number;
  recommendation: string;
}

const TYPE_CONFIG = {
  fact: { label: 'Fact', color: 'bg-blue-50 text-blue-700 border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: '📌' },
  statistic: { label: 'Statistic', color: 'bg-purple-50 text-purple-700 border-purple-200', badge: 'bg-purple-100 text-purple-700', icon: '📊' },
  definition: { label: 'Definition', color: 'bg-green-50 text-green-700 border-green-200', badge: 'bg-green-100 text-green-700', icon: '📖' },
  insight: { label: 'Key Insight', color: 'bg-orange-50 text-orange-700 border-orange-200', badge: 'bg-orange-100 text-orange-700', icon: '💡' },
};

export default function InformationNuggetExtractor() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;

  const extract = async () => {
    if (wordCount < 50) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'nugget-extractor',
          text: input,
        }),
      });

      const data = await response.json();

      if (data.result) {
        try {
          const cleaned = data.result.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          setResult(parsed);
        } catch {
          setError('Could not parse results. Please try again.');
        }
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyNuggets = () => {
    if (!result) return;
    const text = result.nuggets.map(n => `[${n.type.toUpperCase()}] ${n.text}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => { setInput(''); setResult(null); setError(''); };

  const scoreColor = (s: number) =>
    s >= 7 ? 'text-green-600' : s >= 4 ? 'text-yellow-600' : 'text-red-600';

  const scoreLabel = (s: number) =>
    s >= 7 ? 'Well Optimized' : s >= 4 ? 'Needs More Nuggets' : 'Poorly Optimized';

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Paste Your Article Content</label>
          <span className="text-xs text-gray-500">{wordCount} words {wordCount < 50 && wordCount > 0 && '(min 50 words)'}</span>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste your full article here. The tool will extract facts, statistics, definitions and key insights that AI search engines can cite..."
          className="w-full min-h-[240px] p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-sm leading-relaxed"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          onClick={extract}
          disabled={wordCount < 50 || loading}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-sm text-sm"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Extracting Nuggets...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Extract Nuggets
            </>
          )}
        </button>
        {result && (
          <button onClick={reset} className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-5 py-3 rounded-xl transition-all text-sm">
            Reset
          </button>
        )}
      </div>

      {result && (
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-gray-900">{result.nuggets.length} Nuggets Extracted</h3>
                <span className={`text-sm font-bold ${scoreColor(result.score)}`}>
                  AEO Score: {result.score}/10 — {scoreLabel(result.score)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{result.recommendation}</p>
            </div>
            <button
              onClick={copyNuggets}
              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all"
            >
              {copied ? '✓ Copied' : 'Copy All'}
            </button>
          </div>

          <div className="p-5">
            {/* Type summary */}
            <div className="flex flex-wrap gap-2 mb-5">
              {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map(type => {
                const count = result.nuggets.filter(n => n.type === type).length;
                if (count === 0) return null;
                return (
                  <span key={type} className={`text-xs font-semibold px-3 py-1 rounded-full ${TYPE_CONFIG[type].badge}`}>
                    {TYPE_CONFIG[type].icon} {count} {TYPE_CONFIG[type].label}{count > 1 ? 's' : ''}
                  </span>
                );
              })}
            </div>

            <div className="space-y-3">
              {result.nuggets.map((nugget, i) => (
                <div key={i} className={`border rounded-xl p-4 ${TYPE_CONFIG[nugget.type].color}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-base shrink-0 mt-0.5">{TYPE_CONFIG[nugget.type].icon}</span>
                    <div className="flex-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_CONFIG[nugget.type].badge} mb-2 inline-block`}>
                        {TYPE_CONFIG[nugget.type].label}
                      </span>
                      <p className="text-sm leading-relaxed">{nugget.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {result.nuggets.length < 5 && (
              <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">⚠️ Low nugget count.</span> Articles with fewer than 5 nuggets are unlikely to be cited by AI search engines. Add more specific facts, statistics, and clear definitions to improve your AEO score.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
