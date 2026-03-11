import { useState, useCallback } from 'react';

interface ScoreResult {
  overall: number;
  metrics: { name: string; score: number; max: number; tip: string; icon: string }[];
  aiTip: string;
}

export default function SgeReadinessScore() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;

  const getColor = (pct: number) => {
    if (pct >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Excellent' };
    if (pct >= 60) return { bar: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', label: 'Good' };
    if (pct >= 40) return { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Needs Work' };
    return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', label: 'Poor' };
  };

  const analyze = useCallback(async () => {
    if (wordCount < 50) { setError('Please enter at least 50 words for accurate analysis.'); return; }
    setLoading(true); setError(''); setResult(null);

    try {
      const text = input.trim();
      const metrics: ScoreResult['metrics'] = [];

      // 1. Clear Definitions (regex: "X is", "X refers to", "defined as")
      const definitions = (text.match(/\b(is defined as|refers to|is a |is an |means that|is the process of|can be described as)/gi) || []).length;
      const defScore = Math.min(15, definitions * 5);
      metrics.push({ name: 'Clear Definitions', score: defScore, max: 15, icon: '📖',
        tip: definitions >= 3 ? 'Good use of clear definitions.' : 'Add more explicit definitions (e.g., "X is defined as...", "X refers to...").' });

      // 2. Information Nuggets (bullet points, numbered lists)
      const bullets = (text.match(/^[\s]*[-•*]\s/gm) || []).length;
      const numbered = (text.match(/^[\s]*\d+[.)]\s/gm) || []).length;
      const nuggets = bullets + numbered;
      const nuggetScore = Math.min(15, nuggets * 3);
      metrics.push({ name: 'Information Nuggets', score: nuggetScore, max: 15, icon: '📋',
        tip: nuggets >= 5 ? 'Good use of structured lists.' : 'Add bullet points and numbered lists for key facts. AI Overviews love extractable lists.' });

      // 3. Q&A Headers (H2/H3 style questions)
      const qaHeaders = (text.match(/(^|\n)(#{1,3}\s.*\?|what |how |why |when |where |which |can |does |is .*\?)/gim) || []).length;
      const qaScore = Math.min(15, qaHeaders * 5);
      metrics.push({ name: 'Q&A Headers', score: qaScore, max: 15, icon: '❓',
        tip: qaHeaders >= 3 ? 'Good question-based structure.' : 'Add question-based headings (e.g., "## What is X?", "## How does X work?"). These get pulled into AI Overviews.' });

      // 4. Data Citations (numbers, stats, years, percentages)
      const dataPoints = (text.match(/\d+%|\$[\d,.]+|\d{4}\b|\d+\s*(million|billion|thousand|percent|users|customers|companies)/gi) || []).length;
      const dataScore = Math.min(15, dataPoints * 3);
      metrics.push({ name: 'Data & Statistics', score: dataScore, max: 15, icon: '📊',
        tip: dataPoints >= 5 ? 'Good use of specific data.' : 'Add specific numbers, percentages, years, and statistics. AI Overviews prioritize data-backed content.' });

      // 5. Concise Paragraphs (avg paragraph length)
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
      const avgParaWords = paragraphs.length > 0 ? paragraphs.reduce((sum, p) => sum + p.trim().split(/\s+/).length, 0) / paragraphs.length : 0;
      const conciseScore = avgParaWords <= 80 ? 10 : avgParaWords <= 120 ? 7 : avgParaWords <= 160 ? 4 : 2;
      metrics.push({ name: 'Concise Paragraphs', score: conciseScore, max: 10, icon: '📝',
        tip: avgParaWords <= 80 ? 'Good paragraph length for AI extraction.' : 'Break long paragraphs into shorter ones (under 80 words). Shorter paragraphs are easier for AI to cite.' });

      // 6. Content Length
      const lengthScore = wordCount >= 1500 ? 10 : wordCount >= 1000 ? 8 : wordCount >= 500 ? 5 : 3;
      metrics.push({ name: 'Content Depth', score: lengthScore, max: 10, icon: '📏',
        tip: wordCount >= 1000 ? 'Good content length for comprehensive coverage.' : 'Aim for 1,000-2,000 words for comprehensive topic coverage.' });

      // 7. Source Signals (links, citations)
      const sources = (text.match(/according to|source:|study |research |report |survey |data from|published by|\[.*\]|\(http/gi) || []).length;
      const sourceScore = Math.min(10, sources * 3);
      metrics.push({ name: 'Source Signals', score: sourceScore, max: 10, icon: '🔗',
        tip: sources >= 3 ? 'Good use of source references.' : 'Reference studies, reports, or authoritative sources. AI Overviews prefer well-sourced content.' });

      // 8. Direct Answers (first sentence answers)
      const directAnswers = (text.match(/(^|\.\s+)(the answer is|in short|simply put|to summarize|the short answer|in summary|basically)/gim) || []).length;
      const directScore = Math.min(10, (directAnswers + 1) * 3);
      metrics.push({ name: 'Direct Answers', score: directScore, max: 10, icon: '🎯',
        tip: directAnswers >= 1 ? 'Good use of direct answer patterns.' : 'Start sections with direct answers before elaborating. Lead with "The answer is..." or "In short,..." patterns.' });

      const overall = metrics.reduce((sum, m) => sum + m.score, 0);

      // Get AI improvement tip (tiny call)
      let aiTip = '';
      try {
        const analysisData = `Score: ${overall}/100. Weakest areas: ${metrics.filter(m => m.score < m.max * 0.5).map(m => m.name).join(', ') || 'None'}. Word count: ${wordCount}. Has ${nuggets} lists, ${qaHeaders} Q&A headers, ${dataPoints} data points.`;
        
        const response = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: analysisData, tool: 'sge-score' }),
        });
        const data = await response.json();
        if (data.result) aiTip = data.result;
      } catch { aiTip = 'Focus on your weakest scoring areas above to improve your AI Overview readiness.'; }

      setResult({ overall, metrics, aiTip: aiTip || 'Improve your weakest areas shown above.' });
    } catch { setError('Analysis failed. Please try again.'); }
    finally { setLoading(false); }
  }, [input, wordCount]);

  const overallColor = result ? getColor(result.overall) : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-bold text-gray-700">Paste Your Article Content</label>
          <span className="text-xs text-gray-500">{wordCount} words {wordCount > 0 && wordCount < 50 ? '(min 50)' : ''}</span>
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          placeholder="Paste your full article or blog post here. The tool will analyze its structure, data usage, Q&A format, and other factors that determine if Google AI Overviews will cite your content..."
          className="w-full min-h-[220px] p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-y text-base leading-relaxed" />
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200">{error}</div>}

      <div className="flex justify-center">
        <button onClick={analyze} disabled={wordCount < 50 || loading}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold px-8 py-3.5 rounded-xl text-lg transition-all">
          {loading ? (
            <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Analyzing...</>
          ) : '🔍 Analyze SGE Readiness'}
        </button>
      </div>

      {result && (
        <div className="space-y-6 pt-4">
          {/* Overall Score */}
          <div className={`${overallColor!.bg} rounded-2xl p-6 border ${overallColor!.text.replace('text', 'border')}-200 text-center`}>
            <div className="relative w-36 h-36 mx-auto mb-4">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none"
                  stroke={result.overall >= 80 ? '#10b981' : result.overall >= 60 ? '#3b82f6' : result.overall >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(result.overall / 100) * 327} 327`}
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-extrabold ${overallColor!.text}`}>{result.overall}</span>
                <span className="text-xs text-gray-500">/100</span>
              </div>
            </div>
            <h3 className={`text-xl font-extrabold ${overallColor!.text}`}>SGE Readiness: {overallColor!.label}</h3>
            <p className="text-sm text-gray-600 mt-1">How likely Google AI Overviews will cite your content</p>
          </div>

          {/* Metrics Breakdown */}
          <div className="space-y-3">
            {result.metrics.map(m => {
              const pct = Math.round((m.score / m.max) * 100);
              const c = getColor(pct);
              return (
                <div key={m.name} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <span>{m.icon}</span>{m.name}
                    </span>
                    <span className={`text-sm font-extrabold ${c.text}`}>{m.score}/{m.max}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">{m.tip}</p>
                </div>
              );
            })}
          </div>

          {/* AI Tip */}
          {result.aiTip && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">AI-Powered Improvement Tip</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.aiTip}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
        {[
          { icon: '🎯', label: '8 SGE Factors', desc: 'Comprehensive check' },
          { icon: '⚡', label: 'Mostly Offline', desc: 'Regex-powered speed' },
          { icon: '💡', label: 'AI Tips', desc: 'Actionable advice' },
          { icon: '🔒', label: 'Private', desc: 'Content never stored' },
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
