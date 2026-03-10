import { useState, useCallback } from 'react';

export default function MetaDescriptionGenerator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  const generateMeta = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, tool: 'meta-description' }),
      });

      const data = await response.json();
      if (data.result) {
        try {
          const cleaned = data.result.replace(/```json\n?|```/g, '').trim();
          setResult(JSON.parse(cleaned));
        } catch { setError('Could not parse results. Please try again.'); }
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }, [input]);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const getCharColor = (count, max) => count <= max ? 'text-green-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Page Topic, URL, or Content</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your page content, enter your URL topic, or paste the main text of your page..."
          className="w-full min-h-[150px] p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-base leading-relaxed bg-white"
        />
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200">{error}</div>}

      <div className="flex justify-center">
        <button onClick={generateMeta} disabled={!input.trim() || loading}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md text-lg">
          {loading ? (
            <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Generating...</>
          ) : (
            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>Generate Meta Tags</>
          )}
        </button>
      </div>

      {result && (
        <div className="space-y-8 pt-4">
          {/* Title Tags */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">📌</span> SEO Title Tags <span className="text-xs font-normal text-gray-500">(recommended: under 60 characters)</span>
            </h3>
            <div className="space-y-3">
              {result.titles?.map((t, i) => (
                <div key={`title-${i}`} className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-blue-800 text-lg leading-snug">{t.text}</p>
                    <p className={`text-xs mt-1 ${getCharColor(t.chars, 60)}`}>{t.chars} characters</p>
                  </div>
                  <button onClick={() => copy(t.text, `title-${i}`)}
                    className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 shadow-sm">
                    {copied === `title-${i}` ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Meta Descriptions */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">📝</span> Meta Descriptions <span className="text-xs font-normal text-gray-500">(recommended: under 155 characters)</span>
            </h3>
            <div className="space-y-3">
              {result.descriptions?.map((d, i) => (
                <div key={`desc-${i}`} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-gray-800 leading-relaxed">{d.text}</p>
                      <p className={`text-xs mt-1 ${getCharColor(d.chars, 155)}`}>{d.chars} characters</p>
                    </div>
                    <button onClick={() => copy(d.text, `desc-${i}`)}
                      className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 shadow-sm">
                      {copied === `desc-${i}` ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  {/* Google Preview */}
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Google Preview:</p>
                    <p className="text-blue-700 text-base font-medium leading-snug hover:underline cursor-pointer">{result.titles?.[i]?.text || result.titles?.[0]?.text}</p>
                    <p className="text-green-700 text-xs mt-0.5">https://example.com/page</p>
                    <p className="text-gray-600 text-sm mt-0.5 leading-relaxed">{d.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
        {[
          { icon: '🎯', label: 'SEO Optimized', desc: 'Rank-ready tags' },
          { icon: '📊', label: 'Character Count', desc: 'Length validation' },
          { icon: '👁️', label: 'Google Preview', desc: 'See SERP display' },
          { icon: '🔒', label: 'Private & Secure', desc: 'Content never stored' },
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
