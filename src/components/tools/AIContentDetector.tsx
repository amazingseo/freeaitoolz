import { useState, useCallback } from 'react';

export default function AIContentDetector() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;

  const getScoreColor = (score) => {
    if (score <= 20) return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500', label: 'Human Written' };
    if (score <= 40) return { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500', label: 'Likely Human' };
    if (score <= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500', label: 'Mixed' };
    if (score <= 80) return { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-500', label: 'Likely AI' };
    return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500', label: 'AI Generated' };
  };

  const detectContent = useCallback(async () => {
    if (!input.trim()) return;
    if (wordCount < 30) {
      setError('Please enter at least 30 words for accurate detection.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, tool: 'detector' }),
      });

      const data = await response.json();

      if (data.result) {
        try {
          const cleaned = data.result.replace(/```json\n?|```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          setResult(parsed);
        } catch {
          setError('Could not parse results. Please try again.');
        }
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [input, wordCount]);

  const clearAll = () => {
    setInput('');
    setResult(null);
    setError('');
  };

  const scoreStyle = result ? getScoreColor(result.score) : null;

  return (
    <div className="space-y-6">
      {/* Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Paste Text to Analyze</label>
          <span className="text-xs text-gray-500">{wordCount} words {wordCount < 30 && wordCount > 0 ? '(min 30)' : ''}</span>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste any text here to check if it was written by AI or a human. For best results, use at least 50-100 words..."
          className="w-full min-h-[220px] p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-base leading-relaxed transition-all bg-white"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={detectContent}
          disabled={!input.trim() || loading || wordCount < 30}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md text-lg"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Detect AI Content
            </>
          )}
        </button>
        <button
          onClick={clearAll}
          className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3.5 rounded-xl transition-all"
        >
          Clear All
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6 pt-4">
          {/* Score Card */}
          <div className={`${scoreStyle.bg} rounded-2xl p-6 border ${scoreStyle.text.replace('text-', 'border-').replace('700', '200')}`}>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Circular Score */}
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={result.score <= 20 ? '#22c55e' : result.score <= 40 ? '#10b981' : result.score <= 60 ? '#eab308' : result.score <= 80 ? '#f97316' : '#ef4444'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(result.score / 100) * 327} 327`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-extrabold ${scoreStyle.text}`}>{result.score}%</span>
                  <span className="text-xs text-gray-500 mt-0.5">AI Score</span>
                </div>
              </div>

              {/* Verdict */}
              <div className="text-center sm:text-left flex-1">
                <h3 className={`text-2xl font-bold ${scoreStyle.text}`}>{result.verdict}</h3>
                <p className="text-gray-600 mt-2 leading-relaxed">{result.details}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-5">
              <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                <span>Human</span>
                <span>AI Generated</span>
              </div>
              <div className="w-full bg-white rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${scoreStyle.bar}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Reasons */}
          {result.reasons && result.reasons.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                Analysis Details
              </h4>
              <ul className="space-y-3">
                {result.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-gray-700 leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA to Humanizer */}
          {result.score > 40 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold text-gray-900">Text flagged as AI? Try our AI Humanizer</p>
                <p className="text-sm text-gray-600 mt-1">Transform your AI text into natural, human-sounding writing for free.</p>
              </div>
              <a
                href="/tools/ai-humanizer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm whitespace-nowrap"
              >
                Humanize Text
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
        {[
          { icon: '🎯', label: 'High Accuracy', desc: 'Advanced AI analysis' },
          { icon: '⚡', label: 'Instant Results', desc: 'Analyze in seconds' },
          { icon: '📊', label: 'Detailed Report', desc: 'Reasons & scoring' },
          { icon: '🔒', label: 'Private & Secure', desc: 'Text never stored' },
        ].map(f => (
          <div key={f.label} className="text-center p-3">
            <span className="text-2xl">{f.icon}</span>
            <p className="text-sm font-semibold text-gray-800 mt-1">{f.label}</p>
            <p className="text-xs text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
