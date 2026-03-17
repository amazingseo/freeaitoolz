import { useState } from 'react';

const AI_TRANSITION_WORDS = [
  'moreover','furthermore','additionally','consequently','nevertheless',
  'nonetheless','subsequently','accordingly','therefore','thus','hence',
  'in conclusion','in summary','to summarize','it is worth noting',
  'it is important to note','it should be noted','as a result',
  'in addition','on the other hand','having said that','that being said',
  'with that in mind','in other words','to put it simply','delve',
  'utilize','leverage','paradigm','synergy','robust','seamless',
  'cutting-edge','game-changer','revolutionize','transformative',
  'comprehensive','multifaceted','nuanced','intricate','pivotal'
];

const FILLER_PHRASES = [
  'in today\'s world','in today\'s digital age','in the modern era',
  'it goes without saying','needless to say','as we all know',
  'the fact of the matter','at the end of the day','when all is said and done',
  'in the grand scheme of things'
];

interface Issue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  count?: number;
  examples?: string[];
  deduction: number;
}

function analyzeText(text: string): { score: number; issues: Issue[]; stats: Record<string, number> } {
  const issues: Issue[] = [];
  let deductions = 0;

  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const lowerText = text.toLowerCase();

  // Check AI transition words
  const foundTransitions: string[] = [];
  for (const word of AI_TRANSITION_WORDS) {
    const regex = new RegExp('\\b' + word + '\\b', 'gi');
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      foundTransitions.push(`"${word}" (×${matches.length})`);
      deductions += matches.length * 3;
    }
  }
  if (foundTransitions.length > 0) {
    issues.push({
      type: 'AI Transition Words',
      severity: foundTransitions.length > 4 ? 'high' : 'medium',
      message: `Found ${foundTransitions.length} AI-typical transition word${foundTransitions.length > 1 ? 's' : ''}`,
      examples: foundTransitions.slice(0, 5),
      deduction: Math.min(foundTransitions.length * 4, 25),
      count: foundTransitions.length
    });
  }

  // Check filler phrases
  const foundFillers: string[] = [];
  for (const phrase of FILLER_PHRASES) {
    if (lowerText.includes(phrase)) {
      foundFillers.push(`"${phrase}"`);
      deductions += 5;
    }
  }
  if (foundFillers.length > 0) {
    issues.push({
      type: 'Filler Phrases',
      severity: 'medium',
      message: `Found ${foundFillers.length} filler phrase${foundFillers.length > 1 ? 's' : ''}`,
      examples: foundFillers,
      deduction: Math.min(foundFillers.length * 5, 15),
      count: foundFillers.length
    });
  }

  // Check sentence length uniformity
  if (sentences.length >= 4) {
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev < 4) {
      issues.push({
        type: 'Uniform Sentence Length',
        severity: stdDev < 2 ? 'high' : 'medium',
        message: `Low sentence length variation (std dev: ${stdDev.toFixed(1)}). Human writers vary sentence length naturally.`,
        deduction: stdDev < 2 ? 15 : 8,
        count: sentences.length
      });
      deductions += stdDev < 2 ? 15 : 8;
    }
  }

  // Check repetitive sentence starters
  if (sentences.length >= 4) {
    const starters: Record<string, number> = {};
    sentences.forEach(s => {
      const firstWord = s.trim().split(/\s+/)[0]?.toLowerCase() || '';
      if (firstWord.length > 1) starters[firstWord] = (starters[firstWord] || 0) + 1;
    });
    const repeated = Object.entries(starters).filter(([, count]) => count >= 3);
    if (repeated.length > 0) {
      const examples = repeated.map(([word, count]) => `"${word}" starts ${count} sentences`);
      issues.push({
        type: 'Repetitive Sentence Starters',
        severity: 'medium',
        message: `${repeated.length} word${repeated.length > 1 ? 's' : ''} used to start multiple sentences`,
        examples,
        deduction: 10,
        count: repeated.length
      });
      deductions += 10;
    }
  }

  // Check passive voice
  const passivePatterns = /\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi;
  const passiveMatches = text.match(passivePatterns) || [];
  const passiveRatio = sentences.length > 0 ? passiveMatches.length / sentences.length : 0;
  if (passiveRatio > 0.35) {
    issues.push({
      type: 'Excessive Passive Voice',
      severity: 'low',
      message: `${Math.round(passiveRatio * 100)}% of sentences use passive voice. Aim for under 20%.`,
      deduction: 8,
      count: passiveMatches.length
    });
    deductions += 8;
  }

  // Check paragraph length uniformity
  if (paragraphs.length >= 3) {
    const pLengths = paragraphs.map(p => p.split(/\s+/).length);
    const pAvg = pLengths.reduce((a, b) => a + b, 0) / pLengths.length;
    const pVariance = pLengths.reduce((sum, l) => sum + Math.pow(l - pAvg, 2), 0) / pLengths.length;
    if (Math.sqrt(pVariance) < 10 && pAvg > 30) {
      issues.push({
        type: 'Uniform Paragraph Length',
        severity: 'low',
        message: 'All paragraphs are similar length. Human writing has natural variation in paragraph size.',
        deduction: 7,
        count: paragraphs.length
      });
      deductions += 7;
    }
  }

  const score = Math.max(0, Math.min(100, 100 - deductions));
  const stats = {
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    avgSentenceLength: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0
  };

  return { score, issues, stats };
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const label = score >= 75 ? 'Human' : score >= 50 ? 'Mixed' : 'AI-like';
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="45" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="mt-2 text-center" style={{ marginTop: '-85px', marginBottom: '65px' }}>
        <div className="text-3xl font-extrabold" style={{ color }}>{score}</div>
        <div className="text-xs font-semibold text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default function AIHumanizerScorecard() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ score: number; issues: Issue[]; stats: Record<string, number> } | null>(null);

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;

  const analyze = () => {
    if (input.trim().split(/\s+/).length < 20) return;
    setResult(analyzeText(input));
  };

  const reset = () => { setInput(''); setResult(null); };

  const severityColor = (s: Issue['severity']) =>
    s === 'high' ? 'text-red-700 bg-red-50 border-red-200' :
    s === 'medium' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
    'text-blue-700 bg-blue-50 border-blue-200';

  const severityIcon = (s: Issue['severity']) =>
    s === 'high' ? '🔴' : s === 'medium' ? '🟡' : '🔵';

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Paste Your AI-Generated Text</label>
          <span className="text-xs text-gray-500">{wordCount} words {wordCount < 20 && wordCount > 0 && '(min 20 words)'}</span>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste your AI-generated content here to get a human score and identify AI patterns..."
          className="w-full min-h-[220px] p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-sm leading-relaxed"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={analyze}
          disabled={wordCount < 20}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-sm text-sm"
        >
          Analyze Text
        </button>
        {result && (
          <button onClick={reset} className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-5 py-3 rounded-xl transition-all text-sm">
            Reset
          </button>
        )}
      </div>

      {result && (
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          {/* Score Header */}
          <div className="bg-gray-50 p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ScoreRing score={result.score} />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold text-gray-900">
                  {result.score >= 75 ? '✅ Reads Human' : result.score >= 50 ? '⚠️ Partially Human' : '❌ Strongly AI-like'}
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  {result.score >= 75
                    ? 'This text passes most human writing checks. Minor improvements possible.'
                    : result.score >= 50
                    ? 'This text has noticeable AI patterns. Address the issues below before publishing.'
                    : 'This text has strong AI fingerprints. Significant rewriting recommended.'}
                </p>
                <div className="flex flex-wrap gap-4 mt-4 justify-center sm:justify-start">
                  {[
                    { label: 'Words', value: result.stats.words },
                    { label: 'Sentences', value: result.stats.sentences },
                    { label: 'Avg Length', value: result.stats.avgSentenceLength + ' words' },
                    { label: 'Issues', value: result.issues.length }
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Issues */}
          <div className="p-6">
            {result.issues.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-semibold">🎉 No major AI patterns detected!</p>
                <p className="text-gray-500 text-sm mt-1">Your text reads naturally human.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Issues Detected</h4>
                {result.issues.map((issue, i) => (
                  <div key={i} className={`border rounded-xl p-4 ${severityColor(issue.severity)}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span>{severityIcon(issue.severity)}</span>
                          <span className="font-semibold text-sm">{issue.type}</span>
                        </div>
                        <p className="text-sm mt-1 opacity-90">{issue.message}</p>
                        {issue.examples && issue.examples.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {issue.examples.map((ex, j) => (
                              <span key={j} className="text-xs bg-white bg-opacity-60 px-2 py-0.5 rounded-full border border-current border-opacity-20">
                                {ex}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold opacity-70 shrink-0">-{issue.deduction} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
