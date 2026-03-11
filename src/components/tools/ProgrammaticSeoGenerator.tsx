import { useState, useMemo } from 'react';

export default function ProgrammaticSeoGenerator() {
  const [template, setTemplate] = useState('Best [Service] in [City] - Top Rated [Year]');
  const [variables, setVariables] = useState<{ name: string; values: string }[]>([
    { name: 'Service', values: 'Plumber, Electrician, HVAC Repair, Roofing' },
    { name: 'City', values: 'New York, Los Angeles, Chicago, Houston, Phoenix' },
    { name: 'Year', values: '2026' },
  ]);
  const [type, setType] = useState<'title' | 'meta' | 'h1' | 'url'>('title');
  const [copied, setCopied] = useState(false);

  const addVariable = () => setVariables([...variables, { name: '', values: '' }]);
  const removeVariable = (i: number) => setVariables(variables.filter((_, idx) => idx !== i));
  const updateVariable = (i: number, key: 'name' | 'values', val: string) => {
    const n = [...variables]; n[i][key] = val; setVariables(n);
  };

  const output = useMemo(() => {
    const varData = variables.filter(v => v.name && v.values).map(v => ({
      name: v.name,
      values: v.values.split(',').map(s => s.trim()).filter(Boolean),
    }));

    if (varData.length === 0 || !template) return [];

    // Generate all combinations
    function getCombinations(vars: typeof varData): Record<string, string>[] {
      if (vars.length === 0) return [{}];
      const [first, ...rest] = vars;
      const restCombos = getCombinations(rest);
      const result: Record<string, string>[] = [];
      for (const val of first.values) {
        for (const combo of restCombos) {
          result.push({ ...combo, [first.name]: val });
        }
      }
      return result;
    }

    const combos = getCombinations(varData).slice(0, 200); // Cap at 200

    return combos.map(combo => {
      let text = template;
      for (const [key, val] of Object.entries(combo)) {
        text = text.replace(new RegExp(`\\[${key}\\]`, 'gi'), val);
      }
      if (type === 'url') {
        text = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
      }
      return { text, chars: text.length };
    });
  }, [template, variables, type]);

  const maxChars = type === 'title' ? 60 : type === 'meta' ? 155 : type === 'url' ? 100 : 70;
  const overLimit = output.filter(o => o.chars > maxChars).length;

  const copyAll = () => {
    navigator.clipboard.writeText(output.map(o => o.text).join('\n'));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const downloadCsv = () => {
    const csv = 'Text,Characters\n' + output.map(o => `"${o.text}",${o.chars}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pseo-${type}-${Date.now()}.csv`; a.click();
  };

  const presets = [
    { label: 'Local SEO Titles', template: 'Best [Service] in [City] - Top Rated [Year]', vars: [{ name: 'Service', values: 'Plumber, Electrician, HVAC' }, { name: 'City', values: 'New York, LA, Chicago' }, { name: 'Year', values: '2026' }] },
    { label: 'Product Pages', template: '[Brand] [Product] Review - Is It Worth It in [Year]?', vars: [{ name: 'Brand', values: 'Apple, Samsung, Google' }, { name: 'Product', values: 'Laptop, Phone, Tablet' }, { name: 'Year', values: '2026' }] },
    { label: 'Comparison Pages', template: '[ToolA] vs [ToolB] - Which Is Better for [UseCase]?', vars: [{ name: 'ToolA', values: 'Ahrefs, Semrush' }, { name: 'ToolB', values: 'Moz, Ubersuggest' }, { name: 'UseCase', values: 'Beginners, Agencies, Small Business' }] },
  ];

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Quick Presets</label>
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button key={p.label} onClick={() => { setTemplate(p.template); setVariables(p.vars); }}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-700">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Output Type */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Output Type</label>
        <div className="flex gap-2">
          {[
            { id: 'title' as const, label: 'Title Tags', limit: '60 chars' },
            { id: 'meta' as const, label: 'Meta Descriptions', limit: '155 chars' },
            { id: 'h1' as const, label: 'H1 Headings', limit: '70 chars' },
            { id: 'url' as const, label: 'URL Slugs', limit: 'auto-format' },
          ].map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${type === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
              {t.label} <span className="text-[10px] text-gray-400 block">{t.limit}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Template */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Template (use [Variable] for dynamic parts)</label>
        <input type="text" value={template} onChange={e => setTemplate(e.target.value)}
          className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base font-medium" style={{ fontFamily: "'Space Mono', monospace" }}
          placeholder="Best [Service] in [City] - Top Rated [Year]" />
      </div>

      {/* Variables */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-gray-700">Variables</label>
        {variables.map((v, i) => (
          <div key={i} className="flex gap-3 items-start">
            <input type="text" value={v.name} onChange={e => updateVariable(i, 'name', e.target.value)} placeholder="Variable name"
              className="w-36 p-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
            <input type="text" value={v.values} onChange={e => updateVariable(i, 'values', e.target.value)} placeholder="value1, value2, value3"
              className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            {variables.length > 1 && <button onClick={() => removeVariable(i)} className="text-red-400 hover:text-red-600 font-bold text-xl px-2 mt-1">×</button>}
          </div>
        ))}
        <button onClick={addVariable} className="text-sm font-bold text-blue-600 hover:text-blue-800">+ Add Variable</button>
      </div>

      {/* Output */}
      {output.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-700">{output.length} variations generated</span>
              {overLimit > 0 && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">{overLimit} over {maxChars} chars</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={copyAll} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">{copied ? '✓ Copied' : 'Copy All'}</button>
              <button onClick={downloadCsv} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">⬇ CSV</button>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 max-h-[400px] overflow-y-auto divide-y divide-gray-100">
            {output.map((o, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-white transition-colors">
                <span className={`text-sm ${o.chars > maxChars ? 'text-red-600' : 'text-gray-800'}`} style={{ fontFamily: type === 'url' ? "'Space Mono', monospace" : undefined }}>{o.text}</span>
                <span className={`text-xs font-bold ml-3 flex-shrink-0 ${o.chars > maxChars ? 'text-red-500' : 'text-gray-400'}`}>{o.chars}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
