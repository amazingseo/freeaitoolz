import { useState, useCallback } from 'react';

const LOREM_WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum perspiciatis unde omnis iste natus error voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis quasi architecto beatae vitae dicta explicabo nemo ipsam quia voluptas aspernatur aut odit fugit consequuntur magni dolores eos ratione sequi nesciunt neque porro quisquam dolorem adipisci numquam eius modi tempora incidunt magnam aliquam quaerat autem vel accusamus iusto odio dignissimos ducimus blanditiis praesentium voluptatum deleniti atque corrupti quos quas molestias excepturi obcaecati cupiditate provident similique'.split(' ');

function generateWords(count: number): string {
  let result = [];
  for (let i = 0; i < count; i++) result.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
  result[0] = result[0].charAt(0).toUpperCase() + result[0].slice(1);
  return result.join(' ') + '.';
}

function generateSentence(): string {
  const len = 8 + Math.floor(Math.random() * 15);
  return generateWords(len);
}

function generateParagraph(): string {
  const sentences = 3 + Math.floor(Math.random() * 5);
  return Array.from({ length: sentences }, generateSentence).join(' ');
}

export default function LoremIpsumGenerator() {
  const [type, setType] = useState<'paragraphs' | 'sentences' | 'words'>('paragraphs');
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    let result = '';
    if (type === 'paragraphs') {
      result = Array.from({ length: count }, generateParagraph).join('\n\n');
    } else if (type === 'sentences') {
      result = Array.from({ length: count }, generateSentence).join(' ');
    } else {
      result = generateWords(count);
    }
    if (startWithLorem && result.length > 0) {
      result = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + result.slice(result.indexOf(' ', 10) + 1);
    }
    setOutput(result);
  }, [type, count, startWithLorem]);

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const wordCount = output.trim() ? output.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
          <div className="flex gap-2">
            {(['paragraphs', 'sentences', 'words'] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all capitalize ${type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Count</label>
          <input type="number" min={1} max={100} value={count} onChange={e => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="w-24 p-2 border border-gray-200 rounded-xl text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer pb-1">
          <input type="checkbox" checked={startWithLorem} onChange={e => setStartWithLorem(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
          <span className="text-sm font-medium text-gray-700">Start with "Lorem ipsum..."</span>
        </label>
        <button onClick={generate} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-sm">
          Generate
        </button>
      </div>

      {output && (
        <div className="relative">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500">{wordCount} words</span>
            <button onClick={copy} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">{copied ? '✓ Copied' : 'Copy'}</button>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 max-h-[400px] overflow-y-auto">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{output}</p>
          </div>
        </div>
      )}
    </div>
  );
}
