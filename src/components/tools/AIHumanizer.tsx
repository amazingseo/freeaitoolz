import { useState, useCallback } from 'react';

const TONES = [
  { id: 'standard', label: 'Standard', desc: 'Balanced and natural' },
  { id: 'casual', label: 'Casual', desc: 'Relaxed and friendly' },
  { id: 'professional', label: 'Professional', desc: 'Formal and polished' },
  { id: 'academic', label: 'Academic', desc: 'Scholarly and precise' },
];

export default function AIHumanizer() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [tone, setTone] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const outputWordCount = output.trim() ? output.trim().split(/\s+/).length : 0;

  const humanizeText = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setOutput('');

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, tone, tool: 'humanizer' }),
      });

      const data = await response.json();
      
      if (data.result) {
        setOutput(data.result);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [input, tone]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const clearAll = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Tone Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Select Tone</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TONES.map(t => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                tone === t.id
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`block text-sm font-semibold ${tone === t.id ? 'text-blue-700' : 'text-gray-800'}`}>
                {t.label}
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input / Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">AI-Generated Text</label>
            <span className="text-xs text-gray-500">{wordCount} words</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your AI-generated text here... (from ChatGPT, Gemini, Claude, or any AI tool)"
            className="w-full min-h-[280px] p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-base leading-relaxed transition-all bg-white"
          />
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">Humanized Text</label>
            {output && <span className="text-xs text-gray-500">{outputWordCount} words</span>}
          </div>
          <div className="relative">
            <textarea
              value={output}
              readOnly
              placeholder="Your humanized text will appear here..."
              className="w-full min-h-[280px] p-4 border border-gray-200 rounded-xl bg-gray-50 text-base leading-relaxed resize-y"
            />
            {output && (
              <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            )}
          </div>
        </div>
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
          onClick={humanizeText}
          disabled={!input.trim() || loading}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md text-lg"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Humanizing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Humanize Text
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

      {/* Features */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
        {[
          { icon: '🔒', label: 'Private & Secure', desc: 'Text never stored' },
          { icon: '⚡', label: 'Instant Results', desc: 'AI-powered speed' },
          { icon: '🎯', label: 'Multiple Tones', desc: '4 writing styles' },
          { icon: '♾️', label: 'Unlimited Use', desc: 'No word limits' },
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
