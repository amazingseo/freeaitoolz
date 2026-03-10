import { useState, useCallback } from 'react';

const TONES = [
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'friendly', label: 'Friendly', icon: '😊' },
  { id: 'formal', label: 'Formal', icon: '📋' },
  { id: 'persuasive', label: 'Persuasive', icon: '🎯' },
  { id: 'apologetic', label: 'Apologetic', icon: '🙏' },
  { id: 'urgent', label: 'Urgent', icon: '⚡' },
];

const TEMPLATES = [
  { id: 'custom', label: 'Custom Request', placeholder: 'Describe the email you want to write...' },
  { id: 'cold-outreach', label: 'Cold Outreach', placeholder: 'Who are you reaching out to and what do you want? e.g., "Reach out to marketing agency owners offering GoHighLevel automation services"' },
  { id: 'follow-up', label: 'Follow Up', placeholder: 'What are you following up on? e.g., "Follow up on proposal sent last week for website redesign project"' },
  { id: 'meeting-request', label: 'Meeting Request', placeholder: 'Who do you want to meet and why? e.g., "Request a 30-min call with potential client to discuss their CRM needs"' },
  { id: 'thank-you', label: 'Thank You', placeholder: 'What are you thanking them for? e.g., "Thank client for choosing our agency for their marketing automation"' },
  { id: 'introduction', label: 'Introduction', placeholder: 'Who are you introducing yourself to? e.g., "Introduce myself as a GHL expert to a new Upwork client"' },
];

export default function AIEmailWriter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [tone, setTone] = useState('professional');
  const [template, setTemplate] = useState('custom');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const selectedTemplate = TEMPLATES.find(t => t.id === template);

  const generateEmail = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setOutput('');

    const context = template !== 'custom' ? `Email type: ${selectedTemplate.label}. ` : '';

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${context}${input}`, tone, tool: 'email-writer' }),
      });

      const data = await response.json();
      if (data.result) { setOutput(data.result); }
      else { setError(data.error || 'Something went wrong.'); }
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }, [input, tone, template, selectedTemplate]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const clearAll = () => { setInput(''); setOutput(''); setError(''); };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Email Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => { setTemplate(t.id); setInput(''); }}
              className={`p-2.5 rounded-xl border-2 text-center transition-all text-sm ${
                template === t.id ? 'border-blue-500 bg-blue-50 font-semibold text-blue-700' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tone Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Tone</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map(t => (
            <button key={t.id} onClick={() => setTone(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 transition-all text-sm ${
                tone === t.id ? 'border-blue-500 bg-blue-50 font-semibold text-blue-700' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
              }`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input / Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Describe Your Email</label>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={selectedTemplate.placeholder}
            className="w-full min-h-[250px] p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-base leading-relaxed bg-white" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">Generated Email</label>
          </div>
          <div className="relative">
            <textarea value={output} readOnly placeholder="Your email will appear here..."
              className="w-full min-h-[250px] p-4 border border-gray-200 rounded-xl bg-gray-50 text-base leading-relaxed resize-y font-mono text-sm" />
            {output && (
              <button onClick={copyToClipboard}
                className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 shadow-sm">
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200">{error}</div>}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button onClick={generateEmail} disabled={!input.trim() || loading}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md text-lg">
          {loading ? (
            <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Writing...</>
          ) : (
            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>Generate Email</>
          )}
        </button>
        <button onClick={clearAll} className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3.5 rounded-xl transition-all">Clear All</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
        {[
          { icon: '📧', label: '6 Email Types', desc: 'Templates for every need' },
          { icon: '🎨', label: '6 Tones', desc: 'Match your style' },
          { icon: '⚡', label: 'Instant Draft', desc: 'Ready in seconds' },
          { icon: '🔒', label: 'Private', desc: 'Nothing stored' },
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
