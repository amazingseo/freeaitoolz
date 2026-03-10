import { useState, useCallback } from 'react';

export default function WebsiteSpeedChecker() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState('mobile');
  const [error, setError] = useState('');

  const getScoreColor = (score) => {
    if (score >= 90) return { color: '#22c55e', bg: 'bg-green-50', text: 'text-green-700', label: 'Good' };
    if (score >= 50) return { color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Needs Improvement' };
    return { color: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', label: 'Poor' };
  };

  const checkSpeed = useCallback(async () => {
    if (!url.trim()) return;
    let testUrl = url.trim();
    if (!testUrl.startsWith('http')) testUrl = 'https://' + testUrl;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(testUrl)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.error) {
        setError(data.error.message || 'Could not analyze this URL. Please check and try again.');
        return;
      }

      const lh = data.lighthouseResult;
      const categories = lh.categories;
      const audits = lh.audits;

      setResult({
        url: testUrl,
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
          .filter(a => a.details?.type === 'opportunity' && a.score !== null && a.score < 1)
          .sort((a, b) => (a.score || 0) - (b.score || 0))
          .slice(0, 6)
          .map(a => ({ title: a.title, description: a.description, savings: a.details?.overallSavingsMs ? `${Math.round(a.details.overallSavingsMs)}ms` : '' })),
      });
    } catch (err) {
      setError('Failed to analyze the website. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  }, [url, strategy]);

  const ScoreCircle = ({ score, label, size = 'large' }) => {
    const s = getScoreColor(score);
    const r = size === 'large' ? 46 : 34;
    const circumference = 2 * Math.PI * r;
    const dashOffset = circumference - (score / 100) * circumference;
    const svgSize = size === 'large' ? 110 : 80;
    const strokeW = size === 'large' ? 7 : 5;

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative" style={{ width: svgSize, height: svgSize }}>
          <svg width={svgSize} height={svgSize} className="transform -rotate-90">
            <circle cx={svgSize/2} cy={svgSize/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeW} />
            <circle cx={svgSize/2} cy={svgSize/2} r={r} fill="none" stroke={s.color} strokeWidth={strokeW} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-extrabold ${size === 'large' ? 'text-2xl' : 'text-lg'} ${s.text}`}>{score}</span>
          </div>
        </div>
        <span className={`text-xs font-bold ${s.text}`}>{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3">Device Type</label>
        <div className="flex gap-3">
          {['mobile', 'desktop'].map(s => (
            <button key={s} onClick={() => setStrategy(s)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${strategy === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
              {s === 'mobile' ? '📱' : '🖥️'} {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter website URL (e.g., google.com)"
          onKeyDown={e => e.key === 'Enter' && checkSpeed()}
          className="flex-1 p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-all" />
        <button onClick={checkSpeed} disabled={!url.trim() || loading}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold px-6 py-3.5 rounded-xl transition-all text-sm whitespace-nowrap">
          {loading ? (
            <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Analyzing...</>
          ) : 'Check Speed'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200">{error}</div>}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 text-gray-500">
            <svg className="animate-spin w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            <span className="text-sm font-medium">Analyzing website performance... This takes 15-30 seconds.</span>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-8 pt-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium mb-1">{result.strategy === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'} Results for</p>
            <p className="text-lg font-bold text-gray-900 break-all">{result.url}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
            <ScoreCircle score={result.scores.performance} label="Performance" />
            <ScoreCircle score={result.scores.accessibility} label="Accessibility" />
            <ScoreCircle score={result.scores.bestPractices} label="Best Practices" />
            <ScoreCircle score={result.scores.seo} label="SEO" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'First Contentful Paint', value: result.metrics.fcp, key: 'FCP' },
              { label: 'Largest Contentful Paint', value: result.metrics.lcp, key: 'LCP' },
              { label: 'Total Blocking Time', value: result.metrics.tbt, key: 'TBT' },
              { label: 'Cumulative Layout Shift', value: result.metrics.cls, key: 'CLS' },
              { label: 'Speed Index', value: result.metrics.si, key: 'SI' },
              { label: 'Time to Interactive', value: result.metrics.tti, key: 'TTI' },
            ].map(m => (
              <div key={m.key} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{m.key}</p>
                <p className="text-xl font-extrabold text-gray-900 mt-1">{m.value}</p>
                <p className="text-[10px] text-gray-400 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {result.opportunities.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Optimization Opportunities</h3>
              <div className="space-y-3">
                {result.opportunities.map((o, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-gray-900">{o.title}</p>
                      {o.savings && <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap">Save {o.savings}</span>}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{o.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}