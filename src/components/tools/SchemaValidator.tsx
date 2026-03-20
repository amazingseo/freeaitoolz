import { useState, useCallback, useRef } from 'react';

const T = {
  blue:'#2563eb',blueLight:'#eff6ff',blueMid:'#dbeafe',
  violet:'#7c3aed',violetLight:'#f5f3ff',
  emerald:'#10b981',emeraldLight:'#ecfdf5',emeraldMid:'#a7f3d0',
  gray950:'#030712',gray800:'#1f2937',gray700:'#374151',gray600:'#4b5563',
  gray500:'#6b7280',gray400:'#9ca3af',gray200:'#e5e7eb',gray100:'#f3f4f6',gray50:'#f9fafb',white:'#ffffff',
  red:'#dc2626',redLight:'#fef2f2',redMid:'#fee2e2',
  amber:'#d97706',amberLight:'#fffbeb',amberMid:'#fef9c3',
  green:'#16a34a',greenLight:'#f0fdf4',greenMid:'#dcfce7',
};

type SchemaBlock = {
  index: number; raw: string; parsed: any; lineStart: number;
  errors: { field: string; message: string; severity: 'error'|'warning' }[];
  warnings: { field: string; message: string; severity: 'error'|'warning' }[];
  fixed: string | null; valid: boolean;
};

type ApiResult = {
  url: string; domain: string; fetchError: string;
  blocks: SchemaBlock[]; totalBlocks: number; totalErrors: number; totalWarnings: number;
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{ padding:'4px 12px',borderRadius:'8px',border:`1px solid ${copied?T.emerald:T.gray200}`,background:copied?T.greenLight:T.white,color:copied?T.green:T.gray600,fontSize:'0.73rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'0.3rem',transition:'all 0.2s' }}>
      {copied?'✓ Copied!':'📋 Copy'}
    </button>
  );
}

function BlockCard({ block, idx }: { block: SchemaBlock; idx: number }) {
  const [tab, setTab] = useState<'issues'|'original'|'fixed'>('issues');
  const type = block.parsed?.['@type'] ? (Array.isArray(block.parsed['@type']) ? block.parsed['@type'][0] : block.parsed['@type']) : 'Unknown';
  const totalIssues = block.errors.length + block.warnings.length;
  const color = block.valid ? T.green : block.errors.length > 0 ? T.red : T.amber;
  const bg = block.valid ? T.greenLight : block.errors.length > 0 ? T.redLight : T.amberLight;
  const bord = block.valid ? T.greenMid : block.errors.length > 0 ? T.redMid : T.amberMid;

  return (
    <div style={{ border:`1px solid ${bord}`,borderRadius:'14px',overflow:'hidden',marginBottom:'1rem',boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ padding:'0.875rem 1.25rem',background:bg,display:'flex',alignItems:'center',gap:'0.75rem',borderBottom:`1px solid ${bord}` }}>
        <div style={{ width:'32px',height:'32px',borderRadius:'8px',background:`${color}20`,border:`1px solid ${color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:800,color,flexShrink:0 }}>{idx+1}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap' }}>
            <span style={{ fontSize:'0.85rem',fontWeight:700,color:T.gray800 }}>@type: {type}</span>
            <span style={{ fontSize:'0.65rem',padding:'2px 8px',borderRadius:'20px',background:`${color}18`,color,fontWeight:700 }}>
              {block.valid ? '✓ Valid' : `${block.errors.length} error${block.errors.length!==1?'s':''}${block.warnings.length>0?`, ${block.warnings.length} warning${block.warnings.length!==1?'s':''}`:''}`}
            </span>
          </div>
          <div style={{ fontSize:'0.68rem',color:T.gray500,marginTop:'0.15rem' }}>Found at line {block.lineStart}</div>
        </div>
        {block.fixed && <span style={{ fontSize:'0.7rem',padding:'2px 8px',borderRadius:'20px',background:T.greenMid,color:T.green,fontWeight:700,flexShrink:0 }}>✓ Auto-fixed</span>}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',borderBottom:`1px solid ${T.gray200}`,background:T.white }}>
        {([['issues',`Issues (${totalIssues})`],['original','Original'],block.fixed?['fixed','Fixed Schema']:null] as any[]).filter(Boolean).map(([id,label]: [string,string]) => (
          <button key={id} onClick={()=>setTab(id as any)} style={{ padding:'0.6rem 1rem',border:'none',background:'none',cursor:'pointer',fontSize:'0.75rem',fontWeight:600,color:tab===id?T.blue:T.gray500,borderBottom:`2px solid ${tab===id?T.blue:'transparent'}`,marginBottom:'-1px',whiteSpace:'nowrap' }}>{label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding:'1rem 1.25rem' }}>
        {tab === 'issues' && (
          <div>
            {totalIssues === 0 && <div style={{ textAlign:'center',padding:'1.5rem',color:T.green,fontWeight:700,fontSize:'0.85rem' }}>✓ No issues found — this schema is valid</div>}
            {block.errors.map((e,i) => (
              <div key={i} style={{ display:'flex',gap:'0.75rem',padding:'0.625rem 0.875rem',background:T.redLight,border:`1px solid ${T.redMid}`,borderRadius:'8px',marginBottom:'0.4rem' }}>
                <span style={{ fontSize:'0.7rem',fontWeight:800,color:T.red,flexShrink:0,marginTop:'1px' }}>✗ ERROR</span>
                <div>
                  <code style={{ fontSize:'0.72rem',color:T.red,fontFamily:'monospace' }}>{e.field}</code>
                  <div style={{ fontSize:'0.75rem',color:T.gray700,marginTop:'0.15rem',lineHeight:1.4 }}>{e.message}</div>
                </div>
              </div>
            ))}
            {block.warnings.map((w,i) => (
              <div key={i} style={{ display:'flex',gap:'0.75rem',padding:'0.625rem 0.875rem',background:T.amberLight,border:`1px solid ${T.amberMid}`,borderRadius:'8px',marginBottom:'0.4rem' }}>
                <span style={{ fontSize:'0.7rem',fontWeight:800,color:T.amber,flexShrink:0,marginTop:'1px' }}>⚠ WARN</span>
                <div>
                  <code style={{ fontSize:'0.72rem',color:T.amber,fontFamily:'monospace' }}>{w.field}</code>
                  <div style={{ fontSize:'0.75rem',color:T.gray700,marginTop:'0.15rem',lineHeight:1.4 }}>{w.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'original' && (
          <div style={{ position:'relative' }}>
            <div style={{ position:'absolute',top:'0.5rem',right:'0.5rem' }}><CopyBtn text={`<script type="application/ld+json">\n${block.raw}\n</script>`} /></div>
            <pre style={{ margin:0,padding:'1rem',background:'#0d1117',color:'#e6edf3',fontSize:'0.72rem',lineHeight:1.7,overflowX:'auto',borderRadius:'8px',fontFamily:'monospace',maxHeight:'320px',overflowY:'auto' }}>{block.raw}</pre>
          </div>
        )}
        {tab === 'fixed' && block.fixed && (
          <div style={{ position:'relative' }}>
            <div style={{ position:'absolute',top:'0.5rem',right:'0.5rem' }}><CopyBtn text={block.fixed} /></div>
            <div style={{ marginBottom:'0.75rem',padding:'0.5rem 0.75rem',background:T.greenLight,border:`1px solid ${T.greenMid}`,borderRadius:'6px',fontSize:'0.72rem',color:T.green,fontWeight:600 }}>
              ✓ All errors fixed by Claude AI — copy and replace your existing schema
            </div>
            <pre style={{ margin:0,padding:'1rem',background:'#0d1117',color:'#e6edf3',fontSize:'0.72rem',lineHeight:1.7,overflowX:'auto',borderRadius:'8px',fontFamily:'monospace',maxHeight:'320px',overflowY:'auto' }}>{block.fixed}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SchemaValidator() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ApiResult|null>(null);
  const [error, setError] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const LIMIT=5, LS_KEY='schema_val_usage';
  const todayStr=()=>new Date().toISOString().slice(0,10);
  const getUsage=()=>{try{const r=localStorage.getItem(LS_KEY);return r?JSON.parse(r):{date:'',count:0};}catch{return{date:'',count:0};}};
  const getRemaining=()=>{const u=getUsage();return u.date!==todayStr()?LIMIT:Math.max(0,LIMIT-u.count);};
  const [remaining,setRemaining]=useState<number>(()=>{try{return getRemaining();}catch{return LIMIT;}});
  const incUsage=()=>{const t=todayStr(),u=getUsage(),n=u.date===t?u.count+1:1;try{localStorage.setItem(LS_KEY,JSON.stringify({date:t,count:n}));}catch{}setRemaining(Math.max(0,LIMIT-n));};

  const run = useCallback(async () => {
    if (getRemaining()<=0){setError('LIMIT_REACHED');return;}
    if (!url.trim()){setError('Please enter a URL');return;}
    let target = url.trim();
    if (!target.startsWith('http')) target = 'https://'+target;
    try{new URL(target);}catch{setError('Please enter a valid URL');return;}

    setError('');setResult(null);setLoading(true);setProgress(0);

    const steps=[
      {msg:'Fetching your live page...',pct:20},
      {msg:'Extracting all JSON-LD blocks...',pct:40},
      {msg:'Validating against schema.org rules...',pct:65},
      {msg:'Auto-fixing errors with Claude AI...',pct:88},
    ];
    let si=0;
    const timer=setInterval(()=>{if(si<steps.length){setLoadingStep(steps[si].msg);setProgress(steps[si].pct);si++;}},1800);

    try {
      const res = await fetch(`/api/schema-validator?url=${encodeURIComponent(target)}`);
      const json: ApiResult = await res.json();
      clearInterval(timer);
      if((json as any).error){setError((json as any).message||'Failed');setLoading(false);return;}
      incUsage();setProgress(100);setLoadingStep('Validation complete!');
      setTimeout(()=>{setResult(json);setLoading(false);setTimeout(()=>resultsRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100);},400);
    } catch {
      clearInterval(timer);setError('Request failed. Please try again.');setLoading(false);
    }
  },[url]);

  return (
    <div style={{ fontFamily:'Inter,system-ui,sans-serif',color:T.gray800,background:T.white,borderRadius:'16px',border:`1px solid ${T.gray200}`,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${T.gray950} 0%,#1e1b4b 100%)`,padding:'1.75rem' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1.1rem' }}>
          <div style={{ width:'7px',height:'7px',borderRadius:'50%',background:T.emerald,boxShadow:`0 0 6px ${T.emerald}` }} />
          <span style={{ fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.1em' }}>Schema Validator &middot; Live URL Analysis &middot; AI Auto-Fix</span>
        </div>
        <div style={{ display:'flex',gap:'0.75rem',alignItems:'center' }}>
          <div style={{ flex:1,position:'relative' }}>
            <span style={{ position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#64748b' }}>🌐</span>
            <input type="url" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&run()}
              placeholder="https://yourwebsite.com" disabled={loading}
              style={{ width:'100%',boxSizing:'border-box',padding:'0.8rem 1rem 0.8rem 2.5rem',background:'rgba(255,255,255,0.07)',border:'1.5px solid rgba(255,255,255,0.12)',borderRadius:'10px',color:'#f1f5f9',fontSize:'0.9rem',outline:'none',fontFamily:'monospace',transition:'border-color 0.15s' }}
              onFocus={e=>(e.target.style.borderColor=`${T.blue}80`)} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')} />
          </div>
          <button onClick={run} disabled={loading||remaining===0}
            style={{ padding:'0.8rem 1.5rem',borderRadius:'10px',border:'none',background:loading?'#1e40af':remaining===0?'rgba(255,255,255,0.08)':`linear-gradient(135deg,${T.blue} 0%,${T.violet} 100%)`,color:remaining===0?'#475569':T.white,fontSize:'0.88rem',fontWeight:700,cursor:(loading||remaining===0)?'not-allowed':'pointer',whiteSpace:'nowrap',boxShadow:(loading||remaining===0)?'none':'0 4px 15px rgba(37,99,235,0.4)',display:'flex',alignItems:'center',gap:'0.4rem',transition:'all 0.2s' }}>
            {loading?<><span style={{ display:'inline-block',width:'14px',height:'14px',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />Validating...</>:remaining===0?'🔒 Limit Reached':'🔍 Validate Schema'}
          </button>
          {result&&<button onClick={()=>{setResult(null);setUrl('');}} style={{ padding:'0.8rem 0.875rem',borderRadius:'10px',border:'1.5px solid rgba(255,255,255,0.12)',background:'transparent',color:'#64748b',fontSize:'0.8rem',cursor:'pointer' }}>✕</button>}
        </div>

        {loading&&(
          <div style={{ marginTop:'1.25rem' }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'0.5rem' }}>
              <span style={{ fontSize:'0.75rem',color:'#94a3b8' }}>{loadingStep}</span>
              <span style={{ fontSize:'0.72rem',color:'#93c5fd',fontWeight:700 }}>{progress}%</span>
            </div>
            <div style={{ height:'4px',background:'rgba(255,255,255,0.08)',borderRadius:'2px',overflow:'hidden' }}>
              <div style={{ height:'100%',width:`${progress}%`,background:`linear-gradient(90deg,${T.blue},${T.violet})`,borderRadius:'2px',transition:'width 0.7s ease' }} />
            </div>
          </div>
        )}

        {!loading&&(
          <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',marginTop:'1rem' }}>
            <div style={{ display:'flex',gap:'0.3rem' }}>
              {Array.from({length:LIMIT}).map((_,i)=>(
                <div key={i} style={{ width:'20px',height:'4px',borderRadius:'2px',background:i<remaining?T.emerald:'rgba(255,255,255,0.12)',transition:'background 0.3s' }} />
              ))}
            </div>
            <span style={{ fontSize:'0.68rem',color:remaining>0?'#94a3b8':'#f87171',fontWeight:600 }}>
              {remaining>0?`${remaining} of ${LIMIT} free validations today`:'Daily limit reached — resets at midnight'}
            </span>
          </div>
        )}

        {error&&error!=='LIMIT_REACHED'&&<div style={{ marginTop:'1rem',padding:'0.875rem 1rem',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:'10px',color:'#f87171',fontSize:'0.8rem' }}>⚠️ {error}</div>}
        {error==='LIMIT_REACHED'&&<div style={{ marginTop:'1rem',padding:'1rem 1.25rem',background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'12px' }}><div style={{ fontSize:'0.85rem',fontWeight:700,color:'#c4b5fd',marginBottom:'0.3rem' }}>🔒 Daily Limit Reached</div><p style={{ fontSize:'0.75rem',color:'#94a3b8',margin:0 }}>All {LIMIT} free validations used. Resets at midnight.</p></div>}
      </div>

      {/* Empty state */}
      {!result&&!loading&&(
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderBottom:`1px solid ${T.gray100}` }}>
          {[{icon:'🌐',title:'Fetches Live URL',sub:'Reads your actual page HTML',color:T.blue},{icon:'🧩',title:'Finds All Schemas',sub:'Every JSON-LD block extracted',color:T.violet},{icon:'✗',title:'Validates Each One',sub:'Checks required fields & structure',color:T.red},{icon:'✓',title:'Auto-Fixes Errors',sub:'Claude rewrites broken schemas',color:T.green}].map(f=>(
            <div key={f.title} style={{ padding:'1.5rem 1rem',textAlign:'center',borderRight:`1px solid ${T.gray100}` }}>
              <div style={{ width:'44px',height:'44px',borderRadius:'12px',background:`${f.color}12`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',margin:'0 auto 0.75rem' }}>{f.icon}</div>
              <div style={{ fontSize:'0.78rem',fontWeight:700,color:T.gray800 }}>{f.title}</div>
              <div style={{ fontSize:'0.68rem',color:T.gray500,marginTop:'0.2rem' }}>{f.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {result&&!loading&&(
        <div ref={resultsRef}>
          {/* Summary bar */}
          <div style={{ padding:'0.875rem 1.5rem',background:T.gray50,borderBottom:`1px solid ${T.gray100}`,display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap' }}>
            <div style={{ flex:1,minWidth:0 }}>
              <code style={{ fontSize:'0.73rem',color:T.gray600,fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',maxWidth:'400px' }}>{result.url}</code>
            </div>
            <div style={{ display:'flex',gap:'0.4rem',flexWrap:'wrap' }}>
              <span style={{ fontSize:'0.7rem',padding:'3px 9px',borderRadius:'20px',background:T.blueMid,color:T.blue,fontWeight:700 }}>{result.totalBlocks} schema{result.totalBlocks!==1?'s':''} found</span>
              {result.totalErrors>0&&<span style={{ fontSize:'0.7rem',padding:'3px 9px',borderRadius:'20px',background:T.redMid,color:T.red,fontWeight:700 }}>{result.totalErrors} error{result.totalErrors!==1?'s':''}</span>}
              {result.totalWarnings>0&&<span style={{ fontSize:'0.7rem',padding:'3px 9px',borderRadius:'20px',background:T.amberMid,color:T.amber,fontWeight:700 }}>{result.totalWarnings} warning{result.totalWarnings!==1?'s':''}</span>}
              {result.totalErrors===0&&result.totalBlocks>0&&<span style={{ fontSize:'0.7rem',padding:'3px 9px',borderRadius:'20px',background:T.greenMid,color:T.green,fontWeight:700 }}>✓ All valid</span>}
              <button onClick={run} style={{ fontSize:'0.72rem',padding:'4px 12px',border:`1px solid ${T.gray200}`,borderRadius:'20px',background:T.white,color:T.gray600,cursor:'pointer',fontWeight:600 }}>🔄 Re-run</button>
            </div>
          </div>

          <div style={{ padding:'1.5rem' }}>
            {result.fetchError&&(
              <div style={{ padding:'0.875rem 1rem',background:T.amberLight,border:`1px solid ${T.amberMid}`,borderRadius:'10px',marginBottom:'1.25rem',fontSize:'0.78rem',color:T.gray700 }}>
                <b style={{ color:T.amber }}>⚠ Partial fetch:</b> {result.fetchError}. Results may be incomplete.
              </div>
            )}

            {result.totalBlocks===0&&(
              <div style={{ textAlign:'center',padding:'3rem',background:T.redLight,border:`1px solid ${T.redMid}`,borderRadius:'14px' }}>
                <div style={{ fontSize:'2rem',marginBottom:'0.75rem' }}>🧩</div>
                <div style={{ fontSize:'0.95rem',fontWeight:700,color:T.red,marginBottom:'0.5rem' }}>No Schema Markup Found</div>
                <div style={{ fontSize:'0.78rem',color:T.gray600,maxWidth:'400px',margin:'0 auto',lineHeight:1.6 }}>This page has zero JSON-LD schema blocks. This is a critical AEO gap — AI engines have no structured data to extract or cite from this page.</div>
                <div style={{ marginTop:'1rem',display:'flex',gap:'0.5rem',justifyContent:'center',flexWrap:'wrap' }}>
                  <a href="/tools/local-faq-schema" style={{ fontSize:'0.75rem',padding:'6px 14px',borderRadius:'20px',background:T.blue,color:T.white,textDecoration:'none',fontWeight:700 }}>→ Generate FAQ Schema</a>
                  <a href="/tools/schema-markup-generator" style={{ fontSize:'0.75rem',padding:'6px 14px',borderRadius:'20px',background:T.white,border:`1px solid ${T.gray200}`,color:T.gray700,textDecoration:'none',fontWeight:600 }}>→ Schema Generator</a>
                </div>
              </div>
            )}

            {result.blocks.map((block,i)=><BlockCard key={i} block={block} idx={i} />)}

            {result.totalErrors>0&&(
              <div style={{ padding:'1rem 1.25rem',background:T.blueLight,border:`1px solid ${T.blueMid}`,borderRadius:'12px',marginTop:'1rem',fontSize:'0.78rem',color:T.gray700,lineHeight:1.6 }}>
                <b style={{ color:T.blue }}>💡 Next steps:</b> Copy the fixed schema from each block above and replace your existing schema. Then re-run this validator to confirm all errors are resolved. After fixing, run the <a href="/tools/aeo-geo-audit" style={{ color:T.blue }}>AEO &amp; GEO Audit Tool</a> to verify the new schema is detected correctly.
              </div>
            )}
          </div>

          <div style={{ padding:'0.875rem 1.5rem',borderTop:`1px solid ${T.gray100}`,background:T.gray50,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.5rem' }}>
            <span style={{ fontSize:'0.65rem',color:T.gray400 }}>Live HTML fetch &middot; schema.org validation &middot; Claude AI auto-fix</span>
            <button onClick={()=>{setResult(null);setUrl('');}} style={{ fontSize:'0.72rem',padding:'5px 14px',border:`1px solid ${T.blue}`,borderRadius:'20px',background:T.blueLight,color:T.blue,cursor:'pointer',fontWeight:700 }}>← Validate Another URL</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
