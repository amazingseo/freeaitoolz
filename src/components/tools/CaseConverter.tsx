import { useState, useCallback } from 'react';

export default function CaseConverter() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState('');

  const copy = (t: string, id: string) => { navigator.clipboard.writeText(t); setCopied(id); setTimeout(() => setCopied(''), 1500); };

  const conversions = [
    { id: 'upper', label: 'UPPERCASE', fn: (t: string) => t.toUpperCase() },
    { id: 'lower', label: 'lowercase', fn: (t: string) => t.toLowerCase() },
    { id: 'title', label: 'Title Case', fn: (t: string) => t.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) },
    { id: 'sentence', label: 'Sentence case', fn: (t: string) => t.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase()) },
    { id: 'camel', label: 'camelCase', fn: (t: string) => t.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^[A-Z]/, c => c.toLowerCase()) },
    { id: 'pascal', label: 'PascalCase', fn: (t: string) => t.toLowerCase().replace(/(^|[^a-z0-9]+)(.)/g, (_, _s, c) => c.toUpperCase()) },
    { id: 'snake', label: 'snake_case', fn: (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') },
    { id: 'kebab', label: 'kebab-case', fn: (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') },
    { id: 'toggle', label: 'tOGGLE cASE', fn: (t: string) => t.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('') },
    { id: 'dot', label: 'dot.case', fn: (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') },
  ];

  return (
    <div className="space-y-6">
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type or paste your text here to convert its case..."
        className="w-full min-h-[180px] p-5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-base leading-relaxed" />
      {text.trim() && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {conversions.map(c => (
            <div key={c.id} className="bg-gray-50 rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{c.label}</p>
                <p className="text-sm text-gray-800 break-all leading-relaxed">{c.fn(text).slice(0, 200)}{text.length > 200 ? '...' : ''}</p>
              </div>
              <button onClick={() => copy(c.fn(text), c.id)}
                className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-all">
                {copied === c.id ? '✓' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
