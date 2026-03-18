import { useState, useCallback, useMemo, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  charsWithSpaces: number;
  charsWithoutSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  uniqueWords: number;
  syllables: number;
  avgWordLength: number;
  avgSentenceLength: number;
  readingTime: string;
  speakingTime: string;
  fleschScore: number;
  fleschLabel: string;
  longestWord: string;
  shortWords: number;
  longWords: number;
  alphanumeric: number;
  numeric: number;
  uppercase: number;
  lowercase: number;
  spaces: number;
  punctuation: number;
}

interface FreqItem { word: string; count: number; pct: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','this','that',
  'these','those','i','you','he','she','we','they','it','its','my','your',
  'our','their','me','him','her','us','them','as','if','so','not','no','up',
  'out','about','than','then','when','where','who','which','what','how','all',
]);

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function computeStats(text: string): Stats {
  const charsWithSpaces = text.length;
  const charsWithoutSpaces = text.replace(/\s/g, '').length;
  const alphanumeric = (text.match(/[a-zA-Z0-9]/g) || []).length;
  const numeric = (text.match(/[0-9]/g) || []).length;
  const uppercase = (text.match(/[A-Z]/g) || []).length;
  const lowercase = (text.match(/[a-z]/g) || []).length;
  const spaces = (text.match(/ /g) || []).length;
  const punctuation = (text.match(/[^\w\s]/g) || []).length;

  const wordList = text.trim() ? text.trim().split(/\s+/).filter(w => w.length > 0) : [];
  const words = wordList.length;

  const sentenceList = text.split(/[.!?]+/).filter(s => s.trim().length > 2);
  const sentences = sentenceList.length;

  const paraList = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paragraphs = paraList.length;

  const lines = text.split('\n').length;

  const uniqueWords = new Set(wordList.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''))).size;

  const shortWords = wordList.filter(w => w.replace(/[^a-zA-Z]/g, '').length <= 3).length;
  const longWords = wordList.filter(w => w.replace(/[^a-zA-Z]/g, '').length >= 7).length;

  const cleanWords = wordList.map(w => w.replace(/[^a-zA-Z]/g, ''));
  const avgWordLength = words > 0
    ? Math.round((cleanWords.reduce((s, w) => s + w.length, 0) / words) * 10) / 10
    : 0;

  const avgSentenceLength = sentences > 0 ? Math.round((words / sentences) * 10) / 10 : 0;

  const totalSyllables = wordList.reduce((s, w) => s + countSyllables(w), 0);
  const syllables = totalSyllables;

  const longestWord = wordList.reduce((a, b) =>
    b.replace(/[^a-zA-Z]/g, '').length > a.replace(/[^a-zA-Z]/g, '').length ? b : a, '');

  // Flesch Reading Ease
  const asl = words > 0 && sentences > 0 ? words / sentences : 0;
  const asw = words > 0 ? totalSyllables / words : 0;
  const flesch = words > 0 ? Math.round(206.835 - (1.015 * asl) - (84.6 * asw)) : 0;
  const clampedFlesch = Math.max(0, Math.min(100, flesch));

  let fleschLabel = 'Very Difficult';
  if (clampedFlesch >= 90) fleschLabel = 'Very Easy';
  else if (clampedFlesch >= 80) fleschLabel = 'Easy';
  else if (clampedFlesch >= 70) fleschLabel = 'Fairly Easy';
  else if (clampedFlesch >= 60) fleschLabel = 'Standard';
  else if (clampedFlesch >= 50) fleschLabel = 'Fairly Difficult';
  else if (clampedFlesch >= 30) fleschLabel = 'Difficult';

  const readMins = words > 0 ? Math.ceil(words / 238) : 0;
  const speakMins = words > 0 ? Math.ceil(words / 130) : 0;
  const readingTime = readMins < 1 ? '< 1 min' : readMins === 1 ? '1 min' : `${readMins} min`;
  const speakingTime = speakMins < 1 ? '< 1 min' : speakMins === 1 ? '1 min' : `${speakMins} min`;

  return {
    charsWithSpaces, charsWithoutSpaces, alphanumeric, numeric,
    uppercase, lowercase, spaces, punctuation,
    words, sentences, paragraphs, lines, uniqueWords,
    syllables, avgWordLength, avgSentenceLength,
    shortWords, longWords, longestWord,
    readingTime, speakingTime,
    fleschScore: clampedFlesch, fleschLabel,
  };
}

function getFrequency(text: string, n: number, excludeStops: boolean): FreqItem[] {
  if (!text.trim()) return [];
  const tokens = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const map = new Map<string, number>();
  for (let i = 0; i <= tokens.length - n; i++) {
    const phrase = tokens.slice(i, i + n).join(' ');
    if (excludeStops && n === 1 && STOP_WORDS.has(phrase)) continue;
    if (excludeStops && n > 1) {
      const parts = phrase.split(' ');
      if (parts.every(p => STOP_WORDS.has(p))) continue;
    }
    map.set(phrase, (map.get(phrase) || 0) + 1);
  }
  const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, count]) => ({ word, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }));
}

// ─── Social Platform Limits ───────────────────────────────────────────────────
const PLATFORMS = [
  { name: 'Twitter/X', limit: 280, icon: '𝕏' },
  { name: 'SMS', limit: 160, icon: '💬' },
  { name: 'Meta Description', limit: 155, icon: '🔍' },
  { name: 'Title Tag', limit: 60, icon: '📑' },
  { name: 'LinkedIn Post', limit: 3000, icon: 'in' },
  { name: 'LinkedIn Headline', limit: 220, icon: 'in' },
  { name: 'Instagram Bio', limit: 150, icon: '📸' },
  { name: 'Instagram Caption', limit: 2200, icon: '📸' },
  { name: 'YouTube Title', limit: 100, icon: '▶' },
  { name: 'YouTube Description', limit: 5000, icon: '▶' },
  { name: 'Pinterest', limit: 500, icon: '📌' },
  { name: 'Reddit Title', limit: 300, icon: '🤖' },
  { name: 'eBay Title', limit: 80, icon: '🛒' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CharacterCounter() {
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'social' | 'keywords' | 'readability'>('overview');
  const [freqN, setFreqN] = useState(1);
  const [excludeStops, setExcludeStops] = useState(true);
  const [limitMode, setLimitMode] = useState(false);
  const [customLimit, setCustomLimit] = useState(280);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const stats = useMemo(() => computeStats(text), [text]);
  const freq = useMemo(() => getFrequency(text, freqN, excludeStops), [text, freqN, excludeStops]);

  const handleCopy = useCallback(() => {
    const report = [
      `CHARACTER COUNTER REPORT`,
      `━━━━━━━━━━━━━━━━━━━━━━━`,
      `Characters (with spaces): ${stats.charsWithSpaces}`,
      `Characters (without spaces): ${stats.charsWithoutSpaces}`,
      `Words: ${stats.words}`,
      `Sentences: ${stats.sentences}`,
      `Paragraphs: ${stats.paragraphs}`,
      `Unique Words: ${stats.uniqueWords}`,
      `Reading Time: ${stats.readingTime}`,
      `Speaking Time: ${stats.speakingTime}`,
      `Readability: ${stats.fleschLabel} (${stats.fleschScore}/100)`,
      `Avg Word Length: ${stats.avgWordLength} chars`,
      `Avg Sentence Length: ${stats.avgSentenceLength} words`,
    ].join('\n');
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [stats]);

  const handleClear = () => { setText(''); textareaRef.current?.focus(); };

  const pct = customLimit > 0 ? Math.min(100, (stats.charsWithSpaces / customLimit) * 100) : 0;
  const limitColor = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#22c55e';
  const remaining = customLimit - stats.charsWithSpaces;

  const fleschColor = stats.fleschScore >= 70 ? '#22c55e' : stats.fleschScore >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Textarea Area ── */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste or type your text here — stats update in real time..."
          rows={10}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '1rem 1rem 3rem',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '0.95rem', lineHeight: '1.7',
            resize: 'vertical', outline: 'none',
            background: '#fafafa', color: '#111',
            transition: 'border-color 0.2s',
            fontFamily: 'inherit',
          }}
          onFocus={e => (e.target.style.borderColor = '#3b82f6')}
          onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
        />

        {/* Inline quick stats bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0.5rem 1rem',
          background: '#f3f4f6', borderTop: '1px solid #e5e7eb',
          borderRadius: '0 0 10px 10px',
          display: 'flex', alignItems: 'center', gap: '1.5rem',
          fontSize: '0.78rem', color: '#6b7280',
        }}>
          <span><b style={{ color: '#111' }}>{stats.charsWithSpaces.toLocaleString()}</b> chars</span>
          <span><b style={{ color: '#111' }}>{stats.words.toLocaleString()}</b> words</span>
          <span><b style={{ color: '#111' }}>{stats.sentences}</b> sentences</span>
          <span><b style={{ color: '#111' }}>{stats.paragraphs}</b> paragraphs</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
            {text.length > 0 && (
              <button onClick={handleClear} style={{
                padding: '0.2rem 0.6rem', border: '1px solid #d1d5db',
                borderRadius: '6px', background: '#fff', cursor: 'pointer',
                fontSize: '0.75rem', color: '#6b7280',
              }}>Clear</button>
            )}
            <button onClick={handleCopy} style={{
              padding: '0.2rem 0.6rem', border: '1px solid #3b82f6',
              borderRadius: '6px', background: copied ? '#22c55e' : '#eff6ff',
              cursor: 'pointer', fontSize: '0.75rem',
              color: copied ? '#fff' : '#3b82f6', transition: 'all 0.2s',
            }}>{copied ? '✓ Copied' : 'Copy Report'}</button>
          </span>
        </div>
      </div>

      {/* ── Limit Mode Toggle ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        marginBottom: '1.25rem', flexWrap: 'wrap',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', color: '#374151' }}>
          <input type="checkbox" checked={limitMode} onChange={e => setLimitMode(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }} />
          Set character limit
        </label>
        {limitMode && (
          <>
            <input type="number" value={customLimit} min={1} max={100000}
              onChange={e => setCustomLimit(Number(e.target.value))}
              style={{
                width: '90px', padding: '0.3rem 0.5rem', border: '1px solid #d1d5db',
                borderRadius: '6px', fontSize: '0.85rem',
              }} />
            <div style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: limitColor, borderRadius: '3px',
                  transition: 'width 0.1s, background 0.2s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                <span style={{ color: limitColor, fontWeight: 600 }}>
                  {remaining >= 0 ? `${remaining.toLocaleString()} remaining` : `${Math.abs(remaining).toLocaleString()} over limit`}
                </span>
                <span style={{ color: '#9ca3af' }}>{stats.charsWithSpaces}/{customLimit}</span>
              </div>
            </div>
          </>
        )}

        {/* Quick platform presets */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
          {[{ l: 'Twitter', v: 280 }, { l: 'SMS', v: 160 }, { l: 'Meta', v: 155 }, { l: 'Title', v: 60 }].map(p => (
            <button key={p.l} onClick={() => { setLimitMode(true); setCustomLimit(p.v); }} style={{
              padding: '0.25rem 0.6rem', border: '1px solid #e5e7eb',
              borderRadius: '20px', background: customLimit === p.v && limitMode ? '#3b82f6' : '#fff',
              color: customLimit === p.v && limitMode ? '#fff' : '#6b7280',
              fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.15s',
            }}>{p.l} {p.v}</button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '1.25rem', gap: '0', overflowX: 'auto' }}>
        {(['overview', 'social', 'keywords', 'readability'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '0.6rem 1.1rem',
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: 600, textTransform: 'capitalize',
            color: activeTab === tab ? '#3b82f6' : '#6b7280',
            borderBottom: `2px solid ${activeTab === tab ? '#3b82f6' : 'transparent'}`,
            marginBottom: '-2px', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>{tab === 'overview' ? '📊 Overview' : tab === 'social' ? '📱 Social Limits' : tab === 'keywords' ? '🔑 Keywords' : '📖 Readability'}</button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === 'overview' && (
        <div>
          {/* Primary stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              { label: 'Characters', value: stats.charsWithSpaces.toLocaleString(), sub: 'with spaces', color: '#3b82f6' },
              { label: 'No-Space Chars', value: stats.charsWithoutSpaces.toLocaleString(), sub: 'without spaces', color: '#8b5cf6' },
              { label: 'Words', value: stats.words.toLocaleString(), sub: 'total words', color: '#10b981' },
              { label: 'Sentences', value: stats.sentences.toLocaleString(), sub: 'detected', color: '#f59e0b' },
              { label: 'Paragraphs', value: stats.paragraphs.toLocaleString(), sub: 'blocks', color: '#ef4444' },
              { label: 'Unique Words', value: stats.uniqueWords.toLocaleString(), sub: 'distinct', color: '#06b6d4' },
              { label: 'Reading Time', value: stats.readingTime, sub: '238 wpm', color: '#84cc16' },
              { label: 'Speaking Time', value: stats.speakingTime, sub: '130 wpm', color: '#f97316' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '0.875rem', border: '1px solid #e5e7eb', borderRadius: '10px',
                background: '#fff', borderLeft: `3px solid ${s.color}`,
              }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginTop: '0.25rem' }}>{s.label}</div>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Secondary stats table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '0.6rem 0.875rem', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                📝 Character Breakdown
              </div>
              {[
                ['Alphanumeric', stats.alphanumeric],
                ['Numeric Only', stats.numeric],
                ['Uppercase Letters', stats.uppercase],
                ['Lowercase Letters', stats.lowercase],
                ['Spaces', stats.spaces],
                ['Punctuation', stats.punctuation],
              ].map(([k, v]) => (
                <div key={k as string} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.45rem 0.875rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.8rem',
                }}>
                  <span style={{ color: '#4b5563' }}>{k}</span>
                  <span style={{ fontWeight: 700, color: '#111' }}>{(v as number).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '0.6rem 0.875rem', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                📐 Text Metrics
              </div>
              {[
                ['Syllables', stats.syllables],
                ['Avg Word Length', `${stats.avgWordLength} chars`],
                ['Avg Sentence Length', `${stats.avgSentenceLength} words`],
                ['Short Words (≤3 chars)', stats.shortWords],
                ['Long Words (≥7 chars)', stats.longWords],
                ['Lines', stats.lines],
              ].map(([k, v]) => (
                <div key={k as string} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.45rem 0.875rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.8rem',
                }}>
                  <span style={{ color: '#4b5563' }}>{k}</span>
                  <span style={{ fontWeight: 700, color: '#111' }}>{typeof v === 'number' ? v.toLocaleString() : v}</span>
                </div>
              ))}
            </div>
          </div>

          {stats.longestWord && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '0.8rem', color: '#0369a1' }}>
              <b>Longest word:</b> <span style={{ fontFamily: 'monospace', background: '#e0f2fe', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{stats.longestWord}</span>
              <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>({stats.longestWord.replace(/[^a-zA-Z]/g, '').length} letters)</span>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Social Limits ── */}
      {activeTab === 'social' && (
        <div>
          <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1rem', marginTop: 0 }}>
            See how your text fits within each platform's character limit. Green = safe, Yellow = close, Red = over limit.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.65rem' }}>
            {PLATFORMS.map(p => {
              const used = stats.charsWithSpaces;
              const pct = Math.min(100, (used / p.limit) * 100);
              const rem = p.limit - used;
              const over = used > p.limit;
              const warn = pct > 90 && !over;
              const color = over ? '#ef4444' : warn ? '#f59e0b' : '#22c55e';
              const bg = over ? '#fef2f2' : warn ? '#fffbeb' : '#f0fdf4';
              return (
                <div key={p.name} style={{ padding: '0.75rem', border: `1px solid ${over ? '#fecaca' : warn ? '#fde68a' : '#bbf7d0'}`, borderRadius: '10px', background: bg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111' }}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Limit: {p.limit.toLocaleString()}</div>
                    </div>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                      borderRadius: '20px', background: color, color: '#fff',
                    }}>{over ? `${Math.abs(rem)} over` : `${rem} left`}</span>
                  </div>
                  <div style={{ height: '5px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.1s' }} />
                  </div>
                  <div style={{ fontSize: '0.68rem', color, marginTop: '0.25rem', fontWeight: 600 }}>
                    {used.toLocaleString()} / {p.limit.toLocaleString()} ({Math.round(pct)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab: Keywords ── */}
      {activeTab === 'keywords' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => setFreqN(n)} style={{
                  padding: '0.35rem 0.85rem', border: '1px solid #e5e7eb',
                  borderRadius: '20px', cursor: 'pointer',
                  background: freqN === n ? '#3b82f6' : '#fff',
                  color: freqN === n ? '#fff' : '#6b7280',
                  fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
                }}>{n === 1 ? '1 Word' : n === 2 ? '2 Words' : '3 Words'}</button>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#374151', cursor: 'pointer' }}>
              <input type="checkbox" checked={excludeStops} onChange={e => setExcludeStops(e.target.checked)}
                style={{ accentColor: '#3b82f6', cursor: 'pointer' }} />
              Exclude stop words
            </label>
          </div>

          {freq.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '0.85rem' }}>
              Type some text to see keyword frequency analysis
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {freq.map((item, i) => (
                <div key={item.word} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '20px', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'right' }}>{i + 1}</span>
                  <span style={{ width: '140px', fontSize: '0.83rem', fontFamily: 'monospace', fontWeight: 600, color: '#111', truncate: 'true', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.word}</span>
                  <div style={{ flex: 1, height: '20px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%', width: `${item.pct}%`,
                      background: `hsl(${220 - i * 8}, 70%, ${60 - i * 2}%)`,
                      borderRadius: '4px', minWidth: '3px',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ width: '35px', fontSize: '0.78rem', color: '#374151', fontWeight: 700, textAlign: 'right' }}>{item.count}×</span>
                  <span style={{ width: '35px', fontSize: '0.73rem', color: '#9ca3af', textAlign: 'right' }}>{item.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Readability ── */}
      {activeTab === 'readability' && (
        <div>
          {/* Flesch Score Gauge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.25rem', padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fafafa' }}>
            <div style={{ textAlign: 'center', minWidth: '90px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: fleschColor, lineHeight: 1 }}>
                {text ? stats.fleschScore : '—'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>/ 100</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: fleschColor, marginTop: '0.25rem' }}>{text ? stats.fleschLabel : 'No text'}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111', marginBottom: '0.5rem' }}>Flesch Reading Ease Score</div>
              <div style={{ height: '10px', background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)', borderRadius: '5px', position: 'relative', marginBottom: '0.5rem' }}>
                {text && (
                  <div style={{
                    position: 'absolute', top: '-3px',
                    left: `${stats.fleschScore}%`, transform: 'translateX(-50%)',
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: fleschColor, border: '2px solid #fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    transition: 'left 0.3s',
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#9ca3af' }}>
                <span>Very Difficult (0)</span><span>Standard (60)</span><span>Very Easy (100)</span>
              </div>
            </div>
          </div>

          {/* Score table */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.6rem 0.875rem', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
              Flesch Score Reference
            </div>
            {[
              ['90–100', 'Very Easy', '5th grade', '#22c55e'],
              ['80–89', 'Easy', '6th grade', '#84cc16'],
              ['70–79', 'Fairly Easy', '7th grade', '#a3e635'],
              ['60–69', 'Standard', '8th–9th grade', '#facc15'],
              ['50–59', 'Fairly Difficult', '10th–12th grade', '#fb923c'],
              ['30–49', 'Difficult', 'College level', '#f97316'],
              ['0–29', 'Very Difficult', 'Professional', '#ef4444'],
            ].map(([range, label, grade, color]) => (
              <div key={range} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0.875rem', borderBottom: '1px solid #f3f4f6',
                background: text && stats.fleschLabel === label ? `${color}15` : 'transparent',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', color: '#6b7280', width: '55px' }}>{range}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: text && stats.fleschLabel === label ? color : '#374151', flex: 1 }}>{label}</span>
                <span style={{ fontSize: '0.73rem', color: '#9ca3af' }}>{grade}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '0.75rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '0.78rem', color: '#0369a1', lineHeight: 1.5 }}>
            <b>About Flesch Reading Ease:</b> Scores are calculated using the Flesch formula: 206.835 − (1.015 × avg sentence length) − (84.6 × avg syllables per word). A score of 60–70 is ideal for web content. SEO best practice recommends targeting a score above 60 for blog posts and landing pages.
          </div>
        </div>
      )}
    </div>
  );
}
