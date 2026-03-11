import { useState, useCallback } from 'react';

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [indent, setIndent] = useState(2);

  const format = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setError('');
    } catch (e: any) { setError(`Invalid JSON: ${e.message}`); setOutput(''); }
  }, [input, indent]);

  const minify = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e: any) { setError(`Invalid JSON: ${e.message}`); setOutput(''); }
  }, [input]);

  const validate = useCallback(() => {
    try {
      JSON.parse(input);
      setError('');
      setOutput('✅ Valid JSON!');
    } catch (e: any) { setError(`❌ Invalid JSON: ${e.message}`); setOutput(''); }
  }, [input]);

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-gray-700">Indent:</label>
          {[2, 4].map(n => (
            <button key={n} onClick={() => setIndent(n)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${indent === n ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {n} spaces
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={format} disabled={!input.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-lg text-sm transition-all">Format</button>
          <button onClick={minify} disabled={!input.trim()} className="px-4 py-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white font-bold rounded-lg text-sm transition-all">Minify</button>
          <button onClick={validate} disabled={!input.trim()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-lg text-sm transition-all">Validate</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Input JSON</label>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder='{"name": "John", "age": 30}'
            className="w-full min-h-[300px] p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-y text-sm leading-relaxed bg-white" style={{fontFamily: "'Space Mono', monospace"}} />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold text-gray-700">Output</label>
            {output && !output.startsWith('✅') && (
              <button onClick={copy} className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">{copied ? '✓ Copied' : 'Copy'}</button>
            )}
          </div>
          {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200 mb-2">{error}</div>}
          <pre className={`w-full min-h-[300px] p-4 rounded-xl text-sm leading-relaxed overflow-auto ${output.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-950 text-green-400'}`} style={{fontFamily: "'Space Mono', monospace"}}>{output || 'Formatted output will appear here...'}</pre>
        </div>
      </div>
    </div>
  );
}
