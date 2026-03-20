import { useState, useRef } from 'react';

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

const BUSINESS_TYPES = [
  'HVAC & Heating','Plumbing','Electrical','Roofing','Landscaping & Lawn Care',
  'General Contractor','Home Cleaning','Pest Control','Painting','Flooring',
  'Real Estate Agency','Property Management','Mortgage Broker','Home Inspection',
  'Restaurant','Dental Office','Medical Clinic','Chiropractor','Physical Therapy',
  'Veterinary Clinic','Auto Repair','Auto Dealership','Law Firm','Accounting & Tax',
  'Insurance Agency','Gym & Fitness','Beauty Salon','Spa & Massage',
  'Daycare & Childcare','IT Support & Tech','Marketing Agency','Moving Company','Other',
];

const CATEGORY_CONFIG: Record<string,{color:string,bg:string,icon:string}> = {
  INFORMATIONAL:{color:T.blue,bg:T.blueLight,icon:'📖'},
  LOCAL:{color:T.green,bg:T.greenLight,icon:'📍'},
  EMERGENCY:{color:T.red,bg:T.redLight,icon:'🚨'},
  COMPARISON:{color:T.violet,bg:T.violetLight,icon:'⚖️'},
  TRUST:{color:T.amber,bg:T.amberLight,icon:'🏆'},
};

const POTENTIAL_CONFIG: Record<string,{color:string,bg:string}> = {
  High:{color:T.green,bg:T.greenMid},
  Medium:{color:T.amber,bg:T.amberMid},
  Low:{color:T.gray500,bg:T.gray100},
};

const COVERAGE_CONFIG: Record<string,{color:string,bg:string}> = {
  Covered:{color:T.green,bg:T.greenMid},
  Partial:{color:T.amber,bg:T.amberMid},
  Missing:{color:T.red,bg:T.redMid},
};

type Intent = {
  query:string; category:string; contentFormat:string; schemaType:string;
  citationPotential:string; citationReason:string; coverage?:string; priority:number;
};

type ApiResult = {
  businessType:string; location:string; website:string|null;
  intents:Intent[]; topOpportunities:string[];
  estimatedTimeToVisibility:string; hasSiteAnalysis:boolean;
};

function CopyBtn({text}:{text:string}) {
  const [c,setC]=useState(false);
  const copy=async()=>{try{await navigator.clipboard.writeText(text);}catch{const el=document.createElement('textarea');el.value=text;document.body.appendChild(el);el.select();document.execCommand('copy');document.body.removeChild(el);}setC(true);setTimeout(()=>setC(false),2000);};
  return <button onClick={copy} style={{padding:'4px 12px',borderRadius:'8px',border:`1px solid ${c?T.emerald:T.gray200}`,background:c?T.greenLight:T.white,color:c?T.green:T.gray600,fontSize:'0.73rem',fontWeight:700,cursor:'pointer',transition:'all 0.2s'}}>{c?'✓ Copied':'📋 Copy'}</button>;
}

export default function AiIntentMap() {
  const [businessType,setBusinessType]=useState('');
  const [location,setLocation]=useState('');
  const [website,setWebsite]=useState('');
  const [loading,setLoading]=useState(false);
  const [loadingStep,setLoadingStep]=useState('');
  const [progress,setProgress]=useState(0);
  const [result,setResult]=useState<ApiResult|null>(null);
  const [error,setError]=useState('');
  const [activeTab,setActiveTab]=useState<'map'|'plan'|'schema'>('map');
  const [filterCat,setFilterCat]=useState('ALL');
  const resultsRef=useRef<HTMLDivElement>(null);

  const LIMIT=5,LS_KEY='intent_map_usage';
  const todayStr=()=>new Date().toISOString().slice(0,10);
  const getUsage=()=>{try{const r=localStorage.getItem(LS_KEY);return r?JSON.parse(r):{date:'',count:0};}catch{return{date:'',count:0};}};
  const getRemaining=()=>{const u=getUsage();return u.date!==todayStr()?LIMIT:Math.max(0,LIMIT-u.count);};
  const [remaining,setRemaining]=useState<number>(()=>{try{return getRemaining();}catch{return LIMIT;}});
  const incUsage=()=>{const t=todayStr(),u=getUsage(),n=u.date===t?u.count+1:1;try{localStorage.setItem(LS_KEY,JSON.stringify({date:t,count:n}));}catch{}setRemaining(Math.max(0,LIMIT-n));};

  const generate=async()=>{
    if(getRemaining()<=0){setError('LIMIT_REACHED');return;}
    if(!businessType){setError('Please select a business type.');return;}
    if(!location.trim()){setError('Please enter your city and state.');return;}
    setError('');setResult(null);setLoading(true);setProgress(0);

    const steps=[
      {msg:'Researching AI search patterns for your business type...',pct:15},
      {msg:website?'Analyzing your website content...':'Mapping customer intent categories...',pct:35},
      {msg:'Generating 18 intent queries...',pct:60},
      {msg:'Scoring AI citation potential for each...',pct:82},
      {msg:'Building your content action plan...',pct:95},
    ];
    let si=0;
    const timer=setInterval(()=>{if(si<steps.length){setLoadingStep(steps[si].msg);setProgress(steps[si].pct);si++;}},2000);

    try {
      const res=await fetch('/api/ai-intent-map',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessType,location:location.trim(),website:website.trim()||undefined})});
      const json=await res.json();
      clearInterval(timer);
      if(json.error){setError(json.message||'Generation failed.');setLoading(false);return;}
      incUsage();setProgress(100);setLoadingStep('Intent map ready!');
      setTimeout(()=>{setResult(json);setLoading(false);setActiveTab('map');setTimeout(()=>resultsRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100);},400);
    } catch {
      clearInterval(timer);setError('Request failed. Please try again.');setLoading(false);
    }
  };

  const inputStyle={width:'100%',boxSizing:'border-box' as const,padding:'0.8rem 1rem 0.8rem 2.5rem',background:'rgba(255,255,255,0.07)',border:'1.5px solid rgba(255,255,255,0.12)',borderRadius:'10px',color:'#f1f5f9',fontSize:'0.9rem',outline:'none',fontFamily:'inherit',transition:'border-color 0.15s'};
  const labelStyle={display:'block' as const,fontSize:'0.72rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase' as const,letterSpacing:'0.08em',marginBottom:'0.5rem'};

  const filteredIntents=result?.intents.filter(i=>filterCat==='ALL'||i.category===filterCat)||[];
  const categories=['ALL','INFORMATIONAL','LOCAL','EMERGENCY','COMPARISON','TRUST'];

  const csvContent=result?['Query,Category,Content Format,Schema Type,Citation Potential'+(result.hasSiteAnalysis?',Coverage':''),...(result.intents.map(i=>`"${i.query}",${i.category},${i.contentFormat},${i.schemaType},${i.citationPotential}${result.hasSiteAnalysis?','+i.coverage:''}`))].join('\n'):'';

  return (
    <div style={{fontFamily:'Inter,system-ui,sans-serif',color:T.gray800,background:T.white,borderRadius:'16px',border:`1px solid ${T.gray200}`,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${T.gray950} 0%,#1e1b4b 100%)`,padding:'1.75rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1.25rem'}}>
          <div style={{width:'7px',height:'7px',borderRadius:'50%',background:T.emerald,boxShadow:`0 0 6px ${T.emerald}`}} />
          <span style={{fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.1em'}}>AI Search Intent Map &middot; Local Business AEO &middot; Claude Sonnet</span>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'0.875rem'}}>
          <div>
            <label style={labelStyle}>Business Type</label>
            <div style={{position:'relative'}}>
              <select value={businessType} onChange={e=>setBusinessType(e.target.value)} disabled={loading}
                style={{...inputStyle,paddingLeft:'1rem',cursor:'pointer',appearance:'none',color:businessType?'#f1f5f9':'#64748b'}}
                onFocus={e=>(e.target.style.borderColor=`${T.blue}80`)} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')}>
                <option value="" disabled>Select business type...</option>
                {BUSINESS_TYPES.map(b=><option key={b} value={b} style={{background:'#1e1b4b',color:'#f1f5f9'}}>{b}</option>)}
              </select>
              <div style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'#64748b'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></div>
            </div>
          </div>
          <div>
            <label style={labelStyle}>City &amp; State</label>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#64748b'}}>📍</span>
              <input type="text" value={location} onChange={e=>setLocation(e.target.value)} onKeyDown={e=>e.key==='Enter'&&generate()}
                placeholder="e.g. Austin, TX" disabled={loading} style={inputStyle}
                onFocus={e=>(e.target.style.borderColor=`${T.blue}80`)} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')} />
            </div>
          </div>
        </div>

        <div style={{display:'flex',gap:'0.75rem',alignItems:'flex-end'}}>
          <div style={{flex:1}}>
            <label style={labelStyle}>Website <span style={{color:'#475569',fontWeight:400,textTransform:'none'}}>(optional — enables gap analysis)</span></label>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#64748b'}}>🌐</span>
              <input type="text" value={website} onChange={e=>setWebsite(e.target.value)} onKeyDown={e=>e.key==='Enter'&&generate()}
                placeholder="e.g. mikesplumbing.com" disabled={loading} style={{...inputStyle,fontFamily:'monospace'}}
                onFocus={e=>(e.target.style.borderColor=`${T.blue}80`)} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')} />
            </div>
          </div>
          <button onClick={generate} disabled={loading||remaining===0}
            style={{padding:'0.8rem 1.5rem',borderRadius:'10px',border:'none',background:loading?'#1e40af':remaining===0?'rgba(255,255,255,0.08)':`linear-gradient(135deg,${T.blue} 0%,${T.violet} 100%)`,color:remaining===0?'#475569':T.white,fontSize:'0.88rem',fontWeight:700,cursor:(loading||remaining===0)?'not-allowed':'pointer',whiteSpace:'nowrap',boxShadow:(loading||remaining===0)?'none':'0 4px 15px rgba(37,99,235,0.4)',display:'flex',alignItems:'center',gap:'0.4rem',transition:'all 0.2s'}}>
            {loading?<><span style={{display:'inline-block',width:'14px',height:'14px',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />Mapping...</>:remaining===0?'🔒 Limit Reached':'🗺️ Build Intent Map'}
          </button>
          {result&&<button onClick={()=>{setResult(null);setBusinessType('');setLocation('');setWebsite('');setError('');}} style={{padding:'0.8rem 0.875rem',borderRadius:'10px',border:'1.5px solid rgba(255,255,255,0.12)',background:'transparent',color:'#64748b',fontSize:'0.8rem',cursor:'pointer'}}>✕</button>}
        </div>

        {loading&&(
          <div style={{marginTop:'1.25rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.5rem'}}>
              <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>{loadingStep}</span>
              <span style={{fontSize:'0.72rem',color:'#93c5fd',fontWeight:700}}>{progress}%</span>
            </div>
            <div style={{height:'4px',background:'rgba(255,255,255,0.08)',borderRadius:'2px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${progress}%`,background:`linear-gradient(90deg,${T.blue},${T.violet})`,borderRadius:'2px',transition:'width 0.7s ease'}} />
            </div>
          </div>
        )}

        {!loading&&(
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginTop:'1rem'}}>
            <div style={{display:'flex',gap:'0.3rem'}}>{Array.from({length:LIMIT}).map((_,i)=><div key={i} style={{width:'20px',height:'4px',borderRadius:'2px',background:i<remaining?T.emerald:'rgba(255,255,255,0.12)',transition:'background 0.3s'}} />)}</div>
            <span style={{fontSize:'0.68rem',color:remaining>0?'#94a3b8':'#f87171',fontWeight:600}}>{remaining>0?`${remaining} of ${LIMIT} free maps today`:'Daily limit reached — resets at midnight'}</span>
          </div>
        )}

        {error&&error!=='LIMIT_REACHED'&&<div style={{marginTop:'1rem',padding:'0.875rem 1rem',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:'10px',color:'#f87171',fontSize:'0.8rem'}}>⚠️ {error}</div>}
        {error==='LIMIT_REACHED'&&<div style={{marginTop:'1rem',padding:'1rem 1.25rem',background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'12px'}}><div style={{fontSize:'0.85rem',fontWeight:700,color:'#c4b5fd',marginBottom:'0.3rem'}}>🔒 Daily Limit Reached</div><p style={{fontSize:'0.75rem',color:'#94a3b8',margin:0}}>All {LIMIT} free maps used. Resets at midnight.</p></div>}
      </div>

      {/* Empty state */}
      {!result&&!loading&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderBottom:`1px solid ${T.gray100}`}}>
          {[{icon:'🗺️',title:'18 Intent Queries',sub:'Real questions customers ask AI engines',color:T.blue},{icon:'⚖️',title:'5 Intent Categories',sub:'Info, Local, Emergency, Comparison, Trust',color:T.violet},{icon:'🧩',title:'Schema Mapping',sub:'Best schema type per intent',color:T.emerald},{icon:'📊',title:'Gap Analysis',sub:'What you cover vs what you\'re missing',color:'#d97706'}].map(f=>(
            <div key={f.title} style={{padding:'1.5rem 1rem',textAlign:'center',borderRight:`1px solid ${T.gray100}`}}>
              <div style={{width:'44px',height:'44px',borderRadius:'12px',background:`${f.color}12`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',margin:'0 auto 0.75rem'}}>{f.icon}</div>
              <div style={{fontSize:'0.78rem',fontWeight:700,color:T.gray800}}>{f.title}</div>
              <div style={{fontSize:'0.68rem',color:T.gray500,marginTop:'0.2rem'}}>{f.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {result&&!loading&&(
        <div ref={resultsRef}>
          {/* Header bar */}
          <div style={{padding:'0.875rem 1.5rem',background:T.gray50,borderBottom:`1px solid ${T.gray100}`,display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap'}}>
                <span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 8px',borderRadius:'20px',background:T.greenMid,color:T.green}}>✓ {result.intents.length} Intents Mapped</span>
                <code style={{fontSize:'0.73rem',color:T.gray600}}>{result.businessType} &bull; {result.location}</code>
              </div>
              {result.hasSiteAnalysis&&<div style={{fontSize:'0.64rem',color:T.blue,marginTop:'0.15rem'}}>✓ Gap analysis included from your website</div>}
            </div>
            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
              <CopyBtn text={csvContent} />
              <span style={{fontSize:'0.7rem',padding:'3px 9px',borderRadius:'20px',background:T.amberMid,color:T.amber,fontWeight:700}}>~{result.estimatedTimeToVisibility}</span>
            </div>
          </div>

          {/* Top opportunities */}
          {result.topOpportunities?.length>0&&(
            <div style={{margin:'1rem 1.5rem 0',padding:'1rem 1.25rem',background:T.blueLight,border:`1px solid ${T.blueMid}`,borderRadius:'12px'}}>
              <div style={{fontSize:'0.75rem',fontWeight:700,color:T.blue,marginBottom:'0.625rem',textTransform:'uppercase',letterSpacing:'0.07em'}}>⚡ Top 3 Opportunities — Do These First</div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                {result.topOpportunities.map((op,i)=>(
                  <div key={i} style={{display:'flex',gap:'0.75rem',alignItems:'flex-start'}}>
                    <div style={{width:'20px',height:'20px',borderRadius:'6px',background:T.blue,color:T.white,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:800,flexShrink:0}}>{i+1}</div>
                    <span style={{fontSize:'0.78rem',color:T.gray700,lineHeight:1.4}}>{op}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{display:'flex',borderBottom:`1px solid ${T.gray200}`,overflowX:'auto',paddingLeft:'0.5rem',background:T.white,marginTop:'1rem'}}>
            {[{id:'map' as const,label:`Intent Map (${result.intents.length})`,icon:'🗺️'},{id:'plan' as const,label:'Content Plan',icon:'📝'},{id:'schema' as const,label:'Schema Priorities',icon:'🧩'}].map(({id,label,icon})=>(
              <button key={id} onClick={()=>setActiveTab(id)} style={{padding:'0.8rem 1.1rem',border:'none',background:'none',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:'0.35rem',color:activeTab===id?T.blue:T.gray500,borderBottom:`2px solid ${activeTab===id?T.blue:'transparent'}`,marginBottom:'-1px',transition:'all 0.15s'}}>
                <span style={{fontSize:'0.75rem'}}>{icon}</span>{label}
              </button>
            ))}
          </div>

          <div style={{padding:'1.5rem'}}>

            {/* INTENT MAP TAB */}
            {activeTab==='map'&&(
              <div>
                {/* Category filter */}
                <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',marginBottom:'1.25rem'}}>
                  {categories.map(cat=>{
                    const cfg=cat==='ALL'?{color:T.gray600,bg:T.gray100}:(CATEGORY_CONFIG[cat]||{color:T.gray600,bg:T.gray100});
                    const active=filterCat===cat;
                    const count=cat==='ALL'?result.intents.length:result.intents.filter(i=>i.category===cat).length;
                    return <button key={cat} onClick={()=>setFilterCat(cat)} style={{padding:'4px 12px',borderRadius:'20px',border:`1.5px solid ${active?cfg.color:T.gray200}`,background:active?cfg.bg:T.white,color:active?cfg.color:T.gray500,fontSize:'0.72rem',fontWeight:700,cursor:'pointer',transition:'all 0.15s'}}>{cat==='ALL'?'All':cat} ({count})</button>;
                  })}
                </div>

                {/* Table */}
                <div style={{border:`1px solid ${T.gray200}`,borderRadius:'12px',overflow:'hidden'}}>
                  <div style={{display:'grid',gridTemplateColumns:result.hasSiteAnalysis?'2fr 1fr 1fr 1fr 1fr':'2fr 1fr 1fr 1fr',gap:0,background:T.gray50,borderBottom:`1px solid ${T.gray200}`,padding:'0.625rem 1rem'}}>
                    {['Search Query','Category','Format + Schema','Citation Potential',result.hasSiteAnalysis?'Coverage':null].filter(Boolean).map(h=>(
                      <div key={h as string} style={{fontSize:'0.68rem',fontWeight:700,color:T.gray500,textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</div>
                    ))}
                  </div>
                  {filteredIntents.map((intent,i)=>{
                    const catCfg=CATEGORY_CONFIG[intent.category]||{color:T.gray500,bg:T.gray50,icon:'•'};
                    const potCfg=POTENTIAL_CONFIG[intent.citationPotential]||{color:T.gray500,bg:T.gray100};
                    const covCfg=intent.coverage?(COVERAGE_CONFIG[intent.coverage]||{color:T.gray500,bg:T.gray100}):null;
                    return (
                      <div key={i} style={{display:'grid',gridTemplateColumns:result.hasSiteAnalysis?'2fr 1fr 1fr 1fr 1fr':'2fr 1fr 1fr 1fr',gap:0,padding:'0.75rem 1rem',borderBottom:i<filteredIntents.length-1?`1px solid ${T.gray100}`:'none',alignItems:'start'}}>
                        <div>
                          <div style={{fontSize:'0.8rem',fontWeight:600,color:T.gray800,lineHeight:1.4}}>"{intent.query}"</div>
                          <div style={{fontSize:'0.68rem',color:T.gray400,marginTop:'0.2rem',lineHeight:1.3}}>{intent.citationReason}</div>
                        </div>
                        <div><span style={{fontSize:'0.65rem',fontWeight:700,padding:'2px 8px',borderRadius:'20px',background:catCfg.bg,color:catCfg.color}}>{catCfg.icon} {intent.category}</span></div>
                        <div style={{display:'flex',flexDirection:'column',gap:'0.25rem'}}>
                          <span style={{fontSize:'0.65rem',fontWeight:600,color:T.gray600}}>{intent.contentFormat}</span>
                          <code style={{fontSize:'0.62rem',color:T.violet,background:T.violetLight,padding:'1px 5px',borderRadius:'4px'}}>{intent.schemaType}</code>
                        </div>
                        <div><span style={{fontSize:'0.65rem',fontWeight:700,padding:'2px 8px',borderRadius:'20px',background:potCfg.bg,color:potCfg.color}}>{intent.citationPotential}</span></div>
                        {result.hasSiteAnalysis&&covCfg&&<div><span style={{fontSize:'0.65rem',fontWeight:700,padding:'2px 8px',borderRadius:'20px',background:covCfg.bg,color:covCfg.color}}>{intent.coverage}</span></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CONTENT PLAN TAB */}
            {activeTab==='plan'&&(
              <div>
                <div style={{padding:'0.75rem 1rem',background:T.blueLight,border:`1px solid ${T.blueMid}`,borderRadius:'10px',marginBottom:'1.25rem',fontSize:'0.78rem',color:T.gray700,lineHeight:1.6}}>
                  <b style={{color:T.blue}}>💡 How to use this plan:</b> Create one content piece for each High citation potential intent. Start with LOCAL and EMERGENCY intents — they have the shortest path to AI citation and convert to customers immediately.
                </div>
                {categories.filter(c=>c!=='ALL').map(cat=>{
                  const catIntents=result.intents.filter(i=>i.category===cat&&i.citationPotential==='High');
                  if(catIntents.length===0) return null;
                  const cfg=CATEGORY_CONFIG[cat]||{color:T.gray500,bg:T.gray50,icon:'•'};
                  return (
                    <div key={cat} style={{marginBottom:'1rem',border:`1px solid ${T.gray200}`,borderRadius:'12px',overflow:'hidden'}}>
                      <div style={{padding:'0.75rem 1.25rem',background:cfg.bg,borderBottom:`1px solid ${T.gray200}`,display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <span style={{fontSize:'1rem'}}>{cfg.icon}</span>
                        <span style={{fontSize:'0.82rem',fontWeight:700,color:cfg.color}}>{cat} — High Priority</span>
                        <span style={{fontSize:'0.65rem',padding:'2px 7px',borderRadius:'20px',background:`${cfg.color}18`,color:cfg.color,fontWeight:700,marginLeft:'auto'}}>{catIntents.length} pages</span>
                      </div>
                      {catIntents.map((intent,i)=>(
                        <div key={i} style={{padding:'0.75rem 1.25rem',borderBottom:i<catIntents.length-1?`1px solid ${T.gray100}`:'none',display:'flex',gap:'1rem',alignItems:'flex-start'}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:'0.82rem',fontWeight:600,color:T.gray800}}>"{intent.query}"</div>
                            <div style={{display:'flex',gap:'0.4rem',marginTop:'0.35rem',flexWrap:'wrap'}}>
                              <span style={{fontSize:'0.65rem',color:T.gray500,background:T.gray100,padding:'1px 7px',borderRadius:'20px'}}>{intent.contentFormat}</span>
                              <code style={{fontSize:'0.62rem',color:T.violet,background:T.violetLight,padding:'1px 5px',borderRadius:'4px'}}>&lt;{intent.schemaType}&gt;</code>
                            </div>
                          </div>
                          <span style={{fontSize:'0.65rem',fontWeight:700,padding:'2px 8px',borderRadius:'20px',background:T.greenMid,color:T.green,flexShrink:0}}>High</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* SCHEMA PRIORITIES TAB */}
            {activeTab==='schema'&&(
              <div>
                <div style={{padding:'0.75rem 1rem',background:T.violetLight,border:`1px solid #e9d5ff`,borderRadius:'10px',marginBottom:'1.25rem',fontSize:'0.78rem',color:T.gray700,lineHeight:1.6}}>
                  <b style={{color:T.violet}}>🧩 Schema priority:</b> Build schema in this order — each layer builds on the previous and compounds your AI citation potential.
                </div>
                {Object.entries(
                  result.intents.reduce((acc,intent)=>{
                    if(!acc[intent.schemaType]) acc[intent.schemaType]={count:0,high:0,formats:new Set<string>()};
                    acc[intent.schemaType].count++;
                    if(intent.citationPotential==='High') acc[intent.schemaType].high++;
                    acc[intent.schemaType].formats.add(intent.contentFormat);
                    return acc;
                  },{} as Record<string,{count:number,high:number,formats:Set<string>}>)
                ).sort((a,b)=>b[1].high-a[1].high).map(([schema,data],i)=>(
                  <div key={schema} style={{display:'flex',alignItems:'center',gap:'1rem',padding:'0.875rem 1.25rem',border:`1px solid ${T.gray200}`,borderRadius:'12px',marginBottom:'0.5rem',background:T.white,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'8px',background:i===0?T.violet:i===1?T.blue:T.gray100,color:i<2?T.white:T.gray500,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:800,flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1}}>
                      <code style={{fontSize:'0.82rem',fontWeight:700,color:T.violet}}>{schema}</code>
                      <div style={{fontSize:'0.7rem',color:T.gray500,marginTop:'0.15rem'}}>Used by {data.count} intent{data.count!==1?'s':''} &middot; {[...data.formats].join(', ')}</div>
                    </div>
                    <div style={{display:'flex',gap:'0.35rem',flexShrink:0}}>
                      {data.high>0&&<span style={{fontSize:'0.65rem',fontWeight:700,padding:'2px 8px',borderRadius:'20px',background:T.greenMid,color:T.green}}>{data.high} high</span>}
                      <a href="/tools/local-faq-schema" style={{fontSize:'0.65rem',fontWeight:700,padding:'2px 8px',borderRadius:'20px',background:T.blueMid,color:T.blue,textDecoration:'none'}}>Generate →</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{padding:'0.875rem 1.5rem',borderTop:`1px solid ${T.gray100}`,background:T.gray50,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.5rem'}}>
            <span style={{fontSize:'0.65rem',color:T.gray400}}>Powered by Claude Sonnet 4 &middot; {result.intents.length} intents &middot; 5 categories</span>
            <button onClick={()=>{setResult(null);setBusinessType('');setLocation('');setWebsite('');setError('');}} style={{fontSize:'0.72rem',padding:'5px 14px',border:`1px solid ${T.blue}`,borderRadius:'20px',background:T.blueLight,color:T.blue,cursor:'pointer',fontWeight:700}}>← Map Another Business</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
