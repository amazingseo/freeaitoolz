import { useState, useMemo } from 'react';

function markdownToHtml(md: string): string {
  let html = md
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    .replace(/^\* (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
  
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  
  // Wrap remaining lines in <p> tags
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || 
        trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr') || trimmed.startsWith('<img')) return trimmed;
    return `<p>${trimmed}</p>`;
  }).filter(Boolean).join('\n');

  return html;
}

export default function MarkdownToHtml() {
  const [input, setInput] = useState('# Hello World\n\nThis is a **bold** and *italic* text example.\n\n## Features\n\n- Easy to use\n- Real-time preview\n- Copy with one click\n\n> This is a blockquote\n\nVisit [FreeAIToolz](https://freeaitoolz.com) for more tools.');
  const [tab, setTab] = useState<'preview' | 'html'>('preview');
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => markdownToHtml(input), [input]);

  const copy = () => { navigator.clipboard.writeText(html); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Markdown Input</label>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder="# Type your markdown here..."
            className="w-full min-h-[400px] p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-y text-sm leading-relaxed bg-white" style={{fontFamily: "'Space Mono', monospace"}} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1">
              {(['preview', 'html'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {t === 'html' ? 'HTML Code' : 'Preview'}
                </button>
              ))}
            </div>
            <button onClick={copy} className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">{copied ? '✓ Copied' : 'Copy HTML'}</button>
          </div>
          {tab === 'preview' ? (
            <div className="w-full min-h-[400px] p-5 border border-gray-200 rounded-xl bg-white overflow-auto prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <pre className="w-full min-h-[400px] p-4 bg-gray-950 text-green-400 rounded-xl text-sm overflow-auto leading-relaxed" style={{fontFamily: "'Space Mono', monospace"}}>{html}</pre>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-bold text-gray-700 mb-2">Supported Markdown:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs" style={{fontFamily: "'Space Mono', monospace"}}>
          <span># Heading 1</span><span>**bold**</span><span>*italic*</span><span>~~strikethrough~~</span>
          <span>[link](url)</span><span>![image](url)</span><span>- list item</span><span>&gt; blockquote</span>
          <span>`inline code`</span><span>---</span><span>## Heading 2</span><span>### Heading 3</span>
        </div>
      </div>
    </div>
  );
}
