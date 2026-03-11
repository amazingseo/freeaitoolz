import { useState, useCallback } from 'react';

export default function QrCodeGenerator() {
  const [text, setText] = useState('');
  const [size, setSize] = useState(300);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [generated, setGenerated] = useState(false);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=${fgColor.replace('#', '')}&bgcolor=${bgColor.replace('#', '')}&format=png`;

  const generate = () => { if (text.trim()) setGenerated(true); };
  
  const download = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `qrcode-${Date.now()}.png`;
    a.click();
  };

  const presets = [
    { label: '🌐 Website URL', placeholder: 'https://example.com' },
    { label: '📧 Email', placeholder: 'mailto:hello@example.com' },
    { label: '📱 Phone', placeholder: 'tel:+1234567890' },
    { label: '💬 WhatsApp', placeholder: 'https://wa.me/1234567890' },
    { label: '📶 WiFi', placeholder: 'WIFI:T:WPA;S:NetworkName;P:Password;;' },
    { label: '📝 Text', placeholder: 'Any text message here' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Quick Presets</label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map(p => (
                <button key={p.label} onClick={() => { setText(p.placeholder); setGenerated(false); }}
                  className="text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-700">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Content</label>
            <textarea value={text} onChange={e => { setText(e.target.value); setGenerated(false); }}
              placeholder="Enter URL, text, email, phone, or any content..."
              className="w-full min-h-[120px] p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-y text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Size: {size}px</label>
              <input type="range" min={100} max={500} step={50} value={size} onChange={e => { setSize(parseInt(e.target.value)); setGenerated(false); }}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none accent-blue-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">FG Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={fgColor} onChange={e => { setFgColor(e.target.value); setGenerated(false); }} className="w-8 h-8 rounded cursor-pointer" />
                  <span className="text-xs font-mono text-gray-500">{fgColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">BG Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={bgColor} onChange={e => { setBgColor(e.target.value); setGenerated(false); }} className="w-8 h-8 rounded cursor-pointer" />
                  <span className="text-xs font-mono text-gray-500">{bgColor}</span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={generate} disabled={!text.trim()}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl transition-all text-lg">
            Generate QR Code
          </button>
        </div>

        <div className="flex flex-col items-center justify-center">
          {generated ? (
            <div className="space-y-4 text-center">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 inline-block">
                <img src={qrUrl} alt="Generated QR Code" width={size > 300 ? 300 : size} height={size > 300 ? 300 : size} className="rounded-lg" />
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={download} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all">
                  ⬇ Download PNG
                </button>
                <button onClick={() => { navigator.clipboard.writeText(qrUrl); }} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all">
                  🔗 Copy URL
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <span className="text-6xl block mb-4">📱</span>
              <p className="font-medium">Your QR code will appear here</p>
              <p className="text-sm mt-1">Enter content and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
