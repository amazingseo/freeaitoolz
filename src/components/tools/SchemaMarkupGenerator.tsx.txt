import { useState, useCallback } from 'react';

const SCHEMA_TYPES = [
  { id: 'faq', label: 'FAQ Page', icon: '❓', desc: 'Questions & answers' },
  { id: 'howto', label: 'How-To', icon: '📋', desc: 'Step-by-step guide' },
  { id: 'article', label: 'Article', icon: '📰', desc: 'Blog/news article' },
  { id: 'product', label: 'Product', icon: '🛍️', desc: 'Product listing' },
  { id: 'localbusiness', label: 'Local Business', icon: '🏪', desc: 'Business info' },
  { id: 'organization', label: 'Organization', icon: '🏢', desc: 'Company details' },
];

export default function SchemaMarkupGenerator() {
  const [schemaType, setSchemaType] = useState('faq');
  const [items, setItems] = useState([{ q: '', a: '' }]);
  const [articleData, setArticleData] = useState({ title: '', author: '', date: '', description: '', image: '', url: '' });
  const [productData, setProductData] = useState({ name: '', description: '', price: '', currency: 'USD', image: '', brand: '', rating: '', reviewCount: '' });
  const [businessData, setBusinessData] = useState({ name: '', type: '', address: '', city: '', state: '', zip: '', country: '', phone: '', url: '', image: '' });
  const [orgData, setOrgData] = useState({ name: '', url: '', logo: '', description: '', email: '', phone: '' });
  const [howtoData, setHowtoData] = useState({ name: '', description: '', totalTime: '', steps: [{ name: '', text: '' }] });
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const generateSchema = useCallback(() => {
    let schema = {};

    switch (schemaType) {
      case 'faq':
        schema = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": items.filter(i => i.q && i.a).map(i => ({
            "@type": "Question",
            "name": i.q,
            "acceptedAnswer": { "@type": "Answer", "text": i.a }
          }))
        };
        break;
      case 'howto':
        schema = {
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": howtoData.name,
          "description": howtoData.description,
          ...(howtoData.totalTime && { "totalTime": `PT${howtoData.totalTime}M` }),
          "step": howtoData.steps.filter(s => s.name && s.text).map((s, i) => ({
            "@type": "HowToStep",
            "position": i + 1,
            "name": s.name,
            "text": s.text
          }))
        };
        break;
      case 'article':
        schema = {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": articleData.title,
          "author": { "@type": "Person", "name": articleData.author },
          "datePublished": articleData.date,
          "description": articleData.description,
          ...(articleData.image && { "image": articleData.image }),
          ...(articleData.url && { "mainEntityOfPage": articleData.url })
        };
        break;
      case 'product':
        schema = {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": productData.name,
          "description": productData.description,
          ...(productData.brand && { "brand": { "@type": "Brand", "name": productData.brand } }),
          ...(productData.image && { "image": productData.image }),
          "offers": {
            "@type": "Offer",
            "price": productData.price,
            "priceCurrency": productData.currency,
            "availability": "https://schema.org/InStock"
          },
          ...(productData.rating && {
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": productData.rating,
              "reviewCount": productData.reviewCount || "1"
            }
          })
        };
        break;
      case 'localbusiness':
        schema = {
          "@context": "https://schema.org",
          "@type": businessData.type || "LocalBusiness",
          "name": businessData.name,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": businessData.address,
            "addressLocality": businessData.city,
            "addressRegion": businessData.state,
            "postalCode": businessData.zip,
            "addressCountry": businessData.country
          },
          ...(businessData.phone && { "telephone": businessData.phone }),
          ...(businessData.url && { "url": businessData.url }),
          ...(businessData.image && { "image": businessData.image })
        };
        break;
      case 'organization':
        schema = {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": orgData.name,
          ...(orgData.url && { "url": orgData.url }),
          ...(orgData.logo && { "logo": orgData.logo }),
          ...(orgData.description && { "description": orgData.description }),
          ...(orgData.email && { "email": orgData.email }),
          ...(orgData.phone && { "telephone": orgData.phone })
        };
        break;
    }
    setOutput(JSON.stringify(schema, null, 2));
  }, [schemaType, items, articleData, productData, businessData, orgData, howtoData]);

  const copy = () => { navigator.clipboard.writeText(`<script type="application/ld+json">\n${output}\n</script>`); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const addFaqItem = () => setItems([...items, { q: '', a: '' }]);
  const removeFaqItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const updateFaqItem = (idx, field, val) => { const n = [...items]; n[idx][field] = val; setItems(n); };

  const addStep = () => setHowtoData({ ...howtoData, steps: [...howtoData.steps, { name: '', text: '' }] });
  const removeStep = (idx) => setHowtoData({ ...howtoData, steps: howtoData.steps.filter((_, i) => i !== idx) });
  const updateStep = (idx, field, val) => { const s = [...howtoData.steps]; s[idx][field] = val; setHowtoData({ ...howtoData, steps: s }); };

  const inputClass = "w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all";

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3">Schema Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SCHEMA_TYPES.map(t => (
            <button key={t.id} onClick={() => { setSchemaType(t.id); setOutput(''); }}
              className={`p-3 rounded-xl border-2 text-center transition-all ${schemaType === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <span className="text-xl">{t.icon}</span>
              <p className={`text-xs font-bold mt-1 ${schemaType === t.id ? 'text-blue-700' : 'text-gray-800'}`}>{t.label}</p>
              <p className="text-[10px] text-gray-500">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {schemaType === 'faq' && (
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3 relative">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">Question {i + 1}</span>
                {items.length > 1 && <button onClick={() => removeFaqItem(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>}
              </div>
              <input type="text" placeholder="Question..." value={item.q} onChange={e => updateFaqItem(i, 'q', e.target.value)} className={inputClass} />
              <textarea placeholder="Answer..." value={item.a} onChange={e => updateFaqItem(i, 'a', e.target.value)} className={`${inputClass} min-h-[80px] resize-y`} />
            </div>
          ))}
          <button onClick={addFaqItem} className="text-sm font-bold text-blue-600 hover:text-blue-800">+ Add Question</button>
        </div>
      )}

      {schemaType === 'howto' && (
        <div className="space-y-4">
          <input type="text" placeholder="How-To Title" value={howtoData.name} onChange={e => setHowtoData({...howtoData, name: e.target.value})} className={inputClass} />
          <textarea placeholder="Description" value={howtoData.description} onChange={e => setHowtoData({...howtoData, description: e.target.value})} className={`${inputClass} min-h-[60px]`} />
          <input type="text" placeholder="Total time in minutes (optional)" value={howtoData.totalTime} onChange={e => setHowtoData({...howtoData, totalTime: e.target.value})} className={inputClass} />
          {howtoData.steps.map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between"><span className="text-xs font-bold text-gray-500">Step {i+1}</span>{howtoData.steps.length > 1 && <button onClick={() => removeStep(i)} className="text-xs text-red-500">Remove</button>}</div>
              <input type="text" placeholder="Step title" value={s.name} onChange={e => updateStep(i, 'name', e.target.value)} className={inputClass} />
              <textarea placeholder="Step instructions" value={s.text} onChange={e => updateStep(i, 'text', e.target.value)} className={`${inputClass} min-h-[60px]`} />
            </div>
          ))}
          <button onClick={addStep} className="text-sm font-bold text-blue-600 hover:text-blue-800">+ Add Step</button>
        </div>
      )}

      {schemaType === 'article' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="text" placeholder="Article Title *" value={articleData.title} onChange={e => setArticleData({...articleData, title: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Author Name *" value={articleData.author} onChange={e => setArticleData({...articleData, author: e.target.value})} className={inputClass} />
          <input type="date" placeholder="Date Published" value={articleData.date} onChange={e => setArticleData({...articleData, date: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Image URL" value={articleData.image} onChange={e => setArticleData({...articleData, image: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Article URL" value={articleData.url} onChange={e => setArticleData({...articleData, url: e.target.value})} className={`${inputClass} sm:col-span-2`} />
          <textarea placeholder="Description *" value={articleData.description} onChange={e => setArticleData({...articleData, description: e.target.value})} className={`${inputClass} min-h-[80px] sm:col-span-2`} />
        </div>
      )}

      {schemaType === 'product' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="text" placeholder="Product Name *" value={productData.name} onChange={e => setProductData({...productData, name: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Brand" value={productData.brand} onChange={e => setProductData({...productData, brand: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Price *" value={productData.price} onChange={e => setProductData({...productData, price: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Currency (USD)" value={productData.currency} onChange={e => setProductData({...productData, currency: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Rating (1-5)" value={productData.rating} onChange={e => setProductData({...productData, rating: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Review Count" value={productData.reviewCount} onChange={e => setProductData({...productData, reviewCount: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Image URL" value={productData.image} onChange={e => setProductData({...productData, image: e.target.value})} className={`${inputClass} sm:col-span-2`} />
          <textarea placeholder="Description *" value={productData.description} onChange={e => setProductData({...productData, description: e.target.value})} className={`${inputClass} min-h-[80px] sm:col-span-2`} />
        </div>
      )}

      {schemaType === 'localbusiness' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="text" placeholder="Business Name *" value={businessData.name} onChange={e => setBusinessData({...businessData, name: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Business Type (Restaurant, Dentist, etc.)" value={businessData.type} onChange={e => setBusinessData({...businessData, type: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Street Address" value={businessData.address} onChange={e => setBusinessData({...businessData, address: e.target.value})} className={`${inputClass} sm:col-span-2`} />
          <input type="text" placeholder="City" value={businessData.city} onChange={e => setBusinessData({...businessData, city: e.target.value})} className={inputClass} />
          <input type="text" placeholder="State/Region" value={businessData.state} onChange={e => setBusinessData({...businessData, state: e.target.value})} className={inputClass} />
          <input type="text" placeholder="ZIP/Postal Code" value={businessData.zip} onChange={e => setBusinessData({...businessData, zip: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Country" value={businessData.country} onChange={e => setBusinessData({...businessData, country: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Phone Number" value={businessData.phone} onChange={e => setBusinessData({...businessData, phone: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Website URL" value={businessData.url} onChange={e => setBusinessData({...businessData, url: e.target.value})} className={inputClass} />
        </div>
      )}

      {schemaType === 'organization' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="text" placeholder="Organization Name *" value={orgData.name} onChange={e => setOrgData({...orgData, name: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Website URL" value={orgData.url} onChange={e => setOrgData({...orgData, url: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Logo URL" value={orgData.logo} onChange={e => setOrgData({...orgData, logo: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Email" value={orgData.email} onChange={e => setOrgData({...orgData, email: e.target.value})} className={inputClass} />
          <input type="text" placeholder="Phone" value={orgData.phone} onChange={e => setOrgData({...orgData, phone: e.target.value})} className={inputClass} />
          <textarea placeholder="Description" value={orgData.description} onChange={e => setOrgData({...orgData, description: e.target.value})} className={`${inputClass} min-h-[80px] sm:col-span-2`} />
        </div>
      )}

      <div className="flex justify-center">
        <button onClick={generateSchema} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl text-lg transition-all shadow-sm hover:shadow-lg">
          Generate Schema Markup
        </button>
      </div>

      {output && (
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-gray-700">Generated JSON-LD Schema</label>
            <button onClick={copy} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all">
              {copied ? '✓ Copied with script tags!' : 'Copy Code'}
            </button>
          </div>
          <pre className="bg-gray-950 text-green-400 p-5 rounded-xl overflow-x-auto text-sm leading-relaxed" style={{fontFamily: "'Space Mono', monospace"}}>{output}</pre>
          <p className="text-xs text-gray-500 mt-2">Paste this inside a {'<script type="application/ld+json">'} tag in your page's {'<head>'} section.</p>
        </div>
      )}
    </div>
  );
}