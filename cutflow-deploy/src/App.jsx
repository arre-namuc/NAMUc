import { useState, useEffect, useRef } from "react";
import {
  subscribeProjects, saveProject, deleteProject,
  uploadFeedbackImage, subscribeCompany, saveCompany,
  subscribeMembers, saveMember, deleteMember,
  isConfigured,
} from "./firebase.js";

const C = {
  bg:"#f4f5f7", white:"#ffffff", border:"#e4e7ec",
  text:"#111827", dark:"#111827", sub:"#6b7280", faint:"#9ca3af",
  blue:"#2563eb", blueLight:"#eff6ff", blueMid:"#dbeafe",
  green:"#16a34a", greenLight:"#f0fdf4",
  red:"#dc2626", redLight:"#fef2f2",
  amber:"#d97706", amberLight:"#fffbeb",
  purple:"#7c3aed", purpleLight:"#f5f3ff",
  slate:"#475569", slateLight:"#f8fafc",
};

const DEFAULT_COMPANY = {
  name:"NAMUc", ceo:"", bizNo:"", address:"", phone:"", email:"",
  logoUrl:"https://i.imgur.com/ONdvF5Q.jpeg",
  bankName:"", bankAccount:"", bankHolder:"",
  quoteNote:"· 본 견적은 협의된 내용을 기준으로 작성되었습니다.\n· 촬영 조건 및 범위 변경 시 금액이 조정될 수 있습니다.\n· 계약금 50% 선입금 후 제작 착수합니다.",
  validDays:30,
};

const SEED_ACCOUNTS = [
  { id:"m0", name:"김대표",  role:"대표",    pw:"ceo1234",  canViewFinance:true,  canManageMembers:true,  order:0 },
  { id:"m1", name:"박민서",  role:"PD",      pw:"pd1234",   canViewFinance:false, canManageMembers:false, order:1 },
  { id:"m2", name:"이준혁",  role:"감독",    pw:"dir1234",  canViewFinance:false, canManageMembers:false, order:2 },
  { id:"m3", name:"김소연",  role:"촬영감독",pw:"cam1234",  canViewFinance:false, canManageMembers:false, order:3 },
  { id:"m4", name:"최다인",  role:"편집자",  pw:"edit1234", canViewFinance:false, canManageMembers:false, order:4 },
  { id:"m5", name:"정우진",  role:"CG",      pw:"cg1234",   canViewFinance:false, canManageMembers:false, order:5 },
  { id:"m6", name:"한지수",  role:"제작부",  pw:"prod1234", canViewFinance:false, canManageMembers:false, order:6 },
  { id:"m7", name:"오세진",  role:"경영지원",pw:"biz1234",  canViewFinance:true,  canManageMembers:true,  order:7 },
];

const STAGES = {
  "브리프":       { color:C.slate,  bg:C.slateLight, icon:"📋" },
  "프리프로덕션": { color:C.purple, bg:C.purpleLight, icon:"🎨" },
  "촬영":         { color:C.amber,  bg:C.amberLight,  icon:"🎬" },
  "포스트":       { color:C.blue,   bg:C.blueLight,   icon:"✂️" },
  "납품완료":     { color:C.green,  bg:C.greenLight,  icon:"✅" },
};
const TASK_TYPES = ["스크립트","콘티","캐스팅","로케이션","촬영","편집","색보정","음악/사운드","자막/CG","클라이언트 검토","최종 납품","기타"];
const FORMATS_DEFAULT = ["TVC","디지털 광고","유튜브 콘텐츠","숏폼","BTL","브랜드 필름"];
const P_COLORS = ["#2563eb","#7c3aed","#db2777","#d97706","#16a34a","#0891b2"];
const VOUCHER_TYPES = ["세금계산서","영수증","외주견적서","카드영수증","기타"];
const newId = () => Math.random().toString(36).slice(2,8);

const QUOTE_TEMPLATE = [
  { category:"기획/제작관리", groups:[
    { group:"제작관리", items:[
      { name:"EPD (Executive PD)", unit:"건", qty:1, unitPrice:0 },
      { name:"총괄감독", unit:"건", qty:1, unitPrice:0 },
      { name:"AE (대행사 담당)", unit:"건", qty:1, unitPrice:0 },
      { name:"작가 (대본 작성)", unit:"건", qty:1, unitPrice:0 },
      { name:"프로듀싱, 프로덕션 매니징", unit:"건", qty:1, unitPrice:0 },
      { name:"P.P.M 경비", unit:"식", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"프리프로덕션", groups:[
    { group:"기획/연출", items:[
      { name:"기획 및 구성료 (구성안 작성)", unit:"건", qty:1, unitPrice:0 },
      { name:"연출료, 조연출료, 콘티 visualizing", unit:"건", qty:1, unitPrice:0 },
      { name:"조감독 (1st)", unit:"일", qty:1, unitPrice:0 },
      { name:"조감독 (2nd)", unit:"일", qty:0, unitPrice:0 },
    ]},
    { group:"캐스팅/로케이션", items:[
      { name:"캐스팅비", unit:"명", qty:1, unitPrice:0 },
      { name:"로케이션 헌팅", unit:"식", qty:1, unitPrice:0 },
      { name:"장소 사용료", unit:"일", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"촬영", groups:[
    { group:"촬영 인건비", items:[
      { name:"촬영팀 운용", unit:"일", qty:1, unitPrice:0 },
      { name:"촬영감독료", unit:"일", qty:1, unitPrice:0 },
      { name:"촬영 1st", unit:"일", qty:1, unitPrice:0 },
      { name:"조명감독료", unit:"일", qty:1, unitPrice:0 },
      { name:"조명 Grip팀", unit:"일", qty:1, unitPrice:0 },
    ]},
    { group:"카메라 기자재", items:[
      { name:"카메라 바디", unit:"일", qty:1, unitPrice:0 },
      { name:"렌즈", unit:"일", qty:1, unitPrice:0 },
      { name:"모니터", unit:"일", qty:1, unitPrice:0 },
      { name:"기타 기자재", unit:"식", qty:1, unitPrice:0 },
    ]},
    { group:"조명 기자재", items:[
      { name:"조명 기자재", unit:"일", qty:1, unitPrice:0 },
      { name:"발전차", unit:"일", qty:1, unitPrice:0 },
    ]},
    { group:"특수 기자재", items:[
      { name:"지미집 (Jimmy Jib)", unit:"일", qty:1, unitPrice:0 },
      { name:"스테디캠", unit:"일", qty:1, unitPrice:0 },
      { name:"드론/헬리캠", unit:"일", qty:1, unitPrice:0 },
    ]},
    { group:"촬영 장소", items:[
      { name:"스튜디오 대관료", unit:"일", qty:1, unitPrice:0 },
      { name:"로케이션 장소사용료", unit:"일", qty:1, unitPrice:0 },
    ]},
    { group:"미술/분장", items:[
      { name:"미술 세트 제작", unit:"식", qty:1, unitPrice:0 },
      { name:"소품비", unit:"식", qty:1, unitPrice:0 },
      { name:"Make-Up / Hair", unit:"일", qty:1, unitPrice:0 },
      { name:"스타일리스트", unit:"일", qty:1, unitPrice:0 },
    ]},
    { group:"출연/제작지원", items:[
      { name:"출연료 (모델)", unit:"명", qty:1, unitPrice:0 },
      { name:"차량/이동비", unit:"식", qty:1, unitPrice:0 },
      { name:"식비", unit:"식", qty:1, unitPrice:0 },
      { name:"촬영경비, Post경비, 보험료", unit:"식", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"포스트프로덕션", groups:[
    { group:"편집/DI", items:[
      { name:"편집 (Editing)", unit:"건", qty:1, unitPrice:0 },
      { name:"DI (색보정)", unit:"건", qty:1, unitPrice:0 },
      { name:"편집 조연출료", unit:"건", qty:1, unitPrice:0 },
    ]},
    { group:"CG/VFX", items:[
      { name:"2D Animation", unit:"건", qty:1, unitPrice:0 },
      { name:"3D Modeling/Animation/Lighting/Rendering", unit:"건", qty:1, unitPrice:0 },
      { name:"FLAME Compositing", unit:"건", qty:1, unitPrice:0 },
      { name:"CG 및 합성 연출료", unit:"건", qty:1, unitPrice:0 },
    ]},
    { group:"사운드", items:[
      { name:"Sound Design / Mixing / Mastering", unit:"건", qty:1, unitPrice:0 },
      { name:"작곡 / Jingle", unit:"건", qty:1, unitPrice:0 },
      { name:"성우료", unit:"명", qty:0, unitPrice:0 },
      { name:"음악 라이선스 (BGM)", unit:"건", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"메이킹/기타", groups:[
    { group:"메이킹", items:[
      { name:"메이킹 촬영", unit:"건", qty:1, unitPrice:0 },
      { name:"메이킹 편집 (1분)", unit:"건", qty:1, unitPrice:0 },
    ]},
    { group:"저작권/보험", items:[
      { name:"저작권료", unit:"식", qty:1, unitPrice:0 },
      { name:"All Staff 보험료", unit:"식", qty:1, unitPrice:0 },
    ]},
  ]},
];

const makeTemplate = () => QUOTE_TEMPLATE.map(cat=>({
  ...cat,
  groups: cat.groups.map(grp=>({...grp, gid: newId(), items: grp.items.map(it=>({ ...it, id: newId() }))}))
}));

const QUOTE_TEMPLATE_B = [
  { category:"기획료", groups:[{ group:"기획", items:[{ name:"기획구성료", unit:"건", qty:1, unitPrice:0 },{ name:"작가료", unit:"건", qty:1, unitPrice:0 }]}]},
  { category:"연출료", groups:[{ group:"감독료", items:[{ name:"연출료 (기본 1일 촬영)", unit:"일", qty:1, unitPrice:0 },{ name:"편집 연출료", unit:"건", qty:1, unitPrice:0 }]},{ group:"조연출료", items:[{ name:"조감독 1st - 연출료", unit:"일", qty:1, unitPrice:0 }]}]},
  { category:"기술 인건비", groups:[{ group:"촬영 인건비", items:[{ name:"촬영감독료", unit:"일", qty:1, unitPrice:0 },{ name:"1st Assist", unit:"일", qty:1, unitPrice:0 }]},{ group:"조명 인건비", items:[{ name:"조명감독료", unit:"일", qty:1, unitPrice:0 }]}]},
  { category:"카메라 기자재", groups:[{ group:"카메라/렌즈", items:[{ name:"카메라 바디", unit:"대/일", qty:1, unitPrice:0 },{ name:"렌즈 세트", unit:"set/일", qty:1, unitPrice:0 }]}]},
  { category:"포스트프로덕션", groups:[{ group:"편집", items:[{ name:"편집료 (Editing)", unit:"건", qty:1, unitPrice:0 },{ name:"DI (색보정)", unit:"건", qty:1, unitPrice:0 }]},{ group:"사운드", items:[{ name:"Sound Design / Mixing / Mastering", unit:"건", qty:1, unitPrice:0 }]}]},
];

const makeTemplateB = () => QUOTE_TEMPLATE_B.map(cat=>({
  ...cat,
  groups: cat.groups.map(grp=>({...grp, gid: newId(), items: grp.items.map(it=>({ ...it, id: newId() }))}))
}));

const sum     = (arr, fn) => (arr||[]).reduce((s,x)=>s+(fn(x)||0), 0);
const itemAmt = it  => (it.qty||0)*(it.unitPrice||0);
const grpAmt  = grp => sum(grp.items, itemAmt);
const catAmt  = cat => sum(cat.groups, grpAmt);
const qSub    = q   => sum(q.items, catAmt);
const qFee    = q   => Math.round(qSub(q) * (q.agencyFeeRate||0) / 100);
const qSupply = q   => qSub(q) + qFee(q);
const qVat    = q   => q.vat ? Math.round(qSupply(q) * 0.1) : 0;
const qTotal  = q   => qSupply(q) + qVat(q);
const vTotal  = b   => sum(b.vouchers||[], v=>v.amount||0);

const fmt  = n => n==null?"":Math.round(n).toLocaleString("ko-KR")+"원";
const fmtM = n => {
  if (!n) return "0원";
  const abs = Math.abs(n);
  if (abs >= 1e8) return (n<0?"-":"")+(abs/1e8).toFixed(1)+"억";
  if (abs >= 1e4) return (n<0?"-":"")+(abs/1e4).toFixed(0)+"만";
  return n.toLocaleString("ko-KR")+"원";
};

const SEED_PROJECTS = [
  {
    id:"p1", name:"기아 EV9 런칭 캠페인", client:"기아자동차", color:"#2563eb",
    format:"60초", due:"2026-04-15", director:"이준혁", pd:"박민서",
    stage:"촬영", createdAt:"2026-01-10",
    tasks:[
      {id:"t1",title:"브랜드 방향성 확정",type:"스크립트",assignee:"박민서",stage:"납품완료",due:"2026-01-20",priority:"높음",desc:""},
      {id:"t2",title:"콘티 1차 시안",type:"콘티",assignee:"이준혁",stage:"납품완료",due:"2026-02-05",priority:"높음",desc:""},
      {id:"t4",title:"D-day 촬영",type:"촬영",assignee:"김소연",stage:"촬영",due:"2026-03-10",priority:"긴급",desc:""},
      {id:"t5",title:"1차 편집",type:"편집",assignee:"최다인",stage:"브리프",due:"2026-03-25",priority:"높음",desc:""},
    ],
    quote:{ vat:true, agencyFeeRate:10, items: makeTemplate() },
    budget:{ vouchers:[
      {id:"v1",name:"이준혁 감독료",vendor:"개인",type:"세금계산서",date:"2026-02-10",amount:3000000,category:"기획/제작관리",group:"제작관리",number:"",note:"",files:[]},
      {id:"v2",name:"촬영 스튜디오",vendor:"(주)스튜디오101",type:"세금계산서",date:"2026-03-10",amount:2500000,category:"촬영",group:"촬영 장소",number:"",note:"",files:[]},
    ]},
    settlementDate:null, settled:false,
  },
  {
    id:"p2", name:"현대 수소전기차 다큐", client:"현대자동차", color:"#7c3aed",
    format:"다큐멘터리형", due:"2026-05-30", director:"이준혁", pd:"박민서",
    stage:"프리프로덕션", createdAt:"2026-02-01",
    tasks:[{id:"t6",title:"다큐 기획안 작성",type:"스크립트",assignee:"박민서",stage:"납품완료",due:"2026-02-10",priority:"높음",desc:""}],
    quote:{ vat:true, agencyFeeRate:10, items: makeTemplate() },
    budget:{ vouchers:[] },
    settlementDate:null, settled:false,
  },
];

// ===== UTILITY COMPONENTS =====
function Modal({ title, onClose, children, width="540px" }){
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px"}}>
      <div style={{background:C.white,borderRadius:12,width:"100%",maxWidth:width,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:C.white,zIndex:1}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:700}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.sub,lineHeight:1}}>×</button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant="default", size="md", disabled=false, style={} }){
  const base = { border:"none", borderRadius:7, cursor:disabled?"not-allowed":"pointer", fontWeight:600,
    opacity:disabled?0.5:1, transition:"all .15s",
    padding: size==="sm" ? "6px 12px" : size==="lg" ? "12px 24px" : "9px 18px",
    fontSize: size==="sm" ? 13 : size==="lg" ? 16 : 14 };
  const vars = {
    default:  { background:C.blue,   color:"#fff" },
    ghost:    { background:"transparent", color:C.blue,  border:`1px solid ${C.blue}` },
    danger:   { background:C.red,    color:"#fff" },
    "ghost-danger": { background:"transparent", color:C.red, border:`1px solid ${C.red}` },
    subtle:   { background:C.border, color:C.text },
  };
  return <button style={{...base,...(vars[variant]||vars.default),...style}} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Badge({ children, color=C.blue, bg=C.blueLight }){
  return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:20,fontSize:12,fontWeight:600,color,background:bg}}>{children}</span>;
}

function Field({ label, children, required }){
  return (
    <div style={{marginBottom:16}}>
      <label style={{display:"block",fontSize:13,fontWeight:600,color:C.sub,marginBottom:6}}>
        {label}{required && <span style={{color:C.red,marginLeft:2}}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = { width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box",background:C.white };
const sel = { ...inp };

function NumberInput({ value, onChange, placeholder="0", style={} }){
  const [raw, setRaw] = useState(value==null||value===0 ? "" : String(value));
  useEffect(()=>{
    const n = Number(String(value).replace(/,/g,""));
    const cur = Number(raw.replace(/,/g,""));
    if(n !== cur) setRaw(value==null||value===0?"":String(value));
  },[value]);
  return (
    <input style={{...inp,...style}} value={raw?Number(raw.replace(/,/g,"")).toLocaleString():""}
      placeholder={placeholder}
      onChange={e=>{
        const v = e.target.value.replace(/[^0-9]/g,"");
        setRaw(v);
        onChange(v===""?0:Number(v));
      }}
    />
  );
}

// ===== QUOTE EDITOR =====
function QuoteEditor({ quote, onChange }){
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedGrps, setExpandedGrps] = useState({});
  const [showEmpty, setShowEmpty] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [tempName, setTempName] = useState("");

  const toggle = (obj,set,key) => set(p=>({...p,[key]:!p[key]}));
  const update = (catI,gI,iI,field,val)=>{
    const items = quote.items.map((c,ci)=>ci!==catI?c:{...c,groups:c.groups.map((g,gi)=>gi!==gI?g:{...g,items:g.items.map((it,ii)=>ii!==iI?it:{...it,[field]:val})})});
    onChange({...quote,items});
  };
  const updateCatName = (catI,val)=>{
    const items=quote.items.map((c,ci)=>ci!==catI?c:{...c,category:val});
    onChange({...quote,items});
  };
  const updateGrpName = (catI,gI,val)=>{
    const items=quote.items.map((c,ci)=>ci!==catI?c:{...c,groups:c.groups.map((g,gi)=>gi!==gI?g:{...g,group:val})});
    onChange({...quote,items});
  };
  const deleteItem = (catI,gI,iI)=>{
    const items=quote.items.map((c,ci)=>ci!==catI?c:{...c,groups:c.groups.map((g,gi)=>gi!==gI?g:{...g,items:g.items.filter((_,ii)=>ii!==iI)})});
    onChange({...quote,items});
  };
  const addItem = (catI,gI)=>{
    const it={id:newId(),name:"새 항목",unit:"건",qty:1,unitPrice:0};
    const items=quote.items.map((c,ci)=>ci!==catI?c:{...c,groups:c.groups.map((g,gi)=>gi!==gI?g:{...g,items:[...g.items,it]})});
    onChange({...quote,items});
  };
  const addGrp = (catI)=>{
    const grp={gid:newId(),group:"새 그룹",items:[]};
    const items=quote.items.map((c,ci)=>ci!==catI?c:{...c,groups:[...c.groups,grp]});
    onChange({...quote,items});
  };
  const deleteGrp = (catI,gI)=>{
    const items=quote.items.map((c,ci)=>ci!==catI?c:{...c,groups:c.groups.filter((_,gi)=>gi!==gI)});
    onChange({...quote,items});
  };
  const deleteCat = (catI)=>{
    const items=quote.items.filter((_,ci)=>ci!==catI);
    onChange({...quote,items});
  };
  const addCat = ()=>{
    const cat={category:"새 카테고리",groups:[{gid:newId(),group:"새 그룹",items:[{id:newId(),name:"새 항목",unit:"건",qty:1,unitPrice:0}]}]};
    onChange({...quote,items:[...quote.items,cat]});
  };

  const visibleItems = (grp) => showEmpty ? grp.items : grp.items.filter(it=>it.unitPrice>0||it.qty>0);

  return (
    <div>
      {/* 설정 헤더 */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16,padding:16,background:C.slateLight,borderRadius:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{fontSize:13,color:C.sub}}>대행 수수료 (%)</label>
          <input style={{...inp,width:70}} type="number" value={quote.agencyFeeRate||0}
            onChange={e=>onChange({...quote,agencyFeeRate:Number(e.target.value)})} />
        </div>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}>
          <input type="checkbox" checked={!!quote.vat} onChange={e=>onChange({...quote,vat:e.target.checked})} />
          <span>부가세 10%</span>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}>
          <input type="checkbox" checked={showEmpty} onChange={e=>setShowEmpty(e.target.checked)} />
          <span>금액 없는 항목 표시</span>
        </label>
      </div>

      {/* 카테고리 */}
      {(quote.items||[]).map((cat,catI)=>{
        const cAmt = catAmt(cat);
        const cKey = cat.category+catI;
        const cOpen = expandedCats[cKey] !== false;
        return (
          <div key={catI} style={{border:`1px solid ${C.border}`,borderRadius:10,marginBottom:10,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",background:C.slateLight,cursor:"pointer"}}
              onClick={()=>toggle(expandedCats,setExpandedCats,cKey)}>
              <span style={{fontSize:14}}>{cOpen?"▼":"▶"}</span>
              {editingName===`cat${catI}` ? (
                <input autoFocus style={{...inp,flex:1,padding:"4px 8px"}} value={tempName}
                  onChange={e=>setTempName(e.target.value)}
                  onBlur={()=>{updateCatName(catI,tempName);setEditingName(null);}}
                  onKeyDown={e=>{if(e.key==="Enter"){updateCatName(catI,tempName);setEditingName(null);}}}
                  onClick={e=>e.stopPropagation()} />
              ) : (
                <span style={{flex:1,fontWeight:700,fontSize:15}} onDoubleClick={e=>{e.stopPropagation();setTempName(cat.category);setEditingName(`cat${catI}`);}}>{cat.category}</span>
              )}
              <span style={{color:C.blue,fontWeight:700,fontSize:14}}>{cAmt>0?fmt(cAmt):""}</span>
              <button onClick={e=>{e.stopPropagation();deleteCat(catI);}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:16,padding:"0 4px"}}>×</button>
            </div>
            {cOpen && (
              <div style={{padding:"0 8px 8px"}}>
                {cat.groups.map((grp,gI)=>{
                  const gAmt = grpAmt(grp);
                  const gKey = (grp.gid||gI)+catI;
                  const gOpen = expandedGrps[gKey] !== false;
                  const vis = visibleItems(grp);
                  return (
                    <div key={gI} style={{marginTop:8,border:`1px solid ${C.border}`,borderRadius:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:"#f9fafb",cursor:"pointer",borderRadius:"8px 8px 0 0"}}
                        onClick={()=>toggle(expandedGrps,setExpandedGrps,gKey)}>
                        <span style={{fontSize:12}}>{gOpen?"▼":"▶"}</span>
                        {editingName===`grp${catI}_${gI}` ? (
                          <input autoFocus style={{...inp,flex:1,padding:"3px 6px",fontSize:13}} value={tempName}
                            onChange={e=>setTempName(e.target.value)}
                            onBlur={()=>{updateGrpName(catI,gI,tempName);setEditingName(null);}}
                            onKeyDown={e=>{if(e.key==="Enter"){updateGrpName(catI,gI,tempName);setEditingName(null);}}}
                            onClick={e=>e.stopPropagation()} />
                        ) : (
                          <span style={{flex:1,fontWeight:600,fontSize:13,color:C.slate}}
                            onDoubleClick={e=>{e.stopPropagation();setTempName(grp.group);setEditingName(`grp${catI}_${gI}`);}}>
                            {grp.group}
                          </span>
                        )}
                        <span style={{fontSize:13,color:C.blue}}>{gAmt>0?fmt(gAmt):""}</span>
                        <button onClick={e=>{e.stopPropagation();deleteGrp(catI,gI);}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",padding:"0 4px",fontSize:14}}>×</button>
                      </div>
                      {gOpen && (
                        <div style={{padding:"0 8px 8px"}}>
                          <div style={{overflowX:"auto"}}>
                            <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
                              <thead>
                                <tr style={{borderBottom:`1px solid ${C.border}`}}>
                                  {["항목명","단위","수량","단가","금액",""].map(h=>(
                                    <th key={h} style={{padding:"6px 8px",fontSize:12,color:C.sub,textAlign:h==="금액"||h==="단가"?"right":"left",whiteSpace:"nowrap"}}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {vis.map((it,iI)=>(
                                  <tr key={it.id||iI} style={{borderBottom:`1px solid #f3f4f6`}}>
                                    <td style={{padding:"5px 8px"}}>
                                      <input style={{...inp,padding:"4px 6px",fontSize:13,minWidth:120}} value={it.name}
                                        onChange={e=>update(catI,gI,grp.items.indexOf(it),"name",e.target.value)} />
                                    </td>
                                    <td style={{padding:"5px 8px"}}>
                                      <input style={{...inp,padding:"4px 6px",fontSize:13,width:60}} value={it.unit}
                                        onChange={e=>update(catI,gI,grp.items.indexOf(it),"unit",e.target.value)} />
                                    </td>
                                    <td style={{padding:"5px 8px"}}>
                                      <NumberInput style={{padding:"4px 6px",fontSize:13,width:60,textAlign:"right"}} value={it.qty}
                                        onChange={v=>update(catI,gI,grp.items.indexOf(it),"qty",v)} />
                                    </td>
                                    <td style={{padding:"5px 8px"}}>
                                      <NumberInput style={{padding:"4px 6px",fontSize:13,width:100,textAlign:"right"}} value={it.unitPrice}
                                        onChange={v=>update(catI,gI,grp.items.indexOf(it),"unitPrice",v)} />
                                    </td>
                                    <td style={{padding:"5px 8px",textAlign:"right",fontSize:13,fontWeight:600,color:C.dark,whiteSpace:"nowrap"}}>{fmt(itemAmt(it))}</td>
                                    <td style={{padding:"5px 8px"}}>
                                      <button onClick={()=>deleteItem(catI,gI,grp.items.indexOf(it))} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:15,padding:"0 2px"}}>×</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <button onClick={()=>addItem(catI,gI)} style={{marginTop:6,padding:"5px 12px",fontSize:12,background:"transparent",border:`1px dashed ${C.border}`,borderRadius:6,cursor:"pointer",color:C.sub,display:"block",width:"100%"}}>
                            + 항목 추가
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button onClick={()=>addGrp(catI)} style={{marginTop:8,padding:"6px 14px",fontSize:13,background:"transparent",border:`1px dashed ${C.blue}`,borderRadius:7,cursor:"pointer",color:C.blue,display:"block",width:"100%"}}>
                  + 그룹 추가
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button onClick={addCat} style={{padding:"8px 16px",fontSize:13,background:"transparent",border:`1px dashed ${C.blue}`,borderRadius:8,cursor:"pointer",color:C.blue,display:"block",width:"100%",marginTop:4}}>
        + 카테고리 추가
      </button>

      {/* 합계 */}
      <div style={{marginTop:20,padding:16,background:C.slateLight,borderRadius:10,textAlign:"right"}}>
        <div style={{marginBottom:6,fontSize:13,color:C.sub}}>소계: <strong style={{color:C.dark}}>{fmt(qSub(quote))}</strong></div>
        {(quote.agencyFeeRate||0)>0 && <div style={{marginBottom:6,fontSize:13,color:C.sub}}>수수료 ({quote.agencyFeeRate}%): <strong style={{color:C.dark}}>{fmt(qFee(quote))}</strong></div>}
        {quote.vat && <div style={{marginBottom:6,fontSize:13,color:C.sub}}>VAT (10%): <strong style={{color:C.dark}}>{fmt(qVat(quote))}</strong></div>}
        <div style={{fontSize:17,fontWeight:700,color:C.blue}}>최종 합계: {fmt(qTotal(quote))}</div>
      </div>
    </div>
  );
}

// ===== BUDGET EDITOR =====
function BudgetEditor({ budget, onChange, quote }){
  const [modal, setModal] = useState(null);
  const [vf, setVf] = useState({});
  const vouchers = budget.vouchers || [];

  const openAdd = () => {
    setVf({ id:newId(), name:"", vendor:"", type:"세금계산서", date:new Date().toISOString().slice(0,10),
            amount:0, category:"", group:"", number:"", note:"", files:[] });
    setModal("add");
  };
  const openEdit = v => { setVf({...v}); setModal("edit"); };
  const save = () => {
    const list = modal==="edit"
      ? vouchers.map(v=>v.id===vf.id?vf:v)
      : [...vouchers, vf];
    onChange({...budget, vouchers:list});
    setModal(null);
  };
  const del = id => {
    if(window.confirm("삭제하시겠습니까?"))
      onChange({...budget, vouchers:vouchers.filter(v=>v.id!==id)});
  };

  const qTotal_ = quote ? qTotal(quote) : 0;
  const spent = vTotal(budget);
  const balance = qTotal_ - spent;

  // 카테고리/그룹 목록을 견적서에서 추출
  const cats = (quote?.items||[]).map(c=>c.category);
  const groups = vf.category
    ? ((quote?.items||[]).find(c=>c.category===vf.category)?.groups||[]).map(g=>g.group)
    : [];

  return (
    <div>
      {quote && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
          {[
            {label:"견적 합계", val:fmt(qTotal_), color:C.blue},
            {label:"지출 합계", val:fmt(spent), color:C.amber},
            {label:"잔액", val:fmt(balance), color:balance>=0?C.green:C.red},
          ].map(c=>(
            <div key={c.label} style={{background:C.slateLight,borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:12,color:C.sub,marginBottom:4}}>{c.label}</div>
              <div style={{fontSize:16,fontWeight:700,color:c.color}}>{c.val}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <Btn size="sm" onClick={openAdd}>+ 지출 추가</Btn>
      </div>

      {vouchers.length===0 ? (
        <div style={{textAlign:"center",padding:40,color:C.faint,fontSize:14}}>등록된 지출 내역이 없습니다</div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.border}`,background:C.slateLight}}>
                {["날짜","내역","거래처","구분","카테고리","금액",""].map(h=>(
                  <th key={h} style={{padding:"8px 10px",fontSize:12,color:C.sub,textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vouchers.map(v=>(
                <tr key={v.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"8px 10px",fontSize:13,whiteSpace:"nowrap"}}>{v.date}</td>
                  <td style={{padding:"8px 10px",fontSize:13,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.name}</td>
                  <td style={{padding:"8px 10px",fontSize:13}}>{v.vendor}</td>
                  <td style={{padding:"8px 10px",fontSize:12}}><Badge>{v.type}</Badge></td>
                  <td style={{padding:"8px 10px",fontSize:12,color:C.sub}}>{v.category}</td>
                  <td style={{padding:"8px 10px",fontSize:13,fontWeight:600,color:C.amber,textAlign:"right",whiteSpace:"nowrap"}}>{fmt(v.amount)}</td>
                  <td style={{padding:"8px 10px"}}>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>openEdit(v)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 8px",fontSize:12,cursor:"pointer"}}>편집</button>
                      <button onClick={()=>del(v.id)} style={{background:"none",border:`1px solid ${C.red}`,color:C.red,borderRadius:6,padding:"3px 8px",fontSize:12,cursor:"pointer"}}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{borderTop:`2px solid ${C.border}`,background:C.slateLight}}>
                <td colSpan={5} style={{padding:"8px 10px",fontWeight:700,fontSize:13}}>합계</td>
                <td style={{padding:"8px 10px",fontWeight:700,fontSize:14,color:C.amber,textAlign:"right"}}>{fmt(spent)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal==="add"?"지출 추가":"지출 편집"} onClose={()=>setModal(null)}>
          <Field label="날짜" required><input style={inp} type="date" value={vf.date} onChange={e=>setVf(p=>({...p,date:e.target.value}))} /></Field>
          <Field label="내역" required><input style={inp} value={vf.name} onChange={e=>setVf(p=>({...p,name:e.target.value}))} /></Field>
          <Field label="거래처"><input style={inp} value={vf.vendor||""} onChange={e=>setVf(p=>({...p,vendor:e.target.value}))} /></Field>
          <Field label="증빙 구분">
            <select style={sel} value={vf.type} onChange={e=>setVf(p=>({...p,type:e.target.value}))}>
              {VOUCHER_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          {quote && <>
            <Field label="카테고리">
              <select style={sel} value={vf.category||""} onChange={e=>setVf(p=>({...p,category:e.target.value,group:""}))}>
                <option value="">선택</option>
                {cats.map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="세부 그룹">
              <select style={sel} value={vf.group||""} onChange={e=>setVf(p=>({...p,group:e.target.value}))}>
                <option value="">선택</option>
                {groups.map(g=><option key={g}>{g}</option>)}
              </select>
            </Field>
          </>}
          <Field label="금액" required>
            <NumberInput style={{textAlign:"right"}} value={vf.amount} onChange={v=>setVf(p=>({...p,amount:v}))} />
          </Field>
          <Field label="메모"><input style={inp} value={vf.note||""} onChange={e=>setVf(p=>({...p,note:e.target.value}))} /></Field>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
            <Btn variant="subtle" onClick={()=>setModal(null)}>취소</Btn>
            <Btn onClick={save}>저장</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===== SETTLEMENT PRINT =====
function SettlementPrint({ project, company }){
  const q = project.quote||{};
  const b = project.budget||{};
  const vouchers = b.vouchers||[];
  const totalSpent = vTotal(b);
  const today = new Date().toLocaleDateString("ko-KR");

  return (
    <div id="settlement-print" style={{fontFamily:"Noto Sans KR,sans-serif",padding:40,maxWidth:800,margin:"0 auto",color:"#222"}}>
      {/* 헤더 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32,borderBottom:"2px solid #222",paddingBottom:16}}>
        <div>
          <h1 style={{margin:0,fontSize:26,fontWeight:800}}>정산서</h1>
          <p style={{margin:"4px 0 0",color:"#555",fontSize:13}}>발행일: {today}</p>
        </div>
        {company.logoUrl && <img src={company.logoUrl} alt="logo" style={{height:40,objectFit:"contain"}} />}
      </div>

      {/* 프로젝트 정보 */}
      <div style={{marginBottom:24,padding:"14px 18px",background:"#f8fafc",borderRadius:8,border:"1px solid #e4e7ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 24px"}}>
          {[["프로젝트명",project.name],["클라이언트",project.client],["감독",project.director],["PD",project.pd]].map(([k,v])=>(
            <div key={k} style={{display:"flex",gap:8,fontSize:13}}><span style={{color:"#6b7280",minWidth:80}}>{k}</span><span style={{fontWeight:600}}>{v||"-"}</span></div>
          ))}
        </div>
      </div>

      {/* 견적 vs 실지출 */}
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:12}}>견적 vs 실지출 비교</h2>
      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:24,fontSize:13}}>
        <thead>
          <tr style={{background:"#f1f5f9"}}>
            {["카테고리","견적금액","실지출","차액"].map(h=>(
              <th key={h} style={{padding:"8px 12px",textAlign:h==="카테고리"?"left":"right",borderBottom:"1px solid #cbd5e1"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(q.items||[]).map((cat,i)=>{
            const cAmt = catAmt(cat);
            const cSpent = vouchers.filter(v=>v.category===cat.category).reduce((s,v)=>s+(v.amount||0),0);
            const diff = cAmt - cSpent;
            return (
              <tr key={i} style={{borderBottom:"1px solid #e2e8f0"}}>
                <td style={{padding:"7px 12px"}}>{cat.category}</td>
                <td style={{padding:"7px 12px",textAlign:"right"}}>{fmt(cAmt)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",color:"#d97706"}}>{fmt(cSpent)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",color:diff>=0?"#16a34a":"#dc2626",fontWeight:600}}>{fmt(diff)}</td>
              </tr>
            );
          })}
          <tr style={{borderTop:"2px solid #222",background:"#f8fafc",fontWeight:700}}>
            <td style={{padding:"8px 12px"}}>합계</td>
            <td style={{padding:"8px 12px",textAlign:"right"}}>{fmt(qTotal(q))}</td>
            <td style={{padding:"8px 12px",textAlign:"right",color:"#d97706"}}>{fmt(totalSpent)}</td>
            <td style={{padding:"8px 12px",textAlign:"right",color:(qTotal(q)-totalSpent)>=0?"#16a34a":"#dc2626"}}>{fmt(qTotal(q)-totalSpent)}</td>
          </tr>
        </tbody>
      </table>

      {/* 지출 상세 */}
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:12}}>지출 상세 내역</h2>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead>
          <tr style={{background:"#f1f5f9"}}>
            {["날짜","내역","거래처","구분","카테고리","금액"].map(h=>(
              <th key={h} style={{padding:"6px 10px",textAlign:h==="금액"?"right":"left",borderBottom:"1px solid #cbd5e1"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vouchers.map((v,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #e2e8f0"}}>
              <td style={{padding:"5px 10px",whiteSpace:"nowrap"}}>{v.date}</td>
              <td style={{padding:"5px 10px"}}>{v.name}</td>
              <td style={{padding:"5px 10px"}}>{v.vendor}</td>
              <td style={{padding:"5px 10px"}}>{v.type}</td>
              <td style={{padding:"5px 10px",color:"#6b7280"}}>{v.category}</td>
              <td style={{padding:"5px 10px",textAlign:"right",fontWeight:600}}>{fmt(v.amount)}</td>
            </tr>
          ))}
          <tr style={{borderTop:"2px solid #222",fontWeight:700,background:"#f8fafc"}}>
            <td colSpan={5} style={{padding:"6px 10px"}}>총 지출</td>
            <td style={{padding:"6px 10px",textAlign:"right",color:"#d97706"}}>{fmt(totalSpent)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ===== STAFF LIST =====
function StaffList({ project, onChange, accounts }){
  const staff = project.staff || [];
  const [modal, setModal] = useState(null);
  const [sf, setSf] = useState({});
  const [filterGroup, setFilterGroup] = useState("전체");

  const STAFF_GROUPS = ["감독팀","제작팀","촬영팀","조명팀","미술팀","편집팀","CG팀","사운드팀","캐스팅","기타"];
  const ROLES = {
    "감독팀":["감독","조감독","연출부"],
    "제작팀":["PD","프로듀서","제작부","PM"],
    "촬영팀":["촬영감독","촬영1st","촬영2nd","DIT","드론"],
    "조명팀":["조명감독","조명1st","조명2nd","발전차"],
    "미술팀":["미술감독","세트","소품","의상","분장"],
    "편집팀":["편집","DI","DIT"],
    "CG팀":["CG감독","2D","3D","합성"],
    "사운드팀":["음악감독","사운드디자인","성우"],
    "캐스팅":["메인모델","조연","엑스트라"],
    "기타":["기타"],
  };

  const filtered = filterGroup === "전체" ? staff : staff.filter(s => s.group === filterGroup);

  const openAdd = (role="") => {
    setSf({ role, name:"", phone:"", email:"", company:"", note:"", fromTeam:false, memberId:"", group:"기타" });
    setModal("add");
  };
  const openEdit = s => { setSf({...s}); setModal("edit"); };

  const save = () => {
    if (!sf.name?.trim() && !sf.memberId) return;
    let entry = { ...sf, id: sf.id || "st" + Date.now() };
    if (sf.memberId && accounts) {
      const m = accounts.find(a => a.id === sf.memberId);
      if (m) entry = { ...entry, name: m.name, role: m.role };
    }
    const list = modal === "edit"
      ? staff.map(s => s.id === entry.id ? entry : s)
      : [...staff, entry];
    onChange({ ...project, staff: list });
    setModal(null);
  };

  const del = id => {
    if (window.confirm("삭제하시겠습니까?"))
      onChange({ ...project, staff: staff.filter(s => s.id !== id) });
  };

  const groupCounts = STAFF_GROUPS.reduce((acc, g) => {
    acc[g] = staff.filter(s => s.group === g).length;
    return acc;
  }, {});

  return (
    <div>
      {/* 그룹 필터 탭 */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {["전체", ...STAFF_GROUPS].map(g => (
          <button key={g} onClick={() => setFilterGroup(g)}
            style={{padding:"5px 12px",fontSize:12,borderRadius:20,border:`1px solid ${filterGroup===g?C.blue:C.border}`,background:filterGroup===g?C.blue:"transparent",color:filterGroup===g?"#fff":C.sub,cursor:"pointer",fontWeight:filterGroup===g?600:400}}>
            {g}{g!=="전체" && groupCounts[g]>0 ? ` (${groupCounts[g]})` : g==="전체" ? ` (${staff.length})` : ""}
          </button>
        ))}
      </div>

      {/* 추가 버튼 */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <Btn size="sm" onClick={() => openAdd()}>+ 스태프 추가</Btn>
      </div>

      {/* 스태프 목록 */}
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:40,color:C.faint,fontSize:14}}>
          {filterGroup === "전체" ? "등록된 스태프가 없습니다" : `${filterGroup} 스태프가 없습니다`}
        </div>
      ) : (
        <div style={{display:"grid",gap:8}}>
          {filtered.map(s => (
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:C.blueLight,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,color:C.blue,flexShrink:0}}>
                {s.name?.[0]||"?"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14}}>{s.name}</div>
                <div style={{fontSize:12,color:C.sub,marginTop:2}}>
                  {s.role && <span style={{marginRight:8}}>{s.role}</span>}
                  {s.group && <Badge color={C.slate} bg={C.slateLight}>{s.group}</Badge>}
                  {s.company && <span style={{marginLeft:8,color:C.faint}}>{s.company}</span>}
                </div>
              </div>
              {s.phone && <div style={{fontSize:12,color:C.sub,flexShrink:0}}>{s.phone}</div>}
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={() => openEdit(s)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer"}}>편집</button>
                <button onClick={() => del(s.id)} style={{background:"none",border:`1px solid ${C.red}`,color:C.red,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer"}}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 추가/편집 모달 */}
      {modal && (
        <Modal title={modal==="add"?"스태프 추가":"스태프 편집"} onClose={() => setModal(null)}>
          {accounts && accounts.length > 0 && (
            <Field label="팀원에서 선택">
              <select style={sel} value={sf.memberId||""} onChange={e => {
                const m = accounts.find(a => a.id === e.target.value);
                if (m) setSf(p => ({...p, memberId:m.id, name:m.name, role:m.role, fromTeam:true}));
                else setSf(p => ({...p, memberId:"", fromTeam:false}));
              }}>
                <option value="">직접 입력</option>
                {accounts.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
              </select>
            </Field>
          )}
          <Field label="이름" required>
            <input style={inp} value={sf.name||""} onChange={e => setSf(p => ({...p, name:e.target.value}))} />
          </Field>
          <Field label="그룹">
            <select style={sel} value={sf.group||"기타"} onChange={e => setSf(p => ({...p, group:e.target.value, role:""}))}>
              {STAFF_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="직책">
            <select style={sel} value={sf.role||""} onChange={e => setSf(p => ({...p, role:e.target.value}))}>
              <option value="">선택</option>
              {(ROLES[sf.group||"기타"]||[]).map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="연락처">
            <input style={inp} value={sf.phone||""} onChange={e => setSf(p => ({...p, phone:e.target.value}))} placeholder="010-0000-0000" />
          </Field>
          <Field label="이메일">
            <input style={inp} value={sf.email||""} onChange={e => setSf(p => ({...p, email:e.target.value}))} />
          </Field>
          <Field label="소속/회사">
            <input style={inp} value={sf.company||""} onChange={e => setSf(p => ({...p, company:e.target.value}))} />
          </Field>
          <Field label="메모">
            <textarea style={{...inp,minHeight:60,resize:"vertical"}} value={sf.note||""} onChange={e => setSf(p => ({...p, note:e.target.value}))} />
          </Field>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
            <Btn variant="subtle" onClick={() => setModal(null)}>취소</Btn>
            <Btn onClick={save}>저장</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===== FEEDBACK TAB =====
function FeedbackTab({ project, onChange, currentUser, accounts, setNotifications }){
  const feedbacks = project.feedbacks || [];
  const [modal, setModal] = useState(null);
  const [fb, setFb] = useState({});
  const [viewFb, setViewFb] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const commentRef = useRef(null);

  const FEEDBACK_STAGES = ["접수","검토중","수정중","완료","보류"];

  const openAdd = () => {
    setFb({ id:newId(), title:"", content:"", detail:"", receivedDate:new Date().toISOString().slice(0,10),
            dueDate:"", stage:"접수", pdStatus:"미확인", staffStatus:"미확인",
            assignees:[], attachLink:"", comments:[], createdAt:Date.now(), createdBy:currentUser?.id });
    setModal("add");
  };
  const openEdit = (f) => { setFb({...f}); setModal("edit"); };

  const save = () => {
    const list = modal==="edit"
      ? feedbacks.map(f => f.id===fb.id ? fb : f)
      : [...feedbacks, fb];
    onChange({ ...project, feedbacks: list });
    // 담당자 알림
    if (modal==="add" && fb.assignees?.length && setNotifications) {
      fb.assignees.forEach(aid => {
        if (aid !== currentUser?.id) {
          setNotifications(prev => [...prev, {
            id: newId(), type:"assign", targetUserId: aid,
            text: `[${project.name}] "${fb.title||"피드백"}" 담당자로 지정되었습니다`,
            at: Date.now(), read: false
          }]);
        }
      });
    }
    setModal(null);
  };

  const del = id => {
    if (window.confirm("삭제하시겠습니까?"))
      onChange({ ...project, feedbacks: feedbacks.filter(f => f.id !== id) });
  };

  const addComment = (fbId) => {
    if (!commentText.trim()) return;
    const comment = { id:newId(), text:commentText.trim(), author:currentUser?.name||"익명", authorId:currentUser?.id, at:Date.now() };
    const list = feedbacks.map(f => f.id===fbId ? {...f, comments:[...(f.comments||[]), comment]} : f);
    onChange({ ...project, feedbacks: list });
    // 멘션 알림
    const mentions = [...commentText.matchAll(/@(\S+)/g)].map(m => m[1]);
    if (setNotifications && mentions.length > 0) {
      const targetFb = feedbacks.find(f => f.id===fbId);
      mentions.forEach(mentionName => {
        const target = accounts?.find(a => a.name===mentionName);
        if (target && target.id !== currentUser?.id) {
          setNotifications(prev => [...prev, {
            id: newId(), type:"mention", targetUserId: target.id,
            text: `[${project.name}] "${targetFb?.title||"피드백"}" 댓글에서 멘션되었습니다`,
            at: Date.now(), read: false
          }]);
        }
      });
    }
    // 뷰 업데이트
    const updated = feedbacks.map(f => f.id===fbId ? {...f, comments:[...(f.comments||[]), comment]} : f);
    const found = updated.find(f => f.id===fbId);
    if (found) setViewFb(found);
    setCommentText("");
  };

  const delComment = (fbId, cId) => {
    const list = feedbacks.map(f => f.id===fbId ? {...f, comments:(f.comments||[]).filter(c => c.id!==cId)} : f);
    onChange({ ...project, feedbacks: list });
    const found = list.find(f => f.id===fbId);
    if (found) setViewFb(found);
  };

  const stageColor = (s) => {
    return {
      "접수":   { color:C.slate, bg:C.slateLight },
      "검토중": { color:C.blue, bg:C.blueLight },
      "수정중": { color:C.amber, bg:C.amberLight },
      "완료":   { color:C.green, bg:C.greenLight },
      "보류":   { color:C.red, bg:C.redLight },
    }[s] || { color:C.sub, bg:C.border };
  };

  const handleCommentChange = (e) => {
    const val = e.target.value;
    setCommentText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0) {
      const search = val.slice(lastAt+1).split(" ")[0];
      setMentionSearch(search);
      if (search.length >= 0 && accounts) {
        const sugg = accounts.filter(a => a.name.includes(search) || search === "");
        setMentionSuggestions(sugg.slice(0,5));
      }
    } else {
      setMentionSuggestions([]);
    }
  };

  const insertMention = (name) => {
    const lastAt = commentText.lastIndexOf("@");
    const before = commentText.slice(0, lastAt);
    setCommentText(before + "@" + name + " ");
    setMentionSuggestions([]);
    commentRef.current?.focus();
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <Btn size="sm" onClick={openAdd}>+ 피드백 추가</Btn>
      </div>

      {feedbacks.length === 0 ? (
        <div style={{textAlign:"center",padding:60,color:C.faint,fontSize:14}}>등록된 피드백이 없습니다</div>
      ) : (
        <div style={{display:"grid",gap:10}}>
          {feedbacks.map(f => {
            const sc = stageColor(f.stage);
            const isOverdue = f.dueDate && new Date(f.dueDate) < new Date() && f.stage !== "완료";
            return (
              <div key={f.id} style={{border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",background:C.white,cursor:"pointer",transition:"box-shadow .15s"}}
                onClick={() => setViewFb(f)}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:15}}>{f.title||"(제목 없음)"}</span>
                      <Badge color={sc.color} bg={sc.bg}>{f.stage}</Badge>
                      {isOverdue && <Badge color={C.red} bg={C.redLight}>기한초과</Badge>}
                    </div>
                    {f.content && <div style={{fontSize:13,color:C.sub,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.content}</div>}
                    <div style={{display:"flex",gap:12,fontSize:12,color:C.faint,flexWrap:"wrap"}}>
                      {f.receivedDate && <span>수신: {f.receivedDate}</span>}
                      {f.dueDate && <span style={{color:isOverdue?C.red:C.faint}}>마감: {f.dueDate}</span>}
                      {f.assignees?.length > 0 && (
                        <span>담당: {f.assignees.map(aid => accounts?.find(a=>a.id===aid)?.name||aid).join(", ")}</span>
                      )}
                      {(f.comments||[]).length > 0 && <span>💬 {f.comments.length}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                    <button onClick={() => openEdit(f)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",fontSize:12,cursor:"pointer"}}>편집</button>
                    <button onClick={() => del(f.id)} style={{background:"none",border:`1px solid ${C.red}`,color:C.red,borderRadius:6,padding:"4px 8px",fontSize:12,cursor:"pointer"}}>삭제</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 추가/편집 모달 */}
      {modal && (
        <Modal title={modal==="add"?"피드백 추가":"피드백 편집"} onClose={() => setModal(null)} width="600px">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="수신일"><input style={inp} type="date" value={fb.receivedDate||""} onChange={e=>setFb(p=>({...p,receivedDate:e.target.value}))} /></Field>
            <Field label="마감일"><input style={inp} type="date" value={fb.dueDate||""} onChange={e=>setFb(p=>({...p,dueDate:e.target.value}))} /></Field>
          </div>
          <Field label="제목" required><input style={inp} value={fb.title||""} onChange={e=>setFb(p=>({...p,title:e.target.value}))} /></Field>
          <Field label="내용"><textarea style={{...inp,minHeight:80,resize:"vertical"}} value={fb.content||""} onChange={e=>setFb(p=>({...p,content:e.target.value}))} /></Field>
          <Field label="세부사항"><textarea style={{...inp,minHeight:60,resize:"vertical"}} value={fb.detail||""} onChange={e=>setFb(p=>({...p,detail:e.target.value}))} /></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="단계">
              <select style={sel} value={fb.stage||"접수"} onChange={e=>setFb(p=>({...p,stage:e.target.value}))}>
                {FEEDBACK_STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="PD 확인">
              <select style={sel} value={fb.pdStatus||"미확인"} onChange={e=>setFb(p=>({...p,pdStatus:e.target.value}))}>
                {["미확인","확인","처리중","완료"].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="담당자">
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
              {(fb.assignees||[]).map(aid => {
                const m = accounts?.find(a=>a.id===aid);
                return (
                  <span key={aid} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",background:C.blueLight,borderRadius:20,fontSize:12,color:C.blue}}>
                    {m?.name||aid}
                    <button onClick={()=>setFb(p=>({...p,assignees:p.assignees.filter(a=>a!==aid)}))} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:14,lineHeight:1,padding:0}}>×</button>
                  </span>
                );
              })}
            </div>
            <select style={sel} value="" onChange={e=>{
              if (e.target.value && !(fb.assignees||[]).includes(e.target.value))
                setFb(p=>({...p,assignees:[...(p.assignees||[]),e.target.value]}));
            }}>
              <option value="">+ 담당자 추가</option>
              {(accounts||[]).filter(a=>!(fb.assignees||[]).includes(a.id)).map(a=>(
                <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
              ))}
            </select>
          </Field>
          <Field label="첨부 링크"><input style={inp} value={fb.attachLink||""} onChange={e=>setFb(p=>({...p,attachLink:e.target.value}))} placeholder="https://" /></Field>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
            <Btn variant="subtle" onClick={()=>setModal(null)}>취소</Btn>
            <Btn onClick={save}>저장</Btn>
          </div>
        </Modal>
      )}

      {/* 상세 보기 모달 */}
      {viewFb && (
        <Modal title={viewFb.title||"피드백 상세"} onClose={() => setViewFb(null)} width="640px">
          <div style={{marginBottom:16}}>
            {(() => { const sc=stageColor(viewFb.stage); return <Badge color={sc.color} bg={sc.bg}>{viewFb.stage}</Badge>; })()}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 16px",marginBottom:16,fontSize:13}}>
            {[["수신일",viewFb.receivedDate],["마감일",viewFb.dueDate],["PD 확인",viewFb.pdStatus]].map(([k,v])=>v&&(
              <div key={k}><span style={{color:C.sub}}>{k}: </span><strong>{v}</strong></div>
            ))}
            {viewFb.assignees?.length>0 && (
              <div><span style={{color:C.sub}}>담당자: </span>
                <strong>{viewFb.assignees.map(aid=>accounts?.find(a=>a.id===aid)?.name||aid).join(", ")}</strong>
              </div>
            )}
          </div>
          {viewFb.content && <div style={{marginBottom:12,padding:12,background:C.slateLight,borderRadius:8,fontSize:14,lineHeight:1.6}}>{viewFb.content}</div>}
          {viewFb.detail && <div style={{marginBottom:12,padding:12,background:"#fafafa",borderRadius:8,fontSize:13,color:C.sub,lineHeight:1.6,whiteSpace:"pre-line"}}>{viewFb.detail}</div>}
          {viewFb.attachLink && <div style={{marginBottom:12,fontSize:13}}><a href={viewFb.attachLink} target="_blank" rel="noreferrer" style={{color:C.blue}}>첨부 링크 열기 ↗</a></div>}

          {/* 댓글 */}
          <div style={{borderTop:`1px solid ${C.border}`,marginTop:16,paddingTop:16}}>
            <h4 style={{margin:"0 0 12px",fontSize:14}}>댓글 {(viewFb.comments||[]).length}</h4>
            <div style={{display:"grid",gap:8,marginBottom:12}}>
              {(viewFb.comments||[]).map(c => (
                <div key={c.id} style={{padding:"10px 12px",background:C.slateLight,borderRadius:8,fontSize:13}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <strong style={{fontSize:13}}>{c.author}</strong>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:11,color:C.faint}}>{new Date(c.at).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
                      {(currentUser?.id===c.authorId || currentUser?.canManageMembers) && (
                        <button onClick={() => delComment(viewFb.id, c.id)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:12,padding:0}}>삭제</button>
                      )}
                    </div>
                  </div>
                  <div style={{lineHeight:1.6,whiteSpace:"pre-line"}}>{c.text}</div>
                </div>
              ))}
            </div>
            {/* 댓글 입력 */}
            <div style={{position:"relative"}}>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1,position:"relative"}}>
                  <textarea ref={commentRef} style={{...inp,minHeight:60,resize:"vertical"}} value={commentText}
                    onChange={handleCommentChange} placeholder="댓글 작성... (@이름으로 멘션)" />
                  {mentionSuggestions.length > 0 && (
                    <div style={{position:"absolute",bottom:"100%",left:0,background:C.white,border:`1px solid ${C.border}`,borderRadius:8,boxShadow:"0 4px 12px rgba(0,0,0,.1)",minWidth:160,zIndex:10}}>
                      {mentionSuggestions.map(a => (
                        <div key={a.id} onClick={() => insertMention(a.name)}
                          style={{padding:"8px 12px",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}
                          onMouseEnter={e=>e.currentTarget.style.background=C.blueLight}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <strong>{a.name}</strong><span style={{color:C.sub,fontSize:12}}>{a.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Btn onClick={() => addComment(viewFb.id)}>전송</Btn>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===== DAILY TODO =====
function DailyTodo({ projects, accounts, currentUser }){
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [showMemberToggle, setShowMemberToggle] = useState(false);
  const [showMembers, setShowMembers] = useState(null); // null = all

  const hours = Array.from({length:12}, (_,i) => 8+i); // 8AM - 7PM

  // 해당 날짜에 마감인 태스크 수집
  const todayTasks = projects.flatMap(p =>
    (p.tasks||[]).filter(t => t.due === selectedDate).map(t => ({...t, projectName:p.name, projectColor:p.color, projectId:p.id}))
  );

  const members = showMembers === null ? accounts : accounts.filter(a => showMembers.includes(a.id));
  const myTasks = todayTasks.filter(t => t.assignee === currentUser?.name);

  return (
    <div>
      {/* 날짜 선택 */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={()=>{const d=new Date(selectedDate);d.setDate(d.getDate()-1);setSelectedDate(d.toISOString().slice(0,10));}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:16}}>‹</button>
        <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={{...inp,width:"auto",padding:"8px 12px",fontSize:15,fontWeight:600}} />
        <button onClick={()=>{const d=new Date(selectedDate);d.setDate(d.getDate()+1);setSelectedDate(d.toISOString().slice(0,10));}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:16}}>›</button>
        <button onClick={()=>setSelectedDate(new Date().toISOString().slice(0,10))} style={{padding:"6px 14px",background:C.blueLight,border:`1px solid ${C.blueMid}`,borderRadius:7,cursor:"pointer",fontSize:13,color:C.blue,fontWeight:600}}>오늘</button>
        <div style={{marginLeft:"auto",position:"relative"}}>
          <Btn size="sm" variant="ghost" onClick={()=>setShowMemberToggle(p=>!p)}>구성원 선택 ▾</Btn>
          {showMemberToggle && (
            <div style={{position:"absolute",right:0,top:"100%",marginTop:4,background:C.white,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.1)",zIndex:100,padding:12,minWidth:200}}>
              <div style={{fontSize:12,color:C.sub,marginBottom:8}}>표시할 구성원</div>
              {accounts.map(a => {
                const selected = showMembers===null || showMembers.includes(a.id);
                return (
                  <label key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",cursor:"pointer",fontSize:13}}>
                    <input type="checkbox" checked={selected} onChange={()=>{
                      if (showMembers===null) setShowMembers(accounts.filter(m=>m.id!==a.id).map(m=>m.id));
                      else if (showMembers.includes(a.id)) setShowMembers(showMembers.filter(id=>id!==a.id));
                      else {
                        const next = [...showMembers, a.id];
                        if (next.length===accounts.length) setShowMembers(null);
                        else setShowMembers(next);
                      }
                    }} />
                    {a.name} <span style={{color:C.faint,fontSize:11}}>{a.role}</span>
                    {a.id===currentUser?.id && <Badge color={C.blue} bg={C.blueLight}>나</Badge>}
                  </label>
                );
              })}
              <button onClick={()=>{setShowMembers(null);setShowMemberToggle(false);}} style={{marginTop:8,width:"100%",padding:"6px",background:C.slateLight,border:"none",borderRadius:6,cursor:"pointer",fontSize:12}}>전체 표시</button>
            </div>
          )}
        </div>
      </div>

      {/* 오늘의 할 일 요약 */}
      {myTasks.length > 0 && (
        <div style={{marginBottom:20,padding:14,background:C.blueLight,borderRadius:10,border:`1px solid ${C.blueMid}`}}>
          <div style={{fontWeight:700,fontSize:14,color:C.blue,marginBottom:8}}>오늘 내 마감 태스크 ({myTasks.length})</div>
          <div style={{display:"grid",gap:6}}>
            {myTasks.map(t => (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:t.projectColor||C.blue,flexShrink:0}}></span>
                <span style={{fontWeight:600}}>{t.title}</span>
                <span style={{color:C.sub,fontSize:12}}>{t.projectName}</span>
                <Badge color={STAGES[t.stage]?.color||C.sub} bg={STAGES[t.stage]?.bg||C.slateLight}>{t.stage}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 타임라인 */}
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",minWidth:800,borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th style={{width:80,textAlign:"left",padding:"8px 12px",fontSize:12,color:C.sub,borderBottom:`2px solid ${C.border}`,position:"sticky",left:0,background:C.white,zIndex:2}}>시간</th>
              {members.map(m => (
                <th key={m.id} style={{padding:"8px 12px",fontSize:12,color:m.id===currentUser?.id?C.blue:C.sub,borderBottom:`2px solid ${C.border}`,fontWeight:m.id===currentUser?.id?700:500,textAlign:"center",minWidth:120}}>
                  {m.name}
                  {m.id===currentUser?.id && " ✦"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(h => {
              const tasks = todayTasks.filter(t => {
                // 임시: 모든 태스크를 아무 시간 칸에 배치하지 않고, 마감일만 표시
                return false;
              });
              return (
                <tr key={h} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"12px",fontSize:12,color:C.faint,verticalAlign:"top",position:"sticky",left:0,background:C.white,zIndex:1,whiteSpace:"nowrap"}}>
                    {h < 12 ? `오전 ${h}시` : h===12 ? "오후 12시" : `오후 ${h-12}시`}
                  </td>
                  {members.map(m => (
                    <td key={m.id} style={{padding:"8px",verticalAlign:"top",minHeight:40,borderLeft:`1px solid ${C.border}`}}>
                      {todayTasks.filter(t => t.assignee===m.name).map(t => (
                        h === 9 ? ( // 9AM에 해당 멤버 태스크 표시
                          <div key={t.id} style={{padding:"4px 8px",borderRadius:6,background:t.projectColor||C.blue,color:"#fff",fontSize:11,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {t.title}
                          </div>
                        ) : null
                      ))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 날짜 전체 태스크 */}
      {todayTasks.length > 0 && (
        <div style={{marginTop:20}}>
          <h4 style={{fontSize:14,fontWeight:700,marginBottom:12}}>이 날 마감 태스크 ({todayTasks.length})</h4>
          <div style={{display:"grid",gap:8}}>
            {todayTasks.map(t => (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:8}}>
                <div style={{width:4,height:40,borderRadius:4,background:t.projectColor||C.blue,flexShrink:0}}></div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{t.title}</div>
                  <div style={{fontSize:12,color:C.sub,marginTop:2}}>{t.projectName} · {t.type}</div>
                </div>
                <Badge color={C.sub} bg={C.slateLight}>{t.assignee||"미배정"}</Badge>
                <Badge color={STAGES[t.stage]?.color||C.sub} bg={STAGES[t.stage]?.bg||C.slateLight}>{t.stage}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {todayTasks.length === 0 && (
        <div style={{textAlign:"center",padding:60,color:C.faint,fontSize:14}}>이 날 마감 태스크가 없습니다</div>
      )}
    </div>
  );
}

// ===== MONTH CALENDAR =====
function MonthCalendar({ projects, feedbackEvents, onSelectDate }){
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({length:daysInMonth}, (_,i) => i+1);

  const prevMonth = () => { if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); };

  const eventsByDate = {};
  projects.forEach(p => {
    (p.tasks||[]).forEach(t => {
      if (t.due) {
        const d = t.due;
        if (!eventsByDate[d]) eventsByDate[d] = [];
        eventsByDate[d].push({ type:"task", color:p.color||C.blue, label:t.title, sub:p.name, stage:t.stage });
      }
    });
    if (p.due) {
      if (!eventsByDate[p.due]) eventsByDate[p.due] = [];
      eventsByDate[p.due].push({ type:"project", color:p.color||C.blue, label:p.name+"(납품)", bg:p.color||C.blue });
    }
  });

  // 피드백 마감일
  (feedbackEvents||[]).forEach(fe => {
    if (fe.dueDate) {
      if (!eventsByDate[fe.dueDate]) eventsByDate[fe.dueDate] = [];
      eventsByDate[fe.dueDate].push({ type:"feedback", color:C.purple, label:fe.title, sub:"피드백" });
    }
  });

  const cellDate = (day) => `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

  const WEEKDAYS = ["일","월","화","수","목","금","토"];

  return (
    <div>
      {/* 헤더 */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button onClick={prevMonth} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:18}}>‹</button>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,flex:1,textAlign:"center"}}>{year}년 {month+1}월</h2>
        <button onClick={nextMonth} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:18}}>›</button>
      </div>

      {/* 요일 헤더 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{textAlign:"center",fontSize:12,fontWeight:700,color:d==="일"?C.red:d==="토"?C.blue:C.sub,padding:"6px 0"}}>{d}</div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {Array.from({length:firstDay}).map((_,i) => (
          <div key={"e"+i} style={{minHeight:80,background:"#fafafa",borderRadius:6,border:`1px solid ${C.border}`}}></div>
        ))}
        {days.map(day => {
          const dateStr = cellDate(day);
          const events = eventsByDate[dateStr]||[];
          const isToday = dateStr === today.toISOString().slice(0,10);
          const isSelected = dateStr === selectedDate;
          const dow = new Date(year, month, day).getDay();
          return (
            <div key={day} onClick={() => { setSelectedDate(dateStr); if(onSelectDate) onSelectDate(dateStr); }}
              style={{minHeight:80,background:isSelected?C.blueLight:C.white,borderRadius:6,border:`2px solid ${isSelected?C.blue:C.border}`,padding:4,cursor:"pointer",transition:"all .1s",position:"relative"}}>
              <div style={{fontWeight:isToday?700:400,color:isToday?C.blue:dow===0?C.red:dow===6?"#2563eb":C.text,fontSize:13,marginBottom:2}}>
                {isToday ? (
                  <span style={{background:C.blue,color:"#fff",width:22,height:22,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{day}</span>
                ) : day}
              </div>
              <div style={{display:"grid",gap:1}}>
                {events.slice(0,3).map((ev,i) => (
                  <div key={i} style={{fontSize:10,padding:"1px 4px",borderRadius:3,background:ev.color+"22",color:ev.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600}}>
                    {ev.type==="feedback"?"💬 ":""}{ev.label}
                  </div>
                ))}
                {events.length > 3 && (
                  <div style={{fontSize:10,color:C.faint,paddingLeft:4}}>+{events.length-3}개</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 선택된 날짜의 이벤트 상세 */}
      {selectedDate && (eventsByDate[selectedDate]||[]).length > 0 && (
        <div style={{marginTop:16,padding:16,background:C.slateLight,borderRadius:10}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>{selectedDate} 일정</div>
          <div style={{display:"grid",gap:6}}>
            {(eventsByDate[selectedDate]||[]).map((ev,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.white,borderRadius:8,border:`1px solid ${C.border}`}}>
                <div style={{width:4,height:36,borderRadius:4,background:ev.color,flexShrink:0}}></div>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{ev.label}</div>
                  {ev.sub && <div style={{fontSize:11,color:C.sub}}>{ev.sub}</div>}
                </div>
                {ev.stage && <Badge color={STAGES[ev.stage]?.color||C.sub} bg={STAGES[ev.stage]?.bg||C.slateLight}>{ev.stage}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== FINANCE DASHBOARD =====
function FinanceDashboard({ projects }){
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const months = Array.from({length:12}, (_,i) => i);
  const GOAL = 300000000; // 3억

  const getMonthlyRevenue = (year, month) => {
    return projects
      .filter(p => {
        if (!p.settled && !p.settlementDate) return false;
        const d = new Date(p.settlementDate || p.due);
        return d.getFullYear()===year && d.getMonth()===month;
      })
      .reduce((s,p) => s + qTotal(p.quote||{}), 0);
  };

  const getMonthlyExpense = (year, month) => {
    return projects.reduce((s, p) => {
      if (!p.settlementDate) return s;
      const pDate = new Date(p.settlementDate);
      if (pDate.getFullYear()!==year || pDate.getMonth()!==month) return s;
      return s + vTotal(p.budget||{});
    }, 0);
  };

  const monthlyData = months.map(m => ({
    month: m+1,
    revenue: getMonthlyRevenue(viewYear, m),
    expense: getMonthlyExpense(viewYear, m),
  }));

  const yearRevenue = monthlyData.reduce((s,d) => s+d.revenue, 0);
  const yearExpense = monthlyData.reduce((s,d) => s+d.expense, 0);
  const yearProfit = yearRevenue - yearExpense;

  const maxVal = Math.max(...monthlyData.map(d => Math.max(d.revenue, GOAL/12)), 1);

  // 현재 진행중인 프로젝트 수주 합계
  const activeProjects = projects.filter(p => p.stage !== "납품완료");
  const pendingRevenue = activeProjects.reduce((s,p) => s + qTotal(p.quote||{}), 0);

  return (
    <div>
      {/* 연도 선택 */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>setViewYear(y=>y-1)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer"}}>‹</button>
        <h3 style={{margin:0,fontSize:18,fontWeight:700}}>{viewYear}년 재무 현황</h3>
        <button onClick={()=>setViewYear(y=>y+1)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer"}}>›</button>
      </div>

      {/* 연간 요약 카드 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        {[
          {label:"연간 매출",val:yearRevenue,color:C.blue},
          {label:"연간 지출",val:yearExpense,color:C.amber},
          {label:"순이익",val:yearProfit,color:yearProfit>=0?C.green:C.red},
          {label:"진행중 수주 예상",val:pendingRevenue,color:C.purple},
        ].map(c => (
          <div key={c.label} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:"16px 18px",textAlign:"center"}}>
            <div style={{fontSize:12,color:C.sub,marginBottom:6}}>{c.label}</div>
            <div style={{fontSize:16,fontWeight:700,color:c.color}}>{fmtM(c.val)}</div>
          </div>
        ))}
      </div>

      {/* 월별 차트 */}
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:20,marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16,flexWrap:"wrap"}}>
          <h4 style={{margin:0,fontSize:14,fontWeight:700}}>월별 수주 현황</h4>
          <div style={{display:"flex",gap:12,fontSize:12}}>
            {[["매출",C.blue],["지출",C.amber],["목표",C.red]].map(([l,c]) => (
              <span key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:12,height:4,borderRadius:2,background:c,display:"inline-block"}}></span>{l}
              </span>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:180}}>
          {monthlyData.map((d,i) => {
            const rH = Math.round((d.revenue / maxVal) * 160);
            const eH = Math.round((d.expense / maxVal) * 160);
            const goalH = Math.round((GOAL/12 / maxVal) * 160);
            return (
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <div style={{width:"100%",display:"flex",gap:1,alignItems:"flex-end",height:165,position:"relative"}}>
                  {/* 목표선 */}
                  <div style={{position:"absolute",bottom:goalH,left:0,right:0,borderTop:`1px dashed ${C.red}22`,zIndex:1}}></div>
                  <div style={{flex:1,background:C.blue+"cc",borderRadius:"3px 3px 0 0",height:rH||0,minHeight:rH>0?2:0,transition:"height .3s"}}></div>
                  <div style={{flex:1,background:C.amber+"99",borderRadius:"3px 3px 0 0",height:eH||0,minHeight:eH>0?2:0,transition:"height .3s"}}></div>
                </div>
                <div style={{fontSize:10,color:C.sub,textAlign:"center"}}>{d.month}월</div>
                {d.revenue > 0 && <div style={{fontSize:9,color:C.blue,fontWeight:700}}>{fmtM(d.revenue)}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 프로젝트별 수주 목록 */}
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:20}}>
        <h4 style={{margin:"0 0 14px",fontSize:14,fontWeight:700}}>프로젝트별 재무</h4>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:600,fontSize:13}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.border}`,background:C.slateLight}}>
                {["프로젝트","단계","견적 합계","지출 합계","잔액","정산 여부"].map(h => (
                  <th key={h} style={{padding:"8px 12px",textAlign:["견적 합계","지출 합계","잔액"].includes(h)?"right":"left",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const rev = qTotal(p.quote||{});
                const exp = vTotal(p.budget||{});
                const bal = rev - exp;
                const sc = STAGES[p.stage]||{color:C.sub,bg:C.slateLight};
                return (
                  <tr key={p.id} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"8px 12px",fontWeight:600}}>{p.name}</td>
                    <td style={{padding:"8px 12px"}}><Badge color={sc.color} bg={sc.bg}>{p.stage}</Badge></td>
                    <td style={{padding:"8px 12px",textAlign:"right",color:C.blue}}>{fmtM(rev)}</td>
                    <td style={{padding:"8px 12px",textAlign:"right",color:C.amber}}>{fmtM(exp)}</td>
                    <td style={{padding:"8px 12px",textAlign:"right",color:bal>=0?C.green:C.red,fontWeight:600}}>{fmtM(bal)}</td>
                    <td style={{padding:"8px 12px"}}>
                      {p.settled ? <Badge color={C.green} bg={C.greenLight}>정산완료</Badge> : <Badge color={C.faint} bg="#f9fafb">미정산</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== QUOTE PRINT =====
function QuotePrint({ project, company, onClose }){
  const q = project.quote || {};
  const today = new Date().toLocaleDateString("ko-KR");
  const validDate = new Date();
  validDate.setDate(validDate.getDate() + (company.validDays||30));
  const validStr = validDate.toLocaleDateString("ko-KR");

  const print = () => {
    window.print();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1100,overflow:"auto"}}>
      <div style={{maxWidth:820,margin:"20px auto",background:C.white,borderRadius:12}}>
        {/* 툴바 */}
        <div style={{padding:"12px 20px",display:"flex",justifyContent:"space-between",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,background:C.white,zIndex:1,borderRadius:"12px 12px 0 0",className:"no-print"}}>
          <h3 style={{margin:0}}>견적서 미리보기</h3>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={print}>🖨️ 인쇄</Btn>
            <Btn variant="subtle" onClick={onClose}>닫기</Btn>
          </div>
        </div>
        <div style={{padding:48}}>
          {/* 견적서 헤더 */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32}}>
            <div>
              <h1 style={{margin:"0 0 8px",fontSize:32,fontWeight:800,letterSpacing:-1}}>견 적 서</h1>
              <div style={{fontSize:13,color:C.sub}}>발행일: {today} | 유효기간: {validStr}까지</div>
            </div>
            {company.logoUrl && <img src={company.logoUrl} alt={company.name} style={{height:50,objectFit:"contain"}} />}
          </div>

          {/* 기본 정보 */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
            {/* 공급받는 자 */}
            <div style={{padding:16,border:`1px solid ${C.border}`,borderRadius:8}}>
              <div style={{fontWeight:700,marginBottom:8,fontSize:13,color:C.sub}}>공급받는 자</div>
              <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{project.client}</div>
              <div style={{fontSize:13,color:C.sub}}>프로젝트: {project.name}</div>
            </div>
            {/* 공급자 */}
            <div style={{padding:16,border:`1px solid ${C.border}`,borderRadius:8}}>
              <div style={{fontWeight:700,marginBottom:8,fontSize:13,color:C.sub}}>공급자</div>
              <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{company.name}</div>
              {company.ceo && <div style={{fontSize:13}}>대표: {company.ceo}</div>}
              {company.bizNo && <div style={{fontSize:13,color:C.sub}}>사업자번호: {company.bizNo}</div>}
              {company.phone && <div style={{fontSize:13,color:C.sub}}>{company.phone}</div>}
            </div>
          </div>

          {/* 금액 박스 */}
          <div style={{padding:16,background:C.blueLight,borderRadius:8,marginBottom:24,textAlign:"center"}}>
            <div style={{fontSize:13,color:C.sub,marginBottom:4}}>최종 견적금액</div>
            <div style={{fontSize:28,fontWeight:800,color:C.blue}}>{fmt(qTotal(q))}</div>
            <div style={{fontSize:12,color:C.sub,marginTop:4}}>
              (공급가액: {fmt(qSupply(q))}{q.vat?` | 부가세: ${fmt(qVat(q))}`:""})
            </div>
          </div>

          {/* 견적 항목 테이블 */}
          {(q.items||[]).map((cat,ci) => {
            const cAmt = catAmt(cat);
            if (cAmt === 0) return null;
            return (
              <div key={ci} style={{marginBottom:20}}>
                <div style={{background:"#1e293b",color:"#fff",padding:"8px 14px",borderRadius:"6px 6px 0 0",fontWeight:700,fontSize:14}}>
                  {cat.category}  {fmt(cAmt)}
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,border:`1px solid ${C.border}`}}>
                  <thead>
                    <tr style={{background:"#f8fafc",borderBottom:`1px solid ${C.border}`}}>
                      {["항목","단위","수량","단가","금액"].map(h => (
                        <th key={h} style={{padding:"6px 10px",textAlign:["금액","단가"].includes(h)?"right":"left"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.groups.map((grp,gi) => {
                      const gAmt = grpAmt(grp);
                      if (gAmt===0) return null;
                      return [
                        <tr key={"g"+gi} style={{background:"#f1f5f9",borderBottom:`1px solid ${C.border}`}}>
                          <td colSpan={4} style={{padding:"5px 10px",fontWeight:600,fontSize:11,color:C.slate}}>{grp.group}</td>
                          <td style={{padding:"5px 10px",textAlign:"right",fontWeight:600,fontSize:11,color:C.slate}}>{fmt(gAmt)}</td>
                        </tr>,
                        ...grp.items.filter(it=>itemAmt(it)>0).map((it,ii) => (
                          <tr key={ii} style={{borderBottom:`1px solid #f0f0f0`}}>
                            <td style={{padding:"5px 10px",paddingLeft:20}}>{it.name}</td>
                            <td style={{padding:"5px 10px"}}>{it.unit}</td>
                            <td style={{padding:"5px 10px",textAlign:"right"}}>{it.qty}</td>
                            <td style={{padding:"5px 10px",textAlign:"right"}}>{fmt(it.unitPrice)}</td>
                            <td style={{padding:"5px 10px",textAlign:"right",fontWeight:600}}>{fmt(itemAmt(it))}</td>
                          </tr>
                        )),
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* 합계 */}
          <table style={{width:"100%",borderCollapse:"collapse",border:`1px solid ${C.border}`,marginBottom:24}}>
            <tbody>
              <tr style={{borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:"8px 14px",fontWeight:600}}>소계</td>
                <td style={{padding:"8px 14px",textAlign:"right"}}>{fmt(qSub(q))}</td>
              </tr>
              {(q.agencyFeeRate||0)>0 && (
                <tr style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"8px 14px",fontWeight:600}}>대행 수수료 ({q.agencyFeeRate}%)</td>
                  <td style={{padding:"8px 14px",textAlign:"right"}}>{fmt(qFee(q))}</td>
                </tr>
              )}
              {q.vat && (
                <tr style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"8px 14px",fontWeight:600}}>부가세 (10%)</td>
                  <td style={{padding:"8px 14px",textAlign:"right"}}>{fmt(qVat(q))}</td>
                </tr>
              )}
              <tr style={{background:C.blue,color:"#fff"}}>
                <td style={{padding:"10px 14px",fontWeight:800,fontSize:15}}>최종 합계</td>
                <td style={{padding:"10px 14px",textAlign:"right",fontWeight:800,fontSize:16}}>{fmt(qTotal(q))}</td>
              </tr>
            </tbody>
          </table>

          {/* 비고 */}
          {company.quoteNote && (
            <div style={{padding:16,background:C.slateLight,borderRadius:8,marginBottom:24}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>특기사항</div>
              <div style={{fontSize:12,color:C.sub,whiteSpace:"pre-line",lineHeight:1.8}}>{company.quoteNote}</div>
            </div>
          )}

          {/* 계좌정보 */}
          {(company.bankName||company.bankAccount) && (
            <div style={{padding:14,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13}}>
              <div style={{fontWeight:700,marginBottom:6}}>입금 계좌</div>
              <div>{company.bankName} {company.bankAccount} ({company.bankHolder})</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== PROJECT MODAL =====
function ProjectModal({ project, onSave, onClose, accounts, currentUser }){
  const [p, setP] = useState(() => project || {
    id:newId(), name:"", client:"", color:P_COLORS[0], format:"",
    due:"", director:"", pd:"", stage:"브리프", createdAt:new Date().toISOString().slice(0,10),
    tasks:[], quote:{ vat:true, agencyFeeRate:10, items:makeTemplate() },
    budget:{ vouchers:[] }, settled:false, settlementDate:null, feedbacks:[], staff:[],
  });
  const [tab, setTab] = useState("info");
  const [showSettlement, setShowSettlement] = useState(false);
  const [showQuotePrint, setShowQuotePrint] = useState(false);

  const TABS = [
    {id:"info",label:"기본정보"},
    {id:"tasks",label:"태스크"},
    {id:"quote",label:"견적서"},
    {id:"budget",label:"실행예산"},
    {id:"settlement",label:"정산서"},
    {id:"feedback",label:"피드백"},
    {id:"staff",label:"스태프"},
  ];

  const addTask = () => {
    const t = {id:newId(),title:"새 태스크",type:TASK_TYPES[0],assignee:"",stage:"브리프",due:"",priority:"보통",desc:""};
    setP(prev=>({...prev,tasks:[...prev.tasks,t]}));
  };
  const updateTask = (tid,field,val) => {
    setP(prev=>({...prev,tasks:prev.tasks.map(t=>t.id===tid?{...t,[field]:val}:t)}));
  };
  const deleteTask = (tid) => {
    setP(prev=>({...prev,tasks:prev.tasks.filter(t=>t.id!==tid)}));
  };

  const COMPANY = { name:"NAMUc", logoUrl:"https://i.imgur.com/ONdvF5Q.jpeg" };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div style={{background:C.white,borderRadius:14,width:"100%",maxWidth:860,maxHeight:"93vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        {/* 헤더 */}
        <div style={{padding:"18px 24px 0",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,background:C.white,zIndex:1,borderRadius:"14px 14px 0 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h2 style={{margin:0,fontSize:18,fontWeight:800}}>{project ? "프로젝트 편집" : "새 프로젝트"}</h2>
            <div style={{display:"flex",gap:8}}>
              {tab==="quote" && <Btn size="sm" variant="ghost" onClick={()=>setShowQuotePrint(true)}>🖨️ 견적서</Btn>}
              {tab==="settlement" && <Btn size="sm" variant="ghost" onClick={()=>setShowSettlement(true)}>🖨️ 정산서</Btn>}
              <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.sub}}>×</button>
            </div>
          </div>
          {/* 탭 */}
          <div style={{display:"flex",gap:0,overflowX:"auto"}}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:"10px 16px",border:"none",borderBottom:`2px solid ${tab===t.id?C.blue:"transparent"}`,background:"transparent",color:tab===t.id?C.blue:C.sub,fontWeight:tab===t.id?700:500,cursor:"pointer",fontSize:13,whiteSpace:"nowrap",transition:"all .15s"}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 내용 */}
        <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
          {/* 기본정보 */}
          {tab==="info" && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <Field label="프로젝트명" required>
                  <input style={inp} value={p.name} onChange={e=>setP(prev=>({...prev,name:e.target.value}))} />
                </Field>
                <Field label="클라이언트">
                  <input style={inp} value={p.client||""} onChange={e=>setP(prev=>({...prev,client:e.target.value}))} />
                </Field>
                <Field label="형식/분량">
                  <input style={inp} value={p.format||""} onChange={e=>setP(prev=>({...prev,format:e.target.value}))} placeholder="예: 60초, 다큐멘터리" />
                </Field>
                <Field label="납품 기한">
                  <input style={inp} type="date" value={p.due||""} onChange={e=>setP(prev=>({...prev,due:e.target.value}))} />
                </Field>
                <Field label="감독">
                  <select style={sel} value={p.director||""} onChange={e=>setP(prev=>({...prev,director:e.target.value}))}>
                    <option value="">선택</option>
                    {(accounts||[]).map(a=><option key={a.id} value={a.name}>{a.name} ({a.role})</option>)}
                  </select>
                </Field>
                <Field label="PD">
                  <select style={sel} value={p.pd||""} onChange={e=>setP(prev=>({...prev,pd:e.target.value}))}>
                    <option value="">선택</option>
                    {(accounts||[]).map(a=><option key={a.id} value={a.name}>{a.name} ({a.role})</option>)}
                  </select>
                </Field>
                <Field label="단계">
                  <select style={sel} value={p.stage} onChange={e=>setP(prev=>({...prev,stage:e.target.value}))}>
                    {Object.keys(STAGES).map(s=><option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="컬러">
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {P_COLORS.map(c=>(
                      <button key={c} onClick={()=>setP(prev=>({...prev,color:c}))}
                        style={{width:28,height:28,borderRadius:"50%",background:c,border:`3px solid ${p.color===c?"#fff":"transparent"}`,outline:`2px solid ${p.color===c?c:"transparent"}`,cursor:"pointer"}} />
                    ))}
                  </div>
                </Field>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:8}}>
                <Field label="정산 여부">
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14}}>
                    <input type="checkbox" checked={!!p.settled} onChange={e=>setP(prev=>({...prev,settled:e.target.checked}))} />
                    <span>정산 완료</span>
                  </label>
                </Field>
                {p.settled && (
                  <Field label="정산일">
                    <input style={inp} type="date" value={p.settlementDate||""} onChange={e=>setP(prev=>({...prev,settlementDate:e.target.value}))} />
                  </Field>
                )}
              </div>
            </div>
          )}

          {/* 태스크 */}
          {tab==="tasks" && (
            <div>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
                <Btn size="sm" onClick={addTask}>+ 태스크 추가</Btn>
              </div>
              {p.tasks.length === 0 ? (
                <div style={{textAlign:"center",padding:40,color:C.faint}}>태스크가 없습니다</div>
              ) : (
                <div style={{display:"grid",gap:8}}>
                  {p.tasks.map(t => (
                    <div key={t.id} style={{border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",background:C.white}}>
                      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr auto",gap:8,alignItems:"center"}}>
                        <input style={{...inp,padding:"6px 10px",fontSize:13,fontWeight:600}} value={t.title} onChange={e=>updateTask(t.id,"title",e.target.value)} placeholder="태스크명" />
                        <select style={{...sel,padding:"6px 10px",fontSize:12}} value={t.type} onChange={e=>updateTask(t.id,"type",e.target.value)}>
                          {TASK_TYPES.map(ty=><option key={ty}>{ty}</option>)}
                        </select>
                        <select style={{...sel,padding:"6px 10px",fontSize:12}} value={t.stage} onChange={e=>updateTask(t.id,"stage",e.target.value)}>
                          {Object.keys(STAGES).map(s=><option key={s}>{s}</option>)}
                        </select>
                        <input style={{...inp,padding:"6px 10px",fontSize:12}} type="date" value={t.due||""} onChange={e=>updateTask(t.id,"due",e.target.value)} />
                        <button onClick={()=>deleteTask(t.id)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:18,padding:"0 4px"}}>×</button>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                        <select style={{...sel,padding:"6px 10px",fontSize:12}} value={t.assignee||""} onChange={e=>updateTask(t.id,"assignee",e.target.value)}>
                          <option value="">담당자 선택</option>
                          {(accounts||[]).map(a=><option key={a.id} value={a.name}>{a.name}</option>)}
                        </select>
                        <select style={{...sel,padding:"6px 10px",fontSize:12}} value={t.priority||"보통"} onChange={e=>updateTask(t.id,"priority",e.target.value)}>
                          {["긴급","높음","보통","낮음"].map(pr=><option key={pr}>{pr}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 견적서 */}
          {tab==="quote" && (
            <QuoteEditor quote={p.quote||{vat:true,agencyFeeRate:10,items:makeTemplate()}} onChange={q=>setP(prev=>({...prev,quote:q}))} />
          )}

          {/* 실행예산 */}
          {tab==="budget" && (
            <BudgetEditor budget={p.budget||{vouchers:[]}} onChange={b=>setP(prev=>({...prev,budget:b}))} quote={p.quote} />
          )}

          {/* 정산서 탭 */}
          {tab==="settlement" && (
            <SettlementPrint project={p} company={COMPANY} />
          )}

          {/* 피드백 */}
          {tab==="feedback" && (
            <FeedbackTab project={p} onChange={updated=>setP(updated)} currentUser={currentUser} accounts={accounts} />
          )}

          {/* 스태프 */}
          {tab==="staff" && (
            <StaffList project={p} onChange={updated=>setP(updated)} accounts={accounts} />
          )}
        </div>

        {/* 하단 버튼 */}
        <div style={{padding:"14px 24px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"flex-end",gap:10,background:C.white,borderRadius:"0 0 14px 14px"}}>
          <Btn variant="subtle" onClick={onClose}>취소</Btn>
          <Btn onClick={()=>onSave(p)}>저장</Btn>
        </div>
      </div>

      {showQuotePrint && <QuotePrint project={p} company={COMPANY} onClose={()=>setShowQuotePrint(false)} />}
    </div>
  );
}

// ===== LOGIN =====
function Login({ accounts, onLogin }){
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const handle = () => {
    const acc = accounts.find(a => a.name===name && a.pw===pw);
    if (acc) { setError(""); onLogin(acc); }
    else setError("이름 또는 비밀번호가 올바르지 않습니다");
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#667eea 0%,#764ba2 100%)"}}>
      <div style={{background:C.white,borderRadius:16,padding:40,width:360,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <img src="https://i.imgur.com/ONdvF5Q.jpeg" alt="NAMUc" style={{height:50,objectFit:"contain",marginBottom:16}} />
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text}}>NAMUc</h1>
          <p style={{margin:"4px 0 0",color:C.sub,fontSize:13}}>프로덕션 관리 시스템</p>
        </div>
        <Field label="이름">
          <input style={inp} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} placeholder="이름을 입력하세요" autoFocus />
        </Field>
        <Field label="비밀번호">
          <input style={inp} type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} placeholder="비밀번호를 입력하세요" />
        </Field>
        {error && <p style={{color:C.red,fontSize:13,margin:"0 0 12px"}}>{error}</p>}
        <Btn style={{width:"100%"}} size="lg" onClick={handle}>로그인</Btn>
      </div>
    </div>
  );
}

// ===== MEMBER MANAGEMENT =====
function MemberManage({ accounts, onSave, onClose }){
  const [members, setMembers] = useState([...accounts]);
  const [modal, setModal] = useState(null);
  const [mf, setMf] = useState({});

  const ROLES = ["대표","PD","감독","촬영감독","편집자","CG","사운드","제작부","경영지원","기타"];

  const openAdd = () => {
    setMf({ id:"m"+Date.now(), name:"", role:"기타", pw:Math.random().toString(36).slice(2,8), canViewFinance:false, canManageMembers:false, order:members.length });
    setModal("add");
  };
  const openEdit = m => { setMf({...m}); setModal("edit"); };
  const save = () => {
    const list = modal==="edit" ? members.map(m=>m.id===mf.id?mf:m) : [...members, mf];
    setMembers(list);
    setModal(null);
  };
  const del = id => {
    if(window.confirm("삭제하시겠습니까?")) setMembers(members.filter(m=>m.id!==id));
  };

  return (
    <Modal title="팀원 관리" onClose={onClose} width="640px">
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <Btn size="sm" onClick={openAdd}>+ 팀원 추가</Btn>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{borderBottom:`2px solid ${C.border}`,background:C.slateLight}}>
              {["이름","직책","비밀번호","재무","멤버관리",""].map(h=>(
                <th key={h} style={{padding:"8px 12px",textAlign:"left"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(m=>(
              <tr key={m.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:"8px 12px",fontWeight:600}}>{m.name}</td>
                <td style={{padding:"8px 12px"}}><Badge>{m.role}</Badge></td>
                <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.sub}}>{m.pw}</td>
                <td style={{padding:"8px 12px",textAlign:"center"}}>{m.canViewFinance?"✅":"—"}</td>
                <td style={{padding:"8px 12px",textAlign:"center"}}>{m.canManageMembers?"✅":"—"}</td>
                <td style={{padding:"8px 12px"}}>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>openEdit(m)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 8px",fontSize:12,cursor:"pointer"}}>편집</button>
                    <button onClick={()=>del(m.id)} style={{background:"none",border:`1px solid ${C.red}`,color:C.red,borderRadius:6,padding:"3px 8px",fontSize:12,cursor:"pointer"}}>삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
        <Btn variant="subtle" onClick={onClose}>취소</Btn>
        <Btn onClick={()=>onSave(members)}>저장</Btn>
      </div>

      {modal && (
        <Modal title={modal==="add"?"팀원 추가":"팀원 편집"} onClose={()=>setModal(null)}>
          <Field label="이름" required><input style={inp} value={mf.name||""} onChange={e=>setMf(p=>({...p,name:e.target.value}))} /></Field>
          <Field label="직책">
            <select style={sel} value={mf.role||"기타"} onChange={e=>setMf(p=>({...p,role:e.target.value}))}>
              {ROLES.map(r=><option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="비밀번호"><input style={inp} value={mf.pw||""} onChange={e=>setMf(p=>({...p,pw:e.target.value}))} /></Field>
          <div style={{display:"flex",gap:16,marginBottom:12}}>
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
              <input type="checkbox" checked={!!mf.canViewFinance} onChange={e=>setMf(p=>({...p,canViewFinance:e.target.checked}))} />재무 열람
            </label>
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
              <input type="checkbox" checked={!!mf.canManageMembers} onChange={e=>setMf(p=>({...p,canManageMembers:e.target.checked}))} />멤버 관리
            </label>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn variant="subtle" onClick={()=>setModal(null)}>취소</Btn>
            <Btn onClick={save}>저장</Btn>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

// ===== COMPANY SETTINGS =====
function CompanySettings({ company, onSave, onClose }){
  const [c, setC] = useState({...DEFAULT_COMPANY, ...company});

  return (
    <Modal title="회사 설정" onClose={onClose} width="560px">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="회사명"><input style={inp} value={c.name} onChange={e=>setC(p=>({...p,name:e.target.value}))} /></Field>
        <Field label="대표자"><input style={inp} value={c.ceo||""} onChange={e=>setC(p=>({...p,ceo:e.target.value}))} /></Field>
        <Field label="사업자등록번호"><input style={inp} value={c.bizNo||""} onChange={e=>setC(p=>({...p,bizNo:e.target.value}))} placeholder="000-00-00000" /></Field>
        <Field label="전화번호"><input style={inp} value={c.phone||""} onChange={e=>setC(p=>({...p,phone:e.target.value}))} /></Field>
      </div>
      <Field label="주소"><input style={inp} value={c.address||""} onChange={e=>setC(p=>({...p,address:e.target.value}))} /></Field>
      <Field label="이메일"><input style={inp} value={c.email||""} onChange={e=>setC(p=>({...p,email:e.target.value}))} /></Field>
      <Field label="로고 URL"><input style={inp} value={c.logoUrl||""} onChange={e=>setC(p=>({...p,logoUrl:e.target.value}))} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <Field label="은행명"><input style={inp} value={c.bankName||""} onChange={e=>setC(p=>({...p,bankName:e.target.value}))} /></Field>
        <Field label="계좌번호"><input style={inp} value={c.bankAccount||""} onChange={e=>setC(p=>({...p,bankAccount:e.target.value}))} /></Field>
        <Field label="예금주"><input style={inp} value={c.bankHolder||""} onChange={e=>setC(p=>({...p,bankHolder:e.target.value}))} /></Field>
      </div>
      <Field label="견적서 유효일수">
        <input style={inp} type="number" value={c.validDays||30} onChange={e=>setC(p=>({...p,validDays:Number(e.target.value)}))} />
      </Field>
      <Field label="특기사항 (견적서)">
        <textarea style={{...inp,minHeight:80,resize:"vertical"}} value={c.quoteNote||""} onChange={e=>setC(p=>({...p,quoteNote:e.target.value}))} />
      </Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
        <Btn variant="subtle" onClick={onClose}>취소</Btn>
        <Btn onClick={()=>onSave(c)}>저장</Btn>
      </div>
    </Modal>
  );
}

// ===== MAIN APP =====
export default function App(){
  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState(SEED_ACCOUNTS);
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("projects");
  const [projectModal, setProjectModal] = useState(null);
  const [showMemberManage, setShowMemberManage] = useState(false);
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [filterStage, setFilterStage] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");

  // Firebase 연동
  useEffect(()=>{
    if(!isConfigured()) return;
    const unsub1 = subscribeProjects(data=>{
      setProjects(data.length>0 ? data : SEED_PROJECTS);
      setFirebaseReady(true);
    });
    const unsub2 = subscribeCompany(data=>{ if(data) setCompany(data); });
    const unsub3 = subscribeMembers(data=>{ if(data.length>0) setAccounts(data); });
    return ()=>{ unsub1(); unsub2(); unsub3(); };
  },[]);

  // 로컬 초기화
  useEffect(()=>{
    if(!isConfigured() && projects.length===0) setProjects(SEED_PROJECTS);
  },[]);

  // 피드백 D-day 알림
  useEffect(()=>{
    if(!currentUser) return;
    const today = new Date().toISOString().slice(0,10);
    const soon = projects.flatMap(p =>
      (p.feedbacks||[]).filter(f => {
        if (!f.dueDate || f.stage==="완료") return false;
        const diff = Math.ceil((new Date(f.dueDate)-new Date(today))/(1000*60*60*24));
        return diff <= 3 && diff >= 0;
      }).map(f => {
        const diff = Math.ceil((new Date(f.dueDate)-new Date(today))/(1000*60*60*24));
        return { id:"dday_"+f.id, type:"dday", targetUserId:"all",
          text: `[${p.name}] "${f.title}" 마감 ${diff===0?"D-day":"D-"+diff}`, at:Date.now(), read:false };
      })
    );
    if(soon.length>0){
      setNotifications(prev=>{
        const existIds = new Set(prev.map(n=>n.id));
        const newOnes = soon.filter(n=>!existIds.has(n.id));
        return [...prev, ...newOnes];
      });
    }
  },[projects, currentUser]);

  const saveProject = async (p) => {
    const list = projects.find(x=>x.id===p.id) ? projects.map(x=>x.id===p.id?p:x) : [...projects, p];
    setProjects(list);
    if(isConfigured()){ try{ await saveProject(p); }catch(e){ console.error(e); } }
    setProjectModal(null);
  };

  const handleDeleteProject = async (id) => {
    if(!window.confirm("프로젝트를 삭제하시겠습니까?")) return;
    setProjects(prev=>prev.filter(p=>p.id!==id));
    if(isConfigured()){ try{ await deleteProject(id); }catch(e){ console.error(e); } }
  };

  const saveMembersFn = async (list) => {
    setAccounts(list);
    if(isConfigured()){ try{ for(const m of list) await saveMember(m); }catch(e){ console.error(e); } }
    setShowMemberManage(false);
  };

  const saveCompanyFn = async (c) => {
    setCompany(c);
    if(isConfigured()){ try{ await saveCompany(c); }catch(e){ console.error(e); } }
    setShowCompanySettings(false);
  };

  const myNotifications = notifications.filter(n => n.targetUserId===currentUser?.id || n.targetUserId==="all");
  const unreadCount = myNotifications.filter(n=>!n.read).length;

  const markAllRead = () => setNotifications(prev=>prev.map(n=>({...n,read:true})));

  const MAIN_TABS = [
    {id:"projects",label:"📁 프로젝트"},
    {id:"kanban",label:"📋 칸반"},
    {id:"calendar",label:"📅 캘린더"},
    {id:"daily",label:"📆 데일리"},
    ...(currentUser?.canViewFinance ? [{id:"finance",label:"💰 재무"}] : []),
  ];

  const filteredProjects = projects.filter(p => {
    const matchStage = filterStage==="전체" || p.stage===filterStage;
    const matchSearch = !searchQuery || p.name.includes(searchQuery) || (p.client||"").includes(searchQuery);
    return matchStage && matchSearch;
  });

  // 피드백 이벤트 수집 (캘린더용)
  const feedbackEvents = projects.flatMap(p => (p.feedbacks||[]).map(f=>({...f, projectName:p.name, projectId:p.id})));

  if (!currentUser) return <Login accounts={accounts} onLogin={setCurrentUser} />;

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"Noto Sans KR,Apple SD Gothic Neo,sans-serif"}}>
      {/* 네비게이션 */}
      <nav style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:"0 20px",display:"flex",alignItems:"center",height:56,position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginRight:24,cursor:"pointer"}} onClick={()=>setActiveTab("projects")}>
          {company.logoUrl && <img src={company.logoUrl} alt="" style={{height:28,objectFit:"contain"}} />}
          <span style={{fontWeight:800,fontSize:16,color:C.text}}>{company.name}</span>
        </div>
        <div style={{display:"flex",gap:2,flex:1,overflowX:"auto"}}>
          {MAIN_TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{padding:"6px 14px",border:"none",borderBottom:`2px solid ${activeTab===t.id?C.blue:"transparent"}`,background:"transparent",color:activeTab===t.id?C.blue:C.sub,fontWeight:activeTab===t.id?700:500,cursor:"pointer",fontSize:13,whiteSpace:"nowrap",height:56,transition:"all .15s"}}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:16}}>
          {/* 알림 벨 */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowNotifications(p=>!p)}
              style={{background:"none",border:"none",cursor:"pointer",fontSize:20,padding:"4px",position:"relative",color:unreadCount>0?C.amber:C.sub}}>
              🔔
              {unreadCount>0 && (
                <span style={{position:"absolute",top:0,right:0,width:16,height:16,background:C.red,color:"#fff",borderRadius:"50%",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>
                  {unreadCount>9?"9+":unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div style={{position:"absolute",right:0,top:"100%",marginTop:4,width:320,background:C.white,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:200,maxHeight:400,overflow:"auto"}}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:700,fontSize:14}}>알림</span>
                  {unreadCount>0 && <button onClick={markAllRead} style={{background:"none",border:"none",color:C.blue,cursor:"pointer",fontSize:12}}>모두 읽음</button>}
                </div>
                {myNotifications.length===0 ? (
                  <div style={{padding:24,textAlign:"center",color:C.faint,fontSize:13}}>알림이 없습니다</div>
                ) : (
                  myNotifications.slice().reverse().map(n=>(
                    <div key={n.id} style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,background:n.read?"transparent":C.blueLight+"80",fontSize:13,lineHeight:1.5}}>
                      <div style={{color:C.text}}>{n.text}</div>
                      <div style={{fontSize:11,color:C.faint,marginTop:2}}>{new Date(n.at).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div style={{fontSize:13,color:C.sub}}>{currentUser.name}<span style={{fontSize:11,marginLeft:4,color:C.faint}}>({currentUser.role})</span></div>
          {currentUser.canManageMembers && (
            <button onClick={()=>setShowMemberManage(true)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:12,color:C.sub}}>팀원</button>
          )}
          <button onClick={()=>setShowCompanySettings(true)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:12,color:C.sub}}>설정</button>
          <button onClick={()=>setCurrentUser(null)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:12,color:C.sub}}>로그아웃</button>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main style={{padding:"24px 20px",maxWidth:1200,margin:"0 auto"}}>

        {/* 프로젝트 목록 */}
        {activeTab==="projects" && (
          <div>
            <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
              <h2 style={{margin:0,fontSize:20,fontWeight:800,flex:1}}>프로젝트 ({filteredProjects.length})</h2>
              <input style={{...inp,width:200,padding:"8px 12px"}} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="🔍 검색..." />
              <Btn onClick={()=>setProjectModal({})}>+ 새 프로젝트</Btn>
            </div>
            {/* 단계 필터 */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {["전체",...Object.keys(STAGES)].map(s=>{
                const sc = STAGES[s];
                return (
                  <button key={s} onClick={()=>setFilterStage(s)}
                    style={{padding:"5px 14px",fontSize:12,borderRadius:20,border:`1px solid ${filterStage===s?(sc?.color||C.blue):C.border}`,background:filterStage===s?(sc?.bg||C.blueLight):"transparent",color:filterStage===s?(sc?.color||C.blue):C.sub,cursor:"pointer",fontWeight:filterStage===s?700:400}}>
                    {sc?.icon||""} {s}
                  </button>
                );
              })}
            </div>
            {/* 프로젝트 카드 */}
            {filteredProjects.length===0 ? (
              <div style={{textAlign:"center",padding:80,color:C.faint}}>
                <div style={{fontSize:40,marginBottom:12}}>📁</div>
                <div>프로젝트가 없습니다</div>
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
                {filteredProjects.map(p=>{
                  const sc = STAGES[p.stage]||{color:C.sub,bg:C.slateLight,icon:""};
                  const totalTasks = p.tasks?.length||0;
                  const doneTasks = p.tasks?.filter(t=>t.stage==="납품완료").length||0;
                  const progress = totalTasks>0 ? Math.round(doneTasks/totalTasks*100) : 0;
                  const daysLeft = p.due ? Math.ceil((new Date(p.due)-new Date())/(1000*60*60*24)) : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  return (
                    <div key={p.id} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:18,cursor:"pointer",transition:"all .15s",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}
                      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-1px)";}}
                      onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.05)";e.currentTarget.style.transform="none";}}
                      onClick={()=>setProjectModal(p)}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:12}}>
                        <div style={{width:6,height:40,borderRadius:4,background:p.color||C.blue,flexShrink:0,marginTop:2}}></div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:15,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                          <div style={{fontSize:12,color:C.sub}}>{p.client}</div>
                        </div>
                        <div style={{display:"flex",gap:6}} onClick={e=>{e.stopPropagation();}}>
                          <button onClick={()=>handleDeleteProject(p.id)} style={{background:"none",border:"none",color:C.faint,cursor:"pointer",fontSize:14,padding:"2px 4px"}} title="삭제">🗑</button>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                        <Badge color={sc.color} bg={sc.bg}>{sc.icon} {p.stage}</Badge>
                        {daysLeft !== null && (
                          <Badge color={isOverdue?C.red:daysLeft<=7?C.amber:C.green} bg={isOverdue?C.redLight:daysLeft<=7?C.amberLight:C.greenLight}>
                            {isOverdue?`D+${Math.abs(daysLeft)}`:`D-${daysLeft}`}
                          </Badge>
                        )}
                      </div>
                      {totalTasks > 0 && (
                        <div>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.sub,marginBottom:4}}>
                            <span>태스크 진행률</span><span>{doneTasks}/{totalTasks} ({progress}%)</span>
                          </div>
                          <div style={{background:C.border,borderRadius:4,height:5}}>
                            <div style={{background:p.color||C.blue,borderRadius:4,height:"100%",width:progress+"%",transition:"width .3s"}}></div>
                          </div>
                        </div>
                      )}
                      {(p.director||p.pd) && (
                        <div style={{marginTop:10,display:"flex",gap:8,fontSize:11,color:C.faint}}>
                          {p.director && <span>감독 {p.director}</span>}
                          {p.pd && <span>PD {p.pd}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 칸반 */}
        {activeTab==="kanban" && (
          <div>
            <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800}}>칸반</h2>
            <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:16}}>
              {Object.entries(STAGES).map(([stage,sc])=>{
                const stageProjects = projects.filter(p=>p.stage===stage);
                return (
                  <div key={stage} style={{minWidth:240,background:"#f8fafc",borderRadius:12,padding:12,border:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"0 4px"}}>
                      <span style={{fontSize:16}}>{sc.icon}</span>
                      <span style={{fontWeight:700,fontSize:13,color:sc.color}}>{stage}</span>
                      <span style={{marginLeft:"auto",background:sc.bg,color:sc.color,borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700}}>{stageProjects.length}</span>
                    </div>
                    <div style={{display:"grid",gap:8}}>
                      {stageProjects.map(p=>(
                        <div key={p.id} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}} onClick={()=>setProjectModal(p)}>
                          <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>{p.name}</div>
                          <div style={{fontSize:11,color:C.sub}}>{p.client}</div>
                          {p.due && <div style={{fontSize:11,color:C.faint,marginTop:4}}>납품 {p.due}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 캘린더 */}
        {activeTab==="calendar" && (
          <div>
            <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800}}>캘린더</h2>
            <MonthCalendar projects={projects} feedbackEvents={feedbackEvents} />
          </div>
        )}

        {/* 데일리 */}
        {activeTab==="daily" && (
          <div>
            <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800}}>데일리 TODO</h2>
            <DailyTodo projects={projects} accounts={accounts} currentUser={currentUser} />
          </div>
        )}

        {/* 재무 */}
        {activeTab==="finance" && currentUser?.canViewFinance && (
          <div>
            <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800}}>재무 대시보드</h2>
            <FinanceDashboard projects={projects} />
          </div>
        )}
      </main>

      {/* 프로젝트 모달 */}
      {projectModal !== null && (
        <ProjectModal
          project={projectModal?.id ? projectModal : null}
          onSave={saveProject}
          onClose={()=>setProjectModal(null)}
          accounts={accounts}
          currentUser={currentUser}
        />
      )}

      {/* 팀원 관리 */}
      {showMemberManage && (
        <MemberManage accounts={accounts} onSave={saveMembersFn} onClose={()=>setShowMemberManage(false)} />
      )}

      {/* 회사 설정 */}
      {showCompanySettings && (
        <CompanySettings company={company} onSave={saveCompanyFn} onClose={()=>setShowCompanySettings(false)} />
      )}
    </div>
  );
}
