import { useState, useEffect, useRef } from "react";
import {
  subscribeProjects, saveProject, deleteProject,
  uploadVoucherFile, subscribeCompany, saveCompany,
  subscribeMembers, saveMember, deleteMember,
  isConfigured,
} from "./firebase.js";

// ═══════════════════════════════════════════════════════════
// 디자인 토큰
// ═══════════════════════════════════════════════════════════
const C = {
  bg:"#f4f5f7", white:"#ffffff", border:"#e4e7ec",
  text:"#111827", sub:"#6b7280", faint:"#9ca3af",
  blue:"#2563eb", blueLight:"#eff6ff", blueMid:"#dbeafe",
  green:"#16a34a", greenLight:"#f0fdf4",
  red:"#dc2626", redLight:"#fef2f2",
  amber:"#d97706", amberLight:"#fffbeb",
  purple:"#7c3aed", purpleLight:"#f5f3ff",
  slate:"#475569", slateLight:"#f8fafc",
  teal:"#0d9488", tealLight:"#f0fdfa",
  emerald:"#059669", emeraldLight:"#ecfdf5",
};

// ═══════════════════════════════════════════════════════════
// 회사 설정 기본값
// ═══════════════════════════════════════════════════════════
const DEFAULT_COMPANY = {
  name:"NAMUc", ceo:"", bizNo:"", address:"", phone:"", email:"",
  logoUrl:"https://i.imgur.com/ONdvF5Q.jpeg",
  bankName:"", bankAccount:"", bankHolder:"",
  quoteNote:"· 본 견적은 협의된 내용을 기준으로 작성되었습니다.\n· 촬영 조건 및 범위 변경 시 금액이 조정될 수 있습니다.\n· 계약금 50% 선입금 후 제작 착수합니다.",
  validDays:30,
};

// ═══════════════════════════════════════════════════════════
// 계정 / 역할
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 프로덕션 상수
// ═══════════════════════════════════════════════════════════
const STAGES = {
  "브리프":       { color:C.slate,  bg:C.slateLight, icon:"📋" },
  "프리프로덕션": { color:C.purple, bg:C.purpleLight, icon:"🎨" },
  "촬영":         { color:C.amber,  bg:C.amberLight,  icon:"🎬" },
  "포스트":       { color:C.blue,   bg:C.blueLight,   icon:"✂️" },
  "납품완료":     { color:C.green,  bg:C.greenLight,  icon:"✅" },
};
const TASK_TYPES = ["스크립트","콘티","캐스팅","로케이션","촬영","편집","색보정","음악/사운드","자막/CG","클라이언트 검토","최종 납품","기타"];
const FORMATS_DEFAULT = ["TVC","디지털 광고","유튜브 콘텐츠","숏폼","BTL","브랜드 필름"];
const P_COLORS   = ["#2563eb","#7c3aed","#db2777","#d97706","#16a34a","#0891b2"];
const VOUCHER_TYPES = ["세금계산서","영수증","외주견적서","카드영수증","기타"];

// ═══════════════════════════════════════════════════════════
// 견적서 3단계 템플릿 (대분류 > 중분류 > 소분류)
// ═══════════════════════════════════════════════════════════
const newId = () => Math.random().toString(36).slice(2,8);

const QUOTE_TEMPLATE = [
  { category:"기획/제작관리", groups:[
    { group:"제작관리", items:[
      { name:"EPD (Executive PD)",           unit:"건", qty:1, unitPrice:0 },
      { name:"총괄감독",                     unit:"건", qty:1, unitPrice:0 },
      { name:"AE (대행사 담당)",             unit:"건", qty:1, unitPrice:0 },
      { name:"작가 (대본 작성)",             unit:"건", qty:1, unitPrice:0 },
      { name:"프로듀싱, 프로덕션 매니징",    unit:"건", qty:1, unitPrice:0 },
      { name:"P.P.M 경비",                   unit:"식", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"프리프로덕션", groups:[
    { group:"기획/연출", items:[
      { name:"기획 및 구성료 (구성안 작성)", unit:"건", qty:1, unitPrice:0 },
      { name:"프로듀싱, 프로덕션 매니징",    unit:"건", qty:1, unitPrice:0 },
      { name:"연출료, 조연출료, 콘티 visualizing (종합 연출료)", unit:"건", qty:1, unitPrice:0 },
      { name:"조감독 (1st)",                 unit:"일", qty:1, unitPrice:0 },
      { name:"조감독 (2nd)",                 unit:"일", qty:0, unitPrice:0 },
    ]},
    { group:"캐스팅/로케이션", items:[
      { name:"캐스팅비",       unit:"명", qty:1, unitPrice:0 },
      { name:"로케이션 헌팅",  unit:"식", qty:1, unitPrice:0 },
      { name:"장소 사용료",    unit:"일", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"촬영", groups:[
    { group:"촬영 인건비", items:[
      { name:"촬영팀 운용",    unit:"일", qty:1, unitPrice:0 },
      { name:"촬영감독료",     unit:"일", qty:1, unitPrice:0 },
      { name:"촬영 1st",       unit:"일", qty:1, unitPrice:0 },
      { name:"조명감독료",     unit:"일", qty:1, unitPrice:0 },
      { name:"조명 Grip팀",    unit:"일", qty:1, unitPrice:0 },
    ]},
    { group:"카메라 기자재", items:[
      { name:"카메라 바디",    unit:"일", qty:1, unitPrice:0 },
      { name:"렌즈",           unit:"일", qty:1, unitPrice:0 },
      { name:"모니터",         unit:"일", qty:1, unitPrice:0 },
      { name:"기타 기자재",    unit:"식", qty:1, unitPrice:0 },
      { name:"보험료",         unit:"식", qty:1, unitPrice:0 },
    ]},
    { group:"조명 기자재", items:[
      { name:"조명 기자재",    unit:"일", qty:1, unitPrice:0 },
      { name:"발전차",         unit:"일", qty:1, unitPrice:0 },
    ]},
    { group:"특수 기자재", items:[
      { name:"지미집 (Jimmy Jib)", unit:"일", qty:1, unitPrice:0 },
      { name:"스테디캠",           unit:"일", qty:1, unitPrice:0 },
      { name:"드론/헬리캠",        unit:"일", qty:1, unitPrice:0 },
      { name:"테크노크레인",       unit:"일", qty:1, unitPrice:0 },
    ]},
    { group:"촬영 장소", items:[
      { name:"스튜디오 대관료",    unit:"일", qty:1, unitPrice:0 },
      { name:"로케이션 장소사용료",unit:"일", qty:1, unitPrice:0 },
    ]},
    { group:"미술/분장", items:[
      { name:"미술 세트 제작",     unit:"식", qty:1, unitPrice:0 },
      { name:"소품비",             unit:"식", qty:1, unitPrice:0 },
      { name:"Make-Up / Hair",     unit:"일", qty:1, unitPrice:0 },
      { name:"스타일리스트",       unit:"일", qty:1, unitPrice:0 },
    ]},
    { group:"출연/제작지원", items:[
      { name:"출연료 (모델)",      unit:"명", qty:1, unitPrice:0 },
      { name:"인터뷰 촬영",        unit:"건", qty:1, unitPrice:0 },
      { name:"차량/이동비",        unit:"식", qty:1, unitPrice:0 },
      { name:"식비",               unit:"식", qty:1, unitPrice:0 },
      { name:"촬영경비, Post경비, 완성진행비, 진행경비, 보험료", unit:"식", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"포스트프로덕션", groups:[
    { group:"편집/DI", items:[
      { name:"편집 (Editing)",      unit:"건", qty:1, unitPrice:0 },
      { name:"DI (색보정)",         unit:"건", qty:1, unitPrice:0 },
      { name:"편집 조연출료",       unit:"건", qty:1, unitPrice:0 },
    ]},
    { group:"CG/VFX", items:[
      { name:"2D Animation",        unit:"건", qty:1, unitPrice:0 },
      { name:"3D Modeling/Animation/Lighting/Rendering", unit:"건", qty:1, unitPrice:0 },
      { name:"FLAME Compositing",   unit:"건", qty:1, unitPrice:0 },
      { name:"Rendering",           unit:"건", qty:1, unitPrice:0 },
      { name:"CG 및 합성 연출료",   unit:"건", qty:1, unitPrice:0 },
    ]},
    { group:"사운드", items:[
      { name:"녹음실 사용료",       unit:"시간", qty:0, unitPrice:0 },
      { name:"Sound Design / Mixing / Mastering", unit:"건", qty:1, unitPrice:0 },
      { name:"작곡 / Jingle",       unit:"건", qty:1, unitPrice:0 },
      { name:"녹음료",              unit:"건", qty:1, unitPrice:0 },
      { name:"성우료",              unit:"명", qty:0, unitPrice:0 },
      { name:"음악 라이선스 (BGM)", unit:"건", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"메이킹/기타", groups:[
    { group:"메이킹", items:[
      { name:"메이킹 촬영",        unit:"건", qty:1, unitPrice:0 },
      { name:"메이킹 편집 (1분)",  unit:"건", qty:1, unitPrice:0 },
    ]},
    { group:"저작권/보험", items:[
      { name:"저작권료",           unit:"식", qty:1, unitPrice:0 },
      { name:"All Staff 보험료",   unit:"식", qty:1, unitPrice:0 },
    ]},
  ]},
];

const makeTemplate = () => QUOTE_TEMPLATE.map(cat=>({
  ...cat,
  groups: cat.groups.map(grp=>({
    ...grp, gid: newId(),
    items: grp.items.map(it=>({ ...it, id: newId() }))
  }))
}));

// ── 포맷 B 상세형 템플릿 (Kia Shop 스타일) ──
const QUOTE_TEMPLATE_B = [
  { category:"기획료", groups:[
    { group:"기획", items:[
      { name:"기획구성료",                   unit:"건", qty:1, unitPrice:0 },
      { name:"작가료 (카피라이터)",          unit:"건", qty:1, unitPrice:0 },
      { name:"경쟁 PT료",                    unit:"건", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"콘티작화", groups:[
    { group:"콘티", items:[
      { name:"흑백 콘티 (러프)",             unit:"CUT", qty:0, unitPrice:50000 },
      { name:"정밀 컬러 콘티 (슈팅콘티)",   unit:"CUT", qty:0, unitPrice:0 },
      { name:"대형 컬러 콘티 B5이상",       unit:"CUT", qty:0, unitPrice:0 },
    ]},
  ]},
  { category:"프로덕션비", groups:[
    { group:"제작관리", items:[
      { name:"EPD (Executive PD)",           unit:"건", qty:1, unitPrice:0 },
      { name:"총괄감독",                     unit:"건", qty:1, unitPrice:0 },
      { name:"AE (대행사 담당)",             unit:"건", qty:1, unitPrice:0 },
      { name:"Executive Producer",           unit:"건", qty:1, unitPrice:0 },
      { name:"Production Producer",          unit:"건", qty:1, unitPrice:0 },
      { name:"Production Assistant",         unit:"건", qty:1, unitPrice:0 },
      { name:"P.P.M 경비 (도서/보드/칼라복사 등)", unit:"식", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"연출료", groups:[
    { group:"감독료", items:[
      { name:"Pre-prod 연출료",              unit:"건", qty:1, unitPrice:0 },
      { name:"연출료 (기본 1일 촬영)",       unit:"일", qty:1, unitPrice:0 },
      { name:"추가 연출료",                  unit:"일", qty:0, unitPrice:0 },
      { name:"편집 연출료",                  unit:"건", qty:1, unitPrice:0 },
      { name:"CG 및 합성 연출료",           unit:"건", qty:1, unitPrice:0 },
      { name:"출장 및 헌팅 연출료 (국내)",  unit:"건", qty:0, unitPrice:0 },
    ]},
    { group:"조연출료", items:[
      { name:"조감독 1st - 연출료",          unit:"일", qty:1, unitPrice:0 },
      { name:"조감독 1st - 추가 연출료",     unit:"일", qty:0, unitPrice:0 },
      { name:"조감독 1st - 편집 연출료",     unit:"건", qty:1, unitPrice:0 },
      { name:"조감독 1st - CG 연출료",       unit:"건", qty:0, unitPrice:0 },
      { name:"조감독 2nd - 연출료",          unit:"일", qty:1, unitPrice:0 },
      { name:"조연출 보조료",                unit:"일", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"기술 인건비", groups:[
    { group:"촬영 인건비", items:[
      { name:"촬영감독료",                   unit:"일", qty:1, unitPrice:0 },
      { name:"Hunting 및 Travel Charge",     unit:"건", qty:0, unitPrice:0 },
      { name:"Over Charge",                  unit:"시간", qty:0, unitPrice:0 },
      { name:"1st Assist",                   unit:"일", qty:1, unitPrice:0 },
      { name:"2nd Assist",                   unit:"일", qty:1, unitPrice:0 },
      { name:"3rd Assist",                   unit:"일", qty:0, unitPrice:0 },
      { name:"4th Assist",                   unit:"일", qty:0, unitPrice:0 },
      { name:"DIT",                          unit:"일", qty:0, unitPrice:0 },
    ]},
    { group:"조명 인건비", items:[
      { name:"조명감독료",                   unit:"일", qty:1, unitPrice:0 },
      { name:"Over Charge",                  unit:"시간", qty:0, unitPrice:0 },
      { name:"Grip 인건비",                  unit:"일", qty:1, unitPrice:0 },
      { name:"조명조수 인건비",              unit:"일", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"카메라 기자재", groups:[
    { group:"카메라/렌즈", items:[
      { name:"카메라 바디",                  unit:"대/일", qty:1, unitPrice:0 },
      { name:"렌즈 세트",                    unit:"set/일", qty:1, unitPrice:0 },
      { name:"모니터 (Small HD 24)",         unit:"대/일", qty:1, unitPrice:0 },
      { name:"모니터 (Small HD 7)",          unit:"대/일", qty:0, unitPrice:0 },
      { name:"보험료 (카메라 & 렌즈)",       unit:"식", qty:1, unitPrice:0 },
    ]},
    { group:"이동/특수 장비", items:[
      { name:"Steadicam",                    unit:"일", qty:0, unitPrice:0 },
      { name:"Jimmy Jib",                    unit:"일", qty:0, unitPrice:0 },
      { name:"GF Jib",                       unit:"일", qty:0, unitPrice:0 },
      { name:"프리모 달리 세트",             unit:"일", qty:0, unitPrice:0 },
      { name:"헬리캠 (드론)",                unit:"일", qty:0, unitPrice:0 },
      { name:"모션 컨트롤 (M.C.C)",          unit:"일", qty:0, unitPrice:0 },
      { name:"Teradeck 4K",                  unit:"대/일", qty:0, unitPrice:0 },
    ]},
  ]},
  { category:"조명 기자재", groups:[
    { group:"조명 장비", items:[
      { name:"9MP (노말)",                   unit:"대/일", qty:0, unitPrice:0 },
      { name:"4KW",                          unit:"대/일", qty:0, unitPrice:0 },
      { name:"1.8MP (노말)",                 unit:"대/일", qty:0, unitPrice:0 },
      { name:"800MP (노말)",                 unit:"대/일", qty:0, unitPrice:0 },
      { name:"조커 800",                     unit:"대/일", qty:0, unitPrice:0 },
      { name:"어퓨쳐 600D",                  unit:"대/일", qty:0, unitPrice:0 },
      { name:"Dedo 150W",                    unit:"대/일", qty:0, unitPrice:0 },
    ]},
    { group:"발전/헤이저", items:[
      { name:"발전차 (서울)",                unit:"일", qty:0, unitPrice:0 },
      { name:"발전차 (지방)",                unit:"일", qty:0, unitPrice:0 },
      { name:"헤이저 머신",                  unit:"일", qty:0, unitPrice:0 },
      { name:"강풍기/스모그기",              unit:"대/일", qty:0, unitPrice:0 },
    ]},
  ]},
  { category:"Studio / 장소", groups:[
    { group:"로케이션", items:[
      { name:"로케이션 매니저",              unit:"일", qty:1, unitPrice:0 },
      { name:"장소 사용료 (촬영 & 설치/철수)", unit:"건", qty:1, unitPrice:0 },
      { name:"Location 경비/경계료",         unit:"식", qty:0, unitPrice:0 },
    ]},
    { group:"스튜디오", items:[
      { name:"스튜디오 대관료",              unit:"일", qty:0, unitPrice:0 },
      { name:"초과 사용료 (시간당 10%)",     unit:"시간", qty:0, unitPrice:0 },
      { name:"LED Display System",           unit:"식", qty:0, unitPrice:0 },
    ]},
  ]},
  { category:"미술비", groups:[
    { group:"미술/분장", items:[
      { name:"세트 제작료",                  unit:"식", qty:0, unitPrice:0 },
      { name:"도색료 (바닥 및 호리)",        unit:"식", qty:0, unitPrice:0 },
      { name:"Set Design 및 감리비",         unit:"식", qty:0, unitPrice:0 },
      { name:"촬영지 대도구",                unit:"식", qty:0, unitPrice:0 },
      { name:"촬영지 소도구",                unit:"식", qty:0, unitPrice:0 },
      { name:"Make-Up / Hair",               unit:"일", qty:1, unitPrice:0 },
      { name:"스타일리스트",                 unit:"일", qty:0, unitPrice:0 },
      { name:"특수분장료",                   unit:"식", qty:0, unitPrice:0 },
      { name:"Art팀 료",                     unit:"일", qty:0, unitPrice:0 },
    ]},
  ]},
  { category:"촬영 경비", groups:[
    { group:"촬영 준비비", items:[
      { name:"헌팅 경비 (차량 및 기타)",     unit:"식", qty:1, unitPrice:0 },
      { name:"연출부 물품",                  unit:"식", qty:1, unitPrice:0 },
      { name:"식대",                         unit:"식", qty:1, unitPrice:0 },
    ]},
    { group:"본촬영 경비", items:[
      { name:"인원수송 차량",                unit:"대/일", qty:1, unitPrice:0 },
      { name:"카메라 운반 차량",             unit:"대/일", qty:1, unitPrice:0 },
      { name:"조명장비 운반 차량",           unit:"대/일", qty:1, unitPrice:0 },
      { name:"중형 용달 (대도구)",           unit:"대/일", qty:0, unitPrice:0 },
      { name:"소형 용달 (소도구/소모품)",    unit:"대/일", qty:0, unitPrice:0 },
      { name:"고속도로비 / 유류대 / 주차료", unit:"식", qty:1, unitPrice:0 },
      { name:"진행비 (주차/퀵/통신)",        unit:"식", qty:1, unitPrice:0 },
      { name:"외장하드 (2T SSD)",            unit:"개", qty:2, unitPrice:0 },
    ]},
    { group:"보험료", items:[
      { name:"All Staff 보험료",             unit:"식", qty:1, unitPrice:0 },
    ]},
  ]},
  { category:"출연료", groups:[
    { group:"출연", items:[
      { name:"모델료",                       unit:"명", qty:1, unitPrice:0 },
      { name:"조연 모델료",                  unit:"명", qty:0, unitPrice:0 },
      { name:"아역 모델",                    unit:"명", qty:0, unitPrice:0 },
      { name:"대역 모델료",                  unit:"명", qty:0, unitPrice:0 },
    ]},
  ]},
  { category:"저작권", groups:[
    { group:"저작권", items:[
      { name:"음악 (B.G.M) 사용료 (국내 온라인)", unit:"건", qty:0, unitPrice:0 },
      { name:"자료 화면 사용료",             unit:"건", qty:0, unitPrice:0 },
      { name:"원작 저작권료",                unit:"건", qty:0, unitPrice:0 },
    ]},
  ]},
  { category:"포스트프로덕션", groups:[
    { group:"편집", items:[
      { name:"편집료 (Editing)",             unit:"건", qty:1, unitPrice:0 },
      { name:"DI (색보정 및 파일컨버팅)",    unit:"건", qty:1, unitPrice:0 },
      { name:"추가 작업비",                  unit:"건", qty:0, unitPrice:0 },
    ]},
    { group:"CG/VFX", items:[
      { name:"2D Artwork / Animation",       unit:"건", qty:1, unitPrice:0 },
      { name:"3D Modeling / Texture / Animation / Lighting / Rigging", unit:"건", qty:0, unitPrice:0 },
      { name:"FLAME Compositing / Clearing (컷다운 포함)", unit:"건", qty:0, unitPrice:0 },
      { name:"Rendering",                    unit:"건", qty:0, unitPrice:0 },
    ]},
    { group:"사운드", items:[
      { name:"녹음실 사용료",                unit:"시간", qty:0, unitPrice:0 },
      { name:"Sound Design / Mixing / Mastering", unit:"건", qty:1, unitPrice:0 },
      { name:"작곡 / Jingle / Logo Song",    unit:"건", qty:0, unitPrice:0 },
      { name:"성우료",                       unit:"명", qty:0, unitPrice:0 },
      { name:"동시 녹음",                    unit:"건", qty:0, unitPrice:0 },
      { name:"선곡료",                       unit:"건", qty:0, unitPrice:0 },
    ]},
  ]},
  { category:"메이킹 촬영", groups:[
    { group:"메이킹", items:[
      { name:"메이킹 촬영",                  unit:"건", qty:0, unitPrice:0 },
      { name:"메이킹 편집 (1분)",            unit:"건", qty:0, unitPrice:0 },
      { name:"2D",                           unit:"건", qty:0, unitPrice:0 },
    ]},
  ]},
];

const makeTemplateB = () => QUOTE_TEMPLATE_B.map(cat=>({
  ...cat,
  groups: cat.groups.map(grp=>({
    ...grp, gid: newId(),
    items: grp.items.map(it=>({ ...it, id: newId() }))
  }))
}));



// ═══════════════════════════════════════════════════════════
// 재무 계산 헬퍼
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 시드 데이터
// ═══════════════════════════════════════════════════════════
const SEED_PROJECTS = [
  {
    id:"p1", name:"기아 EV9 런칭 캠페인", client:"기아자동차", color:"#2563eb",
    format:"60초", due:"2026-04-15", director:"이준혁", pd:"박민서",
    stage:"촬영", createdAt:"2026-01-10",
    tasks:[
      {id:"t1",title:"브랜드 방향성 확정",type:"스크립트",assignee:"박민서",stage:"납품완료",due:"2026-01-20",priority:"높음",desc:""},
      {id:"t2",title:"콘티 1차 시안",type:"콘티",assignee:"이준혁",stage:"납품완료",due:"2026-02-05",priority:"높음",desc:""},
      {id:"t3",title:"촬영지 헌팅",type:"로케이션",assignee:"한지수",stage:"납품완료",due:"2026-02-15",priority:"보통",desc:""},
      {id:"t4",title:"D-day 촬영",type:"촬영",assignee:"김소연",stage:"촬영",due:"2026-03-10",priority:"긴급",desc:""},
      {id:"t5",title:"1차 편집",type:"편집",assignee:"최다인",stage:"브리프",due:"2026-03-25",priority:"높음",desc:""},
    ],
    quote:{
      vat:true, agencyFeeRate:10,
      items: makeTemplate().map((cat,ci)=>({
        ...cat,
        groups: cat.groups.map((grp,gi)=>({
          ...grp,
          items: grp.items.map((it,ii)=>({
            ...it,
            unitPrice: [[3000000,2500000,1500000],[800000,500000],[1200000,1000000,800000,700000,500000],[1500000,1000000],[400000,300000],[2000000,1500000,1000000],[500000,300000],[3500000,2500000],[800000,500000,400000,300000]].flat()[ci*3+gi+ii] || 500000
          }))
        }))
      }))
    },
    budget:{
      vouchers:[
        {id:"v1",name:"이준혁 감독료",vendor:"개인",type:"세금계산서",date:"2026-02-10",amount:3000000,category:"기획/제작관리",group:"제작관리",number:"",note:"",files:[]},
        {id:"v2",name:"촬영 스튜디오",vendor:"(주)스튜디오101",type:"세금계산서",date:"2026-03-10",amount:2500000,category:"촬영",group:"촬영 장소",number:"",note:"",files:[]},
        {id:"v3",name:"카메라 렌탈",vendor:"씨네렌탈",type:"영수증",date:"2026-03-10",amount:1800000,category:"촬영",group:"촬영 장비",number:"",note:"",files:[]},
      ]
    },
    settlementDate:null, settled:false,
  },
  {
    id:"p2", name:"현대 수소전기차 다큐", client:"현대자동차", color:"#7c3aed",
    format:"다큐멘터리형", due:"2026-05-30", director:"이준혁", pd:"박민서",
    stage:"프리프로덕션", createdAt:"2026-02-01",
    tasks:[
      {id:"t6",title:"다큐 기획안 작성",type:"스크립트",assignee:"박민서",stage:"납품완료",due:"2026-02-10",priority:"높음",desc:""},
      {id:"t7",title:"인터뷰 대상 섭외",type:"캐스팅",assignee:"한지수",stage:"프리프로덕션",due:"2026-03-01",priority:"보통",desc:""},
    ],
    quote:{
      vat:true, agencyFeeRate:10,
      items: makeTemplate()
    },
    budget:{ vouchers:[] },
    settlementDate:null, settled:false,
  },
];

// ═══════════════════════════════════════════════════════════
// PDF 견적서 출력
// ═══════════════════════════════════════════════════════════
function openQuotePDF(project, quote, company={}) {
  const fmtN = n => (n||0).toLocaleString("ko-KR");
  const sub    = (quote.items||[]).reduce((s,cat)=>s+(cat.groups||[]).reduce((s2,grp)=>s2+(grp.items||[]).reduce((s3,it)=>s3+(it.qty||0)*(it.unitPrice||0),0),0),0);
  const fee    = Math.round(sub*(quote.agencyFeeRate||0)/100);
  const supply = sub+fee;
  const vat    = quote.vat?Math.round(supply*0.1):0;
  const total  = supply+vat;
  const today  = new Date();
  const validEnd = new Date(today); validEnd.setDate(today.getDate()+(company.validDays||30));
  const dateStr = d => `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
  let itemRows="",rowNum=1;
  for(const cat of (quote.items||[])){
    const catTotal=(cat.groups||[]).reduce((s,g)=>s+(g.items||[]).reduce((s2,it)=>s2+(it.qty||0)*(it.unitPrice||0),0),0);
    if(!catTotal)continue;
    itemRows+=`<tr class="cat-row"><td colspan="7">■ ${cat.category}</td></tr>`;
    for(const grp of (cat.groups||[])){
      const gi=(grp.items||[]).filter(it=>(it.qty||0)*(it.unitPrice||0)>0);
      if(!gi.length)continue;
      gi.forEach((it,idx)=>{
        const amt=(it.qty||0)*(it.unitPrice||0);
        itemRows+=`<tr><td class="num">${rowNum++}</td><td class="grp-cell">${idx===0?grp.group:""}</td><td>${it.name}</td><td class="center">${it.unit}</td><td class="right">${fmtN(it.qty)}</td><td class="right">${fmtN(it.unitPrice)}</td><td class="right amount">${fmtN(amt)}</td></tr>`;
      });
      const gt=gi.reduce((s,it)=>s+(it.qty||0)*(it.unitPrice||0),0);
      itemRows+=`<tr class="subtotal-row"><td colspan="6" class="right" style="font-style:italic;color:#64748b">└ ${grp.group} 소계</td><td class="right">${fmtN(gt)}</td></tr>`;
    }
    itemRows+=`<tr class="cat-total-row"><td colspan="6" class="right">${cat.category} 합계</td><td class="right">${fmtN(catTotal)}</td></tr>`;
  }
  const html=`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
<title>견적서 — ${project.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans KR',sans-serif;background:#f8fafc;color:#1e293b;font-size:13px}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:14mm 14mm 16mm;position:relative}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10mm;padding-bottom:6mm;border-bottom:3px solid #2563eb}
.logo-box{width:140px;height:52px;border:2px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px}
.doc-title{font-size:30px;font-weight:800;color:#2563eb;letter-spacing:-1px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8mm}
.party-box{border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;position:relative;overflow:hidden}
.party-box::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px}
.party-box.to::before{background:#2563eb}.party-box.from::before{background:#64748b}
.party-label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
.party-name{font-size:16px;font-weight:800;color:#1e293b;margin-bottom:4px}
.party-meta{font-size:11px;color:#94a3b8;margin-top:2px}
.summary-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:8mm}
.sc{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px}
.sc.total{background:linear-gradient(135deg,#2563eb,#1d4ed8);border-color:#2563eb}
.sc .label{font-size:10px;font-weight:600;color:#3b82f6;margin-bottom:4px}
.sc.total .label{color:#bfdbfe}
.sc .value{font-size:17px;font-weight:800;color:#1e40af}
.sc.total .value{color:#fff;font-size:19px}
table{width:100%;border-collapse:collapse;margin-bottom:6mm}
thead th{background:#1e40af;color:#fff;padding:8px 10px;font-size:11px;font-weight:600;text-align:left}
thead th.right{text-align:right}thead th.center{text-align:center}
tbody tr{border-bottom:1px solid #f1f5f9}
td{padding:7px 10px;font-size:12px;vertical-align:middle}
td.num{color:#94a3b8;font-size:11px;width:28px;text-align:center}
td.grp-cell{color:#475569;font-size:11px;font-weight:600;width:90px}
td.center{text-align:center}td.right{text-align:right}td.amount{font-weight:600}
tr.cat-row td{background:#eff6ff;color:#1d4ed8;font-weight:700;font-size:12px;padding:7px 10px}
tr.subtotal-row td{background:#f8fafc;font-size:11px;padding:5px 10px}
tr.cat-total-row td{background:#dbeafe;color:#1e40af;font-weight:700;font-size:12px;padding:7px 10px;border-top:1px solid #bfdbfe}
.total-section{display:flex;justify-content:flex-end;margin-bottom:8mm}
.total-table{width:280px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
.tr{display:flex;justify-content:space-between;padding:8px 14px;font-size:12px;border-bottom:1px solid #f1f5f9}
.tr:last-child{border-bottom:none;background:#2563eb;color:#fff;font-size:14px;font-weight:800;padding:10px 14px}
.tr .tl{color:#64748b}.tr:last-child .tl{color:#bfdbfe}.tr .tv{font-weight:600}
.bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8mm}
.info-box{border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px}
.info-title{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.sign-section{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:4mm}
.sign-box{border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center}
.sign-label{font-size:10px;font-weight:700;color:#64748b;letter-spacing:1px;margin-bottom:12px}
.sign-name{font-size:13px;font-weight:600;color:#1e293b;margin-bottom:24px}
.sign-line{border-bottom:1px solid #cbd5e1;margin:0 20px 6px}
.sign-hint{font-size:10px;color:#94a3b8}
.footer{position:absolute;bottom:8mm;left:14mm;right:14mm;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:6px}
.no-print{background:#1e40af;padding:12px 20px;display:flex;align-items:center;justify-content:space-between}
@media print{body{background:#fff}.page{margin:0;padding:12mm}.no-print{display:none}}
</style></head><body>
<div class="no-print">
  <span style="color:#fff;font-weight:700;font-size:14px;">🎬 ${company.name||"견적서"} 미리보기</span>
  <button onclick="window.print()" style="background:#fff;color:#1e40af;border:none;padding:8px 20px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">🖨️ PDF 저장 / 인쇄</button>
</div>
<div class="page">
  <div class="header">
    <div>
      ${company.logoUrl?`<img src="${company.logoUrl}" style="height:104px;max-width:320px;object-fit:contain;" onerror="this.style.display='none'"/>`:`<div class="logo-box">🎬 로고 미설정</div>`}
      <div style="font-size:18px;font-weight:800;margin-top:6px">${company.name||"회사명"}</div>
    </div>
    <div style="text-align:right">
      <div class="doc-title">견 적 서</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px">No. ${project.id.toUpperCase()}-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px">작성일: ${dateStr(today)}</div>
    </div>
  </div>
  <div class="parties">
    <div class="party-box to">
      <div class="party-label">수 신</div>
      <div class="party-name">${project.client} 귀중</div>
      <div style="font-size:12px;color:#475569">프로젝트: ${project.name}</div>
      <div class="party-meta">포맷: ${project.format||"-"} · 납품: ${project.due||"-"}</div>
    </div>
    <div class="party-box from">
      <div class="party-label">발 신</div>
      <div class="party-name">${company.name||"회사명"}</div>
      <div style="font-size:12px;color:#475569">담당 PD: ${project.pd||"-"} · 감독: ${project.director||"-"}</div>
      ${company.phone?`<div class="party-meta">📞 ${company.phone}</div>`:""}
      ${company.email?`<div class="party-meta">✉️ ${company.email}</div>`:""}
      ${company.address?`<div class="party-meta">📍 ${company.address}</div>`:""}
      ${company.bizNo?`<div class="party-meta">사업자: ${company.bizNo}</div>`:""}
    </div>
  </div>
  <div class="summary-cards">
    <div class="sc"><div class="label">공급가액 (VAT 제외)</div><div class="value">${fmtN(supply)}원</div></div>
    <div class="sc"><div class="label">부가가치세 (10%)</div><div class="value">${quote.vat?fmtN(vat)+"원":"별도"}</div></div>
    <div class="sc total"><div class="label">최종 견적 금액</div><div class="value">${fmtN(total)}원</div></div>
  </div>
  <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;display:flex;align-items:center;gap:6px"><span style="width:3px;height:14px;background:#2563eb;border-radius:2px;display:inline-block"></span>견적 내역</div>
  <table>
    <thead><tr><th style="width:28px">No.</th><th style="width:90px">중분류</th><th>항목명</th><th class="center" style="width:45px">단위</th><th class="right" style="width:55px">수량</th><th class="right" style="width:90px">단가</th><th class="right" style="width:100px">금액</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="total-section">
    <div class="total-table">
      <div class="tr"><span class="tl">소계</span><span class="tv">${fmtN(sub)}원</span></div>
      ${(quote.agencyFeeRate||0)>0?`<div class="tr"><span class="tl">대행수수료 (${quote.agencyFeeRate}%)</span><span class="tv">${fmtN(fee)}원</span></div>`:""}
      <div class="tr"><span class="tl">공급가액</span><span class="tv">${fmtN(supply)}원</span></div>
      ${quote.vat?`<div class="tr"><span class="tl">부가세 (10%)</span><span class="tv">${fmtN(vat)}원</span></div>`:""}
      <div class="tr"><span class="tl">최종 견적 금액</span><span class="tv">${fmtN(total)}원</span></div>
    </div>
  </div>
  <div class="bottom-grid">
    <div class="info-box">
      <div class="info-title">📅 견적 유효기간</div>
      <div style="font-size:13px;font-weight:700;color:#2563eb">${dateStr(today)} ~ ${dateStr(validEnd)}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:6px">유효기간 이후 금액이 변동될 수 있습니다.</div>
    </div>
    <div class="info-box">
      <div class="info-title">💬 특이사항 / 비고</div>
      <div style="font-size:12px;color:#64748b;line-height:1.6">${(company.quoteNote||"").split("\n").join("<br/>")}</div>
    </div>
  </div>
  ${(company.bankName||company.bankAccount)?`<div class="info-box" style="margin-bottom:8mm"><div class="info-title">🏦 입금 계좌</div><div style="font-size:13px;font-weight:700">${company.bankName||""} ${company.bankAccount||""}</div><div style="font-size:12px;color:#475569;margin-top:2px">예금주: ${company.bankHolder||""}</div></div>`:""}
  <div class="sign-section">
    <div class="sign-box"><div class="sign-label">클라이언트 확인</div><div class="sign-name">${project.client}</div><div class="sign-line"></div><div class="sign-hint">(서명 또는 날인)</div></div>
    <div class="sign-box"><div class="sign-label">담당자 확인</div><div class="sign-name">${company.name||"회사명"} · ${project.pd||"담당 PD"}</div><div class="sign-line"></div><div class="sign-hint">(서명 또는 날인)</div></div>
  </div>
  <div class="footer">${company.name||"회사명"} · 본 견적서는 CutFlow로 작성되었습니다 · ${dateStr(today)}</div>
</div></body></html>`;
  const blob=new Blob([html],{type:"text/html;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.target="_blank";a.rel="noopener";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
// ═══════════════════════════════════════════════════════════
// PDF 견적서 출력 - 포맷 B (상세형)
// ═══════════════════════════════════════════════════════════
function openQuotePDFB(project, quote, company={}) {
  const fmtN = n => (n||0).toLocaleString("ko-KR");
  const today = new Date();
  const validEnd = new Date(today); validEnd.setDate(today.getDate()+(company.validDays||30));
  const dateStr = d => `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;

  // 부문별 소계 계산
  let sections = [];
  let grandTotal = 0;
  for (const cat of (quote.items||[])) {
    const catTotal = (cat.groups||[]).reduce((s,g)=>s+(g.items||[]).reduce((s2,it)=>s2+(it.qty||0)*(it.unitPrice||0),0),0);
    if (!catTotal) continue;
    let rows = "";
    for (const grp of (cat.groups||[])) {
      const grpItems = (grp.items||[]).filter(it=>(it.qty||0)*(it.unitPrice||0)>0);
      if (!grpItems.length) continue;
      rows += `<tr class="grp-header"><td colspan="5" style="padding:6px 10px;font-size:11px;font-weight:700;color:#475569;background:#f8fafc;">[ ${grp.group} ]</td></tr>`;
      grpItems.forEach(it=>{
        const amt=(it.qty||0)*(it.unitPrice||0);
        rows+=`<tr><td style="padding:6px 10px;font-size:12px;">${it.name}</td><td style="text-align:center;padding:6px 10px;font-size:12px;">${it.unit||""}</td><td style="text-align:center;padding:6px 10px;font-size:12px;">${fmtN(it.qty)}</td><td style="text-align:right;padding:6px 10px;font-size:12px;">${fmtN(it.unitPrice)}</td><td style="text-align:right;padding:6px 10px;font-size:12px;font-weight:600;">${fmtN(amt)}</td></tr>`;
      });
    }
    sections.push({label:cat.category, total:catTotal, rows});
    grandTotal += catTotal;
  }

  const agencyFee = Math.round(grandTotal*(quote.agencyFeeRate||0)/100);
  const supply = grandTotal + agencyFee;
  const mgmt = Math.round(supply*0.10);   // 일반관리비 10%
  const profit = Math.round((supply+mgmt)*0.05); // 기업이윤 5%
  const finalSupply = supply + mgmt + profit;
  const vat = quote.vat ? Math.round(finalSupply*0.1) : 0;
  const total = finalSupply + vat;

  let sectionsHtml = "";
  sections.forEach((sec,i)=>{
    sectionsHtml += `
    <tr class="cat-header">
      <td colspan="4" style="padding:8px 10px;font-weight:800;font-size:13px;background:#1e40af;color:#fff;">${String.fromCharCode(65+i)}. ${sec.label}</td>
      <td style="text-align:right;padding:8px 10px;font-weight:800;font-size:13px;background:#1e40af;color:#fff;">${fmtN(sec.total)}</td>
    </tr>
    ${sec.rows}
    <tr class="subtotal">
      <td colspan="4" style="text-align:right;padding:7px 10px;font-size:12px;font-weight:700;color:#1e40af;background:#eff6ff;">소 계 (${String.fromCharCode(65+i)})</td>
      <td style="text-align:right;padding:7px 10px;font-size:12px;font-weight:700;color:#1e40af;background:#eff6ff;">${fmtN(sec.total)}</td>
    </tr>`;
  });

  const html=`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
<title>견적서(상세) — ${project.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans KR',sans-serif;background:#f8fafc;color:#1e293b;font-size:13px}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:12mm 12mm 14mm}
.no-print{background:#1e40af;padding:12px 20px;display:flex;align-items:center;justify-content:space-between}
table{width:100%;border-collapse:collapse;}
th{background:#1e40af;color:#fff;padding:8px 10px;font-size:11px;font-weight:700;text-align:left;border:1px solid #1e3a8a}
td{border:1px solid #e2e8f0;vertical-align:middle}
tr:hover td{background:#f8fafc}
.cat-header td{border-color:#1e3a8a}
@media print{body{background:#fff}.page{margin:0;padding:10mm}.no-print{display:none}}
</style></head><body>
<div class="no-print">
  <span style="color:#fff;font-weight:700;font-size:14px;">🎬 ${company.name||"견적서"} · 상세형</span>
  <button onclick="window.print()" style="background:#fff;color:#1e40af;border:none;padding:8px 20px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">🖨️ PDF 저장 / 인쇄</button>
</div>
<div class="page">
  <!-- 헤더 -->
  <div style="text-align:center;border-bottom:3px solid #1e40af;padding-bottom:8mm;margin-bottom:8mm;">
    <div style="font-size:28px;font-weight:800;letter-spacing:8px;color:#1e293b;">견 적 서</div>
  </div>
  <table style="margin-bottom:6mm;border:1px solid #e2e8f0">
    <tr><td style="width:80px;padding:7px 10px;background:#f8fafc;font-weight:700;font-size:11px;">수 신</td><td style="padding:7px 10px;font-size:13px;font-weight:700">${project.client} 귀중</td><td style="width:80px;padding:7px 10px;background:#f8fafc;font-weight:700;font-size:11px;">발행일</td><td style="padding:7px 10px;font-size:12px;">${dateStr(today)}</td></tr>
    <tr><td style="padding:7px 10px;background:#f8fafc;font-weight:700;font-size:11px;">제 목</td><td style="padding:7px 10px;font-size:13px;font-weight:700">${project.name}</td><td style="padding:7px 10px;background:#f8fafc;font-weight:700;font-size:11px;">유효기간</td><td style="padding:7px 10px;font-size:12px;">${dateStr(validEnd)}까지</td></tr>
    <tr><td style="padding:7px 10px;background:#f8fafc;font-weight:700;font-size:11px;">견적가액</td><td colspan="3" style="padding:7px 10px;font-size:14px;font-weight:800;color:#1e40af;">총 ${fmtN(total)}원 ${quote.vat?"(VAT포함)":"(VAT별도)"}</td></tr>
  </table>

  <!-- 항목 테이블 -->
  <table style="margin-bottom:4mm">
    <thead><tr><th style="width:auto">품 명</th><th style="width:50px;text-align:center">단위</th><th style="width:50px;text-align:center">수량</th><th style="width:90px;text-align:right">단 가</th><th style="width:100px;text-align:right">견적금액</th></tr></thead>
    <tbody>${sectionsHtml}</tbody>
  </table>

  <!-- 합계 -->
  <table style="margin-bottom:6mm;margin-left:auto;width:280px">
    <tr><td style="padding:7px 12px;background:#f8fafc;font-size:12px">제작비 소계</td><td style="text-align:right;padding:7px 12px;font-size:12px;font-weight:600">${fmtN(grandTotal)}원</td></tr>
    ${agencyFee>0?`<tr><td style="padding:7px 12px;background:#f8fafc;font-size:12px">대행수수료 (${quote.agencyFeeRate}%)</td><td style="text-align:right;padding:7px 12px;font-size:12px;font-weight:600">${fmtN(agencyFee)}원</td></tr>`:""}
    <tr><td style="padding:7px 12px;background:#f8fafc;font-size:12px">일반관리비 (10%)</td><td style="text-align:right;padding:7px 12px;font-size:12px;font-weight:600">${fmtN(mgmt)}원</td></tr>
    <tr><td style="padding:7px 12px;background:#f8fafc;font-size:12px">기업이윤 (5%)</td><td style="text-align:right;padding:7px 12px;font-size:12px;font-weight:600">${fmtN(profit)}원</td></tr>
    ${quote.vat?`<tr><td style="padding:7px 12px;background:#f8fafc;font-size:12px">부가세 (10%)</td><td style="text-align:right;padding:7px 12px;font-size:12px;font-weight:600">${fmtN(vat)}원</td></tr>`:""}
    <tr><td style="padding:9px 12px;background:#1e40af;color:#fff;font-size:13px;font-weight:800">최종 견적금액</td><td style="text-align:right;padding:9px 12px;background:#1e40af;color:#fff;font-size:14px;font-weight:800">${fmtN(total)}원</td></tr>
  </table>

  <!-- 비고 -->
  ${(company.quoteNote||"")?`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:6mm;font-size:12px;color:#64748b;line-height:1.8">${(company.quoteNote||"").split("\n").join("<br/>")}</div>`:""}

  <!-- 계좌 + 서명 -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:6mm">
    ${(company.bankName||company.bankAccount)?`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px"><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:6px">🏦 입금 계좌</div><div style="font-size:13px;font-weight:700">${company.bankName} ${company.bankAccount}</div><div style="font-size:12px;color:#475569">예금주: ${company.bankHolder||""}</div></div>`:"<div></div>"}
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;text-align:center">
      <div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:10px">공급자</div>
      <div style="font-size:13px;font-weight:700">${company.name||""}</div>
      ${company.phone?`<div style="font-size:11px;color:#64748b;margin-top:2px">Tel: ${company.phone}</div>`:""}
      ${company.email?`<div style="font-size:11px;color:#64748b">Email: ${company.email}</div>`:""}
      ${company.bizNo?`<div style="font-size:11px;color:#64748b">사업자: ${company.bizNo}</div>`:""}
      <div style="border-bottom:1px solid #cbd5e1;margin:12px 20px 6px"></div>
      <div style="font-size:10px;color:#94a3b8">(서명 또는 날인)</div>
    </div>
  </div>
  <div style="text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:6px">${company.name||""} · 본 견적서는 CutFlow로 작성되었습니다 · ${dateStr(today)}</div>
</div></body></html>`;

  const blob=new Blob([html],{type:"text/html;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.target="_blank";a.rel="noopener";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}


// ═══════════════════════════════════════════════════════════
// 공통 UI 컴포넌트
// ═══════════════════════════════════════════════════════════
const btnSm = {padding:"4px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:500};
const inp = {width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};

function Btn({ children, primary, danger, ghost, sm, onClick, style={}, disabled }) {
  const base = {padding:sm?"5px 11px":"9px 18px",borderRadius:8,border:"none",cursor:disabled?"not-allowed":"pointer",fontSize:sm?12:13,fontWeight:600,transition:"opacity .15s",...style};
  const variant = primary?{background:C.blue,color:"#fff"}:danger?{background:C.red,color:"#fff"}:ghost?{background:"transparent",color:C.blue,border:`1px solid ${C.blue}`}:{background:C.slateLight,color:C.text,border:`1px solid ${C.border}`};
  return <button style={{...base,...variant,opacity:disabled?.5:1}} onClick={disabled?undefined:onClick}>{children}</button>;
}

function Field({ label, children, half }) {
  return (
    <div style={{flex:half?"1 1 140px":"1 1 100%",marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:600,color:C.sub,marginBottom:5}}>{label}</div>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div style={{background:C.white,borderRadius:16,padding:28,width:"100%",maxWidth:wide?700:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.15)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:16}}>{title}</div>
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:22,cursor:"pointer",color:C.faint,lineHeight:1}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Avatar({ name, size=28 }) {
  return <div title={name} style={{width:size,height:size,borderRadius:"50%",background:C.blueLight,color:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.43,fontWeight:700,flexShrink:0}}>{(name||"?")[0]}</div>;
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{display:"flex",borderBottom:`2px solid ${C.border}`,marginBottom:24}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>!t.locked&&onChange(t.id)}
          title={t.locked?"접근 권한이 없습니다":""}
          style={{padding:"10px 20px",border:"none",background:"none",cursor:t.locked?"not-allowed":"pointer",fontSize:14,fontWeight:active===t.id?700:500,color:t.locked?C.faint:active===t.id?C.blue:C.sub,borderBottom:active===t.id?`2px solid ${C.blue}`:"2px solid transparent",marginBottom:-2,display:"flex",alignItems:"center",gap:6,opacity:t.locked?0.5:1}}>
          {t.icon} {t.label}{t.locked?" 🔒":""}
        </button>
      ))}
    </div>
  );
}

const todayStr = () => new Date().toISOString().slice(0,10);
const isOverdue = t => t.stage!=="납품완료" && t.due && t.due < todayStr();

// ═══════════════════════════════════════════════════════════
// 로그인 화면
// ═══════════════════════════════════════════════════════════
function LoginScreen({ onLogin, accounts }) {
  const [selId, setSelId] = useState(accounts[0]?.id ?? "");
  const [pw, setPw]       = useState("");
  const [err, setErr]     = useState("");
  const [show, setShow]   = useState(false);

  const login = () => {
    const acc = accounts.find(a=>String(a.id)===String(selId) && a.pw===pw);
    if (acc) onLogin(acc);
    else setErr("비밀번호가 올바르지 않습니다.");
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Pretendard','Apple SD Gothic Neo',-apple-system,sans-serif"}}>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:380,boxShadow:"0 8px 40px rgba(0,0,0,.08)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:36,marginBottom:8}}>🎬</div>
          <div style={{fontWeight:800,fontSize:22,letterSpacing:-0.5}}>CutFlow</div>
          <div style={{fontSize:13,color:C.faint,marginTop:4}}>광고 영상 프로덕션 관리</div>
        </div>
        <Field label="이름">
          <select style={inp} value={selId} onChange={e=>{setSelId(e.target.value);setErr("");setPw("");}}>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
          </select>
        </Field>
        <Field label="비밀번호">
          <div style={{position:"relative"}}>
            <input style={{...inp,paddingRight:40}} type={show?"text":"password"} value={pw}
              placeholder="비밀번호 입력"
              onChange={e=>{setPw(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&login()}/>
            <button onClick={()=>setShow(v=>!v)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",color:C.faint,fontSize:15,padding:0}}>
              {show?"🙈":"👁"}
            </button>
          </div>
        </Field>
        {err && <div style={{fontSize:13,color:C.red,marginBottom:12,padding:"8px 12px",background:C.redLight,borderRadius:8}}>{err}</div>}
        <button onClick={login} style={{width:"100%",padding:12,borderRadius:10,border:"none",background:C.blue,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:4}}>
          로그인
        </button>
        </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 칸반 컬럼
// ═══════════════════════════════════════════════════════════
function KanbanCol({ stage, tasks, onEdit }) {
  const cfg = STAGES[stage];
  return (
    <div style={{flex:"0 0 190px",background:C.bg,borderRadius:12,padding:13,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
        <span>{cfg.icon}</span>
        <span style={{fontWeight:700,fontSize:13,color:cfg.color}}>{stage}</span>
        <span style={{marginLeft:"auto",background:cfg.bg,color:cfg.color,borderRadius:99,padding:"1px 8px",fontSize:12,fontWeight:700}}>{tasks.length}</span>
      </div>
      {tasks.map(t=>(
        <div key={t.id} onClick={()=>onEdit(t)} style={{background:C.white,border:`1px solid ${isOverdue(t)?"#fca5a5":C.border}`,borderRadius:10,padding:"12px 13px",cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{t.title}</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,background:C.slateLight,color:C.slate,padding:"2px 7px",borderRadius:99}}>{t.type}</span>
            <Avatar name={t.assignee} size={22}/>
          </div>
          {t.due&&<div style={{fontSize:11,color:isOverdue(t)?C.red:C.faint,marginTop:6}}>{isOverdue(t)?"⚠ ":"📅 "}{t.due}</div>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 견적서 에디터 (대분류 > 중분류 > 소분류 3단계)
// ═══════════════════════════════════════════════════════════
function QuoteEditor({ quote, onChange, exportProject, company }) {
  const q = quote;
  const [addModal,    setAddModal]    = useState(null); // {ci, gi}
  const [newItem,     setNewItem]     = useState({name:"",unit:"식",qty:1,unitPrice:0});
  const [addGrpModal, setAddGrpModal] = useState(null); // ci
  const [newGrp,      setNewGrp]      = useState("");

  /* 소분류 CRUD */
  const patchItem = (ci,gi,id,k,v) => onChange({...q, items:q.items.map((cat,i)=> i!==ci?cat:{
    ...cat, groups:cat.groups.map((grp,j)=> j!==gi?grp:{
      ...grp, items:grp.items.map(it=> it.id!==id?it:{...it,[k]:k==="qty"||k==="unitPrice"?Number(v)||0:v})
    })
  })});
  const removeItem = (ci,gi,id) => onChange({...q, items:q.items.map((cat,i)=> i!==ci?cat:{
    ...cat, groups:cat.groups.map((grp,j)=> j!==gi?grp:{...grp, items:grp.items.filter(it=>it.id!==id)})
  })});
  const addItem = () => {
    if (!newItem.name.trim()) return;
    const {ci,gi} = addModal;
    onChange({...q, items:q.items.map((cat,i)=> i!==ci?cat:{
      ...cat, groups:cat.groups.map((grp,j)=> j!==gi?grp:{
        ...grp, items:[...grp.items, {...newItem,id:newId(),qty:Number(newItem.qty)||1,unitPrice:Number(newItem.unitPrice)||0}]
      })
    })});
    setAddModal(null); setNewItem({name:"",unit:"식",qty:1,unitPrice:0});
  };

  /* 중분류 CRUD */
  const addGroup = (ci) => {
    if (!newGrp.trim()) return;
    onChange({...q, items:q.items.map((cat,i)=> i!==ci?cat:{
      ...cat, groups:[...cat.groups, {gid:newId(),group:newGrp,items:[]}]
    })});
    setAddGrpModal(null); setNewGrp("");
  };
  const renameGroup  = (ci,gi,v) => onChange({...q, items:q.items.map((cat,i)=> i!==ci?cat:{
    ...cat, groups:cat.groups.map((grp,j)=> j!==gi?grp:{...grp,group:v})
  })});
  const removeGroup  = (ci,gi) => onChange({...q, items:q.items.map((cat,i)=> i!==ci?cat:{
    ...cat, groups:cat.groups.filter((_,j)=>j!==gi)
  })});

  /* 대분류 CRUD */
  const addCategory    = () => onChange({...q, items:[...q.items, {category:"새 대분류",groups:[{gid:newId(),group:"새 중분류",items:[]}]}]});
  const renameCategory = (ci,v) => onChange({...q, items:q.items.map((cat,i)=>i===ci?{...cat,category:v}:cat)});
  const removeCategory = (ci) => onChange({...q, items:q.items.filter((_,i)=>i!==ci)});

  const sub=qSub(q), fee=qFee(q), supply=qSupply(q), vat=qVat(q), total=qTotal(q);

  return (
    <div>
      {/* 옵션 바 */}
      <div style={{display:"flex",gap:16,marginBottom:16,padding:"13px 18px",background:C.blueLight,borderRadius:12,alignItems:"center",flexWrap:"wrap"}}>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,cursor:"pointer"}}>
          <input type="checkbox" checked={q.vat} onChange={e=>onChange({...q,vat:e.target.checked})} style={{accentColor:C.blue}}/>
          부가세 10% 포함
        </label>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,fontWeight:600,color:C.sub}}>대행수수료</span>
          <input type="number" value={q.agencyFeeRate||0} min={0} max={100}
            onChange={e=>onChange({...q,agencyFeeRate:Number(e.target.value)||0})}
            style={{...inp,width:60,textAlign:"right"}}/>
          <span style={{fontSize:13,color:C.sub}}>%</span>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {exportProject && (
            <Btn sm onClick={()=>(exportProject.quoteFmt||"A")==="B"?openQuotePDFB(exportProject,q,company):openQuotePDF(exportProject,q,company)}
              style={{background:"#2563eb10",color:C.blue,border:`1px solid #2563eb40`}}>
              📄 견적서 PDF {exportProject.quoteFmt==="B"?"(상세형)":"(표준형)"} 출력
            </Btn>
          )}
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:C.sub}}>견적 합계 (VAT {q.vat?"포함":"제외"})</div>
            <div style={{fontSize:18,fontWeight:800,color:C.blue}}>{fmt(total)}</div>
          </div>
        </div>
      </div>

      {/* 대분류 반복 */}
      {q.items.map((cat,ci)=>(
        <div key={ci} style={{marginBottom:20,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
          {/* 대분류 헤더 */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#f0f4ff",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:13,color:C.blue,fontWeight:700}}>■</span>
            <input value={cat.category} onChange={e=>renameCategory(ci,e.target.value)}
              style={{...inp,fontWeight:800,fontSize:15,background:"transparent",border:"none",outline:"none",padding:"2px 4px",color:C.blue,width:"auto",minWidth:80}}/>
            <span style={{fontSize:12,color:C.sub,marginLeft:4}}>합계: <b style={{color:C.blue}}>{fmt(catAmt(cat))}</b></span>
            <div style={{marginLeft:"auto",display:"flex",gap:6}}>
              <Btn sm ghost onClick={()=>{setAddGrpModal(ci);setNewGrp("");}}>+ 중분류</Btn>
              <button onClick={()=>removeCategory(ci)} style={{border:"none",background:"none",color:C.faint,cursor:"pointer",fontSize:16,lineHeight:1,padding:"2px 4px"}}>×</button>
            </div>
          </div>

          {/* 중분류 반복 */}
          {cat.groups.map((grp,gi)=>(
            <div key={grp.gid||gi}>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px 6px",background:"#fafbfc",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:12,color:C.slate,fontWeight:600}}>▸</span>
                <input value={grp.group} onChange={e=>renameGroup(ci,gi,e.target.value)}
                  style={{...inp,fontWeight:700,fontSize:13,background:"transparent",border:"none",outline:"none",padding:"2px 4px",color:C.slate,width:"auto",minWidth:60}}/>
                <span style={{fontSize:12,color:C.faint}}>소계: <b style={{color:C.text}}>{fmt(grpAmt(grp))}</b></span>
                <div style={{marginLeft:"auto",display:"flex",gap:6}}>
                  <Btn sm ghost onClick={()=>setAddModal({ci,gi})}>+ 항목</Btn>
                  <button onClick={()=>removeGroup(ci,gi)} style={{border:"none",background:"none",color:C.faint,cursor:"pointer",fontSize:15,lineHeight:1,padding:"2px 4px"}}>×</button>
                </div>
              </div>
              {/* 소분류 테이블 헤더 */}
              {gi===0&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 55px 90px 130px 130px 36px",background:C.slateLight,padding:"6px 14px",fontSize:11,fontWeight:700,color:C.faint,gap:8}}>
                  <span>소분류 항목</span><span>단위</span><span style={{textAlign:"right"}}>수량</span><span style={{textAlign:"right"}}>단가</span><span style={{textAlign:"right"}}>금액</span><span/>
                </div>
              )}
              {/* 소분류 행 */}
              {grp.items.length===0
                ? <div style={{padding:"10px 14px",fontSize:12,color:C.faint,fontStyle:"italic"}}>항목을 추가하세요</div>
                : grp.items.map((it,ii)=>(
                  <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 55px 90px 130px 130px 36px",padding:"6px 14px",borderTop:"1px solid #f0f0f0",gap:8,alignItems:"center",background:ii%2===0?C.white:"#fefefe"}}>
                    <input value={it.name} onChange={e=>patchItem(ci,gi,it.id,"name",e.target.value)}
                      style={{...inp,background:"transparent",border:"1px solid transparent",padding:"4px 6px"}}
                      onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor="transparent"}/>
                    <input value={it.unit} onChange={e=>patchItem(ci,gi,it.id,"unit",e.target.value)}
                      style={{...inp,background:"transparent",border:"1px solid transparent",padding:"4px 6px",textAlign:"center"}}
                      onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor="transparent"}/>
                    <input type="number" value={it.qty} onChange={e=>patchItem(ci,gi,it.id,"qty",e.target.value)}
                      style={{...inp,background:"transparent",border:"1px solid transparent",padding:"4px 6px",textAlign:"right"}}
                      onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor="transparent"}/>
                    <input type="number" value={it.unitPrice} onChange={e=>patchItem(ci,gi,it.id,"unitPrice",e.target.value)}
                      style={{...inp,background:"transparent",border:"1px solid transparent",padding:"4px 6px",textAlign:"right"}}
                      onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor="transparent"}/>
                    <span style={{textAlign:"right",fontSize:13,fontWeight:600}}>{fmt(itemAmt(it))}</span>
                    <button onClick={()=>removeItem(ci,gi,it.id)} style={{border:"none",background:"none",color:C.faint,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
                  </div>
                ))
              }
              {/* 중분류 소계 */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 55px 90px 130px 130px 36px",padding:"6px 14px",borderTop:`1px solid ${C.border}`,gap:8,background:"#f8f9fa"}}>
                <span style={{fontSize:12,color:C.sub,fontStyle:"italic"}}>└ {grp.group} 소계</span>
                <span/><span/><span/>
                <span style={{textAlign:"right",fontSize:12,fontWeight:700,color:C.slate}}>{fmt(grpAmt(grp))}</span>
                <span/>
              </div>
            </div>
          ))}
          {/* 대분류 합계 */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 55px 90px 130px 130px 36px",padding:"8px 14px",borderTop:`2px solid ${C.border}`,gap:8,background:"#f0f4ff"}}>
            <span style={{fontSize:13,fontWeight:800,color:C.blue}}>{cat.category} 합계</span>
            <span/><span/><span/>
            <span style={{textAlign:"right",fontSize:13,fontWeight:800,color:C.blue}}>{fmt(catAmt(cat))}</span>
            <span/>
          </div>
        </div>
      ))}

      <Btn ghost onClick={addCategory} style={{marginBottom:24}}>+ 대분류 추가</Btn>

      {/* 최종 합계 */}
      <div style={{background:C.slateLight,borderRadius:12,padding:"16px 20px",border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",flexDirection:"column",gap:7,maxWidth:340,marginLeft:"auto"}}>
          {[["소계",sub],q.agencyFeeRate>0?[`대행수수료 (${q.agencyFeeRate}%)`,fee]:null,["공급가액",supply],q.vat?["부가세 (10%)",vat]:null]
            .filter(Boolean).map(([label,val])=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.sub}}>
              <span>{label}</span><span style={{fontWeight:600,color:C.text}}>{fmt(val)}</span>
            </div>
          ))}
          <div style={{borderTop:`2px solid ${C.border}`,marginTop:4,paddingTop:10,display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:800,color:C.blue}}>
            <span>견적 합계</span><span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* 소분류 추가 모달 */}
      {addModal!==null && (
        <Modal title={`소분류 추가 — ${q.items[addModal.ci]?.groups[addModal.gi]?.group}`} onClose={()=>setAddModal(null)}>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
            <Field label="항목명 *"><input style={inp} value={newItem.name} autoFocus onChange={e=>setNewItem(v=>({...v,name:e.target.value}))} placeholder="ex. 촬영 1st"/></Field>
            <Field label="단위" half><input style={inp} value={newItem.unit} onChange={e=>setNewItem(v=>({...v,unit:e.target.value}))} placeholder="식/일/명"/></Field>
            <Field label="수량" half><input style={inp} type="number" value={newItem.qty} onChange={e=>setNewItem(v=>({...v,qty:e.target.value}))}/></Field>
            <Field label="단가 (원)"><input style={inp} type="number" value={newItem.unitPrice} onChange={e=>setNewItem(v=>({...v,unitPrice:e.target.value}))} placeholder="0"/></Field>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}>
            <Btn onClick={()=>setAddModal(null)}>취소</Btn>
            <Btn primary onClick={addItem}>추가</Btn>
          </div>
        </Modal>
      )}

      {/* 중분류 추가 모달 */}
      {addGrpModal!==null && (
        <Modal title={`중분류 추가 — ${q.items[addGrpModal]?.category}`} onClose={()=>setAddGrpModal(null)}>
          <Field label="중분류명 *">
            <input style={inp} value={newGrp} autoFocus onChange={e=>setNewGrp(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addGroup(addGrpModal)}
              placeholder="ex. 촬영 인건비"/>
          </Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}>
            <Btn onClick={()=>setAddGrpModal(null)}>취소</Btn>
            <Btn primary onClick={()=>addGroup(addGrpModal)}>추가</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 실행예산서 에디터
// ═══════════════════════════════════════════════════════════
function BudgetEditor({ project, onSave }) {
  const b = project.budget;
  const q = project.quote;

  const [modal,   setModal]   = useState(false);
  const [editV,   setEditV]   = useState(null);
  const [vf,      setVf]      = useState({name:"",vendor:"",type:VOUCHER_TYPES[0],date:todayStr(),amount:"",category:"",group:"",number:"",note:"",files:[]});
  const [preview, setPreview] = useState(null);
  const [analyzing,setAnalyzing]=useState(false);

  // 견적서의 카테고리/그룹 목록
  const catOptions = (q.items||[]).map(c=>c.category);
  const groupOptions = (cat) => {
    const c = (q.items||[]).find(c=>c.category===cat);
    return c ? c.groups.map(g=>g.group) : [];
  };

  const openAdd = () => {
    setEditV(null);
    setVf({name:"",vendor:"",type:VOUCHER_TYPES[0],date:todayStr(),amount:"",category:catOptions[0]||"",group:groupOptions(catOptions[0]||"")[0]||"",number:"",note:"",files:[]});
    setModal(true);
  };
  const openEdit = (v) => {
    setEditV(v);
    setVf({...v});
    setModal(true);
  };

  const save = () => {
    if (!vf.name.trim()||!vf.amount) return;
    const voucher = {...vf, id:editV?editV.id:newId(), amount:Number(vf.amount)||0};
    const vouchers = editV
      ? (b.vouchers||[]).map(v=>v.id===editV.id?voucher:v)
      : [...(b.vouchers||[]), voucher];
    onSave({...b, vouchers});
    setModal(false);
  };
  const remove = (v) => {
    onSave({...b, vouchers:(b.vouchers||[]).filter(x=>x.id!==v.id)});
  };

  // AI 분석 (Anthropic API)
  const analyzeFile = async (file) => {
    setAnalyzing(true);
    try {
      const toB64 = f => new Promise((res,rej)=>{
        const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(f);
      });
      const b64 = await toB64(file);
      const isImg = file.type.startsWith("image/");
      const isPdf = file.type==="application/pdf";

      const msgContent = isImg
        ? [{type:"image",source:{type:"base64",media_type:file.type,data:b64}},{type:"text",text:"이 파일에서 거래처명, 금액, 날짜, 항목명을 JSON으로 추출해줘. {name,vendor,amount,date} 형태."}]
        : isPdf
        ? [{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},{type:"text",text:"이 파일에서 거래처명, 금액, 날짜, 항목명을 JSON으로 추출해줘. {name,vendor,amount,date} 형태."}]
        : null;

      if (!msgContent) { setAnalyzing(false); return; }

      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,messages:[{role:"user",content:msgContent}]})
      });
      const data = await res.json();
      const text = (data.content||[]).map(c=>c.text||"").join("");
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          setVf(v=>({
            ...v,
            name:   parsed.name   || v.name,
            vendor: parsed.vendor || v.vendor,
            amount: parsed.amount ? String(parsed.amount).replace(/[^0-9]/g,"") : v.amount,
            date:   parsed.date   || v.date,
          }));
        } catch(e) {}
      }
    } catch(e) { console.error(e); }
    setAnalyzing(false);
  };

  const handleFile = async (file) => {
    const toB64 = f => new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
    const b64url = await toB64(file);
    setVf(v=>({...v, files:[...(v.files||[]),{name:file.name,type:file.type,b64url,size:file.size}]}));
    analyzeFile(file);
  };

  const spent = vTotal(b);
  const supply = qSupply(q);

  // 예산 현황 by 대분류
  const catSummary = (q.items||[]).map(cat=>{
    const planned = catAmt(cat);
    const actual  = (b.vouchers||[]).filter(v=>v.category===cat.category).reduce((s,v)=>s+(v.amount||0),0);
    return {cat:cat.category, planned, actual, pct: planned?Math.round(actual/planned*100):0};
  });

  return (
    <div>
      {/* 요약 카드 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"견적 공급가액",val:supply,color:C.blue},
          {label:"집행 합계",val:spent,color:C.amber},
          {label:"잔여 예산",val:supply-spent,color:supply-spent>=0?C.green:C.red},
        ].map(s=>(
          <div key={s.label} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${s.color}`}}>
            <div style={{fontSize:11,color:C.sub,marginBottom:6,fontWeight:600}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.color}}>{fmtM(s.val)}</div>
          </div>
        ))}
      </div>

      {/* 대분류별 현황 */}
      <div style={{marginBottom:20,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:C.slateLight,fontSize:12,fontWeight:700,color:C.sub}}>대분류별 집행 현황</div>
        {catSummary.map(s=>(
          <div key={s.cat} style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:120,fontSize:13,fontWeight:600}}>{s.cat}</div>
            <div style={{flex:1}}>
              <div style={{height:6,background:"#e5e7eb",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(s.pct,100)}%`,background:s.pct>100?C.red:s.pct>80?C.amber:C.blue,borderRadius:99,transition:"width .3s"}}/>
              </div>
            </div>
            <div style={{width:80,textAlign:"right",fontSize:12,color:C.sub}}>{fmtM(s.actual)}</div>
            <div style={{width:80,textAlign:"right",fontSize:12,color:C.faint}}>/ {fmtM(s.planned)}</div>
            <div style={{width:48,textAlign:"right",fontSize:12,fontWeight:700,color:s.pct>100?C.red:C.slate}}>{s.pct}%</div>
          </div>
        ))}
      </div>

      {/* 증빙 목록 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:14}}>증빙 목록 ({(b.vouchers||[]).length}건)</div>
        <Btn primary sm onClick={openAdd}>+ 증빙 추가</Btn>
      </div>

      {(b.vouchers||[]).length===0
        ? <div style={{textAlign:"center",padding:40,color:C.faint,fontSize:14,border:`2px dashed ${C.border}`,borderRadius:12}}>증빙을 추가하세요</div>
        : (
          <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 110px 110px 60px",background:C.slateLight,padding:"8px 14px",fontSize:11,fontWeight:700,color:C.sub,gap:8}}>
              <span>항목명</span><span>구분</span><span>업체명</span><span style={{textAlign:"right"}}>금액</span><span style={{textAlign:"right"}}>날짜</span><span/>
            </div>
            {(b.vouchers||[]).map((v,i)=>(
              <div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 110px 110px 60px",padding:"10px 14px",borderTop:`1px solid ${C.border}`,gap:8,alignItems:"center",background:i%2===0?C.white:"#fafbfc"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>{v.name}</div>
                  <div style={{fontSize:11,color:C.faint}}>{v.category} › {v.group}</div>
                </div>
                <span style={{fontSize:11,background:C.slateLight,color:C.slate,padding:"2px 6px",borderRadius:99,whiteSpace:"nowrap"}}>{v.type}</span>
                <span style={{fontSize:13,color:C.sub}}>{v.vendor}</span>
                <span style={{textAlign:"right",fontWeight:700,fontSize:13}}>{fmt(v.amount)}</span>
                <span style={{textAlign:"right",fontSize:12,color:C.faint}}>{v.date}</span>
                <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                  {(v.files||[]).length>0&&<button onClick={()=>setPreview(v)} style={{border:"none",background:"none",cursor:"pointer",fontSize:14,color:C.blue}}>📎</button>}
                  <button onClick={()=>openEdit(v)} style={{border:"none",background:"none",cursor:"pointer",fontSize:14,color:C.sub}}>✏️</button>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* 증빙 모달 */}
      {modal && (
        <Modal title={editV?"증빙 수정":"증빙 추가"} onClose={()=>setModal(false)} wide>
          <div style={{display:"flex",gap:20}}>
            {/* 파일 업로드 패널 */}
            <div style={{width:220,flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:600,color:C.sub,marginBottom:8}}>파일 첨부 (선택)</div>
              <label style={{display:"block",border:`2px dashed ${analyzing?C.blue:C.border}`,borderRadius:10,padding:"20px 12px",textAlign:"center",cursor:"pointer",background:analyzing?C.blueLight:C.bg,transition:"all .2s"}}>
                <input type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleFile(e.target.files[0]);}}/>
                <div style={{fontSize:24,marginBottom:6}}>{analyzing?"⏳":"📎"}</div>
                <div style={{fontSize:12,color:C.sub}}>{analyzing?"AI 분석 중...":"클릭 또는 드롭"}</div>
                <div style={{fontSize:11,color:C.faint,marginTop:4}}>이미지·PDF 지원</div>
              </label>
              {(vf.files||[]).map((f,i)=>(
                <div key={i} style={{marginTop:8,padding:"8px 10px",background:C.slateLight,borderRadius:8,fontSize:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                  <button onClick={()=>setVf(v=>({...v,files:v.files.filter((_,j)=>j!==i)}))} style={{border:"none",background:"none",cursor:"pointer",color:C.faint,fontSize:14,marginLeft:4}}>×</button>
                </div>
              ))}
            </div>
            {/* 입력 패널 */}
            <div style={{flex:1,display:"flex",flexWrap:"wrap",gap:12,alignContent:"flex-start"}}>
              <Field label="항목명 *"><input style={{...inp,background:analyzing?C.blueLight:C.white}} value={vf.name} onChange={e=>setVf(v=>({...v,name:e.target.value}))} placeholder="ex. 카메라 렌탈"/></Field>
              <Field label="업체명 / 공급처 *"><input style={{...inp,background:analyzing?C.blueLight:C.white}} value={vf.vendor} onChange={e=>setVf(v=>({...v,vendor:e.target.value}))} placeholder="ex. 씨네렌탈"/></Field>
              <Field label="계산서번호" half><input style={{...inp,background:analyzing?C.blueLight:C.white}} value={vf.number} onChange={e=>setVf(v=>({...v,number:e.target.value}))} placeholder="2026-001"/></Field>
              <Field label="날짜" half><input style={inp} type="date" value={vf.date} onChange={e=>setVf(v=>({...v,date:e.target.value}))}/></Field>
              <Field label="금액 (원)"><input style={{...inp,background:analyzing?C.blueLight:C.white,fontWeight:700}} type="number" value={vf.amount} onChange={e=>setVf(v=>({...v,amount:e.target.value}))} placeholder="0"/></Field>
              <Field label="증빙 구분" half>
                <select style={inp} value={vf.type} onChange={e=>setVf(v=>({...v,type:e.target.value}))}>
                  {VOUCHER_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="대분류" half>
                <select style={inp} value={vf.category} onChange={e=>setVf(v=>({...v,category:e.target.value,group:groupOptions(e.target.value)[0]||""}))}>
                  {catOptions.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="중분류" half>
                <select style={inp} value={vf.group} onChange={e=>setVf(v=>({...v,group:e.target.value}))}>
                  {groupOptions(vf.category).map(g=><option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="메모 / 비고"><input style={inp} value={vf.note} onChange={e=>setVf(v=>({...v,note:e.target.value}))} placeholder="특이사항, 용도 등"/></Field>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            {editV&&<Btn danger sm onClick={()=>{remove(editV);setModal(false);}}>삭제</Btn>}
            <div style={{flex:1}}/>
            <Btn onClick={()=>setModal(false)}>취소</Btn>
            <Btn primary onClick={save} disabled={analyzing}>저장</Btn>
          </div>
        </Modal>
      )}

      {/* 파일 미리보기 모달 */}
      {preview && (
        <Modal title={`첨부파일 — ${preview.name}`} onClose={()=>setPreview(null)} wide>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {(preview.files||[]).map((f,i)=>(
              <div key={i} style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",maxWidth:280}}>
                {f.type.startsWith("image/")?
                  <img src={f.b64url} alt={f.name} style={{maxWidth:"100%",display:"block"}}/>:
                  <div style={{padding:16,textAlign:"center",color:C.sub,fontSize:13}}>📄 {f.name}</div>
                }
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 결산서
// ═══════════════════════════════════════════════════════════
function SettlementView({ project, onConfirm }) {
  const q = project.quote;
  const b = project.budget;
  const confirmed = !!project.settlementDate;

  const supply = qSupply(q);
  const total  = qTotal(q);
  const spent  = vTotal(b);
  const profit = supply - spent;
  const margin = supply ? Math.round(profit/supply*100) : 0;

  const catMap = {};
  (b.vouchers||[]).forEach(v=>{ catMap[v.category]=(catMap[v.category]||0)+(v.amount||0); });
  const rows = (q.items||[]).map(cat=>{
    const planned=catAmt(cat), actual=catMap[cat.category]||0;
    return {cat:cat.category, planned, actual, diff:planned-actual, rate:planned?Math.round(actual/planned*100):0};
  });

  return (
    <div>
      {confirmed ? (
        <div style={{background:C.greenLight,border:`1px solid ${C.green}30`,borderRadius:12,padding:"13px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>✅</span>
          <div><div style={{fontWeight:700,fontSize:14,color:C.green}}>결산 확정 완료</div><div style={{fontSize:13,color:C.sub}}>확정일: {project.settlementDate}</div></div>
        </div>
      ) : (
        <div style={{background:C.amberLight,border:`1px solid ${C.amber}30`,borderRadius:12,padding:"13px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div><div style={{fontWeight:700,fontSize:14,color:C.amber}}>결산 미확정</div><div style={{fontSize:13,color:C.sub}}>프로젝트 완료 후 확정하면 재무 대시보드에 반영됩니다.</div></div>
          <Btn primary onClick={onConfirm} style={{marginLeft:"auto"}}>결산 확정하기</Btn>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        {[
          {label:"수주금액(VAT포함)",val:total,color:C.blue,sub:"클라이언트 청구액"},
          {label:"매출(공급가액)",val:supply,color:C.purple,sub:`VAT ${fmt(qVat(q))}`},
          {label:"총 매입(집행)",val:spent,color:C.amber,sub:`${(b.vouchers||[]).length}건 증빙`},
          {label:"최종 순이익",val:profit,color:profit>=0?C.green:C.red,sub:`이익률 ${margin}%`},
        ].map(s=>(
          <div key={s.label} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${s.color}`}}>
            <div style={{fontSize:11,color:C.sub,marginBottom:6,fontWeight:600}}>{s.label}</div>
            <div style={{fontSize:20,fontWeight:800,color:s.color}}>{fmt(s.val)}</div>
            <div style={{fontSize:11,color:C.faint,marginTop:3}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <h3 style={{margin:"0 0 10px",fontSize:14,fontWeight:700}}>항목별 집행 현황 (견적 vs 실행)</h3>
      <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 120px 120px 100px 60px",background:C.slateLight,padding:"8px 14px",fontSize:11,fontWeight:700,color:C.sub,gap:8}}>
          <span>대분류</span><span style={{textAlign:"right"}}>견적</span><span style={{textAlign:"right"}}>실행</span><span style={{textAlign:"right"}}>차이</span><span style={{textAlign:"right"}}>달성률</span>
        </div>
        {rows.map((r,i)=>(
          <div key={r.cat} style={{display:"grid",gridTemplateColumns:"1fr 120px 120px 100px 60px",padding:"10px 14px",borderTop:`1px solid ${C.border}`,gap:8,alignItems:"center",background:i%2===0?C.white:"#fafbfc"}}>
            <span style={{fontWeight:600,fontSize:13}}>{r.cat}</span>
            <span style={{textAlign:"right",fontSize:13}}>{fmt(r.planned)}</span>
            <span style={{textAlign:"right",fontSize:13}}>{fmt(r.actual)}</span>
            <span style={{textAlign:"right",fontSize:13,color:r.diff>=0?C.green:C.red,fontWeight:600}}>{r.diff>=0?"+":""}{fmt(r.diff)}</span>
            <span style={{textAlign:"right"}}><span style={{fontSize:12,padding:"2px 6px",borderRadius:99,background:r.rate>100?C.redLight:r.rate>80?C.amberLight:C.greenLight,color:r.rate>100?C.red:r.rate>80?C.amber:C.green,fontWeight:700}}>{r.rate}%</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 구성원 관리 컴포넌트
// ═══════════════════════════════════════════════════════════
const ROLES = ["대표","EPD","PD","감독","조감독","AE","AI","경영지원"];

function MemberManagement({ accounts, onSave, onDelete }) {
  const [modal, setModal] = useState(false);
  const [editM, setEditM] = useState(null);
  const [mf,    setMf]    = useState({});
  const [conf,  setConf]  = useState(null);

  const openAdd  = () => { setEditM(null); setMf({name:"",role:ROLES[1],pw:"",canViewFinance:false,canManageMembers:false}); setModal(true); };
  const openEdit = m => { setEditM(m); setMf({...m}); setModal(true); };
  const save = () => {
    if(!mf.name?.trim()||!mf.pw?.trim()) return;
    onSave({...mf, id:editM?editM.id:"m"+Date.now(), order:editM?(editM.order||0):accounts.length});
    setModal(false);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14}}>구성원 목록 ({accounts.length}명)</div>
        <Btn primary sm onClick={openAdd}>+ 구성원 추가</Btn>
      </div>
      <div style={{border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"36px 1fr 100px 80px 80px 80px 60px",background:C.slateLight,padding:"9px 14px",fontSize:11,fontWeight:700,color:C.sub,gap:8}}>
          <span/><span>이름</span><span>직책</span><span style={{textAlign:"center"}}>재무열람</span><span style={{textAlign:"center"}}>멤버관리</span><span>비밀번호</span><span/>
        </div>
        {accounts.length===0 && <div style={{padding:"30px",textAlign:"center",color:C.faint}}>구성원이 없습니다</div>}
        {accounts.map((m,i)=>(
          <div key={m.id} style={{display:"grid",gridTemplateColumns:"36px 1fr 100px 80px 80px 80px 60px",padding:"11px 14px",borderTop:`1px solid ${C.border}`,gap:8,alignItems:"center",background:i%2===0?C.white:"#fafbfc"}}>
            <Avatar name={m.name} size={28}/>
            <div style={{fontWeight:700,fontSize:13}}>{m.name}</div>
            <span style={{fontSize:12,padding:"2px 8px",borderRadius:99,background:C.slateLight,color:C.slate,fontWeight:600}}>{m.role}</span>
            <div style={{textAlign:"center"}}>{m.canViewFinance?<span style={{color:C.green}}>✅</span>:<span style={{color:C.faint}}>—</span>}</div>
            <div style={{textAlign:"center"}}>{m.canManageMembers?<span style={{color:C.blue}}>✅</span>:<span style={{color:C.faint}}>—</span>}</div>
            <span style={{fontSize:12,color:C.faint,fontFamily:"monospace"}}>{m.pw}</span>
            <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
              <button onClick={()=>openEdit(m)} style={{border:"none",background:"none",cursor:"pointer",fontSize:14}}>✏️</button>
              <button onClick={()=>setConf(m)} style={{border:"none",background:"none",cursor:"pointer",fontSize:14}}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:12,padding:"10px 14px",background:C.amberLight,borderRadius:8,fontSize:12,color:C.amber}}>
        ⚠️ 비밀번호는 구성원이 앱에 로그인할 때 사용합니다.
      </div>

      {modal && (
        <Modal title={editM?"구성원 수정":"구성원 추가"} onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
            <Field label="이름 *"><input style={inp} autoFocus value={mf.name||""} onChange={e=>setMf(v=>({...v,name:e.target.value}))} placeholder="홍길동"/></Field>
            <Field label="직책 *" half><select style={inp} value={mf.role||ROLES[1]} onChange={e=>setMf(v=>({...v,role:e.target.value}))}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></Field>
            <Field label="비밀번호 *" half><input style={inp} value={mf.pw||""} onChange={e=>setMf(v=>({...v,pw:e.target.value}))} placeholder="로그인 비밀번호"/></Field>
            <Field label="연락처" half><input style={inp} value={mf.phone||""} onChange={e=>setMf(v=>({...v,phone:e.target.value}))} placeholder="010-0000-0000"/></Field>
            <Field label="이메일" half><input style={inp} value={mf.email||""} onChange={e=>setMf(v=>({...v,email:e.target.value}))} placeholder="name@company.com"/></Field>
          </div>
          <div style={{marginTop:8,padding:"12px 14px",background:C.slateLight,borderRadius:10}}>
            <div style={{fontWeight:700,fontSize:12,color:C.sub,marginBottom:10}}>권한 설정</div>
            <div style={{display:"flex",gap:20}}>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
                <input type="checkbox" checked={!!mf.canViewFinance} onChange={e=>setMf(v=>({...v,canViewFinance:e.target.checked}))} style={{accentColor:C.green,width:16,height:16}}/>
                <div><div style={{fontWeight:600}}>💰 재무 열람</div><div style={{fontSize:11,color:C.faint}}>재무 대시보드, 결산서</div></div>
              </label>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
                <input type="checkbox" checked={!!mf.canManageMembers} onChange={e=>setMf(v=>({...v,canManageMembers:e.target.checked}))} style={{accentColor:C.blue,width:16,height:16}}/>
                <div><div style={{fontWeight:600}}>👥 구성원 관리</div><div style={{fontSize:11,color:C.faint}}>구성원 추가/수정/삭제</div></div>
              </label>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
            {editM && <Btn danger sm onClick={()=>{setConf(editM);setModal(false);}}>삭제</Btn>}
            <div style={{flex:1}}/>
            <Btn onClick={()=>setModal(false)}>취소</Btn>
            <Btn primary onClick={save} disabled={!mf.name?.trim()||!mf.pw?.trim()}>저장</Btn>
          </div>
        </Modal>
      )}
      {conf && (
        <Modal title="구성원 삭제" onClose={()=>setConf(null)}>
          <div style={{fontSize:14,marginBottom:20}}><b>{conf.name}</b> ({conf.role})을 삭제하시겠습니까?</div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
            <Btn onClick={()=>setConf(null)}>취소</Btn>
            <Btn danger onClick={()=>{onDelete(conf.id);setConf(null);}}>삭제</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 월간 캘린더
// ═══════════════════════════════════════════════════════════
function MonthCalendar({ project, onChange, user }) {
  const canEdit = user.canManageMembers || user.role === "PD";
  const today = new Date();
  const [baseYear,  setBaseYear]  = useState(today.getFullYear());
  const [baseMonth, setBaseMonth] = useState(today.getMonth());
  const [modal, setModal]         = useState(null);
  const [ef, setEf]               = useState({});

  const events = project.calEvents || [];
  const ymd = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const eventsOn = (date) => events.filter(e => e.start <= date && date <= (e.end||e.start));
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  const prevGroup = () => { let m=baseMonth-1, y=baseYear; if(m<0){m=11;y--;} setBaseYear(y); setBaseMonth(m); };
  const nextGroup = () => { let m=baseMonth+1, y=baseYear; if(m>11){m=0;y++;} setBaseYear(y); setBaseMonth(m); };

  // 3개월 배열 생성
  const months = [0,1,2].map(offset => {
    let m = baseMonth + offset, y = baseYear;
    if(m > 11){ m -= 12; y++; }
    return {year:y, month:m};
  });

  const openAdd = (date) => {
    if(!canEdit) return;
    setEf({title:"",start:date,end:date,color:"#2563eb",note:""});
    setModal({mode:"add"});
  };
  const openEdit = (ev, e) => {
    e.stopPropagation();
    if(!canEdit) return;
    setEf({...ev});
    setModal({mode:"edit",id:ev.id});
  };
  const save = () => {
    if(!ef.title?.trim()) return;
    const entry = {...ef, id: modal.id||"ce"+Date.now()};
    onChange(p=>{
      const prev = p.calEvents||[];
      const next = modal.mode==="edit" ? prev.map(e=>e.id===modal.id?entry:e) : [...prev, entry];
      return {...p, calEvents:next};
    });
    setModal(null);
  };
  const del = (id) => { onChange(p=>({...p,calEvents:(p.calEvents||[]).filter(e=>e.id!==id)})); setModal(null); };

  const exportICal = () => {
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//CutFlow//KR","CALSCALE:GREGORIAN","METHOD:PUBLISH",`X-WR-CALNAME:${project.name}`];
    for(const ev of events){
      const dtStart = ev.start.replace(/-/g,"");
      const endD = new Date(ev.end||ev.start); endD.setDate(endD.getDate()+1);
      const dtEndEx = `${endD.getFullYear()}${String(endD.getMonth()+1).padStart(2,"0")}${String(endD.getDate()).padStart(2,"0")}`;
      lines.push("BEGIN:VEVENT",`DTSTART;VALUE=DATE:${dtStart}`,`DTEND;VALUE=DATE:${dtEndEx}`,`SUMMARY:${ev.title}`,ev.note?`DESCRIPTION:${ev.note}`:"",`UID:${ev.id}@cutflow`,"END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.filter(Boolean).join("\r\n")],{type:"text/calendar"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${project.name}_schedule.ics`; a.click();
  };

  const COLORS = ["#2563eb","#7c3aed","#db2777","#d97706","#16a34a","#0891b2","#dc2626","#64748b"];
  const DAYS   = ["일","월","화","수","목","금","토"];

  const MiniCal = ({year, month}) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const cells = [];
    for(let i=0;i<firstDay;i++) cells.push(null);
    for(let d=1;d<=daysInMonth;d++) cells.push(d);

    return (
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 20px",width:"100%"}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:12,color:C.dark}}>{year}년 {month+1}월</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
          {DAYS.map((d,i)=>(
            <div key={d} style={{textAlign:"center",fontSize:12,fontWeight:700,padding:"5px 0",color:i===0?"#ef4444":i===6?"#2563eb":C.faint}}>{d}</div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={i}/>;
            const dateStr = ymd(year,month,d);
            const dayEvs  = eventsOn(dateStr);
            const isToday = dateStr===todayStr;
            const dow     = (firstDay+d-1)%7;
            return (
              <div key={i} onClick={()=>openAdd(dateStr)}
                style={{minHeight:100,background:isToday?"#eff6ff":"transparent",borderRadius:8,padding:"6px 4px",cursor:canEdit?"pointer":"default",border:`1px solid ${isToday?C.blue:"transparent"}`}}>
                <div style={{fontSize:13,fontWeight:isToday?800:400,color:dow===0?"#ef4444":dow===6?"#2563eb":C.dark,marginBottom:3,textAlign:"center",
                  ...(isToday?{background:C.blue,color:"#fff",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 3px",fontSize:12}:{})}}>
                  {d}
                </div>
                {dayEvs.slice(0,3).map(ev=>(
                  <div key={ev.id} onClick={e=>openEdit(ev,e)}
                    style={{fontSize:11,padding:"2px 5px",borderRadius:4,background:ev.color+"22",color:ev.color,fontWeight:600,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:canEdit?"pointer":"default",lineHeight:1.5}}>
                    {ev.title}
                  </div>
                ))}
                {dayEvs.length>3&&<div style={{fontSize:9,color:C.faint,textAlign:"center"}}>+{dayEvs.length-2}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={prevGroup} style={{border:`1px solid ${C.border}`,background:C.white,borderRadius:8,padding:"5px 14px",cursor:"pointer",fontSize:16}}>‹</button>
          <span style={{fontWeight:800,fontSize:16,color:C.dark}}>{months[0].year}년 {months[0].month+1}월 — {months[2].month+1}월</span>
          <button onClick={nextGroup} style={{border:`1px solid ${C.border}`,background:C.white,borderRadius:8,padding:"5px 14px",cursor:"pointer",fontSize:16}}>›</button>
          <button onClick={()=>{setBaseYear(today.getFullYear());setBaseMonth(today.getMonth());}} style={{border:`1px solid ${C.border}`,background:C.white,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:12,color:C.sub}}>오늘</button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {!canEdit&&<span style={{fontSize:12,color:C.faint,padding:"4px 10px",background:C.slateLight,borderRadius:99}}>🔒 읽기 전용</span>}
          {events.length>0&&<button onClick={exportICal} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.blue}`,background:C.blueLight,color:C.blue,cursor:"pointer",fontSize:12,fontWeight:600}}>📅 구글 캘린더로 내보내기</button>}
          {canEdit&&<Btn primary sm onClick={()=>{setEf({title:"",start:todayStr,end:todayStr,color:"#2563eb",note:""});setModal({mode:"add"});}}>+ 일정 추가</Btn>}
        </div>
      </div>

      {/* 3개월 달력 */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {months.map(({year,month})=><MiniCal key={`${year}-${month}`} year={year} month={month}/>)}
      </div>

      {/* 모달 */}
      {modal && (
        <Modal title={modal.mode==="add"?"일정 추가":"일정 수정"} onClose={()=>setModal(null)}>
          <Field label="일정명 *"><input style={inp} autoFocus value={ef.title||""} onChange={e=>setEf(v=>({...v,title:e.target.value}))} placeholder="촬영, 편집 마감, 시사 등"/></Field>
          <div style={{display:"flex",gap:12}}>
            <Field label="시작일" style={{flex:1}}><input style={inp} type="date" value={ef.start||""} onChange={e=>setEf(v=>({...v,start:e.target.value,end:v.end<e.target.value?e.target.value:v.end}))}/></Field>
            <Field label="종료일" style={{flex:1}}><input style={inp} type="date" value={ef.end||""} onChange={e=>setEf(v=>({...v,end:e.target.value}))}/></Field>
          </div>
          <Field label="메모"><input style={inp} value={ef.note||""} onChange={e=>setEf(v=>({...v,note:e.target.value}))} placeholder="상세 내용"/></Field>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,color:C.sub,marginBottom:6}}>색상</div>
            <div style={{display:"flex",gap:6}}>
              {COLORS.map(c=><button key={c} onClick={()=>setEf(v=>({...v,color:c}))} style={{width:24,height:24,borderRadius:"50%",background:c,border:ef.color===c?"3px solid #1e293b":"2px solid transparent",cursor:"pointer"}}/>)}
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            {modal.mode==="edit"&&<Btn danger sm onClick={()=>del(modal.id)}>삭제</Btn>}
            <div style={{flex:1}}/>
            <Btn onClick={()=>setModal(null)}>취소</Btn>
            <Btn primary onClick={save} disabled={!ef.title?.trim()}>저장</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}


const STAFF_ROLES = [
  "EPD","총괄감독","감독","조감독 1st","조감독 2nd",
  "PD","AD","AE",
  "촬영감독","촬영 1st","촬영 2nd","촬영 3rd","DIT",
  "조명감독","조명 1st","조명 Grip",
  "미술감독","소품",
  "편집","DI","2D","3D","FLAME","녹음실",
  "음악감독","성우",
  "메이킹","작가","기타"
];

const STAFF_GROUPS = [
  { label:"제작/연출",   roles:["EPD","총괄감독","감독","조감독 1st","조감독 2nd","PD","AD","AE"] },
  { label:"촬영",        roles:["촬영감독","촬영 1st","촬영 2nd","촬영 3rd","DIT"] },
  { label:"조명",        roles:["조명감독","조명 1st","조명 Grip"] },
  { label:"미술",        roles:["미술감독","소품"] },
  { label:"포스트",      roles:["편집","DI","2D","3D","FLAME","녹음실","음악감독","성우"] },
  { label:"기타",        roles:["메이킹","작가","기타"] },
];

// ═══════════════════════════════════════════════════════════
// 피드백 히스토리
// ═══════════════════════════════════════════════════════════
const FB_STATUSES = [
  {id:"review",   label:"검토중",  color:"#f59e0b"},
  {id:"reflected",label:"반영",    color:"#16a34a"},
  {id:"hold",     label:"보류",    color:"#94a3b8"},
];

function FeedbackTab({project, patchProj, user, accounts}) {
  const feedbacks = project.feedbacks || [];
  const [modal, setModal] = useState(null);
  const [ff, setFf] = useState({});
  const [detail, setDetail] = useState(null); // 세부내용 보기

  const today = () => { const d=new Date(),p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };

  const openAdd = () => {
    setFf({receivedDate:today(), dueDate:"", content:"", assignee:user.name, status:"review", fileUrl:"", detail:""});
    setModal("add");
  };
  const openEdit = fb => { setFf({...fb}); setModal("edit"); };
  const save = () => {
    if(!ff.content?.trim()) return;
    const entry = {...ff, id:ff.id||"fb"+Date.now()};
    const list = modal==="edit"
      ? feedbacks.map(f=>f.id===entry.id?entry:f)
      : [...feedbacks, entry];
    patchProj(p=>({...p, feedbacks:list}));
    setModal(null);
  };
  const del = () => {
    patchProj(p=>({...p, feedbacks:feedbacks.filter(f=>f.id!==ff.id)}));
    setModal(null);
  };

  const sorted = [...feedbacks].sort((a,b)=>(b.receivedDate||b.date||"").localeCompare(a.receivedDate||a.date||""));

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <h3 style={{margin:0,fontSize:16,fontWeight:800}}>💬 클라이언트 피드백 히스토리</h3>
          <p style={{margin:"4px 0 0",fontSize:12,color:C.sub}}>총 {feedbacks.length}건</p>
        </div>
        <Btn primary onClick={openAdd}>+ 피드백 추가</Btn>
      </div>

      {feedbacks.length===0 ? (
        <div style={{padding:"48px 0",textAlign:"center",color:C.faint,fontSize:13,
          border:`1px dashed ${C.border}`,borderRadius:12}}>
          아직 등록된 피드백이 없습니다
        </div>
      ) : (
        <div style={{border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"90px 90px 1fr 80px 80px 60px 36px",
            background:C.slateLight,padding:"9px 16px",fontSize:11,fontWeight:700,color:C.sub,gap:8}}>
            <span>수신일</span><span>마감일</span><span>내용</span><span>담당자</span><span>상태</span><span style={{textAlign:"center"}}>링크</span><span/>
          </div>
          {sorted.map((fb,i)=>{
            const st = FB_STATUSES.find(s=>s.id===fb.status)||FB_STATUSES[0];
            const isOver = fb.dueDate && fb.dueDate < today() && fb.status!=="reflected";
            return (
              <div key={fb.id}
                style={{display:"grid",gridTemplateColumns:"90px 90px 1fr 80px 80px 60px 36px",
                  padding:"11px 16px",gap:8,borderTop:i>0?`1px solid ${C.border}`:"none",
                  background:"#fff",alignItems:"center",cursor:"pointer",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                <span style={{fontSize:12,color:C.sub}}>{fb.receivedDate||fb.date||"-"}</span>
                <span style={{fontSize:12,color:isOver?"#ef4444":C.sub,fontWeight:isOver?700:400}}>
                  {fb.dueDate||"-"}{isOver&&" ⚠️"}
                </span>
                <div onClick={()=>openEdit(fb)} style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:C.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fb.content}</div>
                  {fb.detail&&<div style={{fontSize:11,color:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>{fb.detail}</div>}
                </div>
                <span style={{fontSize:12,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onClick={()=>openEdit(fb)}>{fb.assignee}</span>
                <span onClick={()=>openEdit(fb)}>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,
                    background:st.color+"18",color:st.color,border:`1px solid ${st.color}44`,whiteSpace:"nowrap"}}>
                    {st.label}
                  </span>
                </span>
                <span style={{textAlign:"center"}}>
                  {fb.fileUrl
                    ? <a href={fb.fileUrl} target="_blank" rel="noreferrer"
                        onClick={e=>e.stopPropagation()}
                        style={{fontSize:18,textDecoration:"none"}} title={fb.fileUrl}>📎</a>
                    : <span style={{fontSize:13,color:C.border}}>—</span>
                  }
                </span>
                <span onClick={()=>setDetail(fb)} style={{fontSize:16,color:C.blue,textAlign:"center",cursor:"pointer"}} title="세부내용">›</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 세부내용 패널 */}
      {detail&&(
        <Modal title="피드백 세부내용" onClose={()=>setDetail(null)}>
          <div style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",gap:24,marginBottom:10,flexWrap:"wrap"}}>
              <div><span style={{fontSize:11,color:C.sub,fontWeight:600}}>수신일</span><div style={{fontSize:13,fontWeight:600,marginTop:2}}>{detail.receivedDate||detail.date||"-"}</div></div>
              <div><span style={{fontSize:11,color:C.sub,fontWeight:600}}>마감일</span><div style={{fontSize:13,fontWeight:600,marginTop:2,color:detail.dueDate&&detail.dueDate<today()&&detail.status!=="reflected"?"#ef4444":C.dark}}>{detail.dueDate||"-"}</div></div>
              <div><span style={{fontSize:11,color:C.sub,fontWeight:600}}>담당자</span><div style={{fontSize:13,fontWeight:600,marginTop:2}}>{detail.assignee}</div></div>
              <div><span style={{fontSize:11,color:C.sub,fontWeight:600}}>상태</span>
                <div style={{marginTop:4}}>{(()=>{const st=FB_STATUSES.find(s=>s.id===detail.status)||FB_STATUSES[0];return <span style={{fontSize:12,fontWeight:700,padding:"2px 10px",borderRadius:99,background:st.color+"18",color:st.color,border:`1px solid ${st.color}44`}}>{st.label}</span>;})()}</div>
              </div>
            </div>
            <div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:6}}>피드백 내용</div>
            <div style={{fontSize:13,color:C.dark,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{detail.content}</div>
          </div>
          {detail.detail&&(
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:6}}>세부내용</div>
              <div style={{fontSize:13,color:C.dark,lineHeight:1.7,whiteSpace:"pre-wrap",background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px"}}>{detail.detail}</div>
            </div>
          )}
          {detail.fileUrl&&(
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:6}}>첨부파일</div>
              <a href={detail.fileUrl} target="_blank" rel="noreferrer"
                style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,
                  border:`1px solid ${C.border}`,background:"#fff",color:C.blue,fontSize:13,textDecoration:"none",fontWeight:600}}>
                📎 파일 링크 열기
              </a>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
            <Btn onClick={()=>{setDetail(null);openEdit(detail);}}>✏️ 수정</Btn>
            <Btn primary onClick={()=>setDetail(null)}>닫기</Btn>
          </div>
        </Modal>
      )}

      {/* 추가/수정 모달 */}
      {modal&&(
        <Modal title={modal==="add"?"피드백 추가":"피드백 수정"} onClose={()=>setModal(null)}>
          <div style={{display:"flex",gap:12}}>
            <Field label="수신일 *" half>
              <input style={inp} type="date" value={ff.receivedDate||""} onChange={e=>setFf(v=>({...v,receivedDate:e.target.value}))}/>
            </Field>
            <Field label="마감일" half>
              <input style={inp} type="date" value={ff.dueDate||""} onChange={e=>setFf(v=>({...v,dueDate:e.target.value}))}/>
            </Field>
          </div>
          <Field label="피드백 내용 *">
            <textarea style={{...inp,resize:"vertical",minHeight:80}} autoFocus
              value={ff.content||""} onChange={e=>setFf(v=>({...v,content:e.target.value}))}
              placeholder="클라이언트 피드백 내용을 입력하세요..."/>
          </Field>
          <Field label="세부내용">
            <textarea style={{...inp,resize:"vertical",minHeight:60}}
              value={ff.detail||""} onChange={e=>setFf(v=>({...v,detail:e.target.value}))}
              placeholder="추가 메모, 참고사항 등..."/>
          </Field>
          <div style={{display:"flex",gap:12}}>
            <Field label="담당자" half>
              <select style={inp} value={ff.assignee||""} onChange={e=>setFf(v=>({...v,assignee:e.target.value}))}>
                {accounts.map(a=><option key={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="첨부파일 링크" half>
              <input style={inp} value={ff.fileUrl||""} onChange={e=>setFf(v=>({...v,fileUrl:e.target.value}))}
                placeholder="https://drive.google.com/..."/>
            </Field>
          </div>
          <Field label="상태">
            <div style={{display:"flex",gap:8}}>
              {FB_STATUSES.map(s=>(
                <button key={s.id} onClick={()=>setFf(v=>({...v,status:s.id}))}
                  style={{flex:1,padding:"8px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:ff.status===s.id?700:400,
                    border:`2px solid ${ff.status===s.id?s.color:C.border}`,
                    background:ff.status===s.id?s.color+"15":"#fff",
                    color:ff.status===s.id?s.color:C.sub}}>
                  {s.label}
                </button>
              ))}
            </div>
          </Field>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:12}}>
            {modal==="edit"&&<Btn danger sm onClick={del}>삭제</Btn>}
            <div style={{flex:1}}/>
            <Btn onClick={()=>setModal(null)}>취소</Btn>
            <Btn primary onClick={save} disabled={!ff.content?.trim()}>저장</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// 데일리 TODO
// ═══════════════════════════════════════════════════════════
const HOURS = Array.from({length:16}, (_,i)=>{
  const h = 9 + Math.floor(i/2);
  const m = i%2===0?"00":"30";
  const label = h<12?`오전 ${h}:${m}`:h===12?`오후 12:${m}`:`오후 ${h-12}:${m}`;
  return { key:`${String(h).padStart(2,"0")}:${m}`, label };
}); // 09:00 ~ 16:30 (오전9시~오후5시)

// ═══════════════════════════════════════════════════════════
// 데일리 TODO
// ═══════════════════════════════════════════════════════════
const TODO_CATS = [
  {id:"meal",label:"🍱 식사",color:"#f97316"},
  {id:"outside",label:"🚗 외근",color:"#8b5cf6"},
  {id:"meeting",label:"💬 회의",color:"#2563eb"},
  {id:"rest",label:"☕ 휴식",color:"#16a34a"},
  {id:"personal",label:"📝 개인업무",color:"#64748b"},
];

function makeSlots(sh, eh) {
  const s=[];
  for(let h=sh;h<eh;h++) for(let m of [0,30]){
    const hh=String(h).padStart(2,"0"), mm=m===0?"00":"30";
    const lh=h===0?12:h>12?h-12:h, ap=h<12?"오전":"오후";
    s.push({key:`${hh}:${mm}`, label:`${ap} ${lh}:${mm}`});
  }
  return s;
}

function DailyTodo({accounts, user, dailyTodos, setDailyTodos, projects}) {
  const today = new Date();
  const pad = n=>String(n).padStart(2,"0");
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;

  const [selDate, setSelDate] = useState(todayKey);
  const [sh, setSh] = useState(10);
  const [eh, setEh] = useState(19);
  const [hiddenMembers, setHiddenMembers] = useState(new Set());
  const toggleMember = id => setHiddenMembers(s=>{ const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const [modal, setModal] = useState(null);
  const [tf, setTf] = useState({});
  const dragRef = useRef({active:false,mid:null,start:null,end:null,moved:false});
  const [dragSel, setDragSel] = useState(null); // {mid,start,end} 렌더용

  const slots = makeSlots(sh, eh);
  // 본인 맨 앞, 나머지는 기존 순서
  const sortedAccounts = [
    ...accounts.filter(a=>a.id===user.id),
    ...accounts.filter(a=>a.id!==user.id)
  ];
  const visibleAccounts = sortedAccounts.filter(a=>a.id===user.id||!hiddenMembers.has(a.id));

  const todosOf = (mid, hour) =>
    ((dailyTodos[selDate]||{})[mid]||{})[hour]||[];

  // 이 칸이 범위 블록의 일부인지 확인
  const getCovering = (mid, hour) => {
    const mem = (dailyTodos[selDate]||{})[mid]||{};
    for(const [sk, ts] of Object.entries(mem)) {
      for(const t of ts) {
        if(!t.endHour||t.endHour===sk) continue;
        const keys = slots.map(s=>s.key);
        const si=keys.indexOf(sk), ei=keys.indexOf(t.endHour), ci=keys.indexOf(hour);
        if(ci>si&&ci<=ei) return {todo:t,startKey:sk};
      }
    }
    return null;
  };

  const canEdit = mid => user.id===mid||user.role==="PD"||user.canManageMembers;

  // 드래그 핸들러
  const onMD = (mid, hour) => {
    if(!canEdit(mid)) return;
    dragRef.current = {active:true, mid, start:hour, end:hour, moved:false};
  };
  const onME = (mid, hour) => {
    const r = dragRef.current;
    if(!r.active || r.mid !== mid || r.start === hour) return;
    dragRef.current = {...r, end:hour, moved:true};
    setDragSel({mid, start:r.start, end:hour});
  };
  const onMU = (mid, hour) => {
    const r = dragRef.current;
    if(!r.active) return;
    const moved = r.moved;
    const {start, end} = r;
    dragRef.current = {active:false, mid:null, start:null, end:null, moved:false};
    setDragSel(null);
    if(!moved) return; // 단순 클릭은 onClick에서 처리
    const keys = slots.map(s=>s.key);
    const si = Math.min(keys.indexOf(start), keys.indexOf(end));
    const ei = Math.max(keys.indexOf(start), keys.indexOf(end));
    const from = keys[si], to = keys[ei];
    setTf({cat:"",note:"",projId:"",dnd:false,done:false});
    setModal({mode:"add", mid:r.mid, hour:from, endHour:to});
  };
  const cancelDrag = () => {
    dragRef.current = {active:false, mid:null, start:null, end:null, moved:false};
    setDragSel(null);
  };

  // 드래그 선택 위치 (first/middle/last/single/null)
  const getDragPos = (mid, hour) => {
    if(!dragSel || dragSel.mid !== mid) return null;
    const keys = slots.map(s=>s.key);
    const si = Math.min(keys.indexOf(dragSel.start), keys.indexOf(dragSel.end));
    const ei = Math.max(keys.indexOf(dragSel.start), keys.indexOf(dragSel.end));
    const ci = keys.indexOf(hour);
    if(ci<si||ci>ei) return null;
    if(si===ei) return "single";
    if(ci===si) return "first";
    if(ci===ei) return "last";
    return "mid";
  };

  const openAdd = (mid, hour) => {
    if(!canEdit(mid)) return;
    setTf({cat:"",note:"",projId:"",dnd:false,done:false});
    setModal({mode:"add", mid, hour, endHour:hour});
  };

  const openEdit = (mid, hour, todo) => {
    if(!canEdit(mid)) return;
    setTf({...todo});
    setModal({mode:"edit", mid, hour, id:todo.id});
  };

  const save = () => {
    const {mid, hour, endHour} = modal;
    const entry = {...tf, id:modal.id||"td"+Date.now(), endHour:endHour||hour, title:tf.note||TODO_CATS.find(c=>c.id===tf.cat)?.label||"업무"};
    setDailyTodos(prev=>{
      const day={...prev[selDate]}, mem={...(day[mid]||{})}, slot=[...(mem[hour]||[])];
      if(modal.mode==="edit"){const i=slot.findIndex(t=>t.id===modal.id);i!==-1?slot[i]=entry:slot.push(entry);}
      else slot.push(entry);
      return {...prev,[selDate]:{...day,[mid]:{...mem,[hour]:slot}}};
    });
    setModal(null);
  };

  const del = () => {
    const {mid, hour} = modal;
    setDailyTodos(prev=>{
      const day={...prev[selDate]}, mem={...(day[mid]||{})};
      return {...prev,[selDate]:{...day,[mid]:{...mem,[hour]:(mem[hour]||[]).filter(t=>t.id!==modal.id)}}};
    });
    setModal(null);
  };

  const toggleDone = (mid, hour, id) => {
    setDailyTodos(prev=>{
      const day={...prev[selDate]}, mem={...(day[mid]||{})};
      return {...prev,[selDate]:{...day,[mid]:{...mem,[hour]:(mem[hour]||[]).map(t=>t.id===id?{...t,done:!t.done}:t)}}};
    });
  };

  const moveDate = d => {
    const dt=new Date(selDate); dt.setDate(dt.getDate()+d);
    setSelDate(`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`);
  };

  const dateLabel = () => {
    const dt=new Date(selDate);
    return `${dt.getFullYear()}년 ${dt.getMonth()+1}월 ${dt.getDate()}일 (${["일","월","화","수","목","금","토"][dt.getDay()]})`;
  };

  const COL=140, ROW=70;

  const TodoItem = ({todo, mid, hour, isCovering}) => {
    const cat = TODO_CATS.find(c=>c.id===todo.cat);
    const proj = (projects||[]).find(p=>p.id===todo.projId);
    const bg = todo.done?"#f0fdf4":cat?cat.color+"18":"#eff6ff";
    const bd = todo.done?"#86efac":cat?cat.color+"70":"#bfdbfe";
    return (
      <div onClick={e=>{e.stopPropagation();openEdit(mid,hour,todo);}}
        style={{display:"flex",alignItems:"flex-start",gap:4,padding:"3px 6px",borderRadius:6,
          background:bg,border:`1px solid ${bd}`,marginBottom:2,
          cursor:canEdit(mid)?"pointer":"default",userSelect:"none"}}>
        <input type="checkbox" checked={!!todo.done}
          onClick={e=>{e.stopPropagation();toggleDone(mid,hour,todo.id);}}
          style={{accentColor:"#16a34a",marginTop:2,flexShrink:0,cursor:"pointer"}}/>
        <div style={{minWidth:0,flex:1}}>
          {cat&&<span style={{fontSize:9,padding:"1px 4px",borderRadius:3,background:cat.color+"25",color:cat.color,fontWeight:700,marginRight:3,display:"inline-block"}}>{cat.label}</span>}
          {todo.dnd&&<span style={{fontSize:9,padding:"1px 3px",borderRadius:3,background:"#fef2f2",color:"#ef4444",fontWeight:700,marginRight:3}}>🚫</span>}
          {proj&&<span style={{fontSize:9,padding:"1px 4px",borderRadius:3,background:proj.color+"22",color:proj.color,fontWeight:700,marginRight:3}}>{proj.name}</span>}
          <span style={{fontSize:11,fontWeight:600,color:todo.done?"#94a3b8":C.dark,textDecoration:todo.done?"line-through":"none"}}>{todo.note||cat?.label||"업무"}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>moveDate(-1)} style={{...btnSm}}>‹</button>
          <span style={{fontWeight:800,fontSize:16}}>{dateLabel()}</span>
          <button onClick={()=>moveDate(1)} style={{...btnSm}}>›</button>
          <button onClick={()=>setSelDate(todayKey)} style={{...btnSm,background:selDate===todayKey?C.blue:"#f1f5f9",color:selDate===todayKey?"#fff":C.sub}}>오늘</button>
        </div>
        <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} style={{...inp,width:150,fontSize:13}}/>
      </div>

      {/* 시간 범위 */}
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:C.sub,fontWeight:600}}>표시 시간</span>
        <button onClick={()=>setSh(h=>Math.max(0,h-1))} style={{...btnSm}}>← 앞 추가</button>
        <span style={{fontSize:12,fontWeight:700,minWidth:120,textAlign:"center"}}>{sh<12?`오전 ${sh}시`:`오후 ${sh===12?12:sh-12}시`} ~ {eh<=12?`오전 ${eh}시`:`오후 ${eh===12?12:eh-12}시`}</span>
        <button onClick={()=>setEh(h=>Math.min(24,h+1))} style={{...btnSm}}>뒤 추가 →</button>
        <button onClick={()=>setSh(h=>Math.min(h+1,eh-1))} style={{...btnSm,color:C.faint}}>← 앞 줄이기</button>
        <button onClick={()=>setEh(h=>Math.max(sh+1,h-1))} style={{...btnSm,color:C.faint}}>뒤 줄이기 →</button>
        <button onClick={()=>{setSh(10);setEh(19);}} style={{...btnSm,color:C.faint}}>초기화</button>
      </div>

      {/* 구성원 토글 */}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10,alignItems:"center"}}>
        <span style={{fontSize:12,color:C.sub,fontWeight:600,marginRight:2}}>구성원</span>
        {sortedAccounts.filter(a=>a.id!==user.id).map(acc=>(
          <button key={acc.id} onClick={()=>toggleMember(acc.id)}
            style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:99,
              border:`1.5px solid ${hiddenMembers.has(acc.id)?C.border:"#2563eb"}`,
              background:hiddenMembers.has(acc.id)?"#f1f5f9":"#eff6ff",
              color:hiddenMembers.has(acc.id)?C.faint:"#2563eb",
              fontSize:12,fontWeight:hiddenMembers.has(acc.id)?400:600,cursor:"pointer",opacity:hiddenMembers.has(acc.id)?0.6:1}}>
            <Avatar name={acc.name} size={16}/>
            {acc.name}
            <span style={{fontSize:10}}>{hiddenMembers.has(acc.id)?"":"✓"}</span>
          </button>
        ))}
        {hiddenMembers.size>0&&(
          <button onClick={()=>setHiddenMembers(new Set())}
            style={{padding:"4px 10px",borderRadius:99,border:`1px solid ${C.border}`,
              background:"#fff",color:C.sub,fontSize:11,cursor:"pointer"}}>
            전체 보기
          </button>
        )}
      </div>

      {/* 타임테이블 - 가로 스크롤 */}
      <div style={{overflowX:"auto",border:`1px solid ${C.border}`,borderRadius:12}}
        onMouseUp={cancelDrag} onMouseLeave={cancelDrag}>
        <div style={{minWidth:80+visibleAccounts.length*COL}}>
          {/* 헤더 */}
          <div style={{display:"flex",position:"sticky",top:0,zIndex:10}}>
            <div style={{width:80,flexShrink:0,background:"#1e40af",borderBottom:`2px solid ${C.border}`}}/>
            {visibleAccounts.map(acc=>(
              <div key={acc.id} style={{width:COL,flexShrink:0,padding:"10px 8px",textAlign:"center",background:"#1e40af",borderBottom:`2px solid ${C.border}`,borderLeft:`1px solid #3b82f622`}}>
                <Avatar name={acc.name} size={28}/>
                <div style={{fontSize:12,fontWeight:700,color:"#fff",marginTop:4}}>{acc.name}</div>
                <div style={{fontSize:10,color:"#93c5fd"}}>{acc.role}</div>
              </div>
            ))}
          </div>

          {/* 슬롯 행 */}
          {slots.map(({key,label})=>(
            <div key={key} style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
              {/* 시간 라벨 */}
              <div style={{width:80,flexShrink:0,padding:"8px 10px",fontSize:12,fontWeight:600,
                color:C.sub,background:"#f8fafc",borderRight:`1px solid ${C.border}`,
                display:"flex",alignItems:"flex-start",justifyContent:"flex-end",minHeight:ROW,boxSizing:"border-box"}}>
                {label}
              </div>
              {/* 구성원 셀 */}
              {visibleAccounts.map(acc=>{
                const todos=todosOf(acc.id,key);
                const covering=getCovering(acc.id,key);
                const editable=canEdit(acc.id);
                const cat=covering?TODO_CATS.find(c=>c.id===covering.todo.cat):todos.length>0?TODO_CATS.find(c=>c.id===todos[0].cat):null;
                const isDnd=covering?covering.todo.dnd:todos.some(t=>t.dnd);
                const cellBg=isDnd?"#fff5f5":cat?cat.color+"12":editable?"#fff":"#fafafa";
                const cellBl=isDnd?"3px solid #ef4444":cat?`3px solid ${cat.color}`:"none";

                return (
                  <div key={acc.id}
                    onMouseDown={()=>onMD(acc.id,key)}
                    onMouseEnter={()=>onME(acc.id,key)}
                    onMouseUp={()=>onMU(acc.id,key)}
                    onClick={()=>{ if(!dragRef.current.moved&&!dragRef.current.active){ if(covering) openEdit(acc.id,covering.startKey,covering.todo); else openAdd(acc.id,key); } }}
                    style={{width:COL,flexShrink:0,minHeight:ROW,
                      padding:"4px 5px",boxSizing:"border-box",
                      borderLeft:(()=>{const p=getDragPos(acc.id,key);return p?"3px solid #2563eb":cellBl;})(),
                      background:(()=>{const p=getDragPos(acc.id,key);if(p==="first"||p==="single")return "#1d4ed8";if(p)return "#dbeafe";return cellBg;})(),
                      borderTop:(()=>{const p=getDragPos(acc.id,key);return p==="first"||p==="single"?"2px solid #2563eb":"none";})(),
                      borderBottom:(()=>{const p=getDragPos(acc.id,key);return p==="last"||p==="single"?"2px solid #2563eb":"none";})(),
                      borderRadius:(()=>{const p=getDragPos(acc.id,key);return p==="first"||p==="single"?"6px 6px 0 0":p==="last"?"0 0 6px 6px":"0";})(),
                      cursor:editable?"cell":"default",userSelect:"none"}}>
                    {covering ? (
                      <TodoItem todo={covering.todo} mid={acc.id} hour={covering.startKey} isCovering/>
                    ) : (
                      <>
                        {todos.map(todo=>(
                          <TodoItem key={todo.id} todo={todo} mid={acc.id} hour={key}/>
                        ))}
                        {(()=>{const p=getDragPos(acc.id,key);return(p==="first"||p==="single")?<div style={{pointerEvents:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"4px 0"}}><span style={{fontSize:11,fontWeight:800,color:"#fff"}}>📌 {dragSel?.start}~{dragSel?.end}</span></div>:null;})()}
                        {editable&&(
                          <div onClick={()=>openAdd(acc.id,key)}
                            style={{width:"100%",minHeight:todos.length?24:ROW-8,display:"flex",alignItems:"center",
                              justifyContent:"center",opacity:todos.length?0.3:0,transition:"opacity .15s",borderRadius:6}}
                            onMouseEnter={e=>e.currentTarget.style.opacity=1}
                            onMouseLeave={e=>e.currentTarget.style.opacity=todos.length?0.3:0}>
                            <span style={{fontSize:16,color:"#94a3b8"}}>＋</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 모달 */}
      {modal&&(
        <Modal title={modal.mode==="add"?"할 일 추가":"할 일 수정"} onClose={()=>setModal(null)}>
          <div style={{fontSize:12,color:C.sub,marginBottom:12,padding:"6px 10px",background:"#f1f5f9",borderRadius:8}}>
            📅 {selDate} &nbsp;·&nbsp; 🕐 {modal.hour}{modal.endHour&&modal.endHour!==modal.hour?` ~ ${modal.endHour}`:""} &nbsp;·&nbsp; 👤 {accounts.find(a=>a.id===modal.mid)?.name}
          </div>
          <Field label="카테고리">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {TODO_CATS.map(c=>(
                <button key={c.id} onClick={()=>setTf(v=>({...v,cat:v.cat===c.id?"":c.id}))}
                  style={{padding:"5px 12px",borderRadius:99,border:`2px solid ${tf.cat===c.id?c.color:C.border}`,
                    background:tf.cat===c.id?c.color+"18":"#fff",color:tf.cat===c.id?c.color:C.sub,
                    fontSize:12,fontWeight:tf.cat===c.id?700:400,cursor:"pointer"}}>
                  {c.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="프로젝트">
            <select style={inp} value={tf.projId||""} onChange={e=>setTf(v=>({...v,projId:e.target.value}))}>
              <option value="">— 없음 —</option>
              {(projects||[]).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="상세업무">
            <input style={inp} autoFocus value={tf.note||""} onChange={e=>setTf(v=>({...v,note:e.target.value}))}
              placeholder="상세 내용을 입력하세요" onKeyDown={e=>e.key==="Enter"&&save()}/>
          </Field>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <label style={{flex:1,display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:8,
              border:`1px solid ${C.border}`,background:tf.done?"#f0fdf4":"#fff",cursor:"pointer",fontSize:13}}>
              <input type="checkbox" checked={!!tf.done} onChange={e=>setTf(v=>({...v,done:e.target.checked}))} style={{accentColor:"#16a34a"}}/>
              ✅ 완료 처리
            </label>
            <label onClick={()=>setTf(v=>({...v,dnd:!v.dnd}))}
              style={{flex:1,display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:8,
                border:`2px solid ${tf.dnd?"#ef4444":C.border}`,background:tf.dnd?"#fef2f2":"#fff",
                color:tf.dnd?"#ef4444":C.sub,fontWeight:tf.dnd?700:400,cursor:"pointer",fontSize:13}}>
              🚫 방해금지
            </label>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            {modal.mode==="edit"&&<Btn danger sm onClick={del}>삭제</Btn>}
            <div style={{flex:1}}/>
            <Btn onClick={()=>setModal(null)}>취소</Btn>
            <Btn primary onClick={save} disabled={!tf.note?.trim()&&!tf.cat}>저장</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// 종합 캘린더
// ═══════════════════════════════════════════════════════════
function MasterCalendar({ projects, user, onCalName }) {
  const canEdit = user.canManageMembers || user.role === "PD";
  const today   = new Date();
  const [baseYear,  setBaseYear]  = useState(today.getFullYear());
  const [baseMonth, setBaseMonth] = useState(today.getMonth());
  const [filterProj, setFilterProj] = useState("all"); // "all" | projId

  const ymd = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  // 3개월 배열
  const months = [0,1,2].map(offset => {
    let m = baseMonth + offset, y = baseYear;
    if(m > 11){ m -= 12; y++; }
    return {year:y, month:m};
  });

  const prevMonth = () => { let m=baseMonth-1,y=baseYear; if(m<0){m=11;y--;} setBaseYear(y);setBaseMonth(m); };
  const nextMonth = () => { let m=baseMonth+1,y=baseYear; if(m>11){m=0;y++;} setBaseYear(y);setBaseMonth(m); };

  // 프로젝트 캘린더 표시명 (calName 우선, 없으면 프로젝트명)
  const projLabel = (p) => p.calName || p.name;

  // 전체 이벤트 수집 (프로젝트 정보 포함)
  const allEvents = projects.flatMap(p =>
    (p.calEvents||[]).map(ev => ({
      ...ev,
      projId:    p.id,
      projLabel: projLabel(p),
      projColor: p.color || "#2563eb",
    }))
  );

  const filtered = filterProj==="all" ? allEvents : allEvents.filter(e=>e.projId===filterProj);
  const eventsOn = (date) => filtered.filter(e => e.start <= date && date <= (e.end||e.start));

  // iCal 전체 내보내기
  const exportICal = () => {
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//CutFlow//KR","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:CutFlow 종합 일정"];
    for(const ev of filtered){
      const dtStart = ev.start.replace(/-/g,"");
      const endD = new Date(ev.end||ev.start); endD.setDate(endD.getDate()+1);
      const dtEndEx = `${endD.getFullYear()}${String(endD.getMonth()+1).padStart(2,"0")}${String(endD.getDate()).padStart(2,"0")}`;
      lines.push("BEGIN:VEVENT",`DTSTART;VALUE=DATE:${dtStart}`,`DTEND;VALUE=DATE:${dtEndEx}`,
        `SUMMARY:[${ev.projLabel}] ${ev.title}`,ev.note?`DESCRIPTION:${ev.note}`:"",`UID:${ev.id}@cutflow`,"END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.filter(Boolean).join("\r\n")],{type:"text/calendar"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="CutFlow_종합일정.ics"; a.click();
  };

  const DAYS = ["일","월","화","수","목","금","토"];

  const MiniCal = ({year, month}) => {
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const cells = [];
    for(let i=0;i<firstDay;i++) cells.push(null);
    for(let d=1;d<=daysInMonth;d++) cells.push(d);

    return (
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 20px",width:"100%"}}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:10,color:C.dark}}>{year}년 {month+1}월</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:3}}>
          {DAYS.map((d,i)=>(
            <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,padding:"2px 0",color:i===0?"#ef4444":i===6?"#2563eb":C.faint}}>{d}</div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={i}/>;
            const dateStr = ymd(year,month,d);
            const dayEvs  = eventsOn(dateStr);
            const isToday = dateStr===todayStr;
            const dow     = (firstDay+d-1)%7;
            return (
              <div key={i} style={{minHeight:68,background:isToday?"#eff6ff":"transparent",borderRadius:6,padding:"3px 2px",border:`1px solid ${isToday?C.blue:"transparent"}`}}>
                <div style={{fontSize:11,fontWeight:isToday?800:400,color:dow===0?"#ef4444":dow===6?"#2563eb":C.dark,marginBottom:2,textAlign:"center",
                  ...(isToday?{background:C.blue,color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 2px",fontSize:10}:{})}}>
                  {d}
                </div>
                {dayEvs.slice(0,3).map(ev=>(
                  <div key={ev.id} title={`[${ev.projLabel}] ${ev.title}`}
                    style={{fontSize:9,padding:"1px 4px",borderRadius:3,background:ev.projColor+"22",color:ev.projColor,fontWeight:700,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.5}}>
                    <span style={{opacity:0.7}}>[{ev.projLabel}]</span> {ev.title}
                  </div>
                ))}
                {dayEvs.length>3&&<div style={{fontSize:9,color:C.faint,textAlign:"center"}}>+{dayEvs.length-3}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={prevMonth} style={{border:`1px solid ${C.border}`,background:C.white,borderRadius:8,padding:"5px 14px",cursor:"pointer",fontSize:16}}>‹</button>
          <span style={{fontWeight:800,fontSize:16}}>{months[0].year}년 {months[0].month+1}월 — {months[2].month+1}월</span>
          <button onClick={nextMonth} style={{border:`1px solid ${C.border}`,background:C.white,borderRadius:8,padding:"5px 14px",cursor:"pointer",fontSize:16}}>›</button>
          <button onClick={()=>{setBaseYear(today.getFullYear());setBaseMonth(today.getMonth());}} style={{border:`1px solid ${C.border}`,background:C.white,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:12,color:C.sub}}>오늘</button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {filtered.length>0&&<button onClick={exportICal} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.blue}`,background:C.blueLight,color:C.blue,cursor:"pointer",fontSize:12,fontWeight:600}}>📅 구글 캘린더로 내보내기</button>}
        </div>
      </div>

      {/* 프로젝트 필터 + 캘린더 표시명 설정 */}
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:C.sub,marginRight:4}}>프로젝트 필터</span>
          <button onClick={()=>setFilterProj("all")} style={{padding:"3px 10px",borderRadius:99,border:`1px solid ${filterProj==="all"?C.blue:C.border}`,background:filterProj==="all"?C.blueLight:C.white,color:filterProj==="all"?C.blue:C.sub,fontSize:12,fontWeight:filterProj==="all"?700:400,cursor:"pointer"}}>전체</button>
          {projects.map(p=>(
            <button key={p.id} onClick={()=>setFilterProj(p.id===filterProj?"all":p.id)}
              style={{padding:"3px 10px",borderRadius:99,border:`1px solid ${filterProj===p.id?p.color:C.border}`,background:filterProj===p.id?p.color+"18":C.white,color:filterProj===p.id?p.color:C.sub,fontSize:12,fontWeight:filterProj===p.id?700:400,cursor:"pointer"}}>
              {projLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {/* 프로젝트별 캘린더 표시명 설정 (편집 권한자만) */}
      {canEdit && (
        <div style={{background:C.slateLight,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:10}}>🏷️ 캘린더 표시명 설정 <span style={{fontWeight:400,color:C.faint}}>(미입력 시 프로젝트명 사용)</span></div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            {projects.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0,display:"inline-block"}}/>
                <span style={{fontSize:12,color:C.sub,whiteSpace:"nowrap"}}>{p.name}</span>
                <span style={{fontSize:12,color:C.faint}}>→</span>
                <CalNameInput project={p} onSave={v=>onCalName&&onCalName(p.id,v)}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3개월 달력 */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {months.map(({year,month})=><MiniCal key={`${year}-${month}`} year={year} month={month}/>)}
      </div>

      {/* 범례 */}
      {projects.filter(p=>(p.calEvents||[]).length>0).length>0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
          {projects.filter(p=>(p.calEvents||[]).length>0).map(p=>(
            <span key={p.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,padding:"3px 10px",borderRadius:99,background:p.color+"15",color:p.color,fontWeight:600}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:p.color,display:"inline-block"}}/>
              {projLabel(p)} ({(p.calEvents||[]).length}건)
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 캘린더 표시명 인라인 편집 컴포넌트
function CalNameInput({ project, onSave }) {
  const [val, setVal] = useState(project.calName||"");
  return (
    <input
      style={{...inp,width:120,padding:"3px 8px",fontSize:12}}
      value={val}
      placeholder={project.name}
      onChange={e=>setVal(e.target.value)}
      onBlur={()=>onSave(val)}
      onKeyDown={e=>e.key==="Enter"&&onSave(val)}
    />
  );
}


// ═══════════════════════════════════════════════════════════
// CRM 페이지
// ═══════════════════════════════════════════════════════════
function CRMPage({ projects }) {
  const [search, setSearch] = useState("");
  const [selProj, setSelProj] = useState(null);

  // 프로젝트에서 클라이언트/대행사 정보 집계
  const clients = {};
  for (const p of projects) {
    const key = p.client;
    if (!clients[key]) clients[key] = { name:p.client, agency:p.agency||"", projects:[], contacts:[] };
    clients[key].projects.push(p);
    if (p.contactName) {
      const exists = clients[key].contacts.find(c=>c.name===p.contactName);
      if (!exists) clients[key].contacts.push({ name:p.contactName, phone:p.contactPhone||"", email:p.contactEmail||"", agency:p.agency||"" });
    }
  }
  const list = Object.values(clients).filter(c =>
    !search || c.name.includes(search) || c.agency.includes(search) ||
    c.contacts.some(ct=>ct.name.includes(search)||ct.phone.includes(search))
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontSize:18,fontWeight:800,margin:0}}>👥 CRM — 거래처 관리</h2>
        <input style={{...inp,width:220}} placeholder="🔍 거래처·대행사·담당자 검색" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {list.length===0 && <div style={{textAlign:"center",padding:60,color:C.faint}}>검색 결과가 없습니다</div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
        {list.map(cl=>(
          <div key={cl.name} onClick={()=>setSelProj(selProj===cl.name?null:cl.name)}
            style={{background:C.white,border:`1px solid ${selProj===cl.name?C.blue:C.border}`,borderRadius:14,padding:"16px 18px",cursor:"pointer",transition:"all .15s",boxShadow:selProj===cl.name?"0 0 0 2px "+C.blue+"30":"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontWeight:800,fontSize:15}}>{cl.name}</div>
                {cl.agency&&<div style={{fontSize:12,color:C.sub,marginTop:2}}>📌 {cl.agency}</div>}
              </div>
              <span style={{fontSize:11,padding:"2px 8px",background:C.blueLight,color:C.blue,borderRadius:99,fontWeight:600}}>{cl.projects.length}건</span>
            </div>

            {cl.contacts.length>0 && (
              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:6}}>담당자</div>
                {cl.contacts.map((ct,i)=>(
                  <div key={i} style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6,padding:"6px 8px",background:C.slateLight,borderRadius:8}}>
                    <span style={{fontWeight:700,fontSize:12,width:"100%"}}>{ct.name} {ct.agency&&<span style={{fontWeight:400,color:C.faint}}>({ct.agency})</span>}</span>
                    {ct.phone&&<a href={`tel:${ct.phone}`} style={{fontSize:11,color:C.blue,textDecoration:"none"}}>📞 {ct.phone}</a>}
                    {ct.email&&<a href={`mailto:${ct.email}`} style={{fontSize:11,color:C.blue,textDecoration:"none",marginLeft:8}}>✉️ {ct.email}</a>}
                  </div>
                ))}
              </div>
            )}

            {selProj===cl.name && (
              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:6}}>진행 프로젝트</div>
                {cl.projects.map(p=>(
                  <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                    <div>
                      <span style={{width:8,height:8,borderRadius:"50%",background:p.color,display:"inline-block",marginRight:6}}/>
                      <span style={{fontWeight:600}}>{p.name}</span>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{fontSize:11,padding:"1px 6px",background:C.slateLight,borderRadius:99,color:C.sub}}>{p.stage}</span>
                      {p.due&&<span style={{fontSize:11,color:C.faint}}>{p.due}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// 회사 설정 페이지
// ═══════════════════════════════════════════════════════════
function CompanySettings({ company, onChange, accounts, onSaveMember, onDeleteMember, formats, onAddFormat, onDeleteFormat }) {
  const c = company;
  const set = (k,v) => onChange({...c,[k]:v});
  return (
    <div>
      <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:800}}>회사 설정</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px"}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>🏢 기본 정보</div>
          <Field label="회사명 *"><input style={inp} value={c.name||""} onChange={e=>set("name",e.target.value)} placeholder="ex. NAMUc"/></Field>
          <Field label="대표자명"><input style={inp} value={c.ceo||""} onChange={e=>set("ceo",e.target.value)} placeholder="홍길동"/></Field>
          <Field label="사업자등록번호"><input style={inp} value={c.bizNo||""} onChange={e=>set("bizNo",e.target.value)} placeholder="123-45-67890"/></Field>
          <Field label="주소"><input style={inp} value={c.address||""} onChange={e=>set("address",e.target.value)}/></Field>
          <Field label="전화번호"><input style={inp} value={c.phone||""} onChange={e=>set("phone",e.target.value)}/></Field>
          <Field label="이메일"><input style={inp} value={c.email||""} onChange={e=>set("email",e.target.value)}/></Field>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px"}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>🖼️ 회사 로고</div>
            <Field label="로고 이미지 URL"><input style={inp} value={c.logoUrl||""} onChange={e=>set("logoUrl",e.target.value)} placeholder="https://i.imgur.com/..."/></Field>
            {c.logoUrl
              ? <div style={{marginTop:8,padding:12,background:C.slateLight,borderRadius:10,textAlign:"center"}}><img src={c.logoUrl} alt="로고" style={{maxHeight:60,maxWidth:"100%",objectFit:"contain"}} onError={e=>e.target.style.display="none"}/><div style={{fontSize:11,color:C.faint,marginTop:4}}>미리보기</div></div>
              : <div style={{marginTop:8,padding:"16px",background:C.slateLight,borderRadius:10,textAlign:"center",color:C.faint,fontSize:12}}>URL 입력 시 미리보기</div>
            }
            <div style={{marginTop:10,padding:"10px 12px",background:C.blueLight,borderRadius:8,fontSize:12,color:C.blue}}>
              💡 imgur.com에 업로드 후 이미지 주소를 복사해서 입력하세요.
            </div>
          </div>
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px"}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>🏦 계좌 정보</div>
            <Field label="은행명"><input style={inp} value={c.bankName||""} onChange={e=>set("bankName",e.target.value)} placeholder="국민은행"/></Field>
            <Field label="계좌번호"><input style={inp} value={c.bankAccount||""} onChange={e=>set("bankAccount",e.target.value)}/></Field>
            <Field label="예금주"><input style={inp} value={c.bankHolder||""} onChange={e=>set("bankHolder",e.target.value)}/></Field>
          </div>
        </div>
        <div style={{gridColumn:"1 / -1",background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px"}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>📄 견적서 기본 설정</div>
          <Field label="견적 유효기간 (일)"><input style={inp} type="number" value={c.validDays||30} onChange={e=>set("validDays",Number(e.target.value)||30)}/></Field>
          <Field label="특이사항/비고 기본 문구"><textarea style={{...inp,minHeight:80,resize:"vertical"}} value={c.quoteNote||""} onChange={e=>set("quoteNote",e.target.value)}/></Field>
        </div>
      </div>
      <div style={{marginTop:16,padding:"13px 18px",background:C.greenLight,border:`1px solid ${C.green}30`,borderRadius:12,fontSize:13,color:C.green}}>
        ✅ 설정 내용은 자동 저장됩니다. 견적서 탭에서 <b>📄 견적서 PDF 출력</b> 버튼을 누르면 변경된 정보가 바로 반영됩니다.
      </div>

      {/* 포맷 관리 */}
      <div style={{marginTop:24,background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px"}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🎬 포맷 관리</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
          {formats.map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:C.slateLight,borderRadius:99,fontSize:13}}>
              <span>{f}</span>
              <button onClick={()=>onDeleteFormat(i)} style={{border:"none",background:"none",cursor:"pointer",color:C.faint,fontSize:12,lineHeight:1,padding:"0 2px"}}>✕</button>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input id="new-format-input" style={{...inp,flex:1}} placeholder="새 포맷 입력 (ex. 버티컬 15초)"
            onKeyDown={e=>{ if(e.key==="Enter"){ const v=e.target.value.trim(); if(v){onAddFormat(v);e.target.value="";} } }}/>
          <Btn primary sm onClick={()=>{ const el=document.getElementById("new-format-input"); const v=el.value.trim(); if(v){onAddFormat(v);el.value="";} }}>+ 추가</Btn>
        </div>
        <div style={{fontSize:11,color:C.faint,marginTop:6}}>Enter 또는 + 추가 버튼으로 입력</div>
      </div>

      <div style={{marginTop:28}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:16}}>👥 구성원 관리</div>
          <span style={{fontSize:12,padding:"2px 8px",background:C.amberLight,color:C.amber,borderRadius:99,fontWeight:600}}>대표 · 경영지원 전용</span>
        </div>
        <MemberManagement accounts={accounts} onSave={onSaveMember} onDelete={onDeleteMember}/>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// 재무 대시보드
// ═══════════════════════════════════════════════════════════
function FinanceDash({ projects }) {
  const active  = projects.filter(p=>!p.settled);
  const settled = projects.filter(p=>p.settled);

  const totalOrder  = active.reduce((s,p)=>s+qTotal(p.quote),0);
  const totalSupply = active.reduce((s,p)=>s+qSupply(p.quote),0);
  const totalSpent  = active.reduce((s,p)=>s+vTotal(p.budget),0);
  const totalProfit = totalSupply - totalSpent;
  const totalMargin = totalSupply?Math.round(totalProfit/totalSupply*100):0;

  // 월별 수주액 계산 (납품일 기준)
  const monthlyData = (() => {
    const map = {};
    [...active, ...settled].forEach(p => {
      const d = p.startDate || p.due;
      if(!d) return;
      const ym = d.slice(0,7); // "YYYY-MM"
      if(!map[ym]) map[ym] = {order:0, supply:0, count:0};
      map[ym].order  += qTotal(p.quote)||0;
      map[ym].supply += qSupply(p.quote)||0;
      map[ym].count  += 1;
    });
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([ym,v])=>({
      label: ym.replace("-","년 ")+"월",
      ym,
      ...v
    }));
  })();
  const maxOrder = Math.max(...monthlyData.map(d=>d.order), 1);

  return (
    <div style={{padding:"0 4px"}}>
      <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:800}}>재무 대시보드</h2>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
        {[
          {label:"진행중 프로젝트",val:active.length+"건",color:C.blue,icon:"📋"},
          {label:"총 수주 (VAT포함)",val:fmtM(totalOrder),color:C.purple,icon:"💰"},
          {label:"총 집행",val:fmtM(totalSpent),color:C.amber,icon:"📤"},
          {label:"평균 이익률",val:totalMargin+"%",color:totalMargin>=20?C.green:C.red,icon:"📈"},
        ].map(s=>(
          <div key={s.label} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",borderTop:`3px solid ${s.color}`}}>
            <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* 월별 수주액 차트 */}
      <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700}}>📅 월별 수주액</h3>
      {monthlyData.length===0 ? (
        <div style={{padding:"32px",textAlign:"center",color:C.faint,fontSize:13,background:C.white,borderRadius:12,border:`1px solid ${C.border}`,marginBottom:28}}>
          납품일이 입력된 프로젝트가 없습니다
        </div>
      ) : (
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"20px 24px",marginBottom:28,overflowX:"auto"}}>
          <div style={{width:"100%"}}>
            {/* 목표액 안내 */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <span style={{fontSize:12,color:C.sub}}>월 목표 수주액</span>
              <span style={{fontSize:13,fontWeight:800,color:"#1d4ed8"}}>3억원</span>
            </div>
            {monthlyData.map((d,i)=>{
              const TARGET = 300000000;
              const COLORS = ["#3b82f6","#8b5cf6","#f97316","#16a34a","#ef4444","#0891b2","#d97706","#db2777","#65a30d","#7c3aed"];
              const color = COLORS[i%10];
              const achieved = d.order >= TARGET;
              const barPct = Math.min((d.order/TARGET)*100, 100);
              const overPct = d.order > TARGET ? Math.min(((d.order-TARGET)/TARGET)*60,40) : 0;
              return (
                <div key={d.ym} style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                    <div style={{width:80,textAlign:"right",fontSize:11,fontWeight:600,color:C.sub,flexShrink:0}}>{d.label}</div>
                    <div style={{flex:1,position:"relative",height:18}}>
                      {/* 배경 트랙 */}
                      <div style={{position:"absolute",inset:0,background:"#f1f5f9",borderRadius:99}}/>
                      {/* 목표선 (100% 위치) */}
                      <div style={{position:"absolute",left:"calc(100% * 300000000 / (300000000 * 1.4))",top:-4,bottom:-4,width:2,background:"#dc2626",borderRadius:2,zIndex:2}}/>
                      {/* 수주 막대 */}
                      <div style={{position:"absolute",left:0,top:0,height:"100%",
                        width:`${(barPct/140)*100}%`,
                        borderRadius:overPct>0?"99px":"99px",
                        background:achieved?`linear-gradient(90deg,#16a34a,#22c55e)`:`linear-gradient(90deg,${color},${color}bb)`,
                        transition:"width .5s",zIndex:1}}/>
                      {/* 초과분 */}
                      {overPct>0&&<div style={{position:"absolute",left:`${(100/140)*100}%`,top:2,height:"calc(100% - 4px)",
                        width:`${(overPct/140)*100}%`,
                        borderRadius:"0 99px 99px 0",
                        background:"linear-gradient(90deg,#22c55e88,#22c55e44)",zIndex:1}}/>}
                    </div>
                    <div style={{width:70,fontSize:11,fontWeight:700,color:achieved?"#16a34a":color,flexShrink:0,textAlign:"right"}}>{fmtM(d.order)}</div>
                    <div style={{width:48,flexShrink:0}}>
                      {achieved
                        ? <span style={{fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:99,padding:"2px 6px"}}>✓ 달성</span>
                        : <span style={{fontSize:10,fontWeight:700,color:"#ef4444",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:99,padding:"2px 6px"}}>{Math.round(barPct)}%</span>
                      }
                    </div>
                  </div>
                  {/* 부족액 표시 */}
                  {!achieved&&<div style={{paddingLeft:90,fontSize:10,color:"#ef4444"}}>
                    목표까지 {fmtM(TARGET - d.order)} 부족
                  </div>}
                  {achieved&&d.order>TARGET&&<div style={{paddingLeft:90,fontSize:10,color:"#16a34a"}}>
                    목표 초과 +{fmtM(d.order - TARGET)}
                  </div>}
                </div>
              );
            })}
            {/* 목표선 범례 */}
            <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:90,marginTop:4}}>
              <div style={{width:16,height:3,background:"#dc2626",borderRadius:99}}/>
              <span style={{fontSize:10,color:C.faint}}>목표 3억 기준선</span>
            </div>
          </div>

        </div>
      )}

      <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700}}>진행중 프로젝트 ({active.length}건)</h3>
      <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:28}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 100px 120px 110px 110px 80px 80px",background:C.slateLight,padding:"9px 14px",fontSize:11,fontWeight:700,color:C.sub,gap:8}}>
          <span>프로젝트</span><span style={{textAlign:"right"}}>스테이지</span><span style={{textAlign:"right"}}>수주(VAT)</span><span style={{textAlign:"right"}}>매출</span><span style={{textAlign:"right"}}>집행</span><span style={{textAlign:"right"}}>이익률</span><span style={{textAlign:"center"}}>결산</span>
        </div>
        {active.map((p,i)=>{
          const sup=qSupply(p.quote), sp=vTotal(p.budget), mg=sup?Math.round((sup-sp)/sup*100):0;
          return (
            <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 100px 120px 110px 110px 80px 80px",padding:"11px 14px",borderTop:i>0?`1px solid ${C.border}`:"none",gap:8,alignItems:"center",background:i%2===0?C.white:"#fafbfc"}}>
              <div><div style={{fontSize:14,fontWeight:700}}>{p.name}</div><div style={{fontSize:11,color:C.sub}}>{p.client}</div></div>
              <span style={{textAlign:"right",fontSize:11}}><span style={{padding:"2px 6px",borderRadius:99,background:STAGES[p.stage]?.bg,color:STAGES[p.stage]?.color,fontWeight:700}}>{p.stage}</span></span>
              <span style={{textAlign:"right",fontWeight:600,color:C.blue,fontSize:13}}>{fmtM(qTotal(p.quote))}</span>
              <span style={{textAlign:"right",fontSize:13}}>{fmtM(sup)}</span>
              <span style={{textAlign:"right",fontSize:13,color:C.sub}}>{fmtM(sp)}</span>
              <span style={{textAlign:"right"}}><span style={{fontSize:12,padding:"2px 8px",borderRadius:99,background:mg>=30?C.greenLight:mg>=20?C.amberLight:C.redLight,color:mg>=30?C.green:mg>=20?C.amber:C.red,fontWeight:700}}>{mg}%</span></span>
              <div style={{textAlign:"center"}}>
                {p.settled?<span style={{fontSize:11,color:C.green,fontWeight:700}}>✅ 확정</span>:<span style={{fontSize:11,color:C.faint}}>미확정</span>}
              </div>
            </div>
          );
        })}
      </div>

      {settled.length>0&&(
        <>
          <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700}}>결산 확정 프로젝트 ({settled.length}건)</h3>
          <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 120px 110px 110px 80px 110px",background:C.slateLight,padding:"9px 14px",fontSize:11,fontWeight:700,color:C.sub,gap:8}}>
              <span>프로젝트</span><span style={{textAlign:"right"}}>수주(VAT)</span><span style={{textAlign:"right"}}>매출</span><span style={{textAlign:"right"}}>매입</span><span style={{textAlign:"right"}}>이익률</span><span style={{textAlign:"center"}}>확정일</span>
            </div>
            {settled.map((p,i)=>{
              const sup=qSupply(p.quote), sp=vTotal(p.budget), mg=sup?Math.round((sup-sp)/sup*100):0;
              return (
                <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 120px 110px 110px 80px 110px",padding:"11px 14px",borderTop:i>0?`1px solid ${C.border}`:"none",gap:8,alignItems:"center",background:i%2===0?C.white:"#fafbfc"}}>
                  <div><div style={{fontSize:14,fontWeight:700}}>{p.name}</div><div style={{fontSize:11,color:C.sub}}>{p.client}</div></div>
                  <span style={{textAlign:"right",fontWeight:600,fontSize:13}}>{fmtM(qTotal(p.quote))}</span>
                  <span style={{textAlign:"right",fontSize:13}}>{fmtM(sup)}</span>
                  <span style={{textAlign:"right",fontSize:13,color:C.sub}}>{fmtM(sp)}</span>
                  <span style={{textAlign:"right"}}><span style={{fontSize:12,padding:"2px 8px",borderRadius:99,background:mg>=30?C.greenLight:C.redLight,color:mg>=30?C.green:C.red,fontWeight:700}}>{mg}%</span></span>
                  <span style={{textAlign:"center",fontSize:12,color:C.sub}}>{p.settlementDate}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 메인 앱
// ═══════════════════════════════════════════════════════════
const AppContext = { Provider: ({children}) => children };

function App() {
  const [user,         setUser]         = useState(null);
  const [projects,     setProjects]     = useState(SEED_PROJECTS);
  const [selId,        setSelId]        = useState("p1");
  const [company,      setCompany]      = useState(DEFAULT_COMPANY);
  const [dailyTodos,   setDailyTodos]   = useState({});
  const [formats,      setFormats]      = useState(()=>{
    try { return JSON.parse(localStorage.getItem("cf_formats")||"null") || FORMATS_DEFAULT; }
    catch(e) { return FORMATS_DEFAULT; }
  });
  const [accounts,     setAccounts]     = useState(SEED_ACCOUNTS);
  const [mainTab,      setMainTab]      = useState("tasks");
  const [addProjModal,  setAddProjModal]  = useState(false);
  const [editProjModal, setEditProjModal] = useState(false);
  const [pf,            setPf]            = useState({name:"",client:"",format:formats?.[0]||"TVC",due:"",startDate:"",director:"",pd:"",color:P_COLORS[0],quoteFmt:"A"});

  useEffect(() => {
    if (!isConfigured) return;
    const u1 = subscribeProjects(fb => { if(fb.length>0){setProjects(fb);setSelId(p=>fb.find(x=>x.id===p)?p:fb[0].id);} });
    const u2 = subscribeCompany(d => setCompany(p=>({...DEFAULT_COMPANY,...d})));
    const u3 = subscribeMembers(m => { if(m.length>0) setAccounts(m); });
    return () => { u1(); u2(); u3(); };
  }, []);
  const [docTab,       setDocTab]       = useState("quote");   // quote | budget | settlement
  const [viewMode,     setViewMode]     = useState("list");    // list | kanban
  const [taskModal,    setTaskModal]    = useState(null);
  const [tf,           setTf]           = useState({});

  if (!user) return <LoginScreen onLogin={setUser} accounts={accounts}/>;

  const proj     = projects.find(p=>p.id===selId)||projects[0];

  // 재무 문서 접근 권한: canViewFinance 있거나, 프로젝트 허용 멤버에 포함되거나, 허용 멤버 미지정시 전체 허용
  const canAccessFinance = user.canViewFinance ||
    !proj?.allowedFinanceMembers?.length ||
    (proj?.allowedFinanceMembers||[]).includes(String(user.id));

  const patchProj = fn => setProjects(ps=>{
    const updated=ps.map(p=>p.id===selId?fn(p):p);
    const changed=updated.find(p=>p.id===selId);
    if(changed&&isConfigured) saveProject(changed).catch(console.error);
    return updated;
  });

  const updateTasks = tasks => patchProj(p=>({...p,tasks}));
  const updateQuote = q     => patchProj(p=>({...p,quote:q}));
  const updateBudget= b     => patchProj(p=>({...p,budget:b}));

  const confirmSettlement = () => patchProj(p=>({...p,settlementDate:todayStr(),settled:true}));

  const createProject = () => {
    if (!pf.name.trim()||!pf.client.trim()) return;
    const id = "p"+Date.now();
    const np = {
      id, ...pf, stage:"브리프", createdAt:todayStr(),
      tasks:[],
      quote:{vat:true,agencyFeeRate:10,items:pf.quoteFmt==="B"?makeTemplateB():makeTemplate()},
      budget:{vouchers:[]},
      settlementDate:null, settled:false,
    };
    setProjects(ps=>[...ps,np]);
    setSelId(id);
    setAddProjModal(false);
    if(isConfigured) saveProject(np).catch(console.error);
    setPf({name:"",client:"",format:formats?.[0]||"TVC",due:"",director:"",pd:"",color:P_COLORS[0]});
  };

  const openEditProj = () => {
    const p = projects.find(x=>x.id===selId);
    if(!p) return;
    setPf({name:p.name,client:p.client,format:p.format||formats?.[0]||"TVC",due:p.due||"",startDate:p.startDate||"",director:p.director||"",pd:p.pd||"",color:p.color||P_COLORS[0],allowedFinanceMembers:p.allowedFinanceMembers||[],quoteFmt:p.quoteFmt||"A",agency:p.agency||"",contactName:p.contactName||"",contactPhone:p.contactPhone||"",contactEmail:p.contactEmail||"",epd:p.epd||"",assistant:p.assistant||""});
    setEditProjModal(true);
  };

  const updateProject = () => {
    if(!pf.name.trim()||!pf.client.trim()) return;
    patchProj(p=>({...p,...pf}));
    setEditProjModal(false);
    setPf({name:"",client:"",format:formats?.[0]||"TVC",due:"",director:"",pd:"",color:P_COLORS[0]});
  };

  const deleteProjectById = (id) => {
    const remaining = projects.filter(p=>p.id!==id);
    setProjects(remaining);
    if(selId===id) setSelId(remaining[0]?.id||"");
    if(isConfigured) deleteProject(id).catch(console.error);
  };

  const saveTask = (tf) => {
    if (!tf.title?.trim()) return;
    const tasks = tf.id
      ? proj.tasks.map(t=>t.id===tf.id?tf:t)
      : [...proj.tasks, {...tf,id:"t"+Date.now()}];
    updateTasks(tasks);
    setTaskModal(null);
  };
  const deleteTask = (id) => { updateTasks(proj.tasks.filter(t=>t.id!==id)); setTaskModal(null); };

  const filteredTasks = proj.tasks.filter(t=>{
    if (tf.q&&!t.title.toLowerCase().includes(tf.q.toLowerCase())) return false;
    if (tf.type&&t.type!==tf.type) return false;
    if (tf.assignee&&t.assignee!==tf.assignee) return false;
    if (tf.stage&&t.stage!==tf.stage) return false;
    return true;
  });

  const stageKeys = Object.keys(STAGES);

return (
    <AppContext.Provider value={{setProjects}}>
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Pretendard','Apple SD Gothic Neo',-apple-system,sans-serif"}}>
      {/* 헤더 */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:"0 24px",display:"flex",alignItems:"center",gap:16,height:56,position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
        <div style={{fontWeight:800,fontSize:18,color:C.blue,letterSpacing:-0.5,display:"flex",alignItems:"center",gap:8}}>
          {company.logoUrl?<img src={company.logoUrl} alt="logo" style={{height:28,maxWidth:100,objectFit:"contain"}}/>:"🎬"}
          {company.name||"CutFlow"}
        </div>
        {/* 프로젝트 선택 */}
        <div style={{display:"flex",gap:6,flex:1,overflowX:"auto"}}>
          {projects.map(p=>(
            <button key={p.id} onClick={()=>setSelId(p.id)} style={{padding:"5px 12px",borderRadius:8,border:`2px solid ${selId===p.id?p.color:C.border}`,background:selId===p.id?p.color+"18":C.white,cursor:"pointer",fontSize:12,fontWeight:selId===p.id?700:500,color:selId===p.id?p.color:C.sub,whiteSpace:"nowrap",transition:"all .15s"}}>
              {p.name}
            </button>
          ))}
          <button onClick={()=>setAddProjModal(true)} style={{padding:"5px 12px",borderRadius:8,border:`2px dashed ${C.border}`,background:"none",cursor:"pointer",fontSize:12,color:C.faint,whiteSpace:"nowrap"}}>
            + 새 프로젝트
          </button>
        </div>
        <button onClick={e=>{e.stopPropagation();openEditProj();}} title="현재 프로젝트 수정" style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.white,cursor:"pointer",fontSize:13,color:C.sub,whiteSpace:"nowrap",flexShrink:0,marginLeft:4}}>
          ✏️
        </button>
        {/* 메인탭 */}
        <div style={{display:"flex",gap:2,background:C.slateLight,borderRadius:8,padding:3}}>
          {[{id:"tasks",icon:"📋",label:"프로젝트"},{id:"finance",icon:"💰",label:"재무",locked:!canAccessFinance},{id:"daily-todo",icon:"✅",label:"데일리 TODO"},{id:"master-calendar",icon:"🗓",label:"종합캘린더"},{id:"crm",icon:"👥",label:"CRM"},{id:"settings",icon:"⚙️",label:"설정",locked:!user.canManageMembers}].map(t=>(
            <button key={t.id} onClick={()=>!t.locked&&setMainTab(t.id)} style={{padding:"5px 14px",borderRadius:6,border:"none",background:mainTab===t.id?C.white:"transparent",cursor:t.locked?"not-allowed":"pointer",fontSize:13,fontWeight:mainTab===t.id?700:500,color:mainTab===t.id?C.text:t.locked?C.faint:C.sub,boxShadow:mainTab===t.id?"0 1px 4px rgba(0,0,0,.08)":"none",transition:"all .15s"}}>
              {t.icon} {t.label}{t.locked?" 🔒":""}
            </button>
          ))}
        </div>
        {/* 유저 */}
        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setUser(null)}>
          <Avatar name={user.name}/>
          <div>
            <div style={{fontSize:13,fontWeight:700,lineHeight:1.2}}>{user.name}</div>
            <div style={{fontSize:11,color:C.faint}}>{user.role}</div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1400,margin:"0 auto",padding:"24px 24px 48px"}}>
        {mainTab==="finance" ? (
          <FinanceDash projects={projects}/>
        ) : mainTab==="crm" ? (
          <CRMPage projects={projects}/>
        ) : mainTab==="daily-todo" ? (
          <DailyTodo accounts={accounts} user={user} dailyTodos={dailyTodos} setDailyTodos={setDailyTodos} projects={projects}/>
        ) : mainTab==="master-calendar" ? (
          <MasterCalendar projects={projects} user={user} onCalName={(id,v)=>setProjects(ps=>ps.map(p=>p.id===id?{...p,calName:v}:p))}/>
        ) : mainTab==="settings" ? (
          <CompanySettings
            company={company}
            onChange={u=>{setCompany(u);if(isConfigured)saveCompany(u).catch(console.error);}}
            accounts={accounts}
            onSaveMember={m=>{setAccounts(p=>p.find(a=>a.id===m.id)?p.map(a=>a.id===m.id?m:a):[...p,m]);if(isConfigured)saveMember(m).catch(console.error);}}
            onDeleteMember={id=>{setAccounts(p=>p.filter(a=>a.id!==id));if(isConfigured)deleteMember(id).catch(console.error);}}
            formats={formats}
            onAddFormat={f=>setFormats(p=>[...p,f])}
            onDeleteFormat={i=>setFormats(p=>p.filter((_,idx)=>idx!==i))}
          />
        ) : (
          <>
            {/* 프로젝트 정보 바 */}
            <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 20px",marginBottom:20,display:"flex",gap:16,alignItems:"center",flexWrap:"wrap",borderLeft:`4px solid ${proj.color}`}}>
              <div>
                <div style={{fontWeight:800,fontSize:18}}>{proj.name}</div>
                <div style={{fontSize:13,color:C.sub,marginTop:2}}>{proj.client}{proj.agency&&` · ${proj.agency}`} · {proj.format}</div>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12,color:C.sub,marginLeft:"auto"}}>
                {proj.director&&<span>🎬 {proj.director}</span>}
                {proj.epd&&<span>🎯 EPD {proj.epd}</span>}
                {proj.assistant&&<span>🎥 조감독 {proj.assistant}</span>}
                {proj.pd&&<span>📋 {proj.pd}</span>}
                {proj.agency&&<span>🏢 {proj.agency}</span>}
                {proj.contactName&&<span>👤 {proj.contactName}{proj.contactPhone&&<span style={{color:C.faint}}> · {proj.contactPhone}</span>}</span>}
                {proj.startDate&&<span>🗓 시작 {proj.startDate}</span>}
                {proj.due&&<span>📅 납품 {proj.due}</span>}
                <select value={proj.stage} onChange={e=>patchProj(p=>({...p,stage:e.target.value}))}
                  style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,cursor:"pointer",background:STAGES[proj.stage]?.bg,color:STAGES[proj.stage]?.color,fontWeight:700}}>
                  {stageKeys.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* 태스크 탭 */}
            <TabBar
              tabs={[
                {id:"tasks",icon:"📋",label:"프로젝트"},
                {id:"feedback",icon:"💬",label:"피드백"},
                {id:"stafflist",icon:"👤",label:"스탭리스트"},
                {id:"calendar",icon:"📅",label:"캘린더"},
                {id:"quote",icon:"💵",label:"견적서",locked:!canAccessFinance},
                {id:"budget",icon:"📒",label:"실행예산서",locked:!canAccessFinance},
                {id:"settlement",icon:"📊",label:"결산서",locked:!canAccessFinance},
              ]}
              active={docTab} onChange={setDocTab}
            />

            {/* ── 태스크 ── */}
            {docTab==="tasks"&&(
              <div>
                {/* 필터 바 */}
                <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
                  <input value={tf.q||""} onChange={e=>setTf(v=>({...v,q:e.target.value}))} placeholder="🔍 태스크 검색..." style={{...inp,width:200}}/>
                  <select value={tf.type||""} onChange={e=>setTf(v=>({...v,type:e.target.value}))} style={{...inp,width:140}}>
                    <option value="">유형 전체</option>
                    {TASK_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                  <select value={tf.stage||""} onChange={e=>setTf(v=>({...v,stage:e.target.value}))} style={{...inp,width:130}}>
                    <option value="">스테이지 전체</option>
                    {stageKeys.map(s=><option key={s}>{s}</option>)}
                  </select>
                  <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                    <button onClick={()=>setViewMode("list")} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${viewMode==="list"?C.blue:C.border}`,background:viewMode==="list"?C.blueLight:C.white,cursor:"pointer",fontSize:12,color:viewMode==="list"?C.blue:C.sub}}>☰ 리스트</button>
                    <button onClick={()=>setViewMode("kanban")} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${viewMode==="kanban"?C.blue:C.border}`,background:viewMode==="kanban"?C.blueLight:C.white,cursor:"pointer",fontSize:12,color:viewMode==="kanban"?C.blue:C.sub}}>⠿ 칸반</button>
                    <Btn primary sm onClick={()=>{setTaskModal({stage:"브리프",type:TASK_TYPES[0],assignee:SEED_ACCOUNTS[0].name,priority:"보통"});setTf(v=>({...v,_edit:null}));}}>+ 태스크</Btn>
                  </div>
                </div>

                {viewMode==="kanban"?(
                  <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:12}}>
                    {stageKeys.map(s=><KanbanCol key={s} stage={s} tasks={filteredTasks.filter(t=>t.stage===s)} onEdit={t=>setTaskModal({...t})}/>)}
                  </div>
                ):(
                  <div style={{border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"2fr 100px 90px 90px 80px 32px",background:C.slateLight,padding:"9px 14px",fontSize:11,fontWeight:700,color:C.sub,gap:8}}>
                      <span>태스크</span><span>스테이지</span><span>마감일</span><span>담당자</span><span>우선순위</span><span/>
                    </div>
                    {filteredTasks.length===0&&<div style={{padding:"30px",textAlign:"center",color:C.faint,fontSize:14}}>태스크가 없습니다</div>}
                    {filteredTasks.map((t,i)=>(
                      <div key={t.id} style={{display:"grid",gridTemplateColumns:"2fr 100px 90px 90px 80px 32px",padding:"11px 14px",borderTop:`1px solid ${C.border}`,gap:8,alignItems:"center",background:i%2===0?C.white:"#fafbfc",cursor:"pointer"}}
                        onClick={()=>setTaskModal({...t})}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:isOverdue(t)?C.red:C.text}}>{t.title}{isOverdue(t)?" ⚠":""}</div>
                          <div style={{fontSize:11,color:C.faint,marginTop:2}}>{t.type}</div>
                        </div>
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:STAGES[t.stage]?.bg,color:STAGES[t.stage]?.color,fontWeight:600,whiteSpace:"nowrap"}}>{t.stage}</span>
                        <span style={{fontSize:12,color:isOverdue(t)?C.red:C.faint}}>{t.due||"-"}</span>
                        <div style={{display:"flex",alignItems:"center",gap:6}}><Avatar name={t.assignee} size={22}/><span style={{fontSize:12}}>{t.assignee}</span></div>
                        <span style={{fontSize:11,color:t.priority==="긴급"?C.red:t.priority==="높음"?C.amber:C.faint,fontWeight:600}}>{t.priority||"-"}</span>
                        <button onClick={e=>{e.stopPropagation();deleteTask(t.id);}} style={{border:"none",background:"none",cursor:"pointer",color:C.faint,fontSize:16}}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── 피드백 ── */}
            {docTab==="feedback"&&<FeedbackTab project={proj} patchProj={patchProj} user={user} accounts={accounts}/>}

            {/* ── 캘린더 ── */}
            {docTab==="calendar"&&<MonthCalendar project={proj} onChange={patchProj} user={user}/>}

            {/* ── 스탭리스트 ── */}
            {docTab==="stafflist"&&<StaffList project={proj} onChange={patchProj} accounts={accounts}/>}

            {/* ── 견적서 ── */}
            {docTab==="quote"&&<QuoteEditor quote={proj.quote} onChange={updateQuote} exportProject={proj} company={company}/>}

            {/* ── 실행예산서 ── */}
            {docTab==="budget"&&<BudgetEditor project={proj} onSave={updateBudget}/>}

            {/* ── 결산서 ── */}
            {docTab==="settlement"&&<SettlementView project={proj} onConfirm={confirmSettlement}/>}
          </>
        )}
      </div>

      {/* 태스크 모달 */}
      {taskModal && (
        <Modal title={taskModal.id?"태스크 수정":"새 태스크"} onClose={()=>setTaskModal(null)}>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
            <Field label="태스크명 *"><input style={inp} autoFocus value={taskModal.title||""} onChange={e=>setTaskModal(v=>({...v,title:e.target.value}))} placeholder="ex. 촬영 D-day 준비"/></Field>
            <Field label="유형" half>
              <select style={inp} value={taskModal.type||TASK_TYPES[0]} onChange={e=>setTaskModal(v=>({...v,type:e.target.value}))}>
                {TASK_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="담당자" half>
              <select style={inp} value={taskModal.assignee||SEED_ACCOUNTS[0].name} onChange={e=>setTaskModal(v=>({...v,assignee:e.target.value}))}>
                {accounts.map(a=><option key={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="스테이지" half>
              <select style={inp} value={taskModal.stage||"브리프"} onChange={e=>setTaskModal(v=>({...v,stage:e.target.value}))}>
                {stageKeys.map(s=><option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="우선순위" half>
              <select style={inp} value={taskModal.priority||"보통"} onChange={e=>setTaskModal(v=>({...v,priority:e.target.value}))}>
                {["긴급","높음","보통"].map(p=><option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="마감일" half><input style={inp} type="date" value={taskModal.due||""} onChange={e=>setTaskModal(v=>({...v,due:e.target.value}))}/></Field>
            <Field label="설명"><textarea style={{...inp,resize:"vertical",minHeight:60}} value={taskModal.desc||""} onChange={e=>setTaskModal(v=>({...v,desc:e.target.value}))} placeholder="세부 내용..."/></Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
            {taskModal.id&&<Btn danger sm onClick={()=>deleteTask(taskModal.id)}>삭제</Btn>}
            <div style={{flex:1}}/>
            <Btn onClick={()=>setTaskModal(null)}>취소</Btn>
            <Btn primary onClick={()=>saveTask(taskModal)}>저장</Btn>
          </div>
        </Modal>
      )}

      {/* 새 프로젝트 모달 */}
      {editProjModal && (
        <Modal title="프로젝트 수정" onClose={()=>setEditProjModal(false)}>
          <Field label="프로젝트명 *"><input style={inp} autoFocus value={pf.name} onChange={e=>setPf(v=>({...v,name:e.target.value}))}/></Field>
          {/* 클라이언트 / 대행사 */}
          <div style={{display:"flex",gap:12}}>
            <Field label="클라이언트 *" style={{flex:1}}><input style={inp} value={pf.client} onChange={e=>setPf(v=>({...v,client:e.target.value}))}/></Field>
            <Field label="대행사" style={{flex:1}}><input style={inp} value={pf.agency||""} onChange={e=>setPf(v=>({...v,agency:e.target.value}))} placeholder="대행사명"/></Field>
          </div>
          {/* 포맷 / 시작일 / 납품일 */}
          <div style={{display:"flex",gap:12}}>
            <Field label="포맷" style={{flex:1}}><select style={inp} value={pf.format} onChange={e=>setPf(v=>({...v,format:e.target.value}))}>{formats.map(f=><option key={f}>{f}</option>)}</select></Field>
            <Field label="시작일" style={{flex:1}}><input style={inp} type="date" value={pf.startDate||""} onChange={e=>setPf(v=>({...v,startDate:e.target.value}))}/></Field>
            <Field label="납품일" style={{flex:1}}><input style={inp} type="date" value={pf.due||""} onChange={e=>setPf(v=>({...v,due:e.target.value}))}/></Field>
          </div>
          {/* 담당자명 / 연락처 / 이메일 */}
          <div style={{display:"flex",gap:12}}>
            <Field label="담당자명" style={{flex:1}}><input style={inp} value={pf.contactName||""} onChange={e=>setPf(v=>({...v,contactName:e.target.value}))} placeholder="홍길동 AE"/></Field>
            <Field label="담당자 연락처" style={{flex:1}}><input style={inp} value={pf.contactPhone||""} onChange={e=>setPf(v=>({...v,contactPhone:e.target.value}))} placeholder="010-0000-0000"/></Field>
            <Field label="담당자 이메일" style={{flex:1}}><input style={inp} value={pf.contactEmail||""} onChange={e=>setPf(v=>({...v,contactEmail:e.target.value}))} placeholder="name@agency.com"/></Field>
          </div>
          {/* 감독 / EPD */}
          <div style={{display:"flex",gap:12}}>
            <Field label="감독" style={{flex:1}}><input style={inp} value={pf.director||""} onChange={e=>setPf(v=>({...v,director:e.target.value}))}/></Field>
            <Field label="EPD" style={{flex:1}}><input style={inp} value={pf.epd||""} onChange={e=>setPf(v=>({...v,epd:e.target.value}))} placeholder="이름"/></Field>
          </div>
          {/* 조감독 / PD */}
          <div style={{display:"flex",gap:12}}>
            <Field label="조감독" style={{flex:1}}><input style={inp} value={pf.assistant||""} onChange={e=>setPf(v=>({...v,assistant:e.target.value}))} placeholder="이름"/></Field>
            <Field label="PD" style={{flex:1}}><input style={inp} value={pf.pd||""} onChange={e=>setPf(v=>({...v,pd:e.target.value}))}/></Field>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,color:C.sub,marginBottom:6}}>컬러 태그</div>
            <div style={{display:"flex",gap:6}}>{P_COLORS.map(c=><button key={c} onClick={()=>setPf(v=>({...v,color:c}))} style={{width:24,height:24,borderRadius:"50%",background:c,border:pf.color===c?"3px solid #1e293b":"2px solid transparent",cursor:"pointer"}}/>)}</div>
          </div>
          <Field label="기본 견적서 포맷">
            <div style={{display:"flex",gap:8}}>
              {[{val:"A",label:"📄 포맷 A — 표준형",desc:"대분류/중분류 계층 구조"},{val:"B",label:"📋 포맷 B — 상세형",desc:"부문별 소계 + 관리비/이윤 자동계산"}].map(opt=>(
                <label key={opt.val} style={{flex:1,display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer",padding:"10px 12px",borderRadius:10,border:`2px solid ${(pf.quoteFmt||"A")===opt.val?C.blue:C.border}`,background:(pf.quoteFmt||"A")===opt.val?C.blueLight:C.white}}>
                  <input type="radio" name="quoteFmt" value={opt.val} checked={(pf.quoteFmt||"A")===opt.val} onChange={()=>setPf(v=>({...v,quoteFmt:opt.val}))} style={{marginTop:2,accentColor:C.blue}}/>
                  <div><div style={{fontWeight:700,fontSize:13}}>{opt.label}</div><div style={{fontSize:11,color:C.faint,marginTop:2}}>{opt.desc}</div></div>
                </label>
              ))}
            </div>
          </Field>
          {user.canManageMembers && (
          <div style={{background:C.slateLight,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:4}}>💰 재무 문서 접근 허용 멤버</div>
            <div style={{fontSize:11,color:C.faint,marginBottom:8}}>미선택 시 '재무 열람' 권한자 전체 접근 가능</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {accounts.map(a=>{
                const allowed = pf.allowedFinanceMembers||[];
                const checked = allowed.includes(String(a.id));
                return (
                  <label key={a.id} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,padding:"4px 10px",borderRadius:99,background:checked?C.blueLight:C.white,border:`1px solid ${checked?C.blue:C.border}`}}>
                    <input type="checkbox" checked={checked} onChange={e=>setPf(v=>({...v,allowedFinanceMembers:e.target.checked?[...(v.allowedFinanceMembers||[]),String(a.id)]:(v.allowedFinanceMembers||[]).filter(id=>id!==String(a.id))}))} style={{accentColor:C.blue}}/>
                    {a.name} <span style={{color:C.faint}}>({a.role})</span>
                  </label>
                );
              })}
            </div>
            {(pf.allowedFinanceMembers||[]).length>0 && <button onClick={()=>setPf(v=>({...v,allowedFinanceMembers:[]}))} style={{marginTop:6,fontSize:11,color:C.faint,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>전체 허용으로 초기화</button>}
          </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <Btn danger sm onClick={()=>{if(window.confirm("프로젝트를 삭제하시겠습니까?\n모든 데이터가 사라집니다.")){deleteProjectById(selId);setEditProjModal(false);}}}>🗑️ 삭제</Btn>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={()=>setEditProjModal(false)}>취소</Btn>
              <Btn primary onClick={updateProject} disabled={!pf.name.trim()||!pf.client.trim()}>저장</Btn>
            </div>
          </div>
        </Modal>
        )}

        {addProjModal && (
        <Modal title="새 프로젝트" onClose={()=>setAddProjModal(false)}>
          <Field label="프로젝트명 *"><input style={inp} autoFocus value={pf.name} onChange={e=>setPf(v=>({...v,name:e.target.value}))} placeholder="ex. 나이키 여름 캠페인"/></Field>
          <div style={{display:"flex",gap:12}}>
            <Field label="클라이언트 *" half><input style={inp} value={pf.client} onChange={e=>setPf(v=>({...v,client:e.target.value}))} placeholder="브랜드명"/></Field>
            <Field label="대행사" half><input style={inp} value={pf.agency||""} onChange={e=>setPf(v=>({...v,agency:e.target.value}))} placeholder="대행사명"/></Field>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
            <Field label="포맷" half><select style={inp} value={pf.format} onChange={e=>setPf(v=>({...v,format:e.target.value}))}>{formats.map(f=><option key={f}>{f}</option>)}</select></Field>
            <Field label="시작일" half><input style={inp} type="date" value={pf.startDate||""} onChange={e=>setPf(v=>({...v,startDate:e.target.value}))}/></Field>
            <Field label="납품일" half><input style={inp} type="date" value={pf.due||""} onChange={e=>setPf(v=>({...v,due:e.target.value}))}/></Field>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
            <Field label="담당자명" half><input style={inp} value={pf.contactName||""} onChange={e=>setPf(v=>({...v,contactName:e.target.value}))} placeholder="홍길동 AE"/></Field>
            <Field label="담당자 연락처" half><input style={inp} value={pf.contactPhone||""} onChange={e=>setPf(v=>({...v,contactPhone:e.target.value}))} placeholder="010-0000-0000"/></Field>
            <Field label="담당자 이메일" half><input style={inp} value={pf.contactEmail||""} onChange={e=>setPf(v=>({...v,contactEmail:e.target.value}))} placeholder="name@agency.com"/></Field>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
            <Field label="감독" half><input style={inp} value={pf.director||""} onChange={e=>setPf(v=>({...v,director:e.target.value}))} placeholder="이름"/></Field>
            <Field label="EPD" half><input style={inp} value={pf.epd||""} onChange={e=>setPf(v=>({...v,epd:e.target.value}))} placeholder="이름"/></Field>
            <Field label="조감독" half><input style={inp} value={pf.assistant||""} onChange={e=>setPf(v=>({...v,assistant:e.target.value}))} placeholder="이름"/></Field>
            <Field label="PD" half><input style={inp} value={pf.pd||""} onChange={e=>setPf(v=>({...v,pd:e.target.value}))} placeholder="이름"/></Field>
          </div>
          <Field label="프로젝트 색상">
            <div style={{display:"flex",gap:8,marginTop:2}}>
              {P_COLORS.map(c=><div key={c} onClick={()=>setPf(v=>({...v,color:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",outline:pf.color===c?`3px solid ${c}`:"none",outlineOffset:2}}/>)}
            </div>
          </Field>
          <Field label="견적서 포맷">
            <div style={{display:"flex",gap:8}}>
              {[{val:"A",label:"📄 표준형",desc:"대분류/중분류 계층"},{val:"B",label:"📋 상세형",desc:"부문별 소계 + 관리비/이윤"}].map(opt=>(
                <label key={opt.val} style={{flex:1,display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer",padding:"10px 12px",borderRadius:10,border:`2px solid ${(pf.quoteFmt||"A")===opt.val?C.blue:C.border}`,background:(pf.quoteFmt||"A")===opt.val?C.blueLight:C.white}}>
                  <input type="radio" name="quoteFmtNew" value={opt.val} checked={(pf.quoteFmt||"A")===opt.val} onChange={()=>setPf(v=>({...v,quoteFmt:opt.val}))} style={{marginTop:2,accentColor:C.blue}}/>
                  <div><div style={{fontWeight:700,fontSize:13}}>{opt.label}</div><div style={{fontSize:11,color:C.faint,marginTop:2}}>{opt.desc}</div></div>
                </label>
              ))}
            </div>
          </Field>
          <div style={{background:C.blueLight,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.blue,marginBottom:4}}>
            💡 선택한 포맷에 맞는 견적 항목이 자동으로 추가됩니다.
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:12}}>
            <Btn onClick={()=>setAddProjModal(false)}>취소</Btn>
            <Btn primary onClick={createProject}>생성</Btn>
          </div>
        </Modal>
      )}
    </div>
    </AppContext.Provider>
  );
}

export default App;
