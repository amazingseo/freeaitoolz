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

const CATEGORIES=['HVAC & Heating','Plumbing','Electrical','Roofing','Landscaping & Lawn Care','General Contractor','Home Cleaning Service','Pest Control','Painting','Flooring','Windows & Doors','Pool & Spa Service','Solar Installation','Real Estate Agency','Property Management','Mortgage Broker','Home Inspection','Restaurant','Bakery & Cafe','Catering','Dental Office','Medical Clinic / Doctor','Chiropractor','Physical Therapy','Veterinary Clinic','Auto Repair','Auto Dealership','Car Detailing','Law Firm','Accounting & Tax','Insurance Agency','Financial Advisor','Gym & Fitness','Beauty Salon','Spa & Massage','Barbershop','Daycare & Childcare','Tutoring & Education','IT Support & Tech','Marketing Agency','Photography','Event Planning','Moving Company','Storage Facility','Retail Store','Other'];

const SCORE_LABELS: Record<string,string> = {
  entityClarity:'Entity Clarity',locationSignals:'Location Signals',serviceSpecificity:'Service Specificity',
  trustSignals:'Trust Signals',keywordAlignment:'Keyword Alignment',callToAction:'Call to Action',
  differentiator:'Differentiator',naturalLanguage:'Natural Language',availability:'Availability',socialProof:'Social Proof',
};

type ScoreData = Record<string,number>;
type ApiResult = {
  businessName:string;category:string;location:string;originalDescription:string;
  overallScore:number;scores:ScoreData;scoreReasons:Record<string,string>;
  rewrittenDescription:string;characterCount:number;
  postIdeas:{title:string;content:string;type:string}[];
  missingAttributes:{attribute:string;why:string;priority:string}[];
};

function CopyBtn({text,label='Copy'}:{text:string;label?:string}) {
  const [c,setC]=useState(false);
  const copy=async()=>{try{await navigator.clipboard.writeText(text);}catch{const el=document.createElement('textarea');el.value=text;document.body.appendChild(el);el.select();document.execCommand('copy');document.body.removeChild(el);}setC(true);setTimeout(()=>setC(false),2000);};
  return <button onClick={copy} style={{padding:'5px 12px',borderRadius:'8px',border:`1px solid ${c?T.emerald:T.gray200}`,background:c?T.greenLight:T.white,color:c?T.green:T.gray600,fontSize:'0.73rem',fontWeight:700,cursor:'pointer',transition:'all 0.2s',display:'flex',alignItems:'center',gap:'0.3rem'}}>{c?'✓ Copied!':'📋 '+label}</button>;
}

function ScoreBar({label,score,reason}:{label:string;score:number;reason:string}) {
  const color=score>=8?T.green:score>=6?T.blue:score>=4?T.amber:T.red;
  const bg=score>=8?T.greenLight:score>=6?T.blueLight:score>=4?T.amberLight:T.redLight;
  return (
    <div style={{padding:'0.75rem 0',borderBottom:`1px solid ${T.gray100}`}}>
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.35rem'}}>
        <span style={{fontSize:'0.78rem',fontWeight:600,color:T.gray800,flex:1}}>{label}</span>
        <span style={{fontSize:'0.8rem',fontWeight:800,color,minWidth:'2rem',textAlign:'right'}}>{score}/10</span>
      </div>
      <div style={{height:'6px',background:T.gray100,borderRadius:'3px',overflow:'hidden',marginBottom:'0.3rem'}}>
        <div style={{height:'100%',width:`${score*10}%`,background:color,borderRadius:'3px',transition:'width 1s ease'}} />
      </div>
      <div style={{fontSize:'0.68rem',color:T.gray500,lineHeight:1.4}}>{reason}</div>
    </div>
  );
}

function ScoreRing({score}:{score:number}) {
  const r=42,circ=2*Math.PI*r;
  const dash=circ*(1-score/100);
  const color=score>=80?T.green:score>=60?T.blue:score>=40?T.amber:T.red;
  const bg=score>=80?T.greenLight:score>=60?T.blueLight:score>=40?T.amberLight:T.redLight;
  const lbl=score>=80?'Excellent':score>=60?'Good':score>=40?'Needs Work':'Poor';
  return (
    <div style={{textAlign:'center',padding:'1.5rem 1rem',background:bg,border:`1px solid ${color}30`,borderRadius:'16px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:`linear-gradient(90deg,${color}60,${color})`}} />
      <svg width="100" height="100" style={{display:'block',margin:'0 auto'}}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={`${color}20`} strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round" transform="rotate(-90 50 50)" style={{transition:'stroke-dashoffset 1.2s ease'}} />
        <text x="50" y="47" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="22" fontWeight="900" fontFamily="Inter,system-ui,sans-serif">{score}</text>
        <text x="50" y="63" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="10" fontWeight="700" fontFamily="Inter,system-ui,sans-serif">/100</text>
      </svg>
      <div style={{fontSize:'0.85rem',fontWeight:700,color:T.gray800,marginTop:'0.5rem'}}>AEO Score</div>
      <div style={{display:'inline-flex',alignItems:'center',gap:'0.25rem',marginTop:'0.25rem',padding:'2px 8px',background:`${color}15`,borderRadius:'20px',fontSize:'0.68rem',fontWeight:700,color}}>
        <span style={{width:'5px',height:'5px',borderRadius:'50%',background:color,display:'inline-block'}} />
        {lbl}
      </div>
    </div>
  );
}

export default function GbpAeoScorer() {
  const [businessName,setBusinessName]=useState('');
  const [category,setCategory]=useState('');
  const [location,setLocation]=useState('');
  const [description,setDescription]=useState('');
  const [phone,setPhone]=useState('');
  const [website,setWebsite]=useState('');
  const [services,setServices]=useState('');
  const [loading,setLoading]=useState(false);
  const [loadingStep,setLoadingStep]=useState('');
  const [progress,setProgress]=useState(0);
  const [result,setResult]=useState<ApiResult|null>(null);
  const [error,setError]=useState('');
  const [activeTab,setActiveTab]=useState<'score'|'posts'|'attributes'>('score');
  const resultsRef=useRef<HTMLDivElement>(null);

  const LIMIT=5,LS_KEY='gbp_aeo_usage';
  const todayStr=()=>new Date().toISOString().slice(0,10);
  const getUsage=()=>{try{const r=localStorage.getItem(LS_KEY);return r?JSON.parse(r):{date:'',count:0};}catch{return{date:'',count:0};}};
  const getRemaining=()=>{const u=getUsage();return u.date!==todayStr()?LIMIT:Math.max(0,LIMIT-u.count);};
  const [remaining,setRemaining]=useState<number>(()=>{try{return getRemaining();}catch{return LIMIT;}});
  const incUsage=()=>{const t=todayStr(),u=getUsage(),n=u.date===t?u.count+1:1;try{localStorage.setItem(LS_KEY,JSON.stringify({date:t,count:n}));}catch{}setRemaining(Math.max(0,LIMIT-n));};

  const run=async()=>{
    if(getRemaining()<=0){setError('LIMIT_REACHED');return;}
    if(!businessName.trim()){setError('Please enter your business name.');return;}
    if(!category){setError('Please select a category.');return;}
    if(!location.trim()){setError('Please enter your city and state.');return;}
    if(description.trim().length<30){setError('Please enter your current GBP description (at least 30 characters).');return;}
    setError('');setResult(null);setLoading(true);setProgress(0);

    const steps=[
      {msg:'Analyzing your GBP description...',pct:15},
      {msg:'Scoring 10 AEO criteria...',pct:38},
      {msg:'Rewriting for maximum AI visibility...',pct:62},
      {msg:'Generating weekly post ideas...',pct:82},
      {msg:'Building attribute checklist...',pct:95},
    ];
    let si=0;
    const timer=setInterval(()=>{if(si<steps.length){setLoadingStep(steps[si].msg);setProgress(steps[si].pct);si++;}},2000);

    try {
      const res=await fetch('/api/gbp-aeo-scorer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessName:businessName.trim(),category,location:location.trim(),description:description.trim(),phone:phone.trim()||undefined,website:website.trim()||undefined,services:services.trim()||undefined})});
      const json=await res.json();
      clearInterval(timer);
      if(json.error){setError(json.message||'Scoring failed.');setLoading(false);return;}
      incUsage();setProgress(100);setLoadingStep('Scoring complete!');
      setTimeout(()=>{setResult(json);setLoading(false);setActiveTab('score');setTimeout(()=>resultsRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100);},400);
    } catch {
      clearInterval(timer);setError('Request failed. Please try again.');setLoading(false);
    }
  };

  const inputStyle={width:'100%',boxSizing:'border-box' as const,padding:'0.8rem 1rem 0.8rem 2.5rem',background:'rgba(255,255,255,0.07)',border:'1.5px solid rgba(255,255,255,0.12)',borderRadius:'10px',color:'#f1f5f9',fontSize:'0.9rem',outline:'none',fontFamily:'inherit',transition:'border-color 0.15s'};
  const labelStyle={display:'block' as const,fontSize:'0.72rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase' as const,letterSpacing:'0.08em',marginBottom:'0.5rem'};

  return (
    <div style={{fontFamily:'Inter,system-ui,sans-serif',color:T.gray800,background:T.white,borderRadius:'16px',border:`1px solid ${T.gray200}`,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${T.gray950} 0%,#1e1b4b 100%)`,padding:'1.75rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1.25rem'}}>
          <div style={{width:'7px',height:'7px',borderRadius:'50%',background:T.emerald,boxShadow:`0 0 6px ${T.emerald}`}} />
          <span style={{fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.1em'}}>GBP AEO Scorer &middot; AI Visibility Optimization &middot; Claude Sonnet</span>
        </div>

        {/* Row 1: name + category */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'0.875rem'}}>
          <div>
            <label style={labelStyle}>Business Name</label>
            <div style={{position:'relative'}}><span style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#64748b'}}>🏢</span>
              <input type="text" value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="e.g. Mike's HVAC Services" disabled={loading} style={inputStyle} onFocus={e=>(e.target.style.borderColor=`${T.blue}80`)} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')} /></div>
          </div>
          <div>
            <label style={labelStyle}>Business Category</label>
            <div style={{position:'relative'}}>
              <select value={category} onChange={e=>setCategory(e.target.value)} disabled={loading} style={{...inputStyle,paddingLeft:'1rem',cursor:'pointer',appearance:'none',color:category?'#f1f5f9':'#64748b'}} onFocus={e=>(e.target.style.borderColor=`${T.blue}80`)} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')}>
                <option value="" disabled>Select category...</option>
                {CATEGORIES.map(c=><option key={c} value={c} style={{background:'#1e1b4b',color:'#f1f5f9'}}>{c}</option>)}
              </select>
              <div style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'#64748b'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></div>
            </div>
          </div>
        </div>

        {/* Row 2: location + phone */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'0.875rem'}}>
          <div>
            <label style={labelStyle}>City &amp; State</label>
            <div style={{position:'relative'}}><span style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#64748b'}}>📍</span>
              <input type="text" value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Austin, TX" disabled={loading} style={inputStyle} onFocus={e=>(e.target.style.borderColor=`${T.blue}80`)} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')} /></div>
          </div>
          <div>
            <label style={labelStyle}>Phone <span style={{color:'#475569',fontWeight:400,textTransform:'none'}}>(optional)</span></label>
            <div style={{position:'relative'}}><span style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#64748b'}}>📞</span>
              <input type="text" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(512) 555-0123" disabled={loading} style={inputStyle} onFocus={e=>(e.target.style.borderColor=`${T.blue}80`)} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')} /></div>
          </div>
        </div>

        {/* Row 3: Current description */}
        <div style={{marginBottom:'0.875rem'}}>
          <label style={labelStyle}>Current GBP Description <span style={{color:description.length>750?'#f87171':'#64748b',fontWeight:500,textTransform:'none'}}>{description.length}/750 chars</span></label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} disabled={loading}
            placeholder="Paste your current Google Business Profile description here — the one customers see on your GBP listing..."
            rows={4} style={{...inputStyle,paddingLeft:'1rem',paddingTop:'0.8rem',resize:'vertical',minHeight:'100px',lineHeight:1.5}} onFocus={e=>(e.target.style.borderColor=`${T.blue}80`)} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')} />
        </div>

        {/* Row 4: Services + button */}
        <div style={{display:'flex',gap:'0.75rem',alignItems:'flex-end'}}>
          <div style={{flex:1}}>
            <label style={labelStyle}>Key Services <span style={{color:'#475569',fontWeight:400,textTransform:'none'}}>(optional — improves accuracy)</span></label>
            <div style={{position:'relative'}}><span style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#64748b'}}>🔧</span>
              <input type="text" value={services} onChange={e=>setServices(e.target.value)} onKeyDown={e=>e.key==='Enter'&&run()} placeholder="e.g. AC repair, furnace install, duct cleaning" disabled={loading} style={inputStyle} onFocus={e=>(e.target.style.borderColor=`${T.blue}80`)} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.12)')} /></div>
          </div>
          <button onClick={run} disabled={loading||remaining===0}
            style={{padding:'0.8rem 1.5rem',borderRadius:'10px',border:'none',background:loading?'#1e40af':remaining===0?'rgba(255,255,255,0.08)':`linear-gradient(135deg,${T.blue} 0%,${T.violet} 100%)`,color:remaining===0?'#475569':T.white,fontSize:'0.88rem',fontWeight:700,cursor:(loading||remaining===0)?'not-allowed':'pointer',whiteSpace:'nowrap',boxShadow:(loading||remaining===0)?'none':'0 4px 15px rgba(37,99,235,0.4)',display:'flex',alignItems:'center',gap:'0.4rem',transition:'all 0.2s'}}>
            {loading?<><span style={{display:'inline-block',width:'14px',height:'14px',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />Scoring...</>:remaining===0?'🔒 Limit Reached':'📊 Score My GBP'}
          </button>
          {result&&<button onClick={()=>{setResult(null);setBusinessName('');setCategory('');setLocation('');setDescription('');setPhone('');setWebsite('');setServices('');setError('');}} style={{padding:'0.8rem 0.875rem',borderRadius:'10px',border:'1.5px solid rgba(255,255,255,0.12)',background:'transparent',color:'#64748b',fontSize:'0.8rem',cursor:'pointer'}}>✕</button>}
        </div>

        {loading&&(
          <div style={{marginTop:'1.25rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.5rem'}}><span style={{fontSize:'0.75rem',color:'#94a3b8'}}>{loadingStep}</span><span style={{fontSize:'0.72rem',color:'#93c5fd',fontWeight:700}}>{progress}%</span></div>
            <div style={{height:'4px',background:'rgba(255,255,255,0.08)',borderRadius:'2px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${progress}%`,background:`linear-gradient(90deg,${T.blue},${T.violet})`,borderRadius:'2px',transition:'width 0.7s ease'}} />
            </div>
          </div>
        )}

        {!loading&&(
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginTop:'1rem'}}>
            <div style={{display:'flex',gap:'0.3rem'}}>{Array.from({length:LIMIT}).map((_,i)=><div key={i} style={{width:'20px',height:'4px',borderRadius:'2px',background:i<remaining?T.emerald:'rgba(255,255,255,0.12)',transition:'background 0.3s'}} />)}</div>
            <span style={{fontSize:'0.68rem',color:remaining>0?'#94a3b8':'#f87171',fontWeight:600}}>{remaining>0?`${remaining} of ${LIMIT} free scores today`:'Daily limit reached — resets at midnight'}</span>
          </div>
        )}

        {error&&error!=='LIMIT_REACHED'&&<div style={{marginTop:'1rem',padding:'0.875rem 1rem',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:'10px',color:'#f87171',fontSize:'0.8rem'}}>⚠️ {error}</div>}
        {error==='LIMIT_REACHED'&&<div style={{marginTop:'1rem',padding:'1rem 1.25rem',background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'12px'}}><div style={{fontSize:'0.85rem',fontWeight:700,color:'#c4b5fd',marginBottom:'0.3rem'}}>🔒 Daily Limit Reached</div><p style={{fontSize:'0.75rem',color:'#94a3b8',margin:0}}>All {LIMIT} free scores used. Resets at midnight.</p></div>}
      </div>

      {/* Empty state */}
      {!result&&!loading&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderBottom:`1px solid ${T.gray100}`}}>
          {[{icon:'📊',title:'10-Criteria Scoring',sub:'Each scored 0-10 with reasons',color:T.blue},{icon:'✍️',title:'AI-Optimized Rewrite',sub:'750-char description ready to use',color:T.violet},{icon:'📅',title:'10 Post Ideas',sub:'Weekly GBP posts for AI recency signals',color:T.emerald},{icon:'✅',title:'Attribute Checklist',sub:'Category-specific missing fields',color:'#d97706'}].map(f=>(
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
          <div style={{padding:'0.875rem 1.5rem',background:T.gray50,borderBottom:`1px solid ${T.gray100}`,display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
            <div style={{flex:1}}>
              <code style={{fontSize:'0.73rem',color:T.gray600}}>{result.businessName} &bull; {result.location} &bull; {result.category}</code>
            </div>
            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
              <span style={{fontSize:'0.7rem',padding:'3px 9px',borderRadius:'20px',background:result.overallScore>=80?T.greenMid:result.overallScore>=60?T.blueMid:result.overallScore>=40?T.amberMid:T.redMid,color:result.overallScore>=80?T.green:result.overallScore>=60?T.blue:result.overallScore>=40?T.amber:T.red,fontWeight:700}}>Score: {result.overallScore}/100</span>
              <button onClick={run} style={{fontSize:'0.72rem',padding:'4px 12px',border:`1px solid ${T.gray200}`,borderRadius:'20px',background:T.white,color:T.gray600,cursor:'pointer',fontWeight:600}}>🔄 Re-run</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',borderBottom:`1px solid ${T.gray200}`,overflowX:'auto',paddingLeft:'0.5rem',background:T.white}}>
            {[{id:'score' as const,label:'Score & Rewrite',icon:'📊'},{id:'posts' as const,label:`Post Ideas (${result.postIdeas?.length||0})`,icon:'📅'},{id:'attributes' as const,label:`Missing Attributes (${result.missingAttributes?.length||0})`,icon:'✅'}].map(({id,label,icon})=>(
              <button key={id} onClick={()=>setActiveTab(id)} style={{padding:'0.8rem 1.1rem',border:'none',background:'none',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:'0.35rem',color:activeTab===id?T.blue:T.gray500,borderBottom:`2px solid ${activeTab===id?T.blue:'transparent'}`,marginBottom:'-1px',transition:'all 0.15s'}}>
                <span style={{fontSize:'0.75rem'}}>{icon}</span>{label}
              </button>
            ))}
          </div>

          <div style={{padding:'1.5rem'}}>

            {/* SCORE & REWRITE TAB */}
            {activeTab==='score'&&(
              <div>
                <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'1.5rem',marginBottom:'1.5rem',alignItems:'start'}}>
                  <ScoreRing score={result.overallScore} />
                  <div>
                    <div style={{fontSize:'0.75rem',fontWeight:700,color:T.gray400,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.75rem'}}>Score Breakdown (each /10)</div>
                    {Object.entries(result.scores||{}).map(([key,val])=>(
                      <ScoreBar key={key} label={SCORE_LABELS[key]||key} score={Number(val)} reason={result.scoreReasons?.[key]||''} />
                    ))}
                  </div>
                </div>

                {/* Rewritten description */}
                <div style={{border:`1px solid ${T.greenMid}`,borderRadius:'14px',overflow:'hidden'}}>
                  <div style={{padding:'0.875rem 1.25rem',background:T.greenLight,borderBottom:`1px solid ${T.greenMid}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.5rem'}}>
                    <div>
                      <div style={{fontSize:'0.85rem',fontWeight:700,color:T.green}}>✓ AI-Optimized GBP Description</div>
                      <div style={{fontSize:'0.68rem',color:T.gray600,marginTop:'0.15rem'}}>{result.characterCount} characters — {750-result.characterCount} under GBP limit &middot; scores 9-10 on all criteria</div>
                    </div>
                    <CopyBtn text={result.rewrittenDescription} label="Copy Rewrite" />
                  </div>
                  <div style={{padding:'1.25rem',background:T.white}}>
                    <p style={{margin:0,fontSize:'0.88rem',color:T.gray800,lineHeight:1.7}}>{result.rewrittenDescription}</p>
                  </div>
                  <div style={{padding:'0.75rem 1.25rem',background:T.gray50,borderTop:`1px solid ${T.gray100}`,display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                    {['✓ Entity clarity','✓ Location signals','✓ Trust signals','✓ AI-extractable','✓ CTA included'].map(b=>(
                      <span key={b} style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:'20px',background:T.greenMid,color:T.green,fontWeight:700}}>{b}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* POST IDEAS TAB */}
            {activeTab==='posts'&&(
              <div>
                <div style={{padding:'0.75rem 1rem',background:T.blueLight,border:`1px solid ${T.blueMid}`,borderRadius:'10px',marginBottom:'1.25rem',fontSize:'0.78rem',color:T.gray700,lineHeight:1.6}}>
                  <b style={{color:T.blue}}>💡 Why GBP posts matter for AEO:</b> AI engines increasingly use Google Business Profile posts as a recency signal when generating local business recommendations. Posting weekly shows you&apos;re active, which improves your chances of being cited in AI-generated answers.
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                  {(result.postIdeas||[]).map((post,i)=>(
                    <div key={i} style={{border:`1px solid ${T.gray200}`,borderRadius:'12px',overflow:'hidden',background:T.white,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                      <div style={{padding:'0.75rem 1.25rem',background:T.gray50,borderBottom:`1px solid ${T.gray100}`,display:'flex',alignItems:'center',gap:'0.75rem'}}>
                        <div style={{width:'24px',height:'24px',borderRadius:'8px',background:T.blueMid,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:800,color:T.blue,flexShrink:0}}>W{i+1}</div>
                        <span style={{fontSize:'0.82rem',fontWeight:700,color:T.gray800,flex:1}}>{post.title}</span>
                        <span style={{fontSize:'0.62rem',padding:'2px 7px',borderRadius:'20px',background:T.blueMid,color:T.blue,fontWeight:700,flexShrink:0}}>{post.type}</span>
                        <CopyBtn text={`${post.title}\n\n${post.content}`} label="Copy" />
                      </div>
                      <div style={{padding:'0.875rem 1.25rem'}}>
                        <p style={{margin:0,fontSize:'0.8rem',color:T.gray700,lineHeight:1.65}}>{post.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ATTRIBUTES TAB */}
            {activeTab==='attributes'&&(
              <div>
                <div style={{padding:'0.75rem 1rem',background:T.amberLight,border:`1px solid ${T.amberMid}`,borderRadius:'10px',marginBottom:'1.25rem',fontSize:'0.78rem',color:T.gray700,lineHeight:1.6}}>
                  <b style={{color:T.amber}}>⚠ Missing attributes:</b> Google Business Profile attributes are read by AI engines to understand your business capabilities. Each missing attribute is a signal gap that reduces your chance of being recommended for specific queries.
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.625rem'}}>
                  {(result.missingAttributes||[]).map((attr,i)=>{
                    const priColor=attr.priority==='High'?T.red:attr.priority==='Medium'?T.amber:T.gray500;
                    const priBg=attr.priority==='High'?T.redMid:attr.priority==='Medium'?T.amberMid:T.gray100;
                    return (
                      <div key={i} style={{display:'flex',gap:'1rem',padding:'0.875rem 1.25rem',border:`1px solid ${T.gray200}`,borderRadius:'12px',background:T.white,alignItems:'flex-start'}}>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.25rem'}}>
                            <span style={{fontSize:'0.82rem',fontWeight:700,color:T.gray800}}>{attr.attribute}</span>
                            <span style={{fontSize:'0.62rem',fontWeight:700,padding:'1px 7px',borderRadius:'20px',background:priBg,color:priColor,textTransform:'uppercase'}}>{attr.priority}</span>
                          </div>
                          <p style={{margin:0,fontSize:'0.75rem',color:T.gray600,lineHeight:1.5}}>{attr.why}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{marginTop:'1rem',padding:'0.875rem 1rem',background:T.greenLight,border:`1px solid ${T.greenMid}`,borderRadius:'10px',fontSize:'0.78rem',color:T.gray700}}>
                  <b style={{color:T.green}}>✓ How to add:</b> Go to your Google Business Profile → Edit Profile → scroll down to the Attributes section → fill in each missing field listed above.
                </div>
              </div>
            )}
          </div>

          <div style={{padding:'0.875rem 1.5rem',borderTop:`1px solid ${T.gray100}`,background:T.gray50,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.5rem'}}>
            <span style={{fontSize:'0.65rem',color:T.gray400}}>Powered by Claude Sonnet 4 &middot; 10-criteria AEO scoring &middot; {result.postIdeas?.length||0} post ideas</span>
            <button onClick={()=>{setResult(null);setBusinessName('');setCategory('');setLocation('');setDescription('');setPhone('');setWebsite('');setServices('');setError('');}} style={{fontSize:'0.72rem',padding:'5px 14px',border:`1px solid ${T.blue}`,borderRadius:'20px',background:T.blueLight,color:T.blue,cursor:'pointer',fontWeight:700}}>← Score Another Business</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
