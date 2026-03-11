import { useState } from 'react';

export default function Base64Tool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const process = () => {
    setError('');
    try {
      if (mode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input.trim()))));
      }
    } catch { setError(mode === 'decode' ? 'Invalid Base64 string. Please check your input.' : 'Could not encode text.'); setOutput(''); }
  };

  const swap = () => {
    setMode(mode === 'encode' ? 'decode' : 'encode');
    setInput(output); setOutput(''); setError('');
  };

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {(['encode', 'decode'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setOutput(''); setError(''); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all capitalize ${mode === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {m === 'encode' ? '🔒 Encode' : '🔓 Decode'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">{mode === 'encode' ? 'Plain Text' : 'Base64 String'}</label>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 string to decode...'}
            className="w-full min-h-[220px] p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-y text-sm leading-relaxed" style={{fontFamily: "'Space Mono', monospace"}} />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold text-gray-700">{mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}</label>
            {output && <button onClick={copy} className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">{copied ? '✓ Copied' : 'Copy'}</button>}
          </div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-200 mb-2">{error}</div>}
          <pre className="w-full min-h-[220px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm leading-relaxed overflow-auto whitespace-pre-wrap break-all" style={{fontFamily: "'Space Mono', monospace"}}>{output || 'Output will appear here...'}</pre>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <button onClick={process} disabled={!input.trim()} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl transition-all text-lg">
          {mode === 'encode' ? 'Encode to Base64' : 'Decode from Base64'}
        </button>
        {output && <button onClick={swap} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all flex items-center gap-2">⇄ Swap</button>}
      </div>
    </div>
  );
}
