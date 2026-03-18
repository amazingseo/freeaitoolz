import { useState, useMemo, useCallback } from 'react';

// ─── Diff Algorithm ───────────────────────────────────────────────────────────
type DiffOp = 'equal' | 'insert' | 'delete';
interface DiffChunk { op: DiffOp; value: string }

function diffArrays(a: string[], b: string[]): DiffChunk[] {
  const m = a.length, n = b.length;
  if (m === 0 && n === 0) return [];
  if (m === 0) return b.map(v => ({ op: 'insert' as DiffOp, value: v }));
  if (n === 0) return a.map(v => ({ op: 'delete' as DiffOp, value: v }));

  // For large inputs use fast path
  if (m + n > 3000) return fastDiff(a, b);

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);

  const result: DiffChunk[] = [];
  const bt = (i: number, j: number) => {
    if (i === 0 && j === 0) return;
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) { bt(i-1, j-1); result.push({ op: 'equal', value: a[i-1] }); }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { bt(i, j-1); result.push({ op: 'insert', value: b[j-1] }); }
    else { bt(i-1, j); result.push({ op: 'delete', value: a[i-1] }); }
  };
  bt(m, n);
  return result;
}

function fastDiff(a: string[], b: string[]): DiffChunk[] {
  const result: DiffChunk[] = [];
  const bSet = new Map<string, number[]>();
  b.forEach((v, i) => { if (!bSet.has(v)) bSet.set(v, []); bSet.get(v)!.push(i); });
  let ai = 0, bi = 0;
  while (ai < a.length || bi < b.length) {
    if (ai < a.length && bi < b.length && a[ai] === b[bi]) {
      result.push({ op: 'equal', value: a[ai++] }); bi++;
    } else if (bi < b.length && (!bSet.has(b[bi]) || ai >= a.length)) {
      result.push({ op: 'insert', value: b[bi++] });
    } else if (ai < a.length) {
      result.push({ op: 'delete', value: a[ai++] });
    } else {
      result.push({ op: 'insert', value: b[bi++] });
    }
  }
  return result;
}

function diffWords(a: string, b: string): DiffChunk[] {
  const tok = (s: string) => s.match(/\S+|\s+/g) || (s ? [s] : []);
  return diffArrays(tok(a), tok(b));
}

function diffLines(orig: string, mod: string, ignoreCase: boolean, ignoreWS: boolean): DiffChunk[] {
  const proc = (s: string) => {
    let r = s;
    if (ignoreCase) r = r.toLowerCase();
    if (ignoreWS) r = r.replace(/\s+/g, ' ').trim();
    return r;
  };
  const aLines = orig.split('\n'), bLines = mod.split('\n');
  const chunks = diffArrays(aLines.map(proc), bLines.map(proc));
  let ai = 0, bi = 0;
  return chunks.map(c => {
    if (c.op === 'equal') { ai++; bi++; return { op: 'equal' as DiffOp, value: aLines[ai-1] }; }
    if (c.op === 'delete') return { op: 'delete' as DiffOp, value: aLines[ai++] };
    return { op: 'insert' as DiffOp, value: bLines[bi++] };
  });
}

// ─── Similarity ───────────────────────────────────────────────────────────────
function calcSimilarity(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  const aLines = new Set(a.split('\n'));
  const bLines = b.split('\n');
  const common = bLines.filter(l => aLines.has(l)).length;
  const total = Math.max(a.split('\n').length, bLines.length);
  return total > 0 ? Math.round((common / total) * 100) : 0;
}

// ─── Build Display Pairs ──────────────────────────────────────────────────────
interface LinePair {
  type: 'equal' | 'delete' | 'insert' | 'changed';
  origLine: string; newLine: string;
  lineNumOrig: number | null; lineNumNew: number | null;
  wordDiff?: DiffChunk[];
}

function buildPairs(chunks: DiffChunk[]): LinePair[] {
  const pairs: LinePair[] = [];
  let on = 1, nn = 1;
  const dels: string[] = [], ins: string[] = [];

  const flush = () => {
    const len = Math.min(dels.length, ins.length);
    for (let i = 0; i < len; i++) {
      pairs.push({ type: 'changed', origLine: dels[i], newLine: ins[i], lineNumOrig: on++, lineNumNew: nn++, wordDiff: diffWords(dels[i], ins[i]) });
    }
    for (let i = len; i < dels.length; i++)
      pairs.push({ type: 'delete', origLine: dels[i], newLine: '', lineNumOrig: on++, lineNumNew: null });
    for (let i = len; i < ins.length; i++)
      pairs.push({ type: 'insert', origLine: '', newLine: ins[i], lineNumOrig: null, lineNumNew: nn++ });
    dels.length = 0; ins.length = 0;
  };

  for (const c of chunks) {
    if (c.op === 'equal') { flush(); pairs.push({ type: 'equal', origLine: c.value, newLine: c.value, lineNumOrig: on++, lineNumNew: nn++ }); }
    else if (c.op === 'delete') dels.push(c.value);
    else ins.push(c.value);
  }
  flush();
  return pairs;
}

// ─── Word Diff Render ─────────────────────────────────────────────────────────
function WordDiff({ wdiff, side }: { wdiff: DiffChunk[]; side: 'orig' | 'new' }) {
  return (
    <>
      {wdiff
        .filter(c => c.op === 'equal' || (side === 'orig' ? c.op === 'delete' : c.op === 'insert'))
        .map((c, i) =>
          c.op === 'equal'
            ? <span key={i}>{c.value}</span>
            : <mark key={i} style={{
                background: side === 'orig' ? '#fca5a5' : '#86efac',
                color: side === 'orig' ? '#7f1d1d' : '#14532d',
                borderRadius: '2px', padding: '0 1px',
              }}>{c.value}</mark>
        )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TextCompare() {
  const [orig, setOrig] = useState('');
  const [mod, setMod] = useState('');
  const [view, setView] = useState<'split' | 'unified'>('split');
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWS, setIgnoreWS] = useState(false);
  const [diffsOnly, setDiffsOnly] = useState(false);
  const [copied, setCopied] = useState(false);

  const wc = (t: string) => t.trim() ? t.trim().split(/\s+/).length : 0;

  const { pairs, stats } = useMemo(() => {
    const chunks = diffLines(orig, mod, ignoreCase, ignoreWS);
    const p = buildPairs(chunks);
    const added = p.filter(x => x.type === 'insert').length;
    const removed = p.filter(x => x.type === 'delete').length;
    const changed = p.filter(x => x.type === 'changed').length;
    const unchanged = p.filter(x => x.type === 'equal').length;
    return {
      pairs: p,
      stats: { added, removed, changed, unchanged, similarity: calcSimilarity(orig, mod) },
    };
  }, [orig, mod, ignoreCase, ignoreWS]);

  const display = useMemo(
    () => diffsOnly ? pairs.filter(p => p.type !== 'equal') : pairs,
    [pairs, diffsOnly]
  );

  const hasDiff = orig || mod;
  const simColor = stats.similarity >= 80 ? '#16a34a' : stats.similarity >= 50 ? '#d97706' : '#dc2626';

  const handleSwap = () => { const t = orig; setOrig(mod); setMod(t); };
  const handleClear = () => { setOrig(''); setMod(''); };
  const handleCopy = useCallback(() => {
    const out = pairs.map(p => {
      if (p.type === 'equal') return `  ${p.origLine}`;
      if (p.type === 'delete') return `- ${p.origLine}`;
      if (p.type === 'insert') return `+ ${p.newLine}`;
      return `- ${p.origLine}\n+ ${p.newLine}`;
    }).join('\n');
    navigator.clipboard.writeText(out);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [pairs]);

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace" };
  const numCol: React.CSSProperties = {
    ...mono, width: '42px', minWidth: '42px', textAlign: 'right',
    padding: '2px 8px', fontSize: '0.7rem', color: '#9ca3af',
    userSelect: 'none', flexShrink: 0, borderRight: '1px solid #e5e7eb',
    lineHeight: '1.65',
  };
  const lineContent: React.CSSProperties = {
    ...mono, padding: '2px 10px', fontSize: '0.8rem',
    whiteSpace: 'pre-wrap', wordBreak: 'break-all', flex: 1, lineHeight: '1.65', minWidth: 0,
  };

  const rowBg = (type: LinePair['type'], side: 'orig' | 'new') => {
    if (type === 'equal') return 'transparent';
    if (type === 'delete') return side === 'orig' ? '#fef2f2' : '#fafafa';
    if (type === 'insert') return side === 'new' ? '#f0fdf4' : '#fafafa';
    return side === 'orig' ? '#fff7ed' : '#fefce8';
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" }}>

      {/* ── Input Panels ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 1fr', gap: '8px', alignItems: 'start', marginBottom: '12px' }}>

        {/* Original */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#374151' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', marginRight: '5px' }} />
              Original Text
            </span>
            <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{orig.length.toLocaleString()} chars · {wc(orig)} words</span>
          </div>
          <textarea
            value={orig} onChange={e => setOrig(e.target.value)}
            placeholder="Paste original / old text here..."
            rows={10}
            style={{
              ...mono, width: '100%', boxSizing: 'border-box',
              padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px',
              fontSize: '0.82rem', resize: 'vertical', outline: 'none',
              background: '#fafafa', lineHeight: '1.65', transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = '#ef4444')}
            onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>

        {/* Swap */}
        <div style={{ paddingTop: '22px', display: 'flex', justifyContent: 'center' }}>
          <button onClick={handleSwap} title="Swap texts"
            style={{
              width: '32px', height: '32px', border: '1px solid #e5e7eb', borderRadius: '50%',
              background: '#fff', cursor: 'pointer', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.25s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'rotate(180deg)')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
          >⇄</button>
        </div>

        {/* Modified */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#374151' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', marginRight: '5px' }} />
              Modified Text
            </span>
            <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{mod.length.toLocaleString()} chars · {wc(mod)} words</span>
          </div>
          <textarea
            value={mod} onChange={e => setMod(e.target.value)}
            placeholder="Paste modified / new text here..."
            rows={10}
            style={{
              ...mono, width: '100%', boxSizing: 'border-box',
              padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px',
              fontSize: '0.82rem', resize: 'vertical', outline: 'none',
              background: '#fafafa', lineHeight: '1.65', transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = '#22c55e')}
            onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
        padding: '8px 12px', background: '#f9fafb', borderRadius: '10px',
        border: '1px solid #e5e7eb', marginBottom: '12px',
      }}>
        {/* View */}
        <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '7px', overflow: 'hidden' }}>
          {(['split', 'unified'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '4px 12px', border: 'none', cursor: 'pointer',
              background: view === v ? '#1d4ed8' : '#fff',
              color: view === v ? '#fff' : '#6b7280',
              fontSize: '0.76rem', fontWeight: 600, transition: 'all 0.15s',
            }}>{v === 'split' ? '⊞ Split' : '≡ Unified'}</button>
          ))}
        </div>

        {/* Toggles */}
        {[
          { label: 'Ignore Case', val: ignoreCase, set: setIgnoreCase },
          { label: 'Ignore Whitespace', val: ignoreWS, set: setIgnoreWS },
          { label: 'Diffs Only', val: diffsOnly, set: setDiffsOnly },
        ].map(o => (
          <label key={o.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.76rem', color: '#374151' }}>
            <input type="checkbox" checked={o.val} onChange={e => o.set(e.target.checked)} style={{ accentColor: '#3b82f6', cursor: 'pointer' }} />
            {o.label}
          </label>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          {hasDiff && <>
            <button onClick={handleClear} style={{ padding: '4px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280' }}>Clear</button>
            <button onClick={handleCopy} style={{
              padding: '4px 10px', border: '1px solid #3b82f6', borderRadius: '6px',
              background: copied ? '#22c55e' : '#eff6ff', cursor: 'pointer', fontSize: '0.75rem',
              color: copied ? '#fff' : '#3b82f6', transition: 'all 0.2s',
            }}>{copied ? '✓ Copied' : '⎘ Copy Diff'}</button>
          </>}
        </div>
      </div>

      {/* ── Stats Bar ── */}
      {hasDiff && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'Added', n: stats.added, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '+' },
            { label: 'Removed', n: stats.removed, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '−' },
            { label: 'Modified', n: stats.changed, color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '~' },
            { label: 'Unchanged', n: stats.unchanged, color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', icon: '=' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '8px 10px', background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '1px' }}>{s.label}</div>
              </div>
            </div>
          ))}
          {/* Similarity gauge */}
          <div style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>Similarity</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: simColor }}>{stats.similarity}%</span>
            </div>
            <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.similarity}%`, background: simColor, borderRadius: '2px', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Diff Output ── */}
      {hasDiff && display.length > 0 ? (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>

          {/* Legend + line count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.7rem', color: '#6b7280', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#374151' }}>Legend:</span>
            {[
              { label: 'Removed', bg: '#fef2f2', border: '#fecaca' },
              { label: 'Added', bg: '#f0fdf4', border: '#bbf7d0' },
              { label: 'Modified', bg: '#fff7ed', border: '#fed7aa' },
            ].map(l => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-block', width: '11px', height: '11px', background: l.bg, border: `1px solid ${l.border}`, borderRadius: '2px' }} />
                {l.label}
              </span>
            ))}
            <span style={{ marginLeft: 'auto', color: '#9ca3af' }}>{display.length} lines{diffsOnly ? ' (diffs only)' : ''}</span>
          </div>

          {view === 'split' ? (
            /* Split View */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '5px 10px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>Original</div>
              <div style={{ padding: '5px 10px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>Modified</div>
              {display.map((pair, i) => {
                const origColor = pair.type === 'delete' || pair.type === 'changed' ? '#7f1d1d' : '#374151';
                const newColor = pair.type === 'insert' || pair.type === 'changed' ? '#14532d' : '#374151';
                return [
                  <div key={`l${i}`} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #e5e7eb', background: rowBg(pair.type, 'orig') }}>
                    <span style={numCol}>{pair.lineNumOrig ?? ''}</span>
                    <span style={{ ...lineContent, color: origColor }}>
                      {pair.type === 'delete' && <span style={{ color: '#ef4444', fontWeight: 800, marginRight: '4px' }}>−</span>}
                      {pair.type === 'changed' && pair.wordDiff
                        ? <WordDiff wdiff={pair.wordDiff} side="orig" />
                        : pair.type !== 'insert' ? (pair.origLine || '\u00a0') : '\u00a0'}
                    </span>
                  </div>,
                  <div key={`r${i}`} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', background: rowBg(pair.type, 'new') }}>
                    <span style={numCol}>{pair.lineNumNew ?? ''}</span>
                    <span style={{ ...lineContent, color: newColor }}>
                      {pair.type === 'insert' && <span style={{ color: '#22c55e', fontWeight: 800, marginRight: '4px' }}>+</span>}
                      {pair.type === 'changed' && pair.wordDiff
                        ? <WordDiff wdiff={pair.wordDiff} side="new" />
                        : pair.type !== 'delete' ? (pair.newLine || '\u00a0') : '\u00a0'}
                    </span>
                  </div>,
                ];
              })}
            </div>
          ) : (
            /* Unified View */
            <div>
              <div style={{ padding: '5px 10px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>Unified Diff</div>
              {display.flatMap((pair, i) => {
                const numW: React.CSSProperties = { ...numCol, width: '36px' };
                if (pair.type === 'equal') return [(
                  <div key={`e${i}`} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={numW}>{pair.lineNumOrig}</span>
                    <span style={numW}>{pair.lineNumNew}</span>
                    <span style={{ ...lineContent, color: '#6b7280' }}>{pair.origLine || '\u00a0'}</span>
                  </div>
                )];
                if (pair.type === 'delete') return [(
                  <div key={`d${i}`} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', background: '#fef2f2' }}>
                    <span style={numW}>{pair.lineNumOrig}</span>
                    <span style={{ ...numW, color: 'transparent' }}>0</span>
                    <span style={{ ...lineContent, color: '#7f1d1d' }}>
                      <span style={{ color: '#ef4444', fontWeight: 800, marginRight: '4px' }}>−</span>{pair.origLine || '\u00a0'}
                    </span>
                  </div>
                )];
                if (pair.type === 'insert') return [(
                  <div key={`n${i}`} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', background: '#f0fdf4' }}>
                    <span style={{ ...numW, color: 'transparent' }}>0</span>
                    <span style={numW}>{pair.lineNumNew}</span>
                    <span style={{ ...lineContent, color: '#14532d' }}>
                      <span style={{ color: '#22c55e', fontWeight: 800, marginRight: '4px' }}>+</span>{pair.newLine || '\u00a0'}
                    </span>
                  </div>
                )];
                // changed
                return [
                  <div key={`c1${i}`} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', background: '#fef2f2' }}>
                    <span style={numW}>{pair.lineNumOrig}</span>
                    <span style={{ ...numW, color: 'transparent' }}>0</span>
                    <span style={{ ...lineContent, color: '#7f1d1d' }}>
                      <span style={{ color: '#ef4444', fontWeight: 800, marginRight: '4px' }}>−</span>
                      {pair.wordDiff ? <WordDiff wdiff={pair.wordDiff} side="orig" /> : (pair.origLine || '\u00a0')}
                    </span>
                  </div>,
                  <div key={`c2${i}`} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', background: '#f0fdf4' }}>
                    <span style={{ ...numW, color: 'transparent' }}>0</span>
                    <span style={numW}>{pair.lineNumNew}</span>
                    <span style={{ ...lineContent, color: '#14532d' }}>
                      <span style={{ color: '#22c55e', fontWeight: 800, marginRight: '4px' }}>+</span>
                      {pair.wordDiff ? <WordDiff wdiff={pair.wordDiff} side="new" /> : (pair.newLine || '\u00a0')}
                    </span>
                  </div>,
                ];
              })}
            </div>
          )}
        </div>

      ) : hasDiff && display.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed #bbf7d0', borderRadius: '12px', background: '#f0fdf4' }}>
          <div style={{ fontSize: '2rem', marginBottom: '6px' }}>✅</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#15803d' }}>Texts are identical</div>
          <div style={{ fontSize: '0.8rem', color: '#4ade80', marginTop: '4px' }}>No differences found</div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 2rem', border: '2px dashed #e5e7eb', borderRadius: '12px', color: '#9ca3af' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⚡</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>Paste text in both panels above</div>
          <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Differences appear instantly — no button to click</div>
        </div>
      )}
    </div>
  );
}
