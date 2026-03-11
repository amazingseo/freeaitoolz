import { useState, useCallback, useEffect } from 'react';

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [exclude, setExclude] = useState('');
  const [passwords, setPasswords] = useState<string[]>([]);
  const [copied, setCopied] = useState('');
  const [count, setCount] = useState(5);

  const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++; if (pw.length >= 12) score++; if (pw.length >= 16) score++;
    if (/[a-z]/.test(pw)) score++; if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++; if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', pct: 25 };
    if (score <= 4) return { label: 'Fair', color: 'bg-amber-500', pct: 50 };
    if (score <= 5) return { label: 'Strong', color: 'bg-blue-500', pct: 75 };
    return { label: 'Very Strong', color: 'bg-emerald-500', pct: 100 };
  };

  const generate = useCallback(() => {
    let chars = '';
    if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (numbers) chars += '0123456789';
    if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (exclude) chars = chars.split('').filter(c => !exclude.includes(c)).join('');
    if (!chars) return;

    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      const arr = new Uint32Array(length);
      crypto.getRandomValues(arr);
      results.push(Array.from(arr, v => chars[v % chars.length]).join(''));
    }
    setPasswords(results);
  }, [length, upper, lower, numbers, symbols, exclude, count]);

  useEffect(() => { generate(); }, []);

  const copy = (pw: string, idx: number) => { navigator.clipboard.writeText(pw); setCopied(String(idx)); setTimeout(() => setCopied(''), 1500); };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Length: {length}</label>
          <input type="range" min={4} max={64} value={length} onChange={e => setLength(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-full appearance-none accent-blue-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>4</span><span>64</span></div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Count</label>
          <input type="number" min={1} max={20} value={count} onChange={e => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            className="w-full p-2.5 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Character Types</label>
          <div className="grid grid-cols-2 gap-2">
            {[{ l: 'A-Z', v: upper, s: setUpper }, { l: 'a-z', v: lower, s: setLower }, { l: '0-9', v: numbers, s: setNumbers }, { l: '!@#', v: symbols, s: setSymbols }].map(o => (
              <label key={o.l} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={o.v} onChange={e => o.s(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                <span className="font-medium text-gray-700" style={{fontFamily: "'Space Mono', monospace"}}>{o.l}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Exclude Characters</label>
          <input type="text" value={exclude} onChange={e => setExclude(e.target.value)} placeholder="e.g., 0OlI1"
            className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" style={{fontFamily: "'Space Mono', monospace"}} />
        </div>
      </div>

      <button onClick={generate} className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-lg">
        Generate Passwords
      </button>

      {passwords.length > 0 && (
        <div className="space-y-3">
          {passwords.map((pw, i) => {
            const strength = getStrength(pw);
            return (
              <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm sm:text-base font-bold text-gray-900 break-all flex-1" style={{fontFamily: "'Space Mono', monospace"}}>{pw}</p>
                  <button onClick={() => copy(pw, i)} className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                    {copied === String(i) ? '✓' : 'Copy'}
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-600">{strength.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
