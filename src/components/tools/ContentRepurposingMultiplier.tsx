import { useState, useMemo } from 'react';

interface RepurposeItem { platform: string; icon: string; format: string; count: number; effort: string; tip: string; }

const CONTENT_TYPES = [
  { id: 'video-long', label: '🎬 Long Video', sub: '10+ min YouTube/Webinar', unit: 'minutes' },
  { id: 'video-short', label: '📱 Short Video', sub: '< 3 min TikTok/Reel', unit: 'videos' },
  { id: 'blog', label: '📝 Blog Post', sub: '1000+ words article', unit: 'words' },
  { id: 'podcast', label: '🎙️ Podcast Episode', sub: '20-60 min audio', unit: 'minutes' },
  { id: 'newsletter', label: '📧 Newsletter', sub: 'Email to subscribers', unit: 'words' },
  { id: 'webinar', label: '🖥️ Webinar/Workshop', sub: '30-90 min presentation', unit: 'minutes' },
];

function getRepurposing(type: string, length: number): RepurposeItem[] {
  const items: RepurposeItem[] = [];

  switch (type) {
    case 'video-long':
      items.push(
        { platform: 'YouTube Shorts', icon: '📱', format: 'Vertical clips', count: Math.floor(length / 3), effort: 'Low', tip: 'Extract key moments, add captions' },
        { platform: 'TikTok', icon: '🎵', format: 'Short clips + hooks', count: Math.floor(length / 2.5), effort: 'Low', tip: 'Add trending sounds, use native captions' },
        { platform: 'Instagram Reels', icon: '📸', format: 'Vertical highlights', count: Math.floor(length / 3), effort: 'Low', tip: 'Use carousel for listicle content' },
        { platform: 'LinkedIn Posts', icon: '💼', format: 'Key takeaways', count: Math.ceil(length / 5), effort: 'Medium', tip: 'Write personal stories around each point' },
        { platform: 'Twitter/X Thread', icon: '🐦', format: 'Thread breakdown', count: Math.ceil(length / 8), effort: 'Medium', tip: 'One key insight per tweet, add visuals' },
        { platform: 'Blog Post', icon: '📝', format: 'Transcript + edit', count: 1, effort: 'Medium', tip: 'Use transcript as base, add headers and links' },
        { platform: 'Newsletter', icon: '📧', format: 'Summary + link', count: 1, effort: 'Low', tip: 'Top 3 takeaways + watch link' },
        { platform: 'Pinterest Pins', icon: '📌', format: 'Quote graphics', count: Math.floor(length / 4), effort: 'Low', tip: 'Create quote cards from key statements' },
        { platform: 'Podcast Audio', icon: '🎙️', format: 'Audio extract', count: 1, effort: 'Low', tip: 'Strip audio for podcast platforms' },
      );
      break;
    case 'video-short':
      items.push(
        { platform: 'TikTok', icon: '🎵', format: 'Cross-post', count: length, effort: 'None', tip: 'Remove watermarks between platforms' },
        { platform: 'Instagram Reels', icon: '📸', format: 'Cross-post', count: length, effort: 'None', tip: 'Adjust aspect ratio if needed' },
        { platform: 'YouTube Shorts', icon: '📱', format: 'Cross-post', count: length, effort: 'None', tip: 'Add end screen for channel' },
        { platform: 'LinkedIn', icon: '💼', format: 'Native video + text', count: length, effort: 'Low', tip: 'Add professional context in caption' },
        { platform: 'Twitter/X', icon: '🐦', format: 'Video tweet', count: length, effort: 'Low', tip: 'Add a compelling hook text' },
        { platform: 'Pinterest', icon: '📌', format: 'Idea Pins', count: length, effort: 'Low', tip: 'Add text overlay for Pinterest audience' },
      );
      break;
    case 'blog':
      const sections = Math.max(3, Math.floor(length / 300));
      items.push(
        { platform: 'LinkedIn Posts', icon: '💼', format: 'Key section posts', count: sections, effort: 'Medium', tip: 'Rewrite each section as a standalone post' },
        { platform: 'Twitter/X Thread', icon: '🐦', format: 'Thread version', count: 1, effort: 'Medium', tip: 'Convert to numbered thread with hook' },
        { platform: 'Twitter/X Tweets', icon: '🐦', format: 'Individual tips', count: Math.floor(sections * 1.5), effort: 'Low', tip: 'One insight per tweet' },
        { platform: 'Instagram Carousel', icon: '📸', format: 'Slide deck', count: Math.ceil(sections / 2), effort: 'Medium', tip: 'Design slides from each section' },
        { platform: 'TikTok/Reels', icon: '📱', format: 'Talking head tips', count: Math.ceil(sections / 2), effort: 'High', tip: 'Record yourself explaining each point' },
        { platform: 'Newsletter', icon: '📧', format: 'Digest version', count: 1, effort: 'Low', tip: 'Top 3 points + read more link' },
        { platform: 'Pinterest', icon: '📌', format: 'Infographic pins', count: Math.ceil(sections / 3), effort: 'Medium', tip: 'Create visual summaries of data' },
        { platform: 'Quora/Reddit', icon: '💬', format: 'Answers', count: Math.ceil(sections / 2), effort: 'Low', tip: 'Answer related questions linking back' },
        { platform: 'Medium/Substack', icon: '📰', format: 'Syndicated post', count: 1, effort: 'Low', tip: 'Add canonical link to original' },
      );
      break;
    case 'podcast':
      items.push(
        { platform: 'YouTube Video', icon: '🎬', format: 'Full episode', count: 1, effort: 'Low', tip: 'Add waveform or image for video' },
        { platform: 'YouTube Shorts', icon: '📱', format: 'Best moments', count: Math.floor(length / 5), effort: 'Medium', tip: 'Clip the best 60-sec moments' },
        { platform: 'Blog Post', icon: '📝', format: 'Show notes + transcript', count: 1, effort: 'Medium', tip: 'Use AI to clean up transcript' },
        { platform: 'Twitter/X', icon: '🐦', format: 'Quote tweets', count: Math.floor(length / 7), effort: 'Low', tip: 'Pull best quotes with audiogram' },
        { platform: 'LinkedIn', icon: '💼', format: 'Key insights', count: Math.ceil(length / 10), effort: 'Medium', tip: 'Write professional takeaways' },
        { platform: 'Newsletter', icon: '📧', format: 'Episode recap', count: 1, effort: 'Low', tip: 'Summary + listen link + timestamps' },
        { platform: 'Instagram', icon: '📸', format: 'Audiograms + carousels', count: Math.floor(length / 6), effort: 'Medium', tip: 'Use Headliner for audiogram clips' },
      );
      break;
    case 'newsletter':
      items.push(
        { platform: 'LinkedIn Post', icon: '💼', format: 'Adapted version', count: 1, effort: 'Low', tip: 'Rewrite intro for LinkedIn audience' },
        { platform: 'Twitter/X Thread', icon: '🐦', format: 'Thread version', count: 1, effort: 'Medium', tip: 'Break into numbered insights' },
        { platform: 'Blog Post', icon: '📝', format: 'Expanded article', count: 1, effort: 'Medium', tip: 'Add more detail and SEO optimize' },
        { platform: 'Instagram Carousel', icon: '📸', format: 'Visual slides', count: 1, effort: 'Medium', tip: 'Key stats and takeaways as slides' },
        { platform: 'TikTok/Reels', icon: '📱', format: 'Quick take video', count: 1, effort: 'High', tip: 'Record yourself sharing the main insight' },
      );
      break;
    case 'webinar':
      items.push(
        { platform: 'YouTube', icon: '🎬', format: 'Full recording', count: 1, effort: 'Low', tip: 'Add chapters and timestamps' },
        { platform: 'YouTube Shorts', icon: '📱', format: 'Key moments', count: Math.floor(length / 4), effort: 'Medium', tip: 'Clip the most valuable 60-sec segments' },
        { platform: 'Blog Series', icon: '📝', format: 'Section articles', count: Math.ceil(length / 15), effort: 'High', tip: 'Each major section becomes an article' },
        { platform: 'LinkedIn Posts', icon: '💼', format: 'Takeaway posts', count: Math.ceil(length / 8), effort: 'Medium', tip: 'One key lesson per post' },
        { platform: 'Twitter/X', icon: '🐦', format: 'Thread + clips', count: Math.ceil(length / 10), effort: 'Medium', tip: 'Thread the highlights with video clips' },
        { platform: 'Email Course', icon: '📧', format: 'Drip sequence', count: Math.ceil(length / 15), effort: 'High', tip: 'Break into daily email lessons' },
        { platform: 'Slide Deck', icon: '📊', format: 'Downloadable PDF', count: 1, effort: 'Low', tip: 'Clean up slides as lead magnet' },
        { platform: 'Podcast', icon: '🎙️', format: 'Audio version', count: 1, effort: 'Low', tip: 'Strip audio for podcast feed' },
      );
      break;
  }
  return items;
}

export default function ContentRepurposingMultiplier() {
  const [contentType, setContentType] = useState('blog');
  const [length, setLength] = useState(1500);
  const selectedType = CONTENT_TYPES.find(t => t.id === contentType)!;

  const repurposing = useMemo(() => getRepurposing(contentType, length), [contentType, length]);
  const totalPieces = repurposing.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">Content Type</label>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map(t => (
              <button key={t.id} onClick={() => { setContentType(t.id); setLength(t.id.includes('video') ? 10 : t.id === 'blog' ? 1500 : t.id === 'newsletter' ? 800 : 30); }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${contentType === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className="text-sm font-bold">{t.label}</span>
                <span className="block text-[10px] text-gray-500">{t.sub}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">Content Length ({selectedType.unit})</label>
          <input type="number" min={1} value={length} onChange={e => setLength(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full p-3 border border-gray-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <p className="text-xs text-gray-500 mt-1">Enter number of {selectedType.unit}</p>

          {/* Result summary */}
          <div className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-5 text-white text-center">
            <p className="text-4xl font-extrabold">{totalPieces}</p>
            <p className="text-sm font-medium text-blue-100 mt-1">total content pieces from 1 {selectedType.label.split(' ').pop()}</p>
            <p className="text-xs text-blue-200 mt-2">across {repurposing.length} platforms</p>
          </div>
        </div>
      </div>

      {/* Distribution Map */}
      <div>
        <h3 className="text-lg font-extrabold text-gray-900 mb-4">📋 Your Content Distribution Map</h3>
        <div className="space-y-3">
          {repurposing.map((r, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4 hover:shadow-sm transition-all">
              <span className="text-2xl flex-shrink-0 mt-0.5">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">{r.platform}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.format}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    r.effort === 'None' ? 'bg-emerald-100 text-emerald-700' :
                    r.effort === 'Low' ? 'bg-blue-100 text-blue-700' :
                    r.effort === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>{r.effort} effort</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{r.tip}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-2xl font-extrabold text-blue-600">{r.count}</span>
                <span className="block text-[10px] text-gray-500">pieces</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
        {[
          { icon: '📊', label: 'Strategy Map', desc: 'Plan before creating' },
          { icon: '⚡', label: 'Instant', desc: 'No API needed' },
          { icon: '🎯', label: 'Effort Levels', desc: 'Prioritize wisely' },
          { icon: '💡', label: 'Pro Tips', desc: 'Platform-specific' },
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
