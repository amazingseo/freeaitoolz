import { useState, useMemo } from 'react';

export default function WordCounter() {
  const [text, setText] = useState('');

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const sentences = trimmed ? (trimmed.match(/[.!?]+/g) || []).length || (trimmed.length > 0 ? 1 : 0) : 0;
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(p => p.trim()).length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 225));
    const speakingTime = Math.max(1, Math.ceil(words / 150));
    const wordList = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    const freq: Record<string, number> = {};
    wordList.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { words, chars, charsNoSpace, sentences, paragraphs, readingTime, speakingTime, keywords };
  }, [text]);

  return (
    <div className="space-y-6">
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Start typing or paste your text here to count words, characters, sentences..."
        className="w-full min-h-[250px] p-5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-base leading-relaxed" />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Words', value: stats.words },
          { label: 'Characters', value: stats.chars },
          { label: 'No Spaces', value: stats.charsNoSpace },
          { label: 'Sentences', value: stats.sentences },
          { label: 'Paragraphs', value: stats.paragraphs },
          { label: 'Read Time', value: `${stats.readingTime}m` },
          { label: 'Speak Time', value: `${stats.speakingTime}m` },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      {stats.keywords.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Top Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {stats.keywords.map(([word, count]) => (
              <span key={word} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                {word} <span className="bg-blue-200 text-blue-800 text-xs px-1.5 py-0.5 rounded-full font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
