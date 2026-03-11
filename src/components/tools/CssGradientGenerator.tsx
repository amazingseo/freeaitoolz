import { useState, useMemo } from 'react';

export default function CssGradientGenerator() {
  const [type, setType] = useState<'linear' | 'radial'>('linear');
  const [angle, setAngle] = useState(135);
  const [colors, setColors] = useState([{ color: '#667eea', stop: 0 }, { color: '#764ba2', stop: 100 }]);
  const [copied, setCopied] = useState('');

  const gradient = useMemo(() => {
    const stops = colors.map(c => `${c.color} ${c.stop}%`).join(', ');
    return type === 'linear' ? `linear-gradient(${angle}deg, ${stops})` : `radial-gradient(circle, ${stops})`;
  }, [type, angle, colors]);

  const css = `background: ${gradient};`;

  const addColor = () => {
    if (colors.length >= 5) return;
    const lastStop = colors[colors.length - 1].stop;
    setColors([...colors, { color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'), stop: Math.min(100, lastStop + 20) }]);
  };

  const removeColor = (i: number) => { if (colors.length > 2) setColors(colors.filter((_, idx) => idx !== i)); };
  const updateColor = (i: number, key: string, val: any) => { const n = [...colors]; (n[i] as any)[key] = val; setColors(n); };
  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(''), 1500); };

  const presets = [
    { name: 'Sunset', colors: [{ color: '#f093fb', stop: 0 }, { color: '#f5576c', stop: 100 }] },
    { name: 'Ocean', colors: [{ color: '#667eea', stop: 0 }, { color: '#764ba2', stop: 100 }] },
    { name: 'Forest', colors: [{ color: '#11998e', stop: 0 }, { color: '#38ef7d', stop: 100 }] },
    { name: 'Fire', colors: [{ color: '#f12711', stop: 0 }, { color: '#f5af19', stop: 100 }] },
    { name: 'Sky', colors: [{ color: '#2193b0', stop: 0 }, { color: '#6dd5ed', stop: 100 }] },
    { name: 'Night', colors: [{ color: '#0f0c29', stop: 0 }, { color: '#302b63', stop: 50 }, { color: '#24243e', stop: 100 }] },
  ];

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="w-full h-48 sm:h-64 rounded-2xl shadow-inner border border-gray-200" style={{ background: gradient }} />

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
            <div className="flex gap-2">
              {(['linear', 'radial'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 capitalize transition-all ${type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {type === 'linear' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Angle: {angle}°</label>
              <input type="range" min={0} max={360} value={angle} onChange={e => setAngle(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none accent-blue-600" />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Colors ({colors.length}/5)</label>
            <div className="space-y-3">
              {colors.map((c, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <input type="color" value={c.color} onChange={e => updateColor(i, 'color', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                  <input type="text" value={c.color} onChange={e => updateColor(i, 'color', e.target.value)}
                    className="w-24 p-2 border border-gray-200 rounded-lg text-sm font-bold" style={{fontFamily: "'Space Mono', monospace"}} />
                  <div className="flex items-center gap-1 flex-1">
                    <input type="range" min={0} max={100} value={c.stop} onChange={e => updateColor(i, 'stop', parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none accent-blue-600" />
                    <span className="text-xs text-gray-500 w-8 text-right">{c.stop}%</span>
                  </div>
                  {colors.length > 2 && (
                    <button onClick={() => removeColor(i)} className="text-red-400 hover:text-red-600 text-lg font-bold">×</button>
                  )}
                </div>
              ))}
              {colors.length < 5 && (
                <button onClick={addColor} className="text-sm font-bold text-blue-600 hover:text-blue-800">+ Add Color</button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Presets</label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map(p => (
                <button key={p.name} onClick={() => setColors(p.colors)}
                  className="group rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all">
                  <div className="h-10" style={{ background: `linear-gradient(135deg, ${p.colors.map(c => c.color).join(', ')})` }} />
                  <p className="text-xs font-bold text-gray-600 py-1.5 text-center bg-white group-hover:text-blue-600">{p.name}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-gray-700">CSS Code</label>
              <button onClick={() => copy(css, 'css')} className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                {copied === 'css' ? '✓ Copied' : 'Copy CSS'}
              </button>
            </div>
            <pre className="bg-gray-950 text-green-400 p-4 rounded-xl text-sm overflow-auto" style={{fontFamily: "'Space Mono', monospace"}}>{css}</pre>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-gray-700">Tailwind</label>
              <button onClick={() => copy(`bg-gradient-to-r from-[${colors[0].color}] to-[${colors[colors.length-1].color}]`, 'tw')} className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                {copied === 'tw' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre className="bg-gray-950 text-blue-400 p-4 rounded-xl text-sm overflow-auto" style={{fontFamily: "'Space Mono', monospace"}}>{`bg-gradient-to-r from-[${colors[0].color}] to-[${colors[colors.length-1].color}]`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
