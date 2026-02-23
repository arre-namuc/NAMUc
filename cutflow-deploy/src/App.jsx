import { useState, useEffect, useRef } from "react";
import {
  subscribeProjects, saveProject, deleteProject,
  uploadVoucherFile, uploadFeedbackImage, subscribeCompany, saveCompany,
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
  { id:"m0", name:"최창일", role:"대표", pw:"namucreative02*100%", canViewFinance:true, canManageMembers:true, order:0 },
];

// ═══════════════════════════════════════════════════════════
// 프로젝트 워크플로우 템플릿
// ═══════════════════════════════════════════════════════════

// 역할 정의
const ROLE_OWNER   = "owner";    // 주도자 (책임자)
const ROLE_DRIVER  = "driver";   // 실행자
const ROLE_SUPPORT = "support";  // 보조

// 22단계 표준 워크플로우 템플릿
// 단계별 추천 태스크 목록 (선택사항 - 담당자가 직접 고를 수 있음)
const PHASE_SUGGESTIONS = {
  "s01": ["스터디 및 관점 도출","R&R 설정","기획방향 정리 및 아이데이션","1차 내부 공유","문서화","외주 발주 (그래픽/콘티)","문서 취합","전달"],
  "s02": ["스터디 및 관점 도출","R&R 설정","기획방향 정리 및 아이데이션","1차 내부 공유","수정 및 보완","2차 제안"],
  "s03": ["R&R 설정","스터디 및 관점 도출","레퍼런스 서칭 및 콘티 구상","스토리보드 발주","문서 정리","제안"],
  "s04": ["PPM 자료 준비","스태프 리스트 정리","로케이션 서칭","캐스팅 준비","PPM 문서 취합"],
  "s05": ["견적 항목 구성","단가 산출","실행예산서 작성","내부 검토"],
  "s06": ["PPM 미팅","견적 보고","클라이언트 피드백 수령","수정 반영"],
  "s07": ["스태프 확정","장비 발주","로케이션 확정","캐스팅 확정","촬영 콘티 확정","촬영 콜시트 작성"],
  "s08": ["확정 스태프 기준 예산 재산출","실행예산서 업데이트","내부 보고"],
  "s09": ["촬영 현장 세팅","촬영 진행","소스 확인 및 백업","촬영 결과 보고"],
  "s10": ["소스 정리 및 로깅","어셈블리 편집","파인 컷 편집","내부 검토"],
  "s11": ["색보정 작업","내부 검토"],
  "s12": ["시사 준비","클라이언트 시사","피드백 수령 및 정리","수정 방향 공유"],
  "s13": ["집행 내역 취합","결산서 1차 작성","내부 검토"],
  "s14": ["그래픽 소스 정리","그래픽 작업","내부 검토"],
  "s15": ["시사 준비","클라이언트 시사","피드백 수령 및 정리","수정 방향 결정"],
  "s16": ["피드백 반영 작업","내부 검토","수정 완료 보고"],
  "s17": ["시사 준비","클라이언트 시사","피드백 수령 및 정리"],
  "s18": ["2차 피드백 반영","내부 검토","수정 완료 보고"],
  "s19": ["최종 시사 준비","클라이언트 최종 시사","최종 컨펌 수령"],
  "s20": ["최종 집행 내역 취합","결산서 최종 작성","내부 결재"],
  "s21": ["납품 파일 최종 확인","납품 패키징","납품 전달","클라이언트 수령 확인"],
  "s22": ["투여 시간 집계","ROI 산출","결과 보고서 작성","사내 공유"],
};

const PROJECT_TEMPLATE = [
  {
    id:"s01", phase:"비딩", order:1,
    owner:"기획실장", driver:["기획실장","감독"], support:["PD"],
    stage:"PLANNING", steps: []
  },
  {
    id:"s02", phase:"기획", order:2,
    owner:"기획실장", driver:["기획실장","감독"], support:["PD"],
    stage:"PLANNING", steps: []
  },
  {
    id:"s03", phase:"트리트먼트", order:3,
    owner:"감독", driver:["감독"], support:["PD"],
    stage:"PRE", steps: []
  },
  {
    id:"s04", phase:"PPM 준비", order:4,
    owner:"EPD", driver:["감독","조감독"], support:["PD"],
    stage:"PRE", steps: []
  },
  {
    id:"s05", phase:"견적서 및 실행예산서 1차", order:5,
    owner:"PD", driver:["PD"], support:["경영지원"],
    stage:"PRE", steps: []
  },
  {
    id:"s06", phase:"PPM 및 견적 보고", order:6,
    owner:"EPD", driver:["EPD","PD"], support:["감독"],
    stage:"PRE", steps: []
  },
  {
    id:"s07", phase:"촬영 준비", order:7,
    owner:"PD", driver:["PD","조감독"], support:["감독"],
    stage:"PRODUCTION", steps: []
  },
  {
    id:"s08", phase:"실행예산서 2차 (내부)", order:8,
    owner:"PD", driver:["PD"], support:["경영지원"],
    stage:"PRODUCTION", steps: []
  },
  {
    id:"s09", phase:"PRODUCTION", order:9,
    owner:"감독", driver:["감독","조감독"], support:["PD"],
    stage:"PRODUCTION", steps: []
  },
  {
    id:"s10", phase:"편집", order:10,
    owner:"감독", driver:["감독"], support:["PD"],
    stage:"POST", steps: []
  },
  {
    id:"s11", phase:"색보정", order:11,
    owner:"감독", driver:["감독"], support:["PD"],
    stage:"POST", steps: []
  },
  {
    id:"s12", phase:"편집 시사", order:12,
    owner:"감독", driver:["PD"], support:["감독"],
    stage:"POST", steps: []
  },
  {
    id:"s13", phase:"실행 결산서 1차", order:13,
    owner:"PD", driver:["PD"], support:["경영지원"],
    stage:"POST", steps: []
  },
  {
    id:"s14", phase:"그래픽 작업 1차", order:14,
    owner:"감독", driver:["AI작업자","감독"], support:["PD"],
    stage:"POST", steps: []
  },
  {
    id:"s15", phase:"1차 시사", order:15,
    owner:"감독", driver:["PD"], support:["감독"],
    stage:"POST", steps: []
  },
  {
    id:"s16", phase:"그래픽 작업 2차", order:16,
    owner:"PD", driver:["AI작업자","감독"], support:["PD"],
    stage:"POST", steps: []
  },
  {
    id:"s17", phase:"2차 시사", order:17,
    owner:"PD", driver:["PD"], support:["감독"],
    stage:"POST", steps: []
  },
  {
    id:"s18", phase:"그래픽 작업 3차", order:18,
    owner:"PD", driver:["AI작업자","감독"], support:["PD"],
    stage:"POST", steps: []
  },
  {
    id:"s19", phase:"최종 시사", order:19,
    owner:"PD", driver:["PD"], support:["감독","EPD"],
    stage:"POST", steps: []
  },
  {
    id:"s20", phase:"결산서 2차", order:20,
    owner:"PD", driver:["PD"], support:["경영지원"],
    stage:"ONAIR", steps: []
  },
  {
    id:"s21", phase:"납품", order:21,
    owner:"PD", driver:["PD","AI작업자"], support:["감독"],
    stage:"ONAIR", steps: []
  },
  {
    id:"s22", phase:"프로젝트 최종 보고", order:22,
    owner:"EPD", driver:["PD"], support:["경영지원"],
    stage:"ONAIR", steps: []
  },
];

// 템플릿에서 프로젝트 태스크 생성
function generateTasksFromTemplate(projectId, projectMembers) {
  const tasks = [];
  PROJECT_TEMPLATE.forEach(phase => {
    phase.steps.forEach(step => {
      tasks.push({
        id: "t" + Date.now() + Math.random().toString(36).slice(2,6),
        phaseId: phase.id,
        phase: phase.phase,
        title: step.name,
        role: "",
        assignee: "",
        assignees: [],
        stage: phase.order <= 3 ? "PLANNING" : phase.order <= 6 ? "PRE" : phase.order <= 9 ? "PRODUCTION" : phase.order <= 21 ? "POST" : "ONAIR",
        priority: "보통",
        status: "대기",
        due: "",
        desc: "",
        repeatCount: 0,
        timeSpent: 0,
      });
    });
  });
  return tasks;
}

function findMemberByRole(members, role) {
  if(!members) return "";
  const m = members.find(m => m.role === role || m.role?.includes(role));
  return m ? m.name : "";
}

// ═══════════════════════════════════════════════════════════
// 프로덕션 상수
// ═══════════════════════════════════════════════════════════
const STAGES = {
  "PLANNING":   { color:C.slate,  bg:C.slateLight, icon:"📋", label:"PLANNING" },
  "PRE":        { color:C.purple, bg:C.purpleLight, icon:"🎨", label:"PRE" },
  "PRODUCTION": { color:C.amber,  bg:C.amberLight,  icon:"🎬", label:"PRODUCTION" },
  "POST":       { color:C.blue,   bg:C.blueLight,   icon:"✂️", label:"POST" },
  "ONAIR":      { color:C.green,  bg:C.greenLight,  icon:"✅", label:"ONAIR" },
};
const TASK_TYPES = ["내부","고객사","협력사"];
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
  { category:"PRE", groups:[
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
  { category:"PRODUCTION", groups:[
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
    stage:"PRODUCTION", createdAt:"2026-01-10",
    tasks:[
      {id:"t1",title:"브랜드 방향성 확정",type:"스크립트",assignee:"",stage:"ONAIR",due:"2026-01-20",priority:"높음",desc:""},
      {id:"t2",title:"콘티 1차 시안",type:"콘티",assignee:"",stage:"ONAIR",due:"2026-02-05",priority:"높음",desc:""},
      {id:"t3",title:"촬영지 헌팅",type:"로케이션",assignee:"",stage:"ONAIR",due:"2026-02-15",priority:"보통",desc:""},
      {id:"t4",title:"D-day 촬영",type:"PRODUCTION",assignee:"",stage:"PRODUCTION",due:"2026-03-10",priority:"긴급",desc:""},
      {id:"t5",title:"1차 편집",type:"편집",assignee:"",stage:"PLANNING",due:"2026-03-25",priority:"높음",desc:""},
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
        {id:"v2",name:"촬영 스튜디오",vendor:"(주)스튜디오101",type:"세금계산서",date:"2026-03-10",amount:2500000,category:"PRODUCTION",group:"촬영 장소",number:"",note:"",files:[]},
        {id:"v3",name:"카메라 렌탈",vendor:"씨네렌탈",type:"영수증",date:"2026-03-10",amount:1800000,category:"PRODUCTION",group:"촬영 장비",number:"",note:"",files:[]},
      ]
    },
    settlementDate:null, settled:false,
  },
  {
    id:"p2", name:"현대 수소전기차 다큐", client:"현대자동차", color:"#7c3aed",
    format:"다큐멘터리형", due:"2026-05-30", director:"이준혁", pd:"박민서",
    stage:"PRE", createdAt:"2026-02-01",
    tasks:[
      {id:"t6",title:"다큐 기획안 작성",type:"스크립트",assignee:"",stage:"ONAIR",due:"2026-02-10",priority:"높음",desc:""},
      {id:"t7",title:"인터뷰 대상 섭외",type:"캐스팅",assignee:"",stage:"PRE",due:"2026-03-01",priority:"보통",desc:""},
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
const isOverdue = t => t.stage!=="ONAIR" && t.due && t.due < todayStr();

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
// 단계(페이즈)별 뷰 - 22단계 워크플로우
function PhaseFeedbackBadge({ feedbacks, phaseId }) {
  const phaseFbs = (feedbacks||[]).filter(fb=>fb.phaseId===phaseId);
  const openFbs  = phaseFbs.filter(fb=>fb.taskStatus!=="done");
  if(phaseFbs.length===0) return null;
  if(openFbs.length>0) return (
    <span style={{fontSize:9,padding:"2px 7px",borderRadius:99,
      background:"#fef3c7",color:"#d97706",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
      💬 피드백 {openFbs.length}
    </span>
  );
  return (
    <span style={{fontSize:9,padding:"2px 7px",borderRadius:99,
      background:"#f0fdf4",color:"#16a34a",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
      완료
    </span>
  );
}

function PhaseFeedbacks({ feedbacks, phaseId }) {
  const phaseFbs = (feedbacks||[]).filter(fb=>fb.phaseId===phaseId);
  if(phaseFbs.length===0) return null;
  return (
    <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #f1f5f9"}}>
      <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:6,paddingLeft:4}}>
        💬 연결된 피드백 ({phaseFbs.length})
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {phaseFbs.map(fb=>{
          const isDone = fb.taskStatus==="done";
          return (
            <div key={fb.id} style={{display:"flex",alignItems:"flex-start",gap:8,
              padding:"7px 10px",borderRadius:8,
              background:isDone?"#f0fdf4":"#fffbeb",
              border:"1px solid " + (isDone?"#86efac":"#fcd34d")}}>
              <span style={{fontSize:11,flexShrink:0,marginTop:1}}>{isDone?"✅":"💬"}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:"#1e293b",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {fb.title}
                </div>
                <div style={{fontSize:10,color:"#94a3b8",marginTop:1}}>
                  {fb.receivedDate}
                  {(fb.assignees||[]).length>0 ? " · " + fb.assignees.join(", ") : ""}
                </div>
              </div>
              <span style={{fontSize:9,padding:"2px 6px",borderRadius:99,flexShrink:0,
                background:isDone?"#dcfce7":"#fef9c3",
                color:isDone?"#16a34a":"#ca8a04",fontWeight:700}}>
                {isDone?"완료":"처리중"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhaseRoleDisplay({ projectRoles, phase }) {
  const pr = (projectRoles||{})[phase.id] || {};
  const owner  = pr.owner  || "";
  const driver = pr.driver || "";
  if(!owner && !driver) return null;
  return (
    <>
      {owner && <span style={{fontSize:10,color:"#94a3b8"}}>주도: <strong style={{color:"#d97706"}}>{owner}</strong></span>}
      {owner && driver && <span style={{fontSize:10,color:"#94a3b8",margin:"0 4px"}}>|</span>}
      {driver && <span style={{fontSize:10,color:"#94a3b8"}}>실행: <strong style={{color:"#2563eb"}}>{driver}</strong></span>}
    </>
  );
}


function PhaseView({ tasks, feedbacks, template, user, accounts, onEdit, onUpdateTask, onAddTask, onAddSubTask, onDeleteTask, onUpdatePhaseRole, projectRoles }) {
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [roleForm, setRoleForm] = useState({owner:"", driver:""});
  const today = todayStr();
  const openRoleEdit = (e, phase) => { e.stopPropagation(); setRoleModal(phase); };
  const saveRole = () => { if(onUpdatePhaseRole) onUpdatePhaseRole(roleModal.id, roleForm); setRoleModal(null); };
  const memberNames = (accounts||[]).map(a=>a.name);
  const STATUS_COLOR = {"대기":"#94a3b8","진행중":"#2563eb","컨펌요청":"#d97706","완료":"#16a34a","보류":"#ef4444"};
  const STATUS_BG    = {"대기":"#f8fafc","진행중":"#eff6ff","컨펌요청":"#fffbeb","완료":"#f0fdf4","보류":"#fff1f2"};
  const statusColor = s => STATUS_COLOR[s] || "#94a3b8";
  const statusBg    = s => STATUS_BG[s]    || "#f8fafc";
  const STATUS_OPTIONS = ["대기","진행중","완료","보류"];

  const phaseProgress = (phaseId) => {
    const pt = tasks.filter(t=>t.phaseId===phaseId);
    if(pt.length===0) return {total:0, done:0, pct:0};
    const done = pt.filter(t=>t.status==="완료").length;
    return {total:pt.length, done, pct:Math.round(done/pt.length*100)};
  };
  const totalProgress = (() => {
    const all = tasks.length;
    if(!all) return 0;
    return Math.round(tasks.filter(t=>t.status==="완료").length / all * 100);
  })();
  const activePhase = (() => {
    for(const phase of template) {
      const phaseTasks = tasks.filter(t=>t.phaseId===phase.id);
      const allDone = phaseTasks.length>0 && phaseTasks.every(t=>t.status==="완료");
      if(phaseTasks.length>0 && !allDone) return phase.id;
    }
    return template[0]?.id;
  })();

  return (
    <>
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      <div style={{background:"#f8fafc",borderRadius:12,padding:"14px 18px",marginBottom:16,border:"1px solid #e2e8f0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#1e293b"}}>프로젝트 전체 진행률</span>
          <span style={{fontSize:13,fontWeight:800,color:"#2563eb"}}>{totalProgress}%</span>
        </div>
        <div style={{height:8,background:"#e2e8f0",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:totalProgress+"%",background:"#2563eb",borderRadius:99}}/>
        </div>
      </div>

      {(() => {
        const STAGE_GROUPS = [
          { key:"PLANNING",  label:"PLANNING",  color:"#7c3aed", bg:"#f5f3ff", border:"#ddd6fe", phases:["s01","s02"] },
          { key:"PRE",       label:"PRE",        color:"#0891b2", bg:"#ecfeff", border:"#a5f3fc", phases:["s03","s04","s05","s06"] },
          { key:"PRODUCTION",label:"PRODUCTION", color:"#d97706", bg:"#fffbeb", border:"#fde68a", phases:["s07","s08","s09"] },
          { key:"POST",      label:"POST",       color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe", phases:["s10","s11","s12","s13","s14","s15","s16","s17","s18","s19"] },
          { key:"ONAIR",     label:"ON AIR",     color:"#16a34a", bg:"#f0fdf4", border:"#bbf7d0", phases:["s20","s21","s22"] },
        ];
        return STAGE_GROUPS.map(group => {
          const groupPhases = template.filter(p=>group.phases.includes(p.id));
          const groupTasks = tasks.filter(t=>groupPhases.some(p=>p.id===t.phaseId));
          const groupDone = groupTasks.filter(t=>t.status==="완료").length;
          const groupPct = groupTasks.length>0 ? Math.round(groupDone/groupTasks.length*100) : 0;
          return (
            <div key={group.key} style={{marginBottom:16}}>
              {/* 스테이지 헤더 */}
              <div style={{display:"flex",alignItems:"center",gap:10,
                padding:"8px 14px",borderRadius:"8px 8px 0 0",
                background:group.bg,border:`1px solid ${group.border}`,borderBottom:"none"}}>
                <span style={{fontSize:11,fontWeight:800,color:group.color,
                  letterSpacing:1.5,textTransform:"uppercase"}}>{group.label}</span>
                <div style={{flex:1,height:4,background:group.border,borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:groupPct+"%",background:group.color,borderRadius:99,transition:"width .3s"}}/>
                </div>
                <span style={{fontSize:11,fontWeight:700,color:group.color}}>
                  {groupDone}/{groupTasks.length}
                </span>
              </div>
              {/* 해당 스테이지 단계들 */}
              <div style={{border:`1px solid ${group.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",overflow:"hidden"}}>
                {groupPhases.map((phase) => {
        const prog = phaseProgress(phase.id);
        const isActive = phase.id === activePhase;
        const isOpen = expandedPhase === phase.id || (isActive && expandedPhase === null);
        const phaseTasks = tasks.filter(t=>t.phaseId===phase.id);
        const isDone = prog.total>0 && prog.pct===100;
        const hasAny = prog.total>0;
        return (
          <div key={phase.id} style={{borderLeft:"3px solid " + (isDone?"#16a34a":isActive?"#2563eb":"#e2e8f0"),marginBottom:2,background:"#fff",borderRadius:"0 8px 8px 0"}}>
            <div onClick={()=>setExpandedPhase(isOpen?-1:phase.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",cursor:"pointer",userSelect:"none",
                background:isActive?"#eff6ff":isDone?"#f0fdf4":"transparent",borderRadius:"0 8px 8px 0"}}>
              <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,
                background:isDone?"#16a34a":isActive?"#2563eb":"#e2e8f0",
                color:(isDone||isActive)?"#fff":"#94a3b8",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800}}>
                {isDone?"✓":phase.order}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:13,fontWeight:700,color:isDone?"#16a34a":isActive?"#2563eb":"#334155"}}>
                    {phase.phase}
                  </span>
                  {isActive&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:99,background:"#2563eb",color:"#fff",fontWeight:700}}>진행중</span>}
                </div>
                <div style={{display:"flex",gap:8,marginTop:2,alignItems:"center",flexWrap:"wrap"}}>
                  <PhaseRoleDisplay projectRoles={projectRoles} phase={phase}/>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                {hasAny ? (
                  <div style={{fontSize:11,fontWeight:700,color:isDone?"#16a34a":isActive?"#2563eb":"#64748b"}}>
                    {prog.done + "/" + prog.total}
                  </div>
                ) : (
                  <span style={{fontSize:10,color:"#cbd5e1"}}>미시작</span>
                )}
              </div>
              <PhaseFeedbackBadge feedbacks={feedbacks} phaseId={phase.id}/>
              <button onClick={e=>openRoleEdit(e,phase)}
                style={{border:"1px solid #e2e8f0",background:"#f8fafc",borderRadius:6,
                  padding:"2px 8px",fontSize:10,color:"#64748b",cursor:"pointer",flexShrink:0}}>
                역할편집
              </button>
              <span style={{color:"#cbd5e1",fontSize:12,flexShrink:0}}>{isOpen?"▲":"▼"}</span>
            </div>

            {isOpen && (
              <div style={{padding:"0 14px 12px 14px"}}>
                {phaseTasks.length===0 ? (
                  <div style={{padding:"10px 0",borderTop:"1px solid #f1f5f9",textAlign:"center"}}>
                    <button type="button" onClick={e=>{e.stopPropagation();onAddTask&&onAddTask(phase.id,phase.phase);}}
                      style={{display:"inline-flex",alignItems:"center",gap:6,
                        padding:"7px 16px",borderRadius:8,border:"1.5px dashed #cbd5e1",
                        background:"#f8fafc",color:"#94a3b8",fontSize:12,
                        cursor:"pointer",fontWeight:600,transition:"all .15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#2563eb";e.currentTarget.style.color="#2563eb";e.currentTarget.style.background="#eff6ff";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="#cbd5e1";e.currentTarget.style.color="#94a3b8";e.currentTarget.style.background="#f8fafc";}}>
                      <span style={{fontSize:16,lineHeight:1}}>＋</span> 태스크 추가
                    </button>
                  </div>
                ) : (
                  <div style={{borderTop:"1px solid #f1f5f9",paddingTop:8,display:"flex",flexDirection:"column",gap:2}}>
                    {/* 컬럼 헤더 */}
                    <div style={{display:"grid",gridTemplateColumns:"16px 20px 1fr 110px 100px 90px 28px 28px 28px",
                      padding:"3px 8px",fontSize:10,fontWeight:700,color:"#94a3b8",gap:6}}>
                      <span/><span/><span>태스크</span><span>담당자</span><span>상태</span><span>마감일</span><span/><span/><span/>
                    </div>
                    {/* 계층 렌더링 */}
                    {(()=>{
                      const roots = phaseTasks.filter(t=>!t.parentId);
                      const children = (pid) => phaseTasks.filter(t=>t.parentId===pid);
                      const renderTask = (t, depth=0) => {
                        const kids = children(t.id);
                        const hasKids = kids.length > 0;
                        return (
                          <div key={t.id}>
                            <div style={{display:"grid",
                              gridTemplateColumns:"16px 20px 1fr 110px 100px 90px 28px 28px 28px",
                              padding:"6px 8px",borderRadius:8,gap:6,alignItems:"center",
                              marginLeft: depth * 20,
                              background:t.status==="완료"?"#f8fafc":"#fff",
                              border:`1px solid ${t.status==="완료"?"#f1f5f9":"#e2e8f0"}`,
                              marginBottom:2,
                              borderLeft: depth>0 ? "3px solid #bfdbfe" : "3px solid transparent",
                              opacity:t.status==="완료"?.65:1}}>

                              {/* 들여쓰기 커넥터 */}
                              <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {depth>0 && <span style={{fontSize:9,color:"#cbd5e1"}}>└</span>}
                              </div>

                              {/* 체크박스 */}
                              <input type="checkbox" checked={t.status==="완료"}
                                onChange={e=>onUpdateTask({...t,status:e.target.checked?"완료":"진행중"})}
                                style={{accentColor:"#16a34a",cursor:"pointer"}}/>

                              {/* 태스크명 + 뱃지 */}
                              <div onClick={()=>onEdit(t)} style={{cursor:"pointer",minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:depth===0?600:500,
                                  color:t.status==="완료"?"#94a3b8":"#1e293b",
                                  textDecoration:t.status==="완료"?"line-through":"none",
                                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                  {hasKids && <span style={{fontSize:9,color:"#94a3b8",marginRight:4}}>▸ {kids.length}</span>}
                                  {t.title}
                                </div>
                                <div style={{display:"flex",gap:4,marginTop:2,flexWrap:"wrap"}}>
                                  {(t.comments||[]).length>0&&(
                                    <span style={{fontSize:9,padding:"1px 5px",borderRadius:99,
                                      background:"#f0fdf4",color:"#16a34a",border:"1px solid #86efac",fontWeight:700}}>
                                      💬{t.comments.length}
                                    </span>
                                  )}
                                  {(t.meetings||[]).length>0&&(
                                    <span style={{fontSize:9,padding:"1px 5px",borderRadius:99,
                                      background:"#f5f3ff",color:"#7c3aed",border:"1px solid #ddd6fe",fontWeight:700}}>
                                      📅{t.meetings.length}
                                    </span>
                                  )}
                                  {(t.links||[]).filter(l=>l.url).map((lk,li)=>(
                                    <a key={li} href={lk.url} target="_blank" rel="noreferrer"
                                      onClick={e=>e.stopPropagation()}
                                      style={{fontSize:9,color:"#2563eb",background:"#eff6ff",
                                        padding:"1px 6px",borderRadius:99,textDecoration:"none",
                                        border:"1px solid #bfdbfe",fontWeight:600}}>
                                      🔗{lk.label||"링크"}
                                    </a>
                                  ))}
                                </div>
                              </div>

                              {/* 담당자 */}
                              <div style={{display:"flex",alignItems:"center",gap:3,flexWrap:"wrap"}}>
                                {(t.assignees&&t.assignees.length>0)
                                  ? t.assignees.slice(0,2).map(n=>(
                                      <span key={n} style={{display:"flex",alignItems:"center",gap:2,fontSize:10,
                                        background:"#eff6ff",color:"#2563eb",padding:"1px 6px",borderRadius:99,fontWeight:600}}>
                                        <Avatar name={n} size={14}/>{n}
                                      </span>
                                    ))
                                  : t.assignee
                                    ? <span style={{display:"flex",alignItems:"center",gap:2,fontSize:11,color:"#475569"}}>
                                        <Avatar name={t.assignee} size={16}/>{t.assignee}
                                      </span>
                                    : <span style={{fontSize:11,color:"#94a3b8"}}>-</span>
                                }
                              </div>

                              {/* 상태 */}
                              <select value={t.status||"대기"}
                                onChange={e=>onUpdateTask({...t,status:e.target.value})}
                                onClick={e=>e.stopPropagation()}
                                style={{fontSize:10,padding:"2px 5px",borderRadius:6,
                                  border:"1px solid "+statusColor(t.status||"대기")+"40",
                                  background:statusBg(t.status||"대기"),
                                  color:statusColor(t.status||"대기"),
                                  fontWeight:600,cursor:"pointer",outline:"none"}}>
                                {STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}
                              </select>

                              {/* 마감일 */}
                              <div style={{fontSize:10,color:t.due&&t.due<today?"#ef4444":"#64748b",
                                fontWeight:t.due&&t.due<today?700:400,whiteSpace:"nowrap",lineHeight:1.3}}>
                                {t.due
                                  ? <>{t.due.slice(5,10).replace("-","/")}
                                      {t.due.length>10&&<div style={{fontSize:9,color:"#94a3b8"}}>{t.due.slice(11,16)}</div>}
                                    </>
                                  : <span style={{color:"#cbd5e1"}}>-</span>}
                              </div>

                              {/* 📅 날짜 편집 */}
                              <div style={{position:"relative",width:24,height:24}}>
                                <span style={{fontSize:13,cursor:"pointer",userSelect:"none",lineHeight:"24px",display:"block",textAlign:"center"}}>📅</span>
                                <input type="datetime-local" value={t.due||""}
                                  onChange={e=>onUpdateTask({...t,due:e.target.value})}
                                  onClick={e=>e.stopPropagation()}
                                  style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
                              </div>

                              {/* ＋ 하위 태스크 추가 */}
                              {depth===0 && (
                                <button type="button"
                                  title="하위 태스크 추가"
                                  onClick={e=>{e.stopPropagation();onAddSubTask&&onAddSubTask(t);}}
                                  style={{width:24,height:24,borderRadius:6,border:"1px solid #bfdbfe",
                                    background:"#eff6ff",color:"#2563eb",fontSize:14,fontWeight:700,
                                    cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                                    lineHeight:1,flexShrink:0}}
                                  onMouseEnter={e=>e.currentTarget.style.background="#dbeafe"}
                                  onMouseLeave={e=>e.currentTarget.style.background="#eff6ff"}>
                                  ＋
                                </button>
                              )}
                              {depth>0 && <div style={{width:24}}/>}

                              {/* − 삭제 */}
                              <button type="button"
                                onClick={e=>{e.stopPropagation();onDeleteTask&&onDeleteTask(t.id);}}
                                style={{width:24,height:24,borderRadius:6,border:"1px solid #fca5a5",
                                  background:"#fff1f2",color:"#ef4444",fontSize:15,fontWeight:700,
                                  cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                                  lineHeight:1,flexShrink:0}}>−</button>
                            </div>
                            {/* 하위 태스크 재귀 렌더링 */}
                            {kids.map(kid=>renderTask(kid, depth+1))}
                          </div>
                        );
                      };
                      return roots.map(t=>renderTask(t));
                    })()}

                    {/* ＋ 태스크 추가 버튼 */}
                    <button type="button"
                      onClick={e=>{e.stopPropagation();onAddTask&&onAddTask(phase.id,phase.phase);}}
                      style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",
                        borderRadius:8,border:"1.5px dashed #cbd5e1",background:"#f8fafc",
                        color:"#94a3b8",fontSize:11,cursor:"pointer",fontWeight:600,
                        marginTop:4,transition:"all .15s",alignSelf:"flex-start"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#2563eb";e.currentTarget.style.color="#2563eb";e.currentTarget.style.background="#eff6ff";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="#cbd5e1";e.currentTarget.style.color="#94a3b8";e.currentTarget.style.background="#f8fafc";}}>
                      <span style={{fontSize:14,lineHeight:1}}>＋</span> 태스크 추가
                    </button>
                  </div>
                )}
                <PhaseFeedbacks feedbacks={feedbacks} phaseId={phase.id}/>
              </div>
            )}
          </div>
        );
        })}
              </div>
            </div>
          );
        });
      })()} 
    </div>

    {roleModal && (
      <Modal title={"역할 편집 - " + (roleModal.phase||"")} onClose={()=>setRoleModal(null)}>
        <Field label="주도자 (Owner)">
          <select style={inp} value={roleForm.owner} onChange={e=>setRoleForm(v=>({...v,owner:e.target.value}))}>
            <option value="">- 선택 -</option>
            {["EPD","기획실장","PD","감독","조감독","AE","AI작업자","경영지원","대표"].map(r=>(
              <option key={r} value={r}>{r}</option>
            ))}
            {memberNames.map(n=>(
              <option key={"m_"+n} value={n}>{n}</option>
            ))}
          </select>
        </Field>
        <Field label="실행자 (Driver) - 쉼표로 구분">
          <input style={inp} value={roleForm.driver}
            onChange={e=>setRoleForm(v=>({...v,driver:e.target.value}))}
            placeholder="예: 감독, 조감독"/>
        </Field>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
          <Btn onClick={()=>setRoleModal(null)}>취소</Btn>
          <Btn primary onClick={saveRole}>저장</Btn>
        </div>
      </Modal>
    )}
    </>
  );
}


function TaskDetailPanel({ task, accounts, user, onClose, onUpdate, onDelete, onNotify, projName, projTasks }) {
  if (!task) return null;

  const STATUS_COLOR = {"대기":"#94a3b8","진행중":"#2563eb","컨펌요청":"#d97706","완료":"#16a34a","보류":"#ef4444"};
  const STATUS_BG    = {"대기":"#f1f5f9","진행중":"#eff6ff","완료":"#f0fdf4","보류":"#fffbeb"};
  const PRIO_COLOR   = {"긴급":"#ef4444","높음":"#f59e0b","보통":"#64748b","낮음":"#94a3b8"};

  const set = (patch) => onUpdate({...task, ...patch});

  // 담당자 전달 알림
  const notifyAssign = (names) => {
    if (!onNotify) return;
    names.forEach(name => {
      if (name === user.name) return;
      onNotify({
        id: "n" + Date.now() + Math.random().toString(36).slice(2,5),
        type: "assign",
        label: "태스크 전달",
        to: name,
        from: user.name,
        taskId: task.id,
        fbTitle: task.title,
        projName: projName||"",
        createdAt: new Date().toISOString(),
        urgent: false,
      });
    });
  };

  // 컨펌 요청 — 전달자(assignedBy) 또는 생성자(createdBy)에게
  const notifyConfirmRequest = () => {
    if (!onNotify) return;
    const to = task.assignedBy || task.createdBy;
    if (!to || to === user.name) return;
    onNotify({
      id: "n" + Date.now() + Math.random().toString(36).slice(2,5),
      type: "confirm_req",
      label: "컨펌 요청",
      to,
      from: user.name,
      taskId: task.id,
      fbTitle: task.title,
      projName: projName||"",
      createdAt: new Date().toISOString(),
      urgent: true,
    });
    // 댓글에 자동 기록
    const c = {
      id:"c"+Date.now(), author:user.name,
      text:"📋 컨펌을 요청했습니다.",
      createdAt:new Date().toISOString()
    };
    set({comments:[...(task.comments||[]), c]});
  };

  // 완료 시 생성자에게 알림
  const notifyComplete = () => {
    if (!onNotify || !task.createdBy || task.createdBy === user.name) return;
    onNotify({
      id: "n" + Date.now() + Math.random().toString(36).slice(2,5),
      type: "done",
      label: "태스크 완료",
      to: task.createdBy,
      from: user.name,
      taskId: task.id,
      fbTitle: task.title,
      projName: projName||"",
      createdAt: new Date().toISOString(),
      urgent: false,
    });
  };

  const addMeeting = () => {
    const m = {id:"m"+Date.now(), title:"", date:"", attendees:"", link:"", memo:""};
    set({meetings:[...(task.meetings||[]), m]});
  };
  const updateMeeting = (id, patch) => {
    set({meetings:(task.meetings||[]).map(m=>m.id===id?{...m,...patch}:m)});
  };
  const deleteMeeting = (id) => {
    set({meetings:(task.meetings||[]).filter(m=>m.id!==id)});
  };

  const addComment = (text) => {
    const c = {id:"c"+Date.now(), author:user.name, text, createdAt:new Date().toISOString()};
    set({comments:[...(task.comments||[]), c]});
  };
  const delComment = (cid) => set({comments:(task.comments||[]).filter(c=>c.id!==cid)});

  const toggleAssignee = (name) => {
    const cur = task.assignees||[];
    set({assignees: cur.includes(name) ? cur.filter(n=>n!==name) : [...cur, name]});
  };

  const phaseLabel = PROJECT_TEMPLATE.find(p=>p.id===task.phaseId)?.phase;

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.2)",zIndex:200}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:460,background:"#fff",
        boxShadow:"-6px 0 32px rgba(0,0,0,.13)",zIndex:201,
        display:"flex",flexDirection:"column",overflowY:"auto"}}>

        {/* ── 헤더: 태스크명 편집 ── */}
        <div style={{padding:"20px 20px 16px",borderBottom:"1px solid #f1f5f9",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            {/* 완료 체크 */}
            <input type="checkbox" checked={task.status==="완료"}
              onChange={e=>set({status:e.target.checked?"완료":"진행중"})}
              style={{width:18,height:18,accentColor:"#16a34a",cursor:"pointer",flexShrink:0}}/>
            {/* 태스크명 인라인 편집 */}
            <input value={task.title||""} onChange={e=>set({title:e.target.value})}
              style={{flex:1,fontSize:16,fontWeight:700,border:"none",
                outline:"none",background:"transparent",fontFamily:"inherit",
                textDecoration:task.status==="완료"?"line-through":"none",
                color:task.status==="완료"?"#94a3b8":"#1e293b"}}/>
            <button onClick={onClose}
              style={{width:28,height:28,borderRadius:7,border:"1px solid #e2e8f0",
                background:"#f8fafc",color:"#94a3b8",fontSize:16,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
          </div>
          {/* 메타 정보 */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {phaseLabel&&(
              <span style={{fontSize:11,color:"#7c3aed",background:"#f5f3ff",
                padding:"2px 8px",borderRadius:99,fontWeight:600}}>📌 {phaseLabel}</span>
            )}
            <span style={{fontSize:11,color:STAGES[task.stage]?.color||"#64748b",
              background:STAGES[task.stage]?.bg||"#f1f5f9",
              padding:"2px 8px",borderRadius:99,fontWeight:600}}>{task.stage||"PLANNING"}</span>
            <select value={task.type||"내부"} onChange={e=>set({type:e.target.value})}
              style={{fontSize:11,border:"1px solid #e2e8f0",borderRadius:99,padding:"2px 8px",
                color:"#64748b",background:"#f8fafc",cursor:"pointer",outline:"none"}}>
              {["내부","고객사","협력사"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{flex:1,padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:0}}>

          {/* ── 담당자 + 전달 ── */}
          <Section label="담당자">
            {/* 담당자 선택 */}
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
              {accounts.map(a=>{
                const sel=(task.assignees||[]).includes(a.name);
                return (
                  <button key={a.id} type="button" onClick={()=>toggleAssignee(a.name)}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",
                      borderRadius:99,cursor:"pointer",fontSize:12,border:"none",
                      background:sel?"#eff6ff":"#f1f5f9",
                      color:sel?"#2563eb":"#475569",fontWeight:sel?700:400,
                      outline:sel?"2px solid #2563eb":"none",transition:"all .12s"}}>
                    <Avatar name={a.name} size={17}/>
                    {a.name}{sel&&<span style={{fontSize:10,marginLeft:1}}>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* 전달 영역 - 항상 표시 */}
            <div style={{background:"#f8fafc",borderRadius:10,padding:"12px 14px",
              border:"1px solid #e2e8f0"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:8,fontWeight:600}}>
                📨 담당자에게 태스크 전달
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                {/* 수신자 표시 */}
                <div style={{flex:1,display:"flex",gap:4,flexWrap:"wrap",minWidth:0}}>
                  {(task.assignees||[]).filter(n=>n!==user.name).length > 0
                    ? (task.assignees||[]).filter(n=>n!==user.name).map(n=>(
                        <span key={n} style={{display:"flex",alignItems:"center",gap:3,
                          fontSize:11,fontWeight:600,color:"#2563eb",
                          background:"#eff6ff",padding:"3px 8px",borderRadius:99}}>
                          <Avatar name={n} size={14}/>{n}
                        </span>
                      ))
                    : <span style={{fontSize:11,color:"#94a3b8"}}>위에서 담당자를 선택하세요</span>
                  }
                </div>
                {/* 전달 버튼 */}
                <button type="button"
                  disabled={(task.assignees||[]).filter(n=>n!==user.name).length===0}
                  onClick={()=>{
                    const others=(task.assignees||[]).filter(n=>n!==user.name);
                    notifyAssign(others);
                    const names=others.join(", ");
                    const c={id:"c"+Date.now(),author:user.name,
                      text:"📨 "+names+"에게 태스크를 전달했습니다.",
                      createdAt:new Date().toISOString(),isSystem:true};
                    set({assignedBy:user.name,assignedAt:new Date().toISOString(),
                      comments:[...(task.comments||[]),c]});
                  }}
                  style={{flexShrink:0,padding:"8px 16px",borderRadius:8,border:"none",
                    cursor:(task.assignees||[]).filter(n=>n!==user.name).length===0?"not-allowed":"pointer",
                    fontSize:12,fontWeight:700,transition:"all .12s",
                    background:(task.assignees||[]).filter(n=>n!==user.name).length===0?"#e2e8f0":"#2563eb",
                    color:(task.assignees||[]).filter(n=>n!==user.name).length===0?"#94a3b8":"#fff"}}>
                  📨 전달하기
                </button>
              </div>
              {/* 마지막 전달 기록 */}
              {task.assignedAt&&(
                <div style={{marginTop:8,fontSize:11,color:"#94a3b8",
                  borderTop:"1px solid #e2e8f0",paddingTop:6}}>
                  마지막 전달: <strong>{task.assignedBy}</strong> · {new Date(task.assignedAt).toLocaleDateString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                </div>
              )}
            </div>
          </Section>

          {/* ── 상태 ── */}
          <Section label="상태">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["대기","진행중","컨펌요청","완료","보류"].map(s=>{
                const clr = STATUS_COLOR[s]||"#94a3b8";
                const bg  = STATUS_BG[s]||"#f8fafc";
                const isSel = task.status===s;
                return (
                  <button key={s} type="button"
                    onClick={()=>{
                      if(s==="컨펌요청") notifyConfirmRequest();
                      else if(s==="완료") notifyComplete();
                      set({status:s});
                    }}
                    style={{flex:1,minWidth:56,padding:"8px 4px",borderRadius:8,cursor:"pointer",
                      fontSize:12,fontWeight:isSel?800:500,border:"none",
                      background:isSel?bg:"#f8fafc",
                      color:isSel?clr:"#94a3b8",
                      outline:isSel?"2px solid "+clr:"1px solid #f1f5f9",
                      transition:"all .12s"}}>
                    {s==="컨펌요청"?"📋 컨펌요청":s}
                  </button>
                );
              })}
            </div>
            {task.status==="컨펌요청"&&(
              <div style={{marginTop:6,fontSize:11,color:"#d97706",fontWeight:600,
                background:"#fffbeb",border:"1px solid #fde68a",borderRadius:7,padding:"6px 10px"}}>
                📋 {task.assignedBy||task.createdBy}에게 컨펌 요청이 전송됩니다
              </div>
            )}
            {task.status==="완료"&&task.createdBy&&task.createdBy!==user.name&&(
              <div style={{marginTop:6,fontSize:11,color:"#16a34a",fontWeight:600}}>
                ✅ {task.createdBy}에게 완료 알림이 전송됩니다
              </div>
            )}
          </Section>

          {/* ── 마감일 ── */}
          <Section label="마감일">
            <input type="datetime-local" value={task.due||""}
              onChange={e=>set({due:e.target.value})}
              style={{width:"100%",padding:"9px 12px",borderRadius:8,
                border:"1px solid #e2e8f0",fontSize:13,color:"#1e293b",
                outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            {task.due&&(
              <button onClick={()=>set({due:""})}
                style={{marginTop:4,fontSize:11,color:"#94a3b8",background:"none",
                  border:"none",cursor:"pointer",textDecoration:"underline"}}>
                마감일 제거
              </button>
            )}
          </Section>

          {/* ── 링크 ── */}
          <Section label="링크 연결">
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {(task.links||[]).map((lk,li)=>(
                <div key={li} style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input value={lk.label||""} placeholder="이름"
                    onChange={e=>{
                      const links=(task.links||[]).map((l,i)=>i===li?{...l,label:e.target.value}:l);
                      set({links});
                    }}
                    style={{width:90,padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",
                      fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                  <input value={lk.url||""} placeholder="https://..."
                    onChange={e=>{
                      const links=(task.links||[]).map((l,i)=>i===li?{...l,url:e.target.value}:l);
                      set({links});
                    }}
                    style={{flex:1,padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",
                      fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                  {lk.url
                    ? <a href={lk.url} target="_blank" rel="noreferrer"
                        style={{fontSize:18,textDecoration:"none",flexShrink:0}}>🔗</a>
                    : <span style={{fontSize:18,opacity:.3,flexShrink:0}}>🔗</span>
                  }
                  <button type="button"
                    onClick={()=>set({links:(task.links||[]).filter((_,i)=>i!==li)})}
                    style={{border:"none",background:"none",cursor:"pointer",
                      fontSize:15,color:"#94a3b8",padding:0,flexShrink:0}}>✕</button>
                </div>
              ))}
              <button type="button"
                onClick={()=>set({links:[...(task.links||[]),{url:"",label:""}]})}
                style={{alignSelf:"flex-start",fontSize:12,color:"#2563eb",
                  background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,
                  padding:"5px 12px",cursor:"pointer",fontWeight:600}}>
                + 링크 추가
              </button>
            </div>
          </Section>

          {/* ── 상위 태스크 연결 ── */}
          <Section label="상위 태스크">
            {(()=>{
              const samePhase = (projTasks||[]).filter(t=>
                t.phaseId===task.phaseId && t.id!==task.id && !t.parentId
              );
              return (
                <div>
                  <select
                    value={task.parentId||""}
                    onChange={e=>set({parentId:e.target.value||null})}
                    style={{width:"100%",padding:"8px 12px",borderRadius:8,
                      border:"1px solid #e2e8f0",fontSize:13,color:"#1e293b",
                      outline:"none",boxSizing:"border-box",fontFamily:"inherit",
                      background:"#fff",cursor:"pointer"}}>
                    <option value="">— 상위 태스크 없음 (최상위)</option>
                    {samePhase.map(t=>(
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  {task.parentId && (
                    <div style={{marginTop:6,fontSize:11,color:"#2563eb",
                      display:"flex",alignItems:"center",gap:4}}>
                      <span style={{color:"#cbd5e1"}}>└</span>
                      {(projTasks||[]).find(t=>t.id===task.parentId)?.title||"(삭제된 태스크)"}
                      <span style={{color:"#94a3b8"}}>의 하위 태스크</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </Section>

          {/* ── 설명 ── */}
          <Section label="설명">
            <textarea value={task.desc||""} onChange={e=>set({desc:e.target.value})}
              placeholder="내용을 입력하세요..."
              style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #e2e8f0",
                fontSize:13,color:"#1e293b",outline:"none",resize:"vertical",minHeight:72,
                boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.6}}/>
          </Section>

          {/* ── 회의 일정 ── */}
          <Section label={"회의 일정" + ((task.meetings||[]).length>0?" ("+task.meetings.length+")":"")}>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {(task.meetings||[]).length===0&&(
                <div style={{fontSize:12,color:"#94a3b8",padding:"12px 0",textAlign:"center",
                  border:"1px dashed #e2e8f0",borderRadius:10}}>
                  회의 일정이 없습니다
                </div>
              )}
              {(task.meetings||[]).map((m,mi)=>(
                <div key={m.id} style={{border:"1px solid #e2e8f0",borderRadius:10,
                  padding:"12px 14px",background:"#fafbfc",position:"relative"}}>
                  {/* 헤더: 순번 + 삭제 */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#7c3aed",
                      background:"#f5f3ff",padding:"2px 8px",borderRadius:99}}>
                      회의 {mi+1}
                    </span>
                    <button onClick={()=>deleteMeeting(m.id)}
                      style={{border:"none",background:"none",cursor:"pointer",
                        fontSize:13,color:"#94a3b8",padding:0}}>✕</button>
                  </div>
                  {/* 회의명 + 일시 */}
                  <div style={{display:"flex",gap:8,marginBottom:8}}>
                    <input value={m.title||""} placeholder="회의 제목"
                      onChange={e=>updateMeeting(m.id,{title:e.target.value})}
                      style={{flex:1,padding:"7px 10px",borderRadius:7,
                        border:"1px solid #e2e8f0",fontSize:12,outline:"none",
                        fontFamily:"inherit",fontWeight:600}}/>
                    <input type="datetime-local" value={m.date||""}
                      onChange={e=>updateMeeting(m.id,{date:e.target.value})}
                      style={{width:175,padding:"7px 10px",borderRadius:7,
                        border:"1px solid #e2e8f0",fontSize:12,outline:"none",
                        fontFamily:"inherit"}}/>
                  </div>
                  {/* 참석자 */}
                  <input value={m.attendees||""} placeholder="참석자 (예: 홍길동, 김철수)"
                    onChange={e=>updateMeeting(m.id,{attendees:e.target.value})}
                    style={{width:"100%",padding:"7px 10px",borderRadius:7,
                      border:"1px solid #e2e8f0",fontSize:12,outline:"none",
                      fontFamily:"inherit",boxSizing:"border-box",marginBottom:8}}/>
                  {/* 회의록 링크 */}
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:11,color:"#64748b",fontWeight:600,flexShrink:0}}>📄 회의록</span>
                    <input value={m.link||""} placeholder="회의록 URL"
                      onChange={e=>updateMeeting(m.id,{link:e.target.value})}
                      style={{flex:1,padding:"6px 10px",borderRadius:7,
                        border:"1px solid #e2e8f0",fontSize:12,outline:"none",
                        fontFamily:"inherit"}}/>
                    {m.link
                      ? <a href={m.link} target="_blank" rel="noreferrer"
                          style={{flexShrink:0,padding:"6px 12px",borderRadius:7,
                            background:"#eff6ff",border:"1px solid #bfdbfe",
                            color:"#2563eb",fontSize:12,fontWeight:700,
                            textDecoration:"none",whiteSpace:"nowrap"}}>
                          열기 🔗
                        </a>
                      : <span style={{flexShrink:0,padding:"6px 12px",borderRadius:7,
                          background:"#f1f5f9",color:"#94a3b8",fontSize:12,
                          fontWeight:700,whiteSpace:"nowrap"}}>
                          열기 🔗
                        </span>
                    }
                  </div>
                  {/* 메모 */}
                  <textarea value={m.memo||""} placeholder="회의 메모..."
                    onChange={e=>updateMeeting(m.id,{memo:e.target.value})}
                    rows={2}
                    style={{width:"100%",padding:"7px 10px",borderRadius:7,
                      border:"1px solid #e2e8f0",fontSize:12,outline:"none",
                      fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",
                      lineHeight:1.5}}/>
                </div>
              ))}
              <button type="button" onClick={addMeeting}
                style={{alignSelf:"flex-start",fontSize:12,color:"#7c3aed",
                  background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:7,
                  padding:"6px 14px",cursor:"pointer",fontWeight:600}}>
                + 회의 추가
              </button>
            </div>
          </Section>

          {/* ── 댓글 ── */}
          <Section label={"댓글" + ((task.comments||[]).length>0?" ("+task.comments.length+")":"")}>
            {(task.comments||[]).length===0
              ? <div style={{fontSize:12,color:"#94a3b8",padding:"14px 0",textAlign:"center",
                  border:"1px dashed #e2e8f0",borderRadius:10,marginBottom:10}}>
                  아직 댓글이 없습니다
                </div>
              : <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                  {(task.comments||[]).map(c=>(
                    <div key={c.id} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <Avatar name={c.author} size={28}/>
                      <div style={{flex:1,background:"#f8fafc",borderRadius:"0 10px 10px 10px",
                        padding:"8px 12px",border:"1px solid #e2e8f0"}}>
                        <div style={{display:"flex",justifyContent:"space-between",
                          alignItems:"center",marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:700,color:"#1e293b"}}>{c.author}</span>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <span style={{fontSize:10,color:"#94a3b8"}}>
                              {new Date(c.createdAt).toLocaleDateString("ko-KR",
                                {month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                            </span>
                            {(c.author===user.name||user.role==="PD"||user.role==="대표")&&(
                              <button onClick={()=>delComment(c.id)}
                                style={{fontSize:10,color:"#94a3b8",background:"none",
                                  border:"none",cursor:"pointer",padding:"0 2px"}}>✕</button>
                            )}
                          </div>
                        </div>
                        <div style={{fontSize:13,color:"#1e293b",lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                          {c.text.split(/(@[^\s@]+)/g).map((part,i)=>
                            part.startsWith("@")
                              ? <span key={i} style={{color:"#2563eb",fontWeight:700,
                                  background:"#eff6ff",borderRadius:4,padding:"0 3px"}}>{part}</span>
                              : part
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            }
            <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <Avatar name={user.name} size={28} style={{marginTop:4}}/>
              <div style={{flex:1}}>
                <CommentInput accounts={accounts} user={user} onSubmit={addComment}/>
              </div>
            </div>
          </Section>

          {/* 삭제 */}
          <div style={{marginTop:8,paddingTop:16,borderTop:"1px solid #f1f5f9"}}>
            <button onClick={()=>{if(window.confirm("태스크를 삭제하시겠습니까?"))onDelete(task.id);}}
              style={{fontSize:12,color:"#ef4444",background:"none",border:"1px solid #fca5a5",
                borderRadius:7,padding:"5px 12px",cursor:"pointer",fontWeight:600}}>
              🗑 태스크 삭제
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

function Section({label, children}) {
  return (
    <div style={{paddingTop:16,paddingBottom:16,borderBottom:"1px solid #f8fafc"}}>
      <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:8,
        textTransform:"uppercase",letterSpacing:.8}}>
        {label}
      </div>
      {children}
    </div>
  );
}


// ── 요청 타입별 뷰 ──────────────────────────────────────────
function TypeView({ tasks, onEdit, onDelete }) {
  const TYPE_GROUPS = [
    { key:"내부",   label:"내부",   color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe", icon:"🏢" },
    { key:"고객사", label:"고객사", color:"#d97706", bg:"#fffbeb", border:"#fde68a", icon:"🤝" },
    { key:"협력사", label:"협력사", color:"#7c3aed", bg:"#f5f3ff", border:"#ddd6fe", icon:"🔗" },
  ];
  const today = todayStr();
  const STATUS_COLOR = {"대기":"#94a3b8","진행중":"#2563eb","컨펌요청":"#d97706","완료":"#16a34a","보류":"#ef4444"};
  const STATUS_BG    = {"대기":"#f8fafc","진행중":"#eff6ff","컨펌요청":"#fffbeb","완료":"#f0fdf4","보류":"#fff1f2"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {TYPE_GROUPS.map(g=>{
        const gtasks = tasks.filter(t=>(t.type||"내부")===g.key);
        if(gtasks.length===0) return null;
        const done = gtasks.filter(t=>t.status==="완료").length;
        const pct = Math.round(done/gtasks.length*100);
        return (
          <div key={g.key} style={{border:`1px solid ${g.border}`,borderRadius:12,overflow:"hidden"}}>
            {/* 그룹 헤더 */}
            <div style={{padding:"10px 16px",background:g.bg,
              display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:16}}>{g.icon}</span>
              <span style={{fontSize:13,fontWeight:800,color:g.color,letterSpacing:.5}}>{g.label}</span>
              <div style={{flex:1,height:5,background:"#fff",borderRadius:99,overflow:"hidden",margin:"0 8px"}}>
                <div style={{height:"100%",width:pct+"%",background:g.color,borderRadius:99,transition:"width .3s"}}/>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:g.color}}>{done}/{gtasks.length}</span>
            </div>
            {/* 태스크 목록 */}
            <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:4}}>
              <div style={{display:"grid",gridTemplateColumns:"20px 1fr 110px 90px 90px 28px",
                padding:"3px 6px",fontSize:10,fontWeight:700,color:"#94a3b8",gap:6}}>
                <span/><span>태스크</span><span>단계</span><span>담당자</span><span>마감일</span><span/>
              </div>
              {gtasks.map(t=>(
                <div key={t.id} style={{display:"grid",gridTemplateColumns:"20px 1fr 110px 90px 90px 28px",
                  padding:"7px 8px",borderRadius:8,gap:6,alignItems:"center",
                  background:t.status==="완료"?"#f8fafc":"#fff",
                  border:`1px solid ${t.status==="완료"?"#f1f5f9":g.border}`,
                  borderLeft:`3px solid ${t.status==="완료"?"#e2e8f0":g.color}`,
                  opacity:t.status==="완료"?.65:1}}>
                  {/* 상태 체크 */}
                  <div style={{width:14,height:14,borderRadius:"50%",flexShrink:0,
                    background:STATUS_BG[t.status||"대기"],
                    border:`2px solid ${STATUS_COLOR[t.status||"대기"]}`,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {t.status==="완료"&&<span style={{fontSize:8,color:"#16a34a"}}>✓</span>}
                  </div>
                  {/* 태스크명 */}
                  <div onClick={()=>onEdit(t)} style={{cursor:"pointer",minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:t.parentId?500:600,
                      color:t.status==="완료"?"#94a3b8":"#1e293b",
                      textDecoration:t.status==="완료"?"line-through":"none",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {t.parentId&&<span style={{fontSize:9,color:"#bfdbfe",marginRight:4}}>└</span>}
                      {t.title}
                    </div>
                    {(t.comments||[]).length>0&&(
                      <span style={{fontSize:9,padding:"1px 5px",borderRadius:99,
                        background:"#f0fdf4",color:"#16a34a",border:"1px solid #86efac",fontWeight:700}}>
                        💬{t.comments.length}
                      </span>
                    )}
                  </div>
                  {/* 단계 */}
                  <span style={{fontSize:10,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {t.phase||"-"}
                  </span>
                  {/* 담당자 */}
                  <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
                    {(t.assignees||[]).slice(0,2).map(n=>(
                      <span key={n} style={{fontSize:10,background:"#eff6ff",color:"#2563eb",
                        padding:"1px 6px",borderRadius:99,fontWeight:600,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:80}}>
                        {n}
                      </span>
                    ))}
                    {!(t.assignees||[]).length&&<span style={{fontSize:11,color:"#94a3b8"}}>-</span>}
                  </div>
                  {/* 마감일 */}
                  <div style={{fontSize:10,color:t.due&&t.due<today?"#ef4444":"#64748b",
                    fontWeight:t.due&&t.due<today?700:400,whiteSpace:"nowrap"}}>
                    {t.due?t.due.slice(5,10).replace("-","/"):<span style={{color:"#cbd5e1"}}>-</span>}
                  </div>
                  {/* 삭제 */}
                  <button type="button"
                    onClick={()=>{if(window.confirm("삭제하시겠습니까?"))onDelete&&onDelete(t.id);}}
                    style={{width:24,height:24,borderRadius:6,border:"1px solid #fca5a5",
                      background:"#fff1f2",color:"#ef4444",fontSize:14,fontWeight:700,
                      cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    −
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FlowView({ tasks, accounts, user, onEdit, onAdd, onUpdateTask, onNotify }) {
  const today = todayStr();

  // 태스크를 4가지 버킷으로 분류
  // 내 할 일: 내가 담당자이고 미완료 (컨펌요청 포함)
  const myTasks = tasks.filter(t =>
    (t.assignee === user.name || (t.assignees||[]).includes(user.name)) &&
    t.status !== "완료"
  );
  // 컨펌 요청 받은 것: 내가 전달자(assignedBy)이고 담당자가 "컨펌요청" 상태로 올린 것
  const confirmReqs = tasks.filter(t =>
    t.status === "컨펌요청" &&
    (t.assignedBy === user.name || t.createdBy === user.name) &&
    !(t.assignees||[]).includes(user.name)
  );
  // 내가 전달한 것: 아직 진행 중
  const waitingFor = tasks.filter(t =>
    t.assignedBy === user.name &&
    !(t.assignees||[]).includes(user.name) &&
    t.status !== "완료" && t.status !== "컨펌요청"
  );
  // 기한 초과
  const overdue = tasks.filter(t =>
    t.due && t.due < today && t.status !== "완료" && t.status !== "컨펌요청"
  );
  // 최근 완료 (내가 관련된 것 — 담당자 또는 전달자)
  const recentDone = tasks.filter(t =>
    t.status === "완료" &&
    (t.assignedBy === user.name || t.createdBy === user.name ||
     (t.assignees||[]).includes(user.name) || t.assignee === user.name)
  ).slice(-10).reverse();

  // 컨펌 승인/반려 알림 함수
  const onNotifyConfirmGlobal = (t, type) => {
    const to = (t.assignees||[])[0] || t.assignee;
    if (!to || !onNotify) return;
    const isApproved = type === "approved";
    onNotify({
      id: "n" + Date.now() + Math.random().toString(36).slice(2,5),
      type,
      label: isApproved ? "컨펌 승인" : "컨펌 반려",
      to,
      from: user.name,
      taskId: t.id,
      fbTitle: t.title,
      projName: "",
      createdAt: new Date().toISOString(),
      urgent: !isApproved,
    });
  };

  // 전체 멤버별 태스크 현황
  const memberMap = {};
  tasks.filter(t=>t.stage!=="ONAIR").forEach(t=>{
    if(!memberMap[t.assignee]) memberMap[t.assignee] = {name:t.assignee, tasks:[]};
    memberMap[t.assignee].tasks.push(t);
  });

  // 스테이지 진행 흐름
  const stageFlow = Object.keys(STAGES);
  const stageCount = s => tasks.filter(t=>t.stage===s).length;
  const currentStage = stageFlow.reduce((cur, s) => tasks.filter(t=>t.stage===s && t.stage!=="ONAIR").length > 0 ? s : cur, "PLANNING");

  const PriorityDot = ({p}) => {
    const colors = {긴급:"#ef4444",높음:"#f59e0b",보통:"#94a3b8",낮음:"#cbd5e1"};
    return <span style={{width:8,height:8,borderRadius:"50%",background:colors[p]||"#94a3b8",display:"inline-block",flexShrink:0}}/>;
  };

  // 전달받은 뒤 아직 "대기" 상태인 태스크 = 미확인
  const isNew = (t) => t.assignedBy && t.status === "대기" &&
    (t.assignees||[]).includes(user.name);

  const TaskCard = ({t, showAssignee=false, showActions=false, showConfirmActions=false, onNotifyConfirm}) => {
    const isOver = t.due && t.due < today;
    const stage  = STAGES[t.stage] || {};
    const _new   = isNew(t);
    const STATUS_COLOR = {"대기":"#94a3b8","진행중":"#2563eb","컨펌요청":"#d97706","완료":"#16a34a","보류":"#ef4444"};
    const STATUS_BG    = {"대기":"#f8fafc","진행중":"#eff6ff","컨펌요청":"#fffbeb","완료":"#f0fdf4","보류":"#fff1f2"};
    return (
      <div style={{background:"#fff",borderRadius:10,
          border:`1px solid ${_new?"#fbbf24":t.blocked?"#fca5a5":isOver?"#fcd34d":"#e2e8f0"}`,
          transition:"all .15s",boxShadow:_new?"0 0 0 2px #fde68a":"0 1px 4px rgba(0,0,0,.05)",
          overflow:"hidden"}}>
        {/* 미확인 뱃지 */}
        {_new && (
          <div style={{background:"#fef3c7",padding:"3px 12px",fontSize:10,fontWeight:700,
            color:"#b45309",display:"flex",alignItems:"center",gap:6,borderBottom:"1px solid #fde68a"}}>
            <span>📨</span>
            <span>{t.assignedBy}님이 전달한 태스크 · 확인 필요</span>
          </div>
        )}
        <div onClick={()=>onEdit(t)} style={{padding:"10px 12px",cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"}
          onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
          <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:4}}>
            <PriorityDot p={t.priority}/>
            <div style={{flex:1,fontSize:13,fontWeight:600,color:"#1e293b",lineHeight:1.3}}>{t.title}</div>
            {/* 상태 뱃지 */}
            <span style={{fontSize:10,padding:"1px 8px",borderRadius:99,flexShrink:0,
              background:STATUS_BG[t.status||"대기"],color:STATUS_COLOR[t.status||"대기"],fontWeight:700}}>
              {t.status||"대기"}
            </span>
          </div>
          {((t.comments||[]).length>0||(t.meetings||[]).length>0)&&(
            <div style={{display:"flex",gap:4,marginBottom:5}}>
              {(t.comments||[]).length>0&&(
                <span style={{fontSize:9,padding:"1px 6px",borderRadius:99,
                  background:"#f0fdf4",color:"#16a34a",border:"1px solid #86efac",fontWeight:700}}>
                  💬 {t.comments.length}
                </span>
              )}
              {(t.meetings||[]).length>0&&(
                <span style={{fontSize:9,padding:"1px 6px",borderRadius:99,
                  background:"#f5f3ff",color:"#7c3aed",border:"1px solid #ddd6fe",fontWeight:700}}>
                  📅 {t.meetings.length}
                </span>
              )}
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:10,padding:"1px 7px",borderRadius:99,
              background:stage.bg||"#f1f5f9",color:stage.color||"#64748b",fontWeight:600}}>
              {t.stage}
            </span>
            {t.phase&&<span style={{fontSize:10,color:"#94a3b8"}}>· {t.phase}</span>}
            {showAssignee && (t.assignees||[]).length>0 && (
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                {(t.assignees||[]).map(n=>(
                  <span key={n} style={{display:"flex",alignItems:"center",gap:2,fontSize:10,color:"#64748b"}}>
                    <Avatar name={n} size={14}/>{n}
                  </span>
                ))}
              </div>
            )}
            {t.due && (
              <span style={{fontSize:10,color:isOver?"#ef4444":"#94a3b8",marginLeft:"auto"}}>
                {isOver?"⚠ ":""}{t.due.slice(5,10)}
              </span>
            )}
          </div>
        </div>
        {/* 빠른 액션 버튼 (내 할 일 섹션) */}
        {showActions && (
          <div style={{display:"flex",gap:0,borderTop:"1px solid #f1f5f9"}}>
            {t.status==="대기" && (
              <button type="button"
                onClick={e=>{e.stopPropagation();onUpdateTask&&onUpdateTask({...t,status:"진행중"});}}
                style={{flex:1,padding:"7px",border:"none",background:"#f8fafc",
                  cursor:"pointer",fontSize:11,fontWeight:700,color:"#2563eb",
                  borderRight:"1px solid #f1f5f9"}}
                onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}>
                ▶ 진행 시작
              </button>
            )}
            {t.status==="진행중" && (
              <button type="button"
                onClick={e=>{e.stopPropagation();onUpdateTask&&onUpdateTask({...t,status:"컨펌요청"});}}
                style={{flex:1,padding:"7px",border:"none",background:"#fffbeb",
                  cursor:"pointer",fontSize:11,fontWeight:700,color:"#d97706",
                  borderRight:"1px solid #fde68a"}}
                onMouseEnter={e=>e.currentTarget.style.background="#fef3c7"}
                onMouseLeave={e=>e.currentTarget.style.background="#fffbeb"}>
                📋 컨펌 요청
              </button>
            )}
            {t.status==="컨펌요청" && (
              <div style={{flex:1,padding:"7px",textAlign:"center",
                fontSize:11,fontWeight:700,color:"#d97706",background:"#fffbeb"}}>
                📋 컨펌 요청 중
              </div>
            )}
            {t.status==="완료" && (
              <div style={{flex:1,padding:"7px",textAlign:"center",
                fontSize:11,fontWeight:700,color:"#16a34a",background:"#f0fdf4"}}>
                ✓ 완료됨
              </div>
            )}
            <button type="button"
              onClick={e=>{e.stopPropagation();onEdit(t);}}
              style={{padding:"7px 14px",border:"none",background:"#f8fafc",
                cursor:"pointer",fontSize:11,color:"#64748b"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"}
              onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}>
              상세 →
            </button>
          </div>
        )}

        {/* 컨펌 승인/반려 버튼 (컨펌요청 섹션) */}
        {showConfirmActions && (
          <div style={{display:"flex",gap:0,borderTop:"1px solid #fde68a"}}>
            <button type="button"
              onClick={e=>{
                e.stopPropagation();
                // 승인 → 완료 처리 + 알림
                onUpdateTask&&onUpdateTask({...t,status:"완료",approvedBy:user.name,approvedAt:new Date().toISOString()});
                onNotifyConfirm&&onNotifyConfirm(t,"approved");
              }}
              style={{flex:1,padding:"8px",border:"none",background:"#f0fdf4",
                cursor:"pointer",fontSize:12,fontWeight:800,color:"#16a34a",
                borderRight:"1px solid #dcfce7"}}
              onMouseEnter={e=>e.currentTarget.style.background="#dcfce7"}
              onMouseLeave={e=>e.currentTarget.style.background="#f0fdf4"}>
              ✅ 승인 완료
            </button>
            <button type="button"
              onClick={e=>{
                e.stopPropagation();
                // 반려 → 진행중으로 돌리기 + 알림
                onUpdateTask&&onUpdateTask({...t,status:"진행중",rejectedBy:user.name,rejectedAt:new Date().toISOString()});
                onNotifyConfirm&&onNotifyConfirm(t,"rejected");
              }}
              style={{flex:1,padding:"8px",border:"none",background:"#fff1f2",
                cursor:"pointer",fontSize:12,fontWeight:800,color:"#ef4444",
                borderRight:"1px solid #fecaca"}}
              onMouseEnter={e=>e.currentTarget.style.background="#fecaca"}
              onMouseLeave={e=>e.currentTarget.style.background="#fff1f2"}>
              🔁 반려
            </button>
            <button type="button"
              onClick={e=>{e.stopPropagation();onEdit(t);}}
              style={{padding:"8px 14px",border:"none",background:"#f8fafc",
                cursor:"pointer",fontSize:11,color:"#64748b"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"}
              onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}>
              상세 →
            </button>
          </div>
        )}
      </div>
    );
  };

  const Section = ({icon, title, color, bg, tasks, empty, showAssignee=false, showActions=false, showConfirmActions=false}) => {
    const newCount = showActions ? tasks.filter(t=>isNew(t)).length : 0;
    return (
      <div style={{background:bg,borderRadius:14,padding:"16px",border:`1.5px solid ${color}20`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span style={{fontSize:18}}>{icon}</span>
          <span style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{title}</span>
          {newCount>0 && (
            <span style={{fontSize:10,fontWeight:800,color:"#b45309",
              background:"#fef3c7",border:"1px solid #fde68a",
              padding:"1px 8px",borderRadius:99}}>
              📨 {newCount}개 미확인
            </span>
          )}
          <span style={{marginLeft:"auto",fontSize:12,fontWeight:700,color:color,
            background:`${color}15`,padding:"2px 10px",borderRadius:99}}>
            {tasks.length}건
          </span>
        </div>
        {tasks.length===0
          ? <div style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:"16px 0"}}>{empty}</div>
          : <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {tasks.map(t=><TaskCard key={t.id} t={t} showAssignee={showAssignee} showActions={showActions} showConfirmActions={showConfirmActions} onNotifyConfirm={onNotifyConfirmGlobal}/>)}
            </div>
        }
      </div>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* 프로젝트 진행 흐름 바 */}
      <div style={{background:"#f8fafc",borderRadius:14,padding:"16px 20px",border:"1px solid #e2e8f0"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:12}}>프로젝트 진행 흐름</div>
        <div style={{display:"flex",alignItems:"center",gap:0}}>
          {stageFlow.map((s,i)=>{
            const cfg = STAGES[s];
            const cnt = stageCount(s);
            const isCur = s === currentStage && s !== "ONAIR";
            const isDone = s === "ONAIR";
            return (
              <div key={s} style={{display:"flex",alignItems:"center",flex:1}}>
                <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{width:"100%",height:6,background:isCur?"#2563eb":isDone?"#16a34a":cnt>0?"#93c5fd":"#e2e8f0",borderRadius:99,transition:"all .3s",
                    boxShadow:isCur?"0 0 8px #2563eb60":""}}/>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:11}}>{cfg.icon}</span>
                    <span style={{fontSize:10,fontWeight:isCur?700:500,color:isCur?"#2563eb":cnt>0?"#475569":"#cbd5e1"}}>
                      {s}
                    </span>
                    {cnt>0&&<span style={{fontSize:9,background:isCur?"#2563eb":cfg.bg,color:isCur?"#fff":cfg.color,padding:"1px 5px",borderRadius:99,fontWeight:700}}>{cnt}</span>}
                  </div>
                </div>
                {i < stageFlow.length-1 && (
                  <div style={{width:20,height:6,display:"flex",alignItems:"center",justifyContent:"center",color:"#cbd5e1",fontSize:10,flexShrink:0}}>›</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 섹션 그리드 */}

      {/* 컨펌 요청 — 전체 너비 강조 */}
      {confirmReqs.length>0 && (
        <Section
          icon="📋" title="컨펌 요청 받은 것"
          color="#d97706" bg="#fffbeb"
          tasks={confirmReqs}
          showAssignee={true}
          showConfirmActions={true}
          empty=""
        />
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Section
          icon="🙋" title={`내 할 일 (${user.name})`}
          color="#2563eb" bg="#eff6ff"
          tasks={myTasks}
          showActions={true}
          empty="지금 처리해야 할 태스크가 없어요"
        />
        <Section
          icon="⏳" title="내가 전달한 것 · 처리 대기"
          color="#7c3aed" bg="#f5f3ff"
          tasks={waitingFor}
          showAssignee={true}
          empty="다른 팀원에게 넘긴 태스크가 없어요"
        />
        <Section
          icon="🚨" title="기한 초과"
          color="#ef4444" bg="#fff1f2"
          tasks={overdue}
          showAssignee={true}
          empty="기한 초과 태스크 없음 👍"
        />
        <Section
          icon="✅" title="최근 완료"
          color="#16a34a" bg="#f0fdf4"
          tasks={recentDone}
          showAssignee={true}
          empty="완료된 태스크가 없어요"
        />
      </div>

      {/* 팀원별 현황 */}
      <div>
        <div style={{fontSize:13,fontWeight:700,color:"#1e293b",marginBottom:10}}>👥 팀원별 진행 현황</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          {Object.values(memberMap).map(m=>{
            const urgent = m.tasks.filter(t=>t.priority==="긴급").length;
            const over   = m.tasks.filter(t=>t.due&&t.due<today).length;
            return (
              <div key={m.name} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <Avatar name={m.name} size={28}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#1e293b"}}>{m.name}</div>
                    <div style={{fontSize:10,color:"#94a3b8"}}>{m.tasks.length}개 태스크</div>
                  </div>
                  <div style={{marginLeft:"auto",display:"flex",gap:4}}>
                    {urgent>0&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:99,background:"#fee2e2",color:"#ef4444",fontWeight:700}}>긴급 {urgent}</span>}
                    {over>0&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:99,background:"#fef3c7",color:"#d97706",fontWeight:700}}>초과 {over}</span>}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {m.tasks.slice(0,3).map(t=>(
                    <div key={t.id} onClick={()=>onEdit(t)}
                      style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",
                        padding:"5px 8px",borderRadius:7,background:"#f8fafc"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                      onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}>
                      <PriorityDot p={t.priority}/>
                      <span style={{fontSize:11,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#334155"}}>{t.title}</span>
                      <span style={{fontSize:9,color:STAGES[t.stage]?.color||"#94a3b8",flexShrink:0}}>{t.stage}</span>
                    </div>
                  ))}
                  {m.tasks.length>3&&<div style={{fontSize:10,color:"#94a3b8",textAlign:"center",paddingTop:2}}>+{m.tasks.length-3}개 더</div>}
                </div>
              </div>
            );
          })}
          {Object.keys(memberMap).length===0&&(
            <div style={{gridColumn:"1/-1",textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>
              태스크를 추가하면 팀원별 현황이 표시됩니다
            </div>
          )}
        </div>
      </div>

    </div>
  );
}





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
          {((t.comments||[]).length>0||(t.meetings||[]).length>0)&&(
            <div style={{display:"flex",gap:4,marginBottom:6}}>
              {(t.comments||[]).length>0&&(
                <span style={{fontSize:9,padding:"1px 6px",borderRadius:99,
                  background:"#f0fdf4",color:"#16a34a",border:"1px solid #86efac",fontWeight:700}}>
                  💬 {t.comments.length}
                </span>
              )}
              {(t.meetings||[]).length>0&&(
                <span style={{fontSize:9,padding:"1px 6px",borderRadius:99,
                  background:"#f5f3ff",color:"#7c3aed",border:"1px solid #ddd6fe",fontWeight:700}}>
                  📅 {t.meetings.length}
                </span>
              )}
            </div>
          )}
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
// 실행예산서 에디터 (견적서 스타일 수기입력)
// ═══════════════════════════════════════════════════════════
function BudgetEditor({ project, onSave }) {
  const q   = project.quote;
  // 매입 데이터: q.items 구조 그대로, 각 item에 purchasePrice 추가
  const bud = project.budget2 || { items: [] };

  // q.items 기반으로 매입 데이터 초기화 (견적서 항목과 동기화)
  const syncedItems = (q.items || []).map(cat => {
    const existing = (bud.items || []).find(b => b.category === cat.category);
    return {
      category: cat.category,
      groups: (cat.groups || []).map(grp => {
        const exGrp = existing ? (existing.groups || []).find(g => g.group === grp.group) : null;
        return {
          group: grp.group,
          items: (grp.items || []).map(it => {
            const exIt = exGrp ? (exGrp.items || []).find(i => i.id === it.id) : null;
            return {
              id: it.id,
              name: it.name || it.desc || '',
              qty: it.qty || 0,
              unitPrice: it.unitPrice || 0,
              purchasePrice: exIt ? (exIt.purchasePrice || 0) : 0,
              purchaseNote: exIt ? (exIt.purchaseNote || '') : '',
            };
          }),
        };
      }),
    };
  });

  const patch = (ci, gi, id, val) => {
    const updated = syncedItems.map((cat, i) => i !== ci ? cat : {
      ...cat,
      groups: cat.groups.map((grp, j) => j !== gi ? grp : {
        ...grp,
        items: grp.items.map(it => it.id !== id ? it : { ...it, ...val }),
      }),
    });
    onSave({ ...project, budget2: { items: updated } });
  };

  // 합계 계산
  const salesTotal = (q.items || []).reduce((s, cat) => s + catAmt(cat), 0);
  const purchaseTotal = syncedItems.reduce((s, cat) =>
    s + (cat.groups || []).reduce((s2, grp) =>
      s2 + (grp.items || []).reduce((s3, it) => s3 + (it.purchasePrice || 0), 0), 0), 0);
  const profit = salesTotal - purchaseTotal;
  const margin = salesTotal ? Math.round(profit / salesTotal * 100) : 0;

  return (
    <div>
      {/* 요약 카드 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"매출 (공급가액)",  val:salesTotal,    color:C.blue,  sub:"견적서 기준"},
          {label:"매입 (실행예산)",  val:purchaseTotal, color:C.amber, sub:"수기 입력 기준"},
          {label:"예상 잔여",        val:profit,        color:profit>=0?C.green:C.red, sub:"매출 - 매입"},
          {label:"예상 이익률",      val:margin,        color:margin>=0?C.green:C.red, sub:`순이익 ${fmtM(profit)}`, isPct:true},
        ].map(s=>(
          <div key={s.label} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${s.color}`}}>
            <div style={{fontSize:11,color:C.sub,marginBottom:6,fontWeight:600}}>{s.label}</div>
            <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.isPct?margin+"%":fmtM(s.val)}</div>
            <div style={{fontSize:11,color:C.faint,marginTop:3}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 헤더 */}
      <div style={{display:"grid",gridTemplateColumns:"200px 1fr 16px 1fr",gap:0,marginBottom:0}}>
        <div style={{padding:"8px 12px",background:C.slateLight,borderRadius:"8px 0 0 0",border:`1px solid ${C.border}`,borderRight:"none",fontSize:12,fontWeight:700,color:C.sub}}/>
        <div style={{padding:"8px 12px",background:"#eff6ff",border:`1px solid ${C.border}`,borderRight:"none",fontSize:12,fontWeight:700,color:C.blue,textAlign:"center"}}>
          📈 매출 (견적서 기준 · 읽기전용)
        </div>
        <div style={{background:C.slateLight,border:`1px solid ${C.border}`,borderLeft:"none",borderRight:"none"}}/>
        <div style={{padding:"8px 12px",background:"#fffbeb",border:`1px solid ${C.border}`,borderRadius:"0 8px 0 0",fontSize:12,fontWeight:700,color:C.amber,textAlign:"center"}}>
          📉 매입 (수기 입력)
        </div>
      </div>

      {/* 항목 없을 때 */}
      {(q.items||[]).length===0 ? (
        <div style={{textAlign:"center",padding:48,color:C.faint,border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 8px 8px"}}>
          <div style={{fontSize:32,marginBottom:8}}>📋</div>
          <div style={{fontWeight:600,marginBottom:4}}>견적서 항목이 없습니다</div>
          <div style={{fontSize:12}}>먼저 견적서 탭에서 항목을 추가하면 자동으로 연동됩니다</div>
        </div>
      ) : (
        <div style={{border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",overflow:"hidden"}}>
          {syncedItems.map((cat, ci) => {
            const catSales    = (q.items[ci] ? catAmt(q.items[ci]) : 0);
            const catPurchase = (cat.groups||[]).reduce((s,g)=>(g.items||[]).reduce((s2,it)=>s2+(it.purchasePrice||0),s),0);
            return (
              <div key={cat.category}>
                {/* 대분류 행 */}
                <div style={{display:"grid",gridTemplateColumns:"200px 1fr 16px 1fr",background:C.slateLight,borderBottom:`1px solid ${C.border}`}}>
                  <div style={{padding:"9px 12px",fontWeight:700,fontSize:13,color:C.dark,borderRight:`1px solid ${C.border}`}}>
                    {cat.category}
                  </div>
                  <div style={{padding:"9px 12px",fontWeight:700,fontSize:13,color:C.blue,textAlign:"right",borderRight:`1px solid ${C.border}`}}>
                    {fmtM(catSales)}
                  </div>
                  <div style={{borderRight:`1px solid ${C.border}`,background:"#f1f5f9"}}/>
                  <div style={{padding:"9px 12px",fontWeight:700,fontSize:13,color:C.amber,textAlign:"right"}}>
                    {fmtM(catPurchase)}
                  </div>
                </div>

                {/* 중분류 + 항목 */}
                {(cat.groups||[]).map((grp, gi) => {
                  const grpSales    = (q.items[ci]?.groups[gi] ? (q.items[ci].groups[gi].items||[]).reduce((s,it)=>s+(it.qty||0)*(it.unitPrice||0),0) : 0);
                  const grpPurchase = (grp.items||[]).reduce((s,it)=>s+(it.purchasePrice||0),0);
                  return (
                    <div key={grp.group}>
                      {/* 중분류 행 */}
                      <div style={{display:"grid",gridTemplateColumns:"200px 1fr 16px 1fr",background:"#f8fafc",borderBottom:`1px solid ${C.border}`}}>
                        <div style={{padding:"7px 12px 7px 20px",fontWeight:600,fontSize:12,color:C.slate,borderRight:`1px solid ${C.border}`}}>
                          {grp.group}
                        </div>
                        <div style={{padding:"7px 12px",fontSize:12,color:C.blue,textAlign:"right",borderRight:`1px solid ${C.border}`}}>
                          {fmtM(grpSales)}
                        </div>
                        <div style={{borderRight:`1px solid ${C.border}`,background:"#f1f5f9"}}/>
                        <div style={{padding:"7px 12px",fontSize:12,color:C.amber,textAlign:"right"}}>
                          {fmtM(grpPurchase)}
                        </div>
                      </div>

                      {/* 소항목 행 */}
                      {(grp.items||[]).map((it, idx) => {
                        const qIt = q.items[ci]?.groups[gi]?.items[idx];
                        const salesAmt = qIt ? (qIt.qty||0)*(qIt.unitPrice||0) : 0;
                        return (
                          <div key={it.id} style={{display:"grid",gridTemplateColumns:"200px 1fr 16px 1fr",borderBottom:`1px solid ${C.border}`,background:idx%2===0?C.white:"#fafbfc"}}>
                            {/* 항목명 */}
                            <div style={{padding:"8px 12px 8px 32px",fontSize:12,color:C.dark,borderRight:`1px solid ${C.border}`,display:"flex",alignItems:"center"}}>
                              {it.name}
                            </div>
                            {/* 매출 (읽기전용) */}
                            <div style={{padding:"8px 12px",borderRight:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8}}>
                              <span style={{fontSize:11,color:C.faint}}>{qIt?.qty||0}개 × {fmt(qIt?.unitPrice||0)}</span>
                              <span style={{fontSize:13,fontWeight:600,color:C.blue,minWidth:80,textAlign:"right"}}>{fmt(salesAmt)}</span>
                            </div>
                            {/* 구분선 */}
                            <div style={{borderRight:`1px solid ${C.border}`,background:"#f1f5f9"}}/>
                            {/* 매입 (수기 입력) */}
                            <div style={{padding:"6px 12px",display:"flex",alignItems:"center",gap:8}}>
                              <input
                                type="number"
                                value={it.purchasePrice||""}
                                onChange={e=>patch(ci,gi,it.id,{purchasePrice:Number(e.target.value)||0})}
                                placeholder="금액 입력"
                                style={{flex:1,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",fontSize:13,textAlign:"right",outline:"none",color:C.dark,background:C.white}}
                              />
                              <input
                                value={it.purchaseNote||""}
                                onChange={e=>patch(ci,gi,it.id,{purchaseNote:e.target.value})}
                                placeholder="메모"
                                style={{width:80,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",fontSize:11,outline:"none",color:C.sub,background:C.white}}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* 합계 행 */}
          <div style={{display:"grid",gridTemplateColumns:"200px 1fr 16px 1fr",background:C.slateLight,borderTop:`2px solid ${C.border}`,fontWeight:700}}>
            <div style={{padding:"10px 12px",fontSize:13,borderRight:`1px solid ${C.border}`}}>합계</div>
            <div style={{padding:"10px 12px",fontSize:14,color:C.blue,textAlign:"right",borderRight:`1px solid ${C.border}`}}>{fmtM(salesTotal)}</div>
            <div style={{borderRight:`1px solid ${C.border}`,background:"#f1f5f9"}}/>
            <div style={{padding:"10px 12px",fontSize:14,color:C.amber,textAlign:"right",display:"flex",justifyContent:"flex-end",alignItems:"center",gap:12}}>
              <span>{fmtM(purchaseTotal)}</span>
              <span style={{fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:99,
                background:profit>=0?"#dcfce7":"#fee2e2",color:profit>=0?C.green:C.red}}>
                {profit>=0?"▲":"▼"} {margin}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 결산서 (증빙자료 + 예산 비교)
// ═══════════════════════════════════════════════════════════
function SettlementView({ project, onConfirm, onSave }) {
  const q   = project.quote;
  const b   = project.budget  || { vouchers: [] };
  const b2  = project.budget2 || { items: [] };
  const confirmed = !!project.settlementDate;

  const supply   = qSupply(q);
  const total    = qTotal(q);
  const spent    = vTotal(b);
  const budgeted = (b2.items||[]).reduce((s,c)=>(c.groups||[]).reduce((s2,g)=>(g.items||[]).reduce((s3,it)=>s3+(it.qty||0)*(it.unitPrice||0),s2),s),0);
  const profit   = supply - spent;
  const margin   = supply ? Math.round(profit/supply*100) : 0;

  const [modal,       setModal]      = useState(false);
  const [editV,       setEditV]      = useState(null);
  const [vf,          setVf]         = useState({name:"",vendor:"",type:VOUCHER_TYPES[0],date:todayStr(),amount:"",category:"",group:"",number:"",note:"",files:[]});
  const [preview,     setPreview]    = useState(null);
  const [lightboxImg, setLightboxImg]= useState(null);
  const [analyzing,   setAnalyzing]  = useState(false);

  const catOptions   = (q.items||[]).map(c=>c.category);
  const groupOptions = cat => { const c=(q.items||[]).find(c=>c.category===cat); return c?c.groups.map(g=>g.group):[]; };

  const patchB = fn => onSave({...project, budget: fn(b)});

  const openAdd = () => {
    setEditV(null);
    const cat0=catOptions[0]||"", grp0=groupOptions(cat0)[0]||"";
    setVf({name:"",vendor:"",type:VOUCHER_TYPES[0],date:todayStr(),amount:"",category:cat0,group:grp0,number:"",note:"",files:[]});
    setModal(true);
  };
  const openEdit = v => { setEditV(v); setVf({...v}); setModal(true); };
  const saveV = () => {
    if(!vf.name||!vf.vendor) return alert("항목명과 업체명을 입력해주세요.");
    const entry={...vf,id:editV?editV.id:"v"+Date.now(),amount:Number(vf.amount)||0};
    patchB(b=>({...b,vouchers:editV?(b.vouchers||[]).map(v=>v.id===editV.id?entry:v):[...(b.vouchers||[]),entry]}));
    setModal(false);
  };
  const removeV = v => patchB(b=>({...b,vouchers:(b.vouchers||[]).filter(x=>x.id!==v.id)}));

  const analyzeFile = async file => {
    setAnalyzing(true);
    try {
      const toB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
      const b64=await toB64(file);
      const isImg=file.type.startsWith("image/"),isPdf=file.type==="application/pdf";
      const msgContent=isImg
        ?[{type:"image",source:{type:"base64",media_type:file.type,data:b64}},{type:"text",text:"이 영수증/증빙 이미지에서 정보를 추출해서 반드시 아래 JSON 형식으로만 답해줘. 다른 말은 하지 마.\n{\"name\":\"항목명\",\"vendor\":\"거래처명\",\"amount\":숫자만,\"date\":\"YYYY-MM-DD\"}"}]
        :isPdf?[{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},{type:"text",text:"이 영수증/증빙 PDF에서 정보를 추출해서 반드시 아래 JSON 형식으로만 답해줘. 다른 말은 하지 마.\n{\"name\":\"항목명\",\"vendor\":\"거래처명\",\"amount\":숫자만,\"date\":\"YYYY-MM-DD\"}"}]
        :null;
      if(!msgContent){setAnalyzing(false);return;}
      const res=await fetch("/api/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:msgContent}]})});
      if(!res.ok){setAnalyzing(false);return;}
      const data=await res.json();
      const text=(data.content||[]).map(c=>c.text||"").join("").trim();
      const cleaned=text.replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim();
      const match=cleaned.match(/\{[\s\S]*\}/);
      if(match){try{const p=JSON.parse(match[0]);setVf(v=>({...v,name:p.name||v.name,vendor:p.vendor||v.vendor,amount:p.amount?String(p.amount).replace(/[^0-9]/g,""):v.amount,date:p.date||v.date}));}catch(e){}}
    }catch(e){console.error(e);}
    setAnalyzing(false);
  };
  const handleFile = async file => {
    const toB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
    const b64url=await toB64(file);
    setVf(v=>({...v,files:[...(v.files||[]),{name:file.name,type:file.type,b64url,size:file.size}]}));
    analyzeFile(file);
  };

  // 결산서 비교: q.items 기준 대분류별 매출 vs 증빙 집행액
  const voucherMap={};
  (b.vouchers||[]).forEach(v=>{voucherMap[v.category]=(voucherMap[v.category]||0)+(v.amount||0);});

  // 실행예산(budget2) 기준 대분류별 매입 합계
  const budgetMap={};
  (b2.items||[]).forEach(cat=>{
    const amt=(cat.groups||[]).reduce((s,g)=>(g.items||[]).reduce((s2,it)=>s2+(it.purchasePrice||0),s),0);
    budgetMap[cat.category]=amt;
  });

  // q.items 기준으로 행 생성 (매출 | 실행예산 매입 | 실제집행 증빙)
  const compareRows=(q.items||[]).map(cat=>{
    const salesAmt = catAmt(cat);
    const budAmt   = budgetMap[cat.category]||0;
    const actualAmt= voucherMap[cat.category]||0;
    const diff     = budAmt - actualAmt;
    const rate     = budAmt ? Math.round(actualAmt/budAmt*100) : 0;
    return {cat:cat.category, sales:salesAmt, budget:budAmt, actual:actualAmt, diff, rate};
  });

  return (
    <div>
      {confirmed?(
        <div style={{background:C.greenLight,border:`1px solid ${C.green}30`,borderRadius:12,padding:"13px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>✅</span>
          <div><div style={{fontWeight:700,fontSize:14,color:C.green}}>결산 확정 완료</div><div style={{fontSize:13,color:C.sub}}>확정일: {project.settlementDate}</div></div>
        </div>
      ):(
        <div style={{background:C.amberLight,border:`1px solid ${C.amber}30`,borderRadius:12,padding:"13px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div><div style={{fontWeight:700,fontSize:14,color:C.amber}}>결산 미확정</div><div style={{fontSize:13,color:C.sub}}>프로젝트 완료 후 확정하면 경영관리 대시보드에 반영됩니다.</div></div>
          <Btn primary onClick={onConfirm} style={{marginLeft:"auto"}}>결산 확정하기</Btn>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"수주금액(VAT포함)", val:total,    color:C.blue,  sub:"클라이언트 청구액"},
          {label:"실행예산",          val:budgeted, color:C.purple,sub:"집행 예정액"},
          {label:"실제 집행(증빙)",   val:spent,    color:C.amber, sub:`${(b.vouchers||[]).length}건 증빙`},
          {label:"최종 순이익",       val:profit,   color:profit>=0?C.green:C.red, sub:`이익률 ${margin}%`},
        ].map(s=>(
          <div key={s.label} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${s.color}`}}>
            <div style={{fontSize:11,color:C.sub,marginBottom:6,fontWeight:600}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.color}}>{fmtM(s.val)}</div>
            <div style={{fontSize:11,color:C.faint,marginTop:3}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:13,color:C.sub}}>증빙자료 업로드 및 수기 입력 · AI 자동 분석 지원</div>
            <Btn primary sm onClick={openAdd}>+ 증빙 추가</Btn>
          </div>
          {(b.vouchers||[]).length===0?(
            <div style={{textAlign:"center",padding:40,color:C.faint,border:`2px dashed ${C.border}`,borderRadius:12}}>
              <div style={{fontSize:32,marginBottom:8}}>📋</div>
              <div style={{fontWeight:600,marginBottom:4}}>증빙을 추가하세요</div>
              <div style={{fontSize:12}}>영수증·세금계산서 등 파일을 업로드하면 AI가 자동으로 항목을 추출합니다</div>
            </div>
          ):(
            <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 120px 110px 60px",background:C.slateLight,padding:"8px 14px",fontSize:11,fontWeight:700,color:C.sub,gap:8}}>
                <span>항목명</span><span>구분</span><span>업체명</span><span style={{textAlign:"right"}}>금액</span><span style={{textAlign:"right"}}>날짜</span><span/>
              </div>
              {(b.vouchers||[]).map((v,i)=>(
                <div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 120px 110px 60px",padding:"10px 14px",borderTop:`1px solid ${C.border}`,gap:8,alignItems:"center",background:i%2===0?C.white:"#fafbfc"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{v.name}</div>
                    <div style={{fontSize:11,color:C.faint}}>{v.category}{v.group?` › ${v.group}`:""}</div>
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
              <div style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 120px 110px 60px",padding:"10px 14px",borderTop:`2px solid ${C.border}`,gap:8,background:C.slateLight,fontWeight:700,fontSize:13}}>
                <span>합계</span><span/><span/><span style={{textAlign:"right",color:C.amber}}>{fmt(spent)}</span><span/><span/>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{marginTop:24}}>
        <div style={{fontSize:14,fontWeight:700,color:C.dark,marginBottom:12}}>📊 예산 vs 실행 비교</div>
        <div>
          {/* 대분류별 바 차트 */}
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            {compareRows.length===0
              ? <div style={{padding:32,textAlign:"center",color:C.faint,fontSize:13,border:`2px dashed ${C.border}`,borderRadius:10}}>
                  견적서 항목을 먼저 추가해주세요
                </div>
              : compareRows.map(r=>{
                  const maxVal=Math.max(r.sales,r.budget,r.actual,1);
                  return (
                    <div key={r.cat} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                        <div style={{fontWeight:700,fontSize:14,color:C.dark}}>{r.cat}</div>
                        <div style={{display:"flex",gap:14,fontSize:12,alignItems:"center"}}>
                          <span style={{color:C.blue}}>매출 <strong>{fmtM(r.sales)}</strong></span>
                          <span style={{color:C.purple}}>실행예산 <strong>{fmtM(r.budget)}</strong></span>
                          <span style={{color:C.amber}}>실제집행 <strong>{fmtM(r.actual)}</strong></span>
                          <span style={{padding:"2px 8px",borderRadius:99,fontWeight:700,fontSize:11,
                            background:r.rate>100?"#fee2e2":r.rate>80?"#fef3c7":"#dcfce7",
                            color:r.rate>100?C.red:r.rate>80?C.amber:C.green}}>
                            집행률 {r.rate}%
                          </span>
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {[
                          {label:"매출",    val:r.sales,  color:C.blue},
                          {label:"실행예산",val:r.budget, color:C.purple},
                          {label:"실제집행",val:r.actual, color:r.actual>r.budget?C.red:C.amber},
                        ].map(bar=>(
                          <div key={bar.label} style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:52,fontSize:11,color:C.faint,textAlign:"right",flexShrink:0}}>{bar.label}</div>
                            <div style={{flex:1,height:10,background:"#f1f5f9",borderRadius:99,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${Math.round(bar.val/maxVal*100)}%`,background:bar.color,borderRadius:99,transition:"width .4s"}}/>
                            </div>
                            <div style={{width:72,fontSize:12,fontWeight:600,color:bar.color,textAlign:"right",flexShrink:0}}>{fmtM(bar.val)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
            }
          </div>

          {/* 합계 테이블 */}
          {compareRows.length>0&&(
            <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 110px 80px",background:C.slateLight,padding:"8px 14px",fontSize:11,fontWeight:700,color:C.sub,gap:8}}>
                <span>대분류</span>
                <span style={{textAlign:"right",color:C.blue}}>매출</span>
                <span style={{textAlign:"right",color:C.purple}}>실행예산</span>
                <span style={{textAlign:"right",color:C.amber}}>실제집행</span>
                <span style={{textAlign:"right"}}>집행률</span>
              </div>
              {compareRows.map((r,i)=>(
                <div key={r.cat} style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 110px 80px",padding:"10px 14px",borderTop:`1px solid ${C.border}`,gap:8,alignItems:"center",background:i%2===0?C.white:"#fafbfc"}}>
                  <span style={{fontWeight:600,fontSize:13}}>{r.cat}</span>
                  <span style={{textAlign:"right",fontSize:13,color:C.blue,fontWeight:600}}>{fmt(r.sales)}</span>
                  <span style={{textAlign:"right",fontSize:13,color:C.purple}}>{fmt(r.budget)}</span>
                  <span style={{textAlign:"right",fontSize:13,color:r.actual>r.budget?C.red:C.amber,fontWeight:600}}>{fmt(r.actual)}</span>
                  <span style={{textAlign:"right"}}>
                    <span style={{fontSize:12,padding:"2px 6px",borderRadius:99,fontWeight:700,
                      background:r.rate>100?C.redLight:r.rate>80?C.amberLight:C.greenLight,
                      color:r.rate>100?C.red:r.rate>80?C.amber:C.green}}>{r.rate}%</span>
                  </span>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 110px 80px",padding:"10px 14px",borderTop:`2px solid ${C.border}`,gap:8,background:C.slateLight,fontWeight:700,fontSize:13}}>
                <span>합계</span>
                <span style={{textAlign:"right",color:C.blue}}>{fmt(compareRows.reduce((s,r)=>s+r.sales,0))}</span>
                <span style={{textAlign:"right",color:C.purple}}>{fmt(compareRows.reduce((s,r)=>s+r.budget,0))}</span>
                <span style={{textAlign:"right",color:C.amber}}>{fmt(compareRows.reduce((s,r)=>s+r.actual,0))}</span>
                <span/>
              </div>
            </div>
          )}
        </div>
      </div>
      {modal&&(
        <Modal title={editV?"증빙 수정":"증빙 추가"} onClose={()=>setModal(false)} wide>
          <div style={{display:"flex",gap:20}}>
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
            <div style={{flex:1,display:"flex",flexWrap:"wrap",gap:12,alignContent:"flex-start"}}>
              <Field label="항목명 *"><input style={{...inp,background:analyzing?C.blueLight:C.white}} value={vf.name} onChange={e=>setVf(v=>({...v,name:e.target.value}))} placeholder="ex. 카메라 렌탈"/></Field>
              <Field label="업체명 / 공급처 *"><input style={{...inp,background:analyzing?C.blueLight:C.white}} value={vf.vendor} onChange={e=>setVf(v=>({...v,vendor:e.target.value}))} placeholder="ex. 씨네렌탈"/></Field>
              <Field label="계산서번호" half><input style={{...inp}} value={vf.number||""} onChange={e=>setVf(v=>({...v,number:e.target.value}))} placeholder="2026-001"/></Field>
              <Field label="날짜" half><input style={inp} type="date" value={vf.date} onChange={e=>setVf(v=>({...v,date:e.target.value}))}/></Field>
              <Field label="금액 (원)"><input style={{...inp,fontWeight:700}} type="number" value={vf.amount} onChange={e=>setVf(v=>({...v,amount:e.target.value}))} placeholder="0"/></Field>
              <Field label="증빙 구분" half>
                <select style={inp} value={vf.type} onChange={e=>setVf(v=>({...v,type:e.target.value}))}>
                  {VOUCHER_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="대분류" half>
                <select style={inp} value={vf.category} onChange={e=>{const cat=e.target.value,grp=groupOptions(cat)[0]||"";setVf(v=>({...v,category:cat,group:grp}));}}>
                  <option value="">- 선택 -</option>
                  {catOptions.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="중분류" half>
                <select style={inp} value={vf.group} onChange={e=>setVf(v=>({...v,group:e.target.value}))}>
                  <option value="">- 선택 -</option>
                  {groupOptions(vf.category).map(g=><option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="메모 / 비고"><input style={inp} value={vf.note||""} onChange={e=>setVf(v=>({...v,note:e.target.value}))} placeholder="특이사항, 용도 등"/></Field>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            {editV&&<Btn danger sm onClick={()=>{removeV(editV);setModal(false);}}>삭제</Btn>}
            <div style={{flex:1}}/>
            <Btn onClick={()=>setModal(false)}>취소</Btn>
            <Btn primary onClick={saveV} disabled={analyzing}>저장</Btn>
          </div>
        </Modal>
      )}

      {preview&&(
        <Modal title={`첨부파일 — ${preview.name}`} onClose={()=>setPreview(null)} wide>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {(preview.files||[]).map((f,i)=>(
              <div key={i} style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",maxWidth:f.type==="application/pdf"?"100%":320,width:f.type==="application/pdf"?"100%":"auto",position:"relative",background:C.slateLight}}>
                {f.type.startsWith("image/")?(
                  <>
                    <img src={f.b64url} alt={f.name} style={{maxWidth:"100%",display:"block",cursor:"zoom-in"}} onClick={()=>setLightboxImg(f.b64url)}/>
                    <button onClick={()=>setLightboxImg(f.b64url)} style={{position:"absolute",top:8,right:8,width:32,height:32,borderRadius:8,border:"none",background:"rgba(0,0,0,.45)",color:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>🔍</button>
                    <div style={{padding:"6px 10px",fontSize:11,color:C.sub,borderTop:`1px solid ${C.border}`,background:C.white}}>{f.name}</div>
                  </>
                ):f.type==="application/pdf"?(
                  <>
                    <iframe src={f.b64url} title={f.name} style={{width:"100%",height:400,border:"none",display:"block"}}/>
                    <div style={{padding:"6px 10px",fontSize:11,color:C.sub,borderTop:`1px solid ${C.border}`,background:C.white,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span>📄 {f.name}</span>
                      <a href={f.b64url} download={f.name} style={{fontSize:11,color:C.blue,textDecoration:"none",fontWeight:600}}>⬇ 다운로드</a>
                    </div>
                  </>
                ):(
                  <div style={{padding:16,textAlign:"center",color:C.sub,fontSize:13}}>📄 {f.name}</div>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {lightboxImg&&(
        <div onClick={()=>setLightboxImg(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out",backdropFilter:"blur(6px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{position:"relative",maxWidth:"90vw",maxHeight:"90vh"}}>
            <img src={lightboxImg} alt="확대 보기" style={{maxWidth:"90vw",maxHeight:"85vh",borderRadius:12,boxShadow:"0 24px 80px rgba(0,0,0,.6)",display:"block",objectFit:"contain"}}/>
            <button onClick={()=>setLightboxImg(null)} style={{position:"absolute",top:-14,right:-14,width:32,height:32,borderRadius:"50%",border:"none",background:"#fff",color:"#1e293b",cursor:"pointer",fontSize:18,fontWeight:700,boxShadow:"0 2px 8px rgba(0,0,0,.3)",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</button>
            <div style={{textAlign:"center",color:"rgba(255,255,255,.6)",fontSize:12,marginTop:10}}>클릭하거나 × 버튼으로 닫기</div>
          </div>
        </div>
      )}
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
          <span/><span>이름</span><span>직책</span><span style={{textAlign:"center"}}>경영관리열람</span><span style={{textAlign:"center"}}>멤버관리</span><span>비밀번호</span><span/>
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
                <div><div style={{fontWeight:600}}>💰 경영관리 열람</div><div style={{fontSize:11,color:C.faint}}>경영관리 대시보드, 결산서</div></div>
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
  // 피드백 마감일을 가상 이벤트로 생성
  const feedbackEvents = (project.feedbacks||[])
    .filter(fb => fb.dueDate && fb.taskStatus !== "done")
    .map(fb => ({
      id: "fb-"+fb.id,
      title: "[피드백] "+(fb.title||"(제목없음)"),
      start: fb.dueDate,
      end: fb.dueDate,
      color: "#8b5cf6",
      isFeedback: true,
    }));
  const allEvents = [...events, ...feedbackEvents];
  const eventsOn = (date) => allEvents.filter(e => e.start <= date && date <= (e.end||e.start));
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

  // 구글 캘린더 자동 연동
  const syncToGoogleCalendar = async () => {
    const CLIENT_ID = "22645531970-kje71cnuacg1oj8kmsolm6g85556a3vu.apps.googleusercontent.com";
    const SCOPE = "https://www.googleapis.com/auth/calendar.events";

    // 1. Google Identity Services 로드
    if (!window.google?.accounts?.oauth2) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    // 2. Access Token 요청
    const token = await new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (resp) => {
          if (resp.error) reject(new Error(resp.error));
          else resolve(resp.access_token);
        },
      });
      client.requestAccessToken();
    });

    // 3. 일정 업로드
    const eventsToSync = allEvents.filter(e => !e.isFeedback);
    let success = 0, fail = 0;

    for (const ev of eventsToSync) {
      const body = {
        summary: ev.title,
        description: ev.note || "",
        start: { date: ev.start },
        end:   { date: ev.end || ev.start },
        colorId: "1",
      };
      try {
        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) success++; else fail++;
      } catch { fail++; }
    }

    alert(`구글 캘린더 연동 완료!\n✅ 성공: ${success}건${fail > 0 ? "\n❌ 실패: " + fail + "건" : ""}`);
  };

  const exportCalPPT = async () => {
    // pptxgenjs를 CDN에서 동적 로드
    if (!window.PptxGenJS) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const PptxGenJS = window.PptxGenJS;
    const pres = new PptxGenJS();
    pres.layout = "LAYOUT_16x9";
    pres.title = `${project.name} 일정표`;

    const NAVY = "1E3A5F";
    const BLUE = "2563EB";
    const LIGHT = "EFF6FF";
    const WHITE = "FFFFFF";
    const GRAY = "64748B";
    const BORDER = "CBD5E1";
    const DAYS_KO = ["일","월","화","수","목","금","토"];
    const fmtDate = s => s ? s.replace(/-/g,".") : "";
    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

    // ── 표지 슬라이드 ──────────────────────────────────
    const cover = pres.addSlide();
    cover.background = { color: NAVY };
    cover.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:0.35, h:5.625, fill:{ color: BLUE } });
    cover.addShape(pres.shapes.RECTANGLE, { x:0.35, y:3.8, w:9.65, h:1.825, fill:{ color:"1E3A5F", transparency:0 } });
    cover.addText(project.name, { x:0.7, y:1.2, w:8.8, h:1.4, fontSize:40, bold:true, color:WHITE, fontFace:"Calibri", align:"left" });
    cover.addText("프로젝트 일정표", { x:0.7, y:2.5, w:8.8, h:0.5, fontSize:18, color:"BFDBFE", fontFace:"Calibri", align:"left" });
    const infoLines = [];
    if(project.client) infoLines.push(project.client);
    if(project.format) infoLines.push(project.format);
    if(project.due) infoLines.push(`납품일 ${fmtDate(project.due)}`);
    infoLines.push(`출력일 ${today.getFullYear()}.${today.getMonth()+1}.${today.getDate()}`);
    cover.addText(infoLines.join("  ·  "), { x:0.7, y:4.0, w:8.8, h:0.5, fontSize:13, color:"93C5FD", fontFace:"Calibri", align:"left" });

    // ── 3개월 캘린더 슬라이드 ──────────────────────────
    const monthsToRender = [0,1,2].map(offset => {
      let m = baseMonth + offset, y = baseYear;
      if(m > 11){ m -= 12; y++; }
      return {year:y, month:m};
    });

    monthsToRender.forEach(({year, month}) => {
      const slide = pres.addSlide();
      slide.background = { color: "F8FAFC" };

      // 헤더 바
      slide.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.75, fill:{ color: NAVY } });
      slide.addText(`${year}년 ${month+1}월`, { x:0.4, y:0, w:5, h:0.75, fontSize:20, bold:true, color:WHITE, fontFace:"Calibri", valign:"middle", margin:0 });
      slide.addText(project.name, { x:5, y:0, w:4.7, h:0.75, fontSize:12, color:"93C5FD", fontFace:"Calibri", valign:"middle", align:"right", margin:0 });

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month+1, 0).getDate();
      const cells = [];
      for(let i=0;i<firstDay;i++) cells.push(null);
      for(let d=1;d<=daysInMonth;d++) cells.push(d);
      while(cells.length % 7 !== 0) cells.push(null);

      const numWeeks = cells.length / 7;
      const calTop = 0.95;
      const calH = 4.5;
      const cellW = 10/7;
      const dayHdrH = 0.35;
      const cellH = (calH - dayHdrH) / numWeeks;

      // 요일 헤더
      DAYS_KO.forEach((d,i) => {
        const col = i === 0 ? "EF4444" : i === 6 ? BLUE : GRAY;
        slide.addShape(pres.shapes.RECTANGLE, { x: i*cellW, y: calTop, w: cellW, h: dayHdrH, fill:{ color: "F1F5F9" }, line:{ color: BORDER, pt:0.5 } });
        slide.addText(d, { x: i*cellW, y: calTop, w: cellW, h: dayHdrH, fontSize:11, bold:true, color: col, align:"center", valign:"middle", margin:0 });
      });

      // 날짜 셀
      cells.forEach((d, idx) => {
        const row = Math.floor(idx/7);
        const col = idx%7;
        const cx = col * cellW;
        const cy = calTop + dayHdrH + row * cellH;

        if(!d) {
          slide.addShape(pres.shapes.RECTANGLE, { x:cx, y:cy, w:cellW, h:cellH, fill:{ color:"F8FAFC" }, line:{ color:BORDER, pt:0.5 } });
          return;
        }
        const dateKey = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const isToday = dateKey === todayKey;
        const dayEvs = allEvents.filter(e => e.start <= dateKey && dateKey <= (e.end||e.start));
        const dow = col;

        slide.addShape(pres.shapes.RECTANGLE, { x:cx, y:cy, w:cellW, h:cellH, fill:{ color: isToday ? LIGHT : WHITE }, line:{ color: isToday ? BLUE : BORDER, pt: isToday ? 1 : 0.5 } });

        const numColor = dow===0 ? "EF4444" : dow===6 ? BLUE : isToday ? BLUE : "1E293B";
        // 오늘 날짜 원형 배경
        if(isToday) {
          slide.addShape(pres.shapes.OVAL, { x: cx + cellW/2 - 0.12, y: cy + 0.04, w: 0.24, h: 0.24, fill:{ color: BLUE }, line:{ color: BLUE, pt:0 } });
          slide.addText(String(d), { x:cx, y:cy+0.04, w:cellW, h:0.24, fontSize:10, bold:true, color:WHITE, align:"center", valign:"middle", margin:0 });
        } else {
          slide.addText(String(d), { x:cx, y:cy+0.06, w:cellW, h:0.22, fontSize:10, bold:false, color:numColor, align:"center", margin:0 });
        }

        // 이벤트 표시 (최대 3개)
        dayEvs.slice(0,3).forEach((ev, ei) => {
          const evY = cy + 0.3 + ei * (cellH < 0.9 ? 0.19 : 0.22);
          if(evY + 0.18 > cy + cellH) return;
          const evColor = ev.isFeedback ? "8B5CF6" : ev.color.replace("#","");
          const evBg = ev.isFeedback ? "F5F3FF" : evColor + "22";
          slide.addShape(pres.shapes.RECTANGLE, { x:cx+0.04, y:evY, w:cellW-0.08, h:0.18, fill:{ color: evBg }, line:{ color: evColor, pt:0.5 } });
          slide.addText(ev.title, { x:cx+0.06, y:evY, w:cellW-0.12, h:0.18, fontSize:7, color:evColor, bold:true, valign:"middle", margin:0 });
        });
        if(dayEvs.length > 3) {
          slide.addText(`+${dayEvs.length-3}`, { x:cx, y:cy+cellH-0.2, w:cellW, h:0.2, fontSize:7, color:GRAY, align:"center", margin:0 });
        }
      });
    });

    // ── 일정 목록 슬라이드 ────────────────────────────
    const sortedEvs = [...allEvents].sort((a,b) => a.start.localeCompare(b.start));
    if(sortedEvs.length > 0) {
      const ROWS_PER_SLIDE = 14;
      const chunks = [];
      for(let i=0; i<sortedEvs.length; i+=ROWS_PER_SLIDE) chunks.push(sortedEvs.slice(i,i+ROWS_PER_SLIDE));

      chunks.forEach((chunk, pi) => {
        const ls = pres.addSlide();
        ls.background = { color: "F8FAFC" };
        ls.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.75, fill:{ color: NAVY } });
        ls.addText(`📋 일정 목록${chunks.length>1 ? ` (${pi+1}/${chunks.length})` : ""}`, { x:0.4, y:0, w:7, h:0.75, fontSize:20, bold:true, color:WHITE, fontFace:"Calibri", valign:"middle", margin:0 });
        ls.addText(project.name, { x:5, y:0, w:4.7, h:0.75, fontSize:12, color:"93C5FD", fontFace:"Calibri", valign:"middle", align:"right", margin:0 });

        // 테이블 헤더
        const tblTop = 0.9;
        const rowH = 0.31;
        const cols = [{label:"일정명",x:0.3,w:4.5},{label:"시작일",x:4.8,w:1.5},{label:"종료일",x:6.3,w:1.5},{label:"메모",x:7.8,w:1.9}];
        cols.forEach(col => {
          ls.addShape(pres.shapes.RECTANGLE, { x:col.x, y:tblTop, w:col.w, h:rowH, fill:{color:"1E40AF"}, line:{color:"1E40AF",pt:0} });
          ls.addText(col.label, { x:col.x+0.06, y:tblTop, w:col.w-0.06, h:rowH, fontSize:11, bold:true, color:WHITE, valign:"middle", margin:0 });
        });
        // 행
        chunk.forEach((ev, ri) => {
          const ry = tblTop + rowH * (ri+1);
          const bg = ri%2===0 ? WHITE : "F8FAFC";
          ls.addShape(pres.shapes.RECTANGLE, { x:0.3, y:ry, w:9.4, h:rowH, fill:{color:bg}, line:{color:BORDER,pt:0.3} });
          const evColor = (ev.isFeedback ? "8B5CF6" : ev.color.replace("#","")) || BLUE;
          ls.addShape(pres.shapes.OVAL, { x:0.36, y:ry+rowH/2-0.07, w:0.14, h:0.14, fill:{color:evColor}, line:{color:evColor,pt:0} });
          ls.addText(ev.title+(ev.isFeedback?" [피드백]":""), { x:0.55, y:ry, w:4.2, h:rowH, fontSize:10, color:"1E293B", bold:!!ev.isFeedback, valign:"middle", margin:0 });
          ls.addText(fmtDate(ev.start), { x:4.8, y:ry, w:1.5, h:rowH, fontSize:10, color:GRAY, align:"center", valign:"middle", margin:0 });
          ls.addText(fmtDate(ev.end||ev.start), { x:6.3, y:ry, w:1.5, h:rowH, fontSize:10, color:GRAY, align:"center", valign:"middle", margin:0 });
          ls.addText(ev.note||"", { x:7.8, y:ry, w:1.9, h:rowH, fontSize:9, color:GRAY, valign:"middle", margin:0 });
        });
      });
    }

    await pres.writeFile({ fileName: `${project.name}_일정표.pptx` });
  };

  const exportCalPDF = () => {
    const DAYS = ["일","월","화","수","목","금","토"];
    const fmtDate = s => s ? s.replace(/-/g,".") : "";
    // 현재 보이는 3개월 수집
    const monthsToRender = [0,1,2].map(offset => {
      let m = baseMonth + offset, y = baseYear;
      if(m > 11){ m -= 12; y++; }
      return {year:y, month:m};
    });

    const renderMonth = ({year, month}) => {
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month+1, 0).getDate();
      const cells = [];
      for(let i=0;i<firstDay;i++) cells.push(null);
      for(let d=1;d<=daysInMonth;d++) cells.push(d);
      const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

      let rows = "";
      let week = [...cells.slice(0, Math.ceil(cells.length/7)*7)];
      // pad to multiple of 7
      while(week.length % 7 !== 0) week.push(null);
      for(let r=0; r<week.length/7; r++){
        let rowHtml = "<tr>";
        for(let c=0;c<7;c++){
          const d = week[r*7+c];
          if(!d){ rowHtml += `<td style="background:#fafafa;border:1px solid #e4e7ec;height:90px;vertical-align:top;padding:4px;"></td>`; continue; }
          const dateKey = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const dayEvs = allEvents.filter(e => e.start <= dateKey && dateKey <= (e.end||e.start));
          const isToday = dateKey === todayKey;
          const dow = (firstDay+d-1)%7;
          const numColor = dow===0?"#ef4444":dow===6?"#2563eb":"#1e293b";
          let evHtml = "";
          dayEvs.slice(0,4).forEach(ev=>{
            const bg = ev.isFeedback?"#f5f3ff":ev.color+"22";
            const col = ev.isFeedback?"#8b5cf6":ev.color;
            const bl = ev.isFeedback?"2px solid #8b5cf6":"none";
            evHtml += `<div style="font-size:9px;padding:1px 4px;border-radius:3px;background:${bg};color:${col};font-weight:600;margin-bottom:1px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;border-left:${bl}">${ev.title}</div>`;
          });
          if(dayEvs.length>4) evHtml += `<div style="font-size:8px;color:#94a3b8;text-align:center">+${dayEvs.length-4}</div>`;
          const numStyle = isToday
            ? `display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#2563eb;color:#fff;font-size:11px;font-weight:800;`
            : `font-size:12px;font-weight:${isToday?800:400};color:${numColor};`;
          rowHtml += `<td style="border:1px solid #e4e7ec;height:90px;vertical-align:top;padding:4px;background:${isToday?"#eff6ff":"#fff"}"><div style="${numStyle}margin-bottom:2px;">${d}</div>${evHtml}</td>`;
        }
        rowHtml += "</tr>";
        rows += rowHtml;
      }
      return `
        <div style="margin-bottom:24px;break-inside:avoid;">
          <div style="font-weight:800;font-size:15px;color:#1e293b;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #2563eb;">${year}년 ${month+1}월</div>
          <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <thead><tr>${DAYS.map((d,i)=>`<th style="text-align:center;padding:6px 2px;font-size:11px;font-weight:700;color:${i===0?"#ef4444":i===6?"#2563eb":"#6b7280"};background:#f8fafc;border:1px solid #e4e7ec;">${d}</th>`).join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    };

    // 이벤트 목록
    const sortedEvs = [...allEvents].sort((a,b)=>a.start.localeCompare(b.start));
    let evListHtml = "";
    if(sortedEvs.length > 0){
      evListHtml = `
        <div style="break-before:auto;margin-top:20px;">
          <div style="font-weight:800;font-size:14px;color:#1e293b;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #2563eb;">📋 일정 목록 (${sortedEvs.length}건)</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead><tr>
              <th style="padding:6px 10px;background:#1e40af;color:#fff;text-align:left;border-radius:4px 0 0 0;">일정명</th>
              <th style="padding:6px 10px;background:#1e40af;color:#fff;text-align:center;">시작일</th>
              <th style="padding:6px 10px;background:#1e40af;color:#fff;text-align:center;">종료일</th>
              <th style="padding:6px 10px;background:#1e40af;color:#fff;text-align:left;border-radius:0 4px 0 0;">메모</th>
            </tr></thead>
            <tbody>${sortedEvs.map((ev,i)=>`
              <tr style="background:${i%2===0?"#fff":"#f8fafc"}">
                <td style="padding:6px 10px;border-bottom:1px solid #e4e7ec;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ev.isFeedback?"#8b5cf6":ev.color};margin-right:5px;vertical-align:middle;"></span>
                  <span style="font-weight:600;color:${ev.isFeedback?"#8b5cf6":"#1e293b"}">${ev.title}</span>
                  ${ev.isFeedback?`<span style="font-size:9px;margin-left:4px;padding:1px 5px;background:#f5f3ff;color:#8b5cf6;border-radius:99px;">피드백</span>`:""}
                </td>
                <td style="padding:6px 10px;border-bottom:1px solid #e4e7ec;text-align:center;color:#475569;">${fmtDate(ev.start)}</td>
                <td style="padding:6px 10px;border-bottom:1px solid #e4e7ec;text-align:center;color:#475569;">${fmtDate(ev.end||ev.start)}</td>
                <td style="padding:6px 10px;border-bottom:1px solid #e4e7ec;color:#6b7280;">${ev.note||""}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    }

    const printDate = `${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일`;
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
<title>${project.name} — 일정표</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans KR',sans-serif;background:#f8fafc;color:#1e293b;font-size:13px}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:12mm 12mm 14mm}
.no-print{background:#1e40af;padding:12px 20px;display:flex;align-items:center;justify-content:space-between}
@media print{body{background:#fff}.page{margin:0;padding:10mm}.no-print{display:none}@page{size:A4;margin:10mm}}
</style></head><body>
<div class="no-print">
  <span style="color:#fff;font-weight:700;font-size:14px;">📅 ${project.name} — 일정표 미리보기</span>
  <button onclick="window.print()" style="background:#fff;color:#1e40af;border:none;padding:8px 20px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">🖨️ PDF 저장 / 인쇄</button>
</div>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #2563eb;">
    <div>
      <div style="font-size:22px;font-weight:800;color:#1e293b;">${project.name}</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;">${project.client||""} ${project.format?`· ${project.format}`:""} ${project.due?`· 납품일 ${fmtDate(project.due)}`:""}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#94a3b8;">
      <div>📅 일정표</div>
      <div>${printDate} 출력</div>
    </div>
  </div>
  ${monthsToRender.map(renderMonth).join("")}
  ${evListHtml}
</div></body></html>`;

    const blob = new Blob([html],{type:"text/html;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.target="_blank"; a.rel="noopener";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),3000);
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
                <div style={{fontWeight:isToday?800:400,marginBottom:3,textAlign:"center",
                  ...(isToday?{background:C.blue,color:"#fff",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 3px",fontSize:12}:{fontSize:13,color:dow===0?"#ef4444":dow===6?"#2563eb":C.dark})}}>
                  {d}
                </div>
                {dayEvs.slice(0,3).map(ev=>(
                  <div key={ev.id} onClick={e=>{if(!ev.isFeedback) openEdit(ev,e); else e.stopPropagation();}}
                    style={{fontSize:11,padding:"2px 5px",borderRadius:4,
                      background:ev.isFeedback?"#f5f3ff":ev.color+"22",
                      color:ev.isFeedback?"#8b5cf6":ev.color,
                      fontWeight:600,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      cursor:ev.isFeedback?"default":canEdit?"pointer":"default",
                      lineHeight:1.5,borderLeft:ev.isFeedback?"2px solid #8b5cf6":"none"}}>
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
          {allEvents.length>0&&<button onClick={exportCalPPT} style={{padding:"6px 14px",borderRadius:8,border:`1px solid #7c3aed`,background:"#f5f3ff",color:"#7c3aed",cursor:"pointer",fontSize:12,fontWeight:600}}>📊 PPT로 내보내기</button>}
          {allEvents.length>0&&<button onClick={exportCalPDF} style={{padding:"6px 14px",borderRadius:8,border:`1px solid #dc2626`,background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontSize:12,fontWeight:600}}>📄 PDF로 내보내기</button>}
          {allEvents.filter(e=>!e.isFeedback).length>0&&(
            <button onClick={syncToGoogleCalendar} style={{padding:"6px 14px",borderRadius:8,border:"1px solid #16a34a",background:"#f0fdf4",color:"#16a34a",cursor:"pointer",fontSize:12,fontWeight:600}}>
              🔄 구글 캘린더 연동
            </button>
          )}
          {events.length>0&&<button onClick={exportICal} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.blue}`,background:C.blueLight,color:C.blue,cursor:"pointer",fontSize:12,fontWeight:600}}>📅 .ics 내보내기</button>}
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
  { label:"PRODUCTION",        roles:["촬영감독","촬영 1st","촬영 2nd","촬영 3rd","DIT"] },
  { label:"조명",        roles:["조명감독","조명 1st","조명 Grip"] },
  { label:"미술",        roles:["미술감독","소품"] },
  { label:"POST",      roles:["편집","DI","2D","3D","FLAME","녹음실","음악감독","성우"] },
  { label:"기타",        roles:["메이킹","작가","기타"] },
];

// ═══════════════════════════════════════════════════════════
// 스탭리스트
// ═══════════════════════════════════════════════════════════
function StaffList({ project, onChange, accounts }) {
  const staff = project.staff || [];
  const [modal, setModal] = useState(false);
  const [editS, setEditS] = useState(null);
  const [sf, setSf] = useState({});
  const [conf, setConf] = useState(null);
  const [filterGroup, setFilterGroup] = useState("전체");

  const openAdd = () => {
    setEditS(null);
    setSf({ role: STAFF_ROLES[0], name: "", phone: "", email: "", company: "", note: "", fee: "", feeType: "건", confirmed: false });
    setModal(true);
  };
  const openEdit = s => { setEditS(s); setSf({ ...s }); setModal(true); };

  const save = () => {
    if (!sf.name?.trim()) return;
    const entry = { ...sf, id: editS ? editS.id : "s" + Date.now() };
    const list = editS
      ? staff.map(s => s.id === editS.id ? entry : s)
      : [...staff, entry];
    onChange(p => ({ ...p, staff: list }));
    setModal(false);
  };

  const del = id => {
    onChange(p => ({ ...p, staff: staff.filter(s => s.id !== id) }));
    setConf(null);
  };

  const toggleConfirm = id => {
    onChange(p => ({
      ...p,
      staff: staff.map(s => s.id === id ? { ...s, confirmed: !s.confirmed } : s)
    }));
  };

  // 그룹 필터링
  const groupLabels = ["전체", ...STAFF_GROUPS.map(g => g.label)];
  const visibleStaff = filterGroup === "전체"
    ? staff
    : staff.filter(s => {
        const grp = STAFF_GROUPS.find(g => g.roles.includes(s.role));
        return grp?.label === filterGroup;
      });

  // 그룹별 정렬
  const getRoleOrder = role => {
    for (let i = 0; i < STAFF_GROUPS.length; i++) {
      const idx = STAFF_GROUPS[i].roles.indexOf(role);
      if (idx !== -1) return i * 100 + idx;
    }
    return 9999;
  };
  const sorted = [...visibleStaff].sort((a, b) => getRoleOrder(a.role) - getRoleOrder(b.role));

  // 그룹별 합계
  const totalFee = staff.reduce((s, m) => s + (Number(m.fee) || 0), 0);
  const confirmedCount = staff.filter(s => s.confirmed).length;

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>👤 스탭리스트</h3>
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.sub }}>
            <span>총 <b style={{ color: C.text }}>{staff.length}명</b></span>
            <span>컨펌 <b style={{ color: C.green }}>{confirmedCount}명</b></span>
            <span>미컨펌 <b style={{ color: C.amber }}>{staff.length - confirmedCount}명</b></span>
            {totalFee > 0 && <span>총 스탭비 <b style={{ color: C.blue }}>{totalFee.toLocaleString("ko-KR")}원</b></span>}
          </div>
        </div>
        <Btn primary onClick={openAdd}>+ 스탭 추가</Btn>
      </div>

      {/* 그룹 필터 탭 */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {groupLabels.map(g => (
          <button key={g} onClick={() => setFilterGroup(g)}
            style={{
              padding: "5px 14px", borderRadius: 99, border: `1.5px solid ${filterGroup === g ? C.blue : C.border}`,
              background: filterGroup === g ? C.blueLight : "#fff",
              color: filterGroup === g ? C.blue : C.sub,
              fontSize: 12, fontWeight: filterGroup === g ? 700 : 400, cursor: "pointer"
            }}>
            {g}
            {g !== "전체" && (
              <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>
                ({staff.filter(s => STAFF_GROUPS.find(x => x.label === g)?.roles.includes(s.role)).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 스탭 테이블 */}
      {sorted.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: C.faint, fontSize: 13, border: `2px dashed ${C.border}`, borderRadius: 12 }}>
          스탭을 추가해주세요
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          {/* 컬럼 헤더 */}
          <div style={{ display: "grid", gridTemplateColumns: "110px 90px 1fr 120px 120px 90px 70px 60px", background: C.slateLight, padding: "9px 14px", fontSize: 11, fontWeight: 700, color: C.sub, gap: 8 }}>
            <span>파트/직책</span><span>이름</span><span>소속/업체</span><span>연락처</span><span>이메일</span><span style={{ textAlign: "right" }}>스탭비</span><span style={{ textAlign: "center" }}>컨펌</span><span />
          </div>

          {/* 그룹별 행 */}
          {STAFF_GROUPS.map(grp => {
            const members = sorted.filter(s => grp.roles.includes(s.role));
            if (!members.length) return null;
            const showGroup = filterGroup === "전체";
            return (
              <div key={grp.label}>
                {showGroup && (
                  <div style={{ padding: "7px 14px", background: "#f0f4ff", borderTop: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, color: C.blue }}>
                    {grp.label}
                  </div>
                )}
                {members.map((s, i) => (
                  <div key={s.id}
                    style={{ display: "grid", gridTemplateColumns: "110px 90px 1fr 120px 120px 90px 70px 60px", padding: "10px 14px", borderTop: `1px solid ${C.border}`, gap: 8, alignItems: "center", background: s.confirmed ? "#f8fffe" : i % 2 === 0 ? C.white : "#fafbfc" }}>
                    {/* 직책 */}
                    <div>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 99, background: C.purpleLight, color: C.purple, fontWeight: 700 }}>{s.role}</span>
                    </div>
                    {/* 이름 */}
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                    {/* 소속 + 메모 */}
                    <div>
                      {s.company && <div style={{ fontSize: 12, color: C.sub }}>{s.company}</div>}
                      {s.note && <div style={{ fontSize: 11, color: C.faint }}>{s.note}</div>}
                    </div>
                    {/* 연락처 */}
                    <div style={{ fontSize: 12, color: C.sub }}>
                      {s.phone ? <a href={`tel:${s.phone}`} style={{ color: C.blue, textDecoration: "none" }}>📞 {s.phone}</a> : <span style={{ color: C.border }}>—</span>}
                    </div>
                    {/* 이메일 */}
                    <div style={{ fontSize: 11, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.email ? <a href={`mailto:${s.email}`} style={{ color: C.blue, textDecoration: "none" }}>✉️ {s.email}</a> : <span style={{ color: C.border }}>—</span>}
                    </div>
                    {/* 스탭비 */}
                    <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600 }}>
                      {s.fee ? `${Number(s.fee).toLocaleString("ko-KR")}원` : <span style={{ color: C.border }}>—</span>}
                      {s.fee && s.feeType && <div style={{ fontSize: 10, color: C.faint }}>/{s.feeType}</div>}
                    </div>
                    {/* 컨펌 */}
                    <div style={{ textAlign: "center" }}>
                      <button onClick={() => toggleConfirm(s.id)}
                        style={{ padding: "3px 8px", borderRadius: 6, border: `1.5px solid ${s.confirmed ? C.green : C.border}`, background: s.confirmed ? C.greenLight : "#fff", color: s.confirmed ? C.green : C.faint, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {s.confirmed ? "✅" : "⬜"}
                      </button>
                    </div>
                    {/* 액션 */}
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <button onClick={() => openEdit(s)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14 }}>✏️</button>
                      <button onClick={() => setConf(s)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14 }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* 합계 행 */}
          {totalFee > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "110px 90px 1fr 120px 120px 90px 70px 60px", padding: "10px 14px", borderTop: `2px solid ${C.border}`, gap: 8, background: "#f0f4ff" }}>
              <span /><span /><span /><span /><span />
              <span style={{ textAlign: "right", fontWeight: 800, fontSize: 13, color: C.blue }}>
                총 {totalFee.toLocaleString("ko-KR")}원
              </span>
              <span /><span />
            </div>
          )}
        </div>
      )}

      {/* 추가/수정 모달 */}
      {modal && (
        <Modal title={editS ? "스탭 수정" : "스탭 추가"} onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Field label="직책 *" half>
              <select style={inp} value={sf.role || STAFF_ROLES[0]} onChange={e => setSf(v => ({ ...v, role: e.target.value }))}>
                {STAFF_GROUPS.map(grp => (
                  <optgroup key={grp.label} label={grp.label}>
                    {grp.roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="이름 *" half>
              <input style={inp} autoFocus value={sf.name || ""} onChange={e => setSf(v => ({ ...v, name: e.target.value }))} placeholder="홍길동" />
            </Field>
            <Field label="소속 / 업체" half>
              <input style={inp} value={sf.company || ""} onChange={e => setSf(v => ({ ...v, company: e.target.value }))} placeholder="프리랜서 / 회사명" />
            </Field>
            <Field label="연락처" half>
              <input style={inp} value={sf.phone || ""} onChange={e => setSf(v => ({ ...v, phone: e.target.value }))} placeholder="010-0000-0000" />
            </Field>
            <Field label="이메일">
              <input style={inp} value={sf.email || ""} onChange={e => setSf(v => ({ ...v, email: e.target.value }))} placeholder="name@email.com" />
            </Field>
            <Field label="스탭비 (원)" half>
              <input style={inp} type="number" value={sf.fee || ""} onChange={e => setSf(v => ({ ...v, fee: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="단위" half>
              <select style={inp} value={sf.feeType || "건"} onChange={e => setSf(v => ({ ...v, feeType: e.target.value }))}>
                {["건", "일", "시간", "회"].map(u => <option key={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="메모">
              <input style={inp} value={sf.note || ""} onChange={e => setSf(v => ({ ...v, note: e.target.value }))} placeholder="특이사항, 계약 내용 등" />
            </Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, marginBottom: 16, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${sf.confirmed ? C.green : C.border}`, background: sf.confirmed ? C.greenLight : "#fff" }}>
            <input type="checkbox" checked={!!sf.confirmed} onChange={e => setSf(v => ({ ...v, confirmed: e.target.checked }))} style={{ accentColor: C.green, width: 16, height: 16 }} />
            ✅ 컨펌 완료 (섭외/계약 확정)
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {editS && <Btn danger sm onClick={() => { del(editS.id); setModal(false); }}>삭제</Btn>}
            <div style={{ flex: 1 }} />
            <Btn onClick={() => setModal(false)}>취소</Btn>
            <Btn primary onClick={save} disabled={!sf.name?.trim()}>저장</Btn>
          </div>
        </Modal>
      )}

      {/* 삭제 확인 */}
      {conf && (
        <Modal title="스탭 삭제" onClose={() => setConf(null)}>
          <div style={{ fontSize: 14, marginBottom: 20 }}><b>{conf.name}</b> ({conf.role})을 삭제하시겠습니까?</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn onClick={() => setConf(null)}>취소</Btn>
            <Btn danger onClick={() => del(conf.id)}>삭제</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 피드백 히스토리
// ═══════════════════════════════════════════════════════════
// ── 댓글 입력 컴포넌트 (버튼 방식 멘션) ──────────────────────────────
function CommentInput({ accounts, user, onSubmit }) {
  const [text, setText] = useState("");
  const [showMention, setShowMention] = useState(false);
  const taRef = useRef(null);

  const insertMention = (name) => {
    const ta = taRef.current;
    const pos = ta ? ta.selectionStart : text.length;
    const newText = text.slice(0, pos) + "@" + name + " " + text.slice(pos);
    setText(newText);
    setShowMention(false);
    setTimeout(() => { ta && ta.focus(); }, 0);
  };

  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
    setShowMention(false);
  };

  const others = accounts.filter(a => a.name !== user.name);

  return (
    <div style={{position:"relative"}}>
      {/* 멘션 팝업 */}
      {showMention && (
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,
          boxShadow:"0 6px 20px rgba(0,0,0,.1)",marginBottom:4,overflow:"hidden"}}>
          <div style={{padding:"6px 12px",fontSize:11,fontWeight:700,color:"#64748b",
            background:"#f8fafc",borderBottom:"1px solid #f1f5f9"}}>
            멘션할 팀원 선택
          </div>
          {others.length === 0
            ? <div style={{padding:"12px",fontSize:12,color:"#94a3b8",textAlign:"center"}}>다른 팀원이 없습니다</div>
            : others.map(a => (
              <div key={a.id}
                onMouseDown={e => { e.preventDefault(); insertMention(a.name); }}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",
                  borderBottom:"1px solid #f8fafc"}}
                onMouseEnter={e => e.currentTarget.style.background="#eff6ff"}
                onMouseLeave={e => e.currentTarget.style.background=""}>
                <div style={{width:26,height:26,borderRadius:"50%",background:"#2563eb",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>
                  {a.name[0]}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{a.name}</div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>{a.role}</div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
        <div style={{flex:1,position:"relative"}}>
          <textarea
            ref={taRef}
            value={text}
            rows={2}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (showMention && e.key === "Escape") { e.preventDefault(); setShowMention(false); return; }
              if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); submit(); }
            }}
            placeholder="댓글 입력  (Shift+Enter 전송 · Enter 줄바꿈)"
            style={{width:"100%",padding:"8px 12px",paddingRight:others.length>0?"38px":"12px",
              borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,resize:"none",
              lineHeight:1.6,fontFamily:"inherit",outline:"none",
              background:"#fff",color:"#1e293b",boxSizing:"border-box"}}
          />
          {others.length > 0 && (
            <button
              onMouseDown={e => { e.preventDefault(); setShowMention(v => !v); taRef.current?.focus(); }}
              style={{position:"absolute",right:8,top:7,padding:"2px 7px",borderRadius:5,
                border:"1px solid #e2e8f0",background:showMention?"#eff6ff":"#f8fafc",
                color:showMention?"#2563eb":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              @
            </button>
          )}
        </div>
        <button
          onMouseDown={e => { e.preventDefault(); submit(); }}
          disabled={!text.trim()}
          style={{padding:"0 16px",height:52,borderRadius:8,border:"none",
            background:text.trim()?"#2563eb":"#e2e8f0",
            color:text.trim()?"#fff":"#94a3b8",
            fontSize:13,fontWeight:700,cursor:text.trim()?"pointer":"default",
            whiteSpace:"nowrap",flexShrink:0}}>
          전송
        </button>
      </div>
      <div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>
        Shift+Enter 전송 · Enter 줄바꿈 · @ 버튼으로 멘션
      </div>
    </div>
  );
}
function FeedbackTab({project, patchProj, user, accounts, setNotifications}) {
  const feedbacks = project.feedbacks || [];
  const [modal, setModal] = useState(null);
  const [ff, setFf] = useState({});
  const [detail, setDetail] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [mentionSuggest, setMentionSuggest] = useState([]);
  const [mentionIdx, setMentionIdx] = useState(-1);
  const commentRef = useRef(null);
  const composingRef = useRef(false);

  const today = () => { const d=new Date(),p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };

  // PD 관점 상태 (긴급도)
  const PD_ST = [
    {id:"urgent",   label:"긴급",  color:"#ef4444", bg:"#fef2f2", icon:"🔴"},
    {id:"relaxed",  label:"여유",  color:"#16a34a", bg:"#f0fdf4", icon:"🟢"},
    {id:"gathering",label:"취합중",color:"#f59e0b", bg:"#fffbeb", icon:"🟡"},
  ];
  // 담당자 관점 상태 (진행상태)
  const TASK_ST = [
    {id:"review",   label:"검토",   color:"#6366f1", bg:"#eef2ff", icon:"🔍"},
    {id:"inprogress",label:"진행중", color:"#0891b2", bg:"#ecfeff", icon:"⚙️"},
    {id:"hold",     label:"보류",   color:"#94a3b8", bg:"#f8fafc", icon:"⏸"},
    {id:"done",     label:"완료",   color:"#16a34a", bg:"#f0fdf4", icon:"✅"},
  ];

  const isPD = user.role==="PD"||user.role==="대표"||user.role==="EPD";
  const isAssignee = (fb) => (fb.assignees||[]).includes(user.name);

  const openAdd = () => {
    setFf({receivedDate:today(), dueDate:"", title:"", content:"", assignees:[], pdStatus:"urgent", taskStatus:"review", fileUrl:"", detail:"", images:[], tags:[], customTag:""});
    setModal("add");
  };
  const openEdit = fb => { setFf({...fb, assignees:fb.assignees||[], images:fb.images||[], tags:fb.tags||[], customTag:""}); setModal("edit"); };

  const toggleAssignee = (name) => setFf(v => {
    const cur = v.assignees||[];
    return {...v, assignees: cur.includes(name) ? cur.filter(n=>n!==name) : [...cur, name]};
  });

  const toggleTag = (tag) => setFf(v=>{
    const cur = v.tags||[];
    return {...v, tags: cur.includes(tag)?cur.filter(t=>t!==tag):[...cur, tag]};
  });
  const addCustomTag = () => {
    const t = (ff.customTag||"").trim();
    if(!t || (ff.tags||[]).includes(t)) return;
    setFf(v=>({...v, tags:[...(v.tags||[]), t], customTag:""}));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if(!files.length) return;
    setUploading(true);
    setUploadError("");
    e.target.value = "";
    try {
      const fbId = ff.id || "fb"+Date.now();
      const pid = project?.id || "unknown";
      const uploaded = [];
      for(const f of files) {
        const result = await uploadFeedbackImage(pid, fbId, f);
        uploaded.push(result);
      }
      setFf(v=>({...v, images:[...(v.images||[]), ...uploaded]}));
    } catch(err) {
      console.error("이미지 업로드 에러:", err);
      setUploadError("업로드 실패: " + (err.message||"알 수 없는 오류"));
    } finally { setUploading(false); }
  };
  const removeImage = (i) => setFf(v=>({...v, images:(v.images||[]).filter((_,j)=>j!==i)}));

  const save = () => {
    if(!ff.title?.trim()) return;
    const isNew = !ff.id;
    const prevFb = feedbacks.find(f=>f.id===ff.id);
    const prevAssignees = prevFb?.assignees||[];
    const entry = {...ff, id:ff.id||"fb"+Date.now(), images:ff.images||[], assignees:ff.assignees||[]};
    const list = modal==="edit" ? feedbacks.map(f=>f.id===entry.id?entry:f) : [...feedbacks, entry];
    patchProj(p=>({...p, feedbacks:list}));
    // 새로 추가된 담당자에게 알림
    const newAssignees = (ff.assignees||[]).filter(a=>!prevAssignees.includes(a)&&a!==user.name);
    if(newAssignees.length>0) {
      const notifs = newAssignees.map(name=>({
        id: `assign-${entry.id}-${name}-${Date.now()}`,
        type: "assign",
        urgent: false,
        label: "담당자 지정",
        projName: project.name,
        fbTitle: entry.title,
        projId: project.id,
        fbId: entry.id,
        from: user.name,
        to: name,
        createdAt: new Date().toISOString(),
        read: false,
      }));
      setNotifications(prev=>[...notifs, ...prev]);
    }
    setModal(null);
  };
  const del = () => { patchProj(p=>({...p, feedbacks:feedbacks.filter(f=>f.id!==ff.id)})); setModal(null); };

  const addComment = (fb, commentTextArg) => {
    const text = (commentTextArg||commentText||"").trim();
    if(!text) return;
    const comment = {
      id: "c"+Date.now(),
      author: user.name,
      text,
      createdAt: new Date().toISOString(),
    };
    // @멘션 파싱 → 알림 생성
    const mentionPattern = /@([^\s@]+)/g;
    let m;
    const newNotifs = [];
    while((m=mentionPattern.exec(text))!==null) {
      const mentionedName = m[1];
      if(mentionedName !== user.name) {
        newNotifs.push({
          id: `mention-${comment.id}-${mentionedName}`,
          type: "mention",
          urgent: false,
          label: "댓글 멘션",
          projName: project.name,
          fbTitle: fb.title||"(제목없음)",
          projId: project.id,
          fbId: fb.id,
          from: user.name,
          to: mentionedName,
          commentText: text,
          createdAt: comment.createdAt,
          read: false,
        });
      }
    }
    if(newNotifs.length>0) {
      setNotifications(prev=>[...newNotifs, ...prev]);
    }
    const updated = {...fb, comments:[...(fb.comments||[]), comment]};
    const list = feedbacks.map(f=>f.id===fb.id?updated:f);
    patchProj(p=>({...p, feedbacks:list}));
    setDetail(updated);
    setCommentText("");
  };

  const deleteComment = (fb, commentId) => {
    const updated = {...fb, comments:(fb.comments||[]).filter(c=>c.id!==commentId)};
    const list = feedbacks.map(f=>f.id===fb.id?updated:f);
    patchProj(p=>({...p, feedbacks:list}));
    setDetail(updated);
  };

  // 담당자가 자신의 taskStatus만 빠르게 변경
  const quickUpdateTaskStatus = (fb, statusId) => {
    const entry = {...fb, taskStatus: statusId};
    const list = feedbacks.map(f=>f.id===fb.id?entry:f);
    patchProj(p=>({...p, feedbacks:list}));
    if(detail?.id===fb.id) setDetail(entry);
  };

  const sorted = [...feedbacks].sort((a,b)=>(b.receivedDate||b.date||"").localeCompare(a.receivedDate||a.date||""));

  return (
    <div>
      {/* 헤더 요약 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <h3 style={{margin:0,fontSize:16,fontWeight:800}}>💬 클라이언트 피드백 히스토리</h3>
          <div style={{display:"flex",gap:16,marginTop:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{fontSize:11,color:C.sub,fontWeight:600}}>PD</span>
              {PD_ST.map(s=>{
                const cnt = feedbacks.filter(f=>(f.pdStatus||"urgent")===s.id).length;
                return cnt>0 && <span key={s.id} style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:s.bg,color:s.color,border:`1px solid ${s.color}44`,fontWeight:700}}>{s.icon} {s.label} {cnt}</span>;
              })}
            </div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{fontSize:11,color:C.sub,fontWeight:600}}>담당</span>
              {TASK_ST.map(s=>{
                const cnt = feedbacks.filter(f=>(f.taskStatus||"review")===s.id).length;
                return cnt>0 && <span key={s.id} style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:s.bg,color:s.color,border:`1px solid ${s.color}44`,fontWeight:700}}>{s.icon} {s.label} {cnt}</span>;
              })}
            </div>
          </div>
        </div>
        <Btn primary onClick={openAdd}>+ 피드백 추가</Btn>
      </div>

      {feedbacks.length===0 ? (
        <div style={{padding:"48px 0",textAlign:"center",color:C.faint,fontSize:13,border:`1px dashed ${C.border}`,borderRadius:12}}>아직 등록된 피드백이 없습니다</div>
      ) : (
        <div style={{border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"86px 86px 80px 1fr 100px 90px 90px 50px 80px",
            background:C.slateLight,padding:"9px 16px",fontSize:11,fontWeight:700,color:C.sub,gap:8}}>
            <span>수신일</span><span>마감일</span><span style={{color:"#7c3aed"}}>단계</span><span>제목</span><span>담당자</span>
            <span style={{color:"#ef4444"}}>PD 상태</span>
            <span style={{color:"#6366f1"}}>진행상태</span>
            <span style={{textAlign:"center"}}>첨부</span><span/>
          </div>
          {sorted.map((fb,i)=>{
            const pdSt  = PD_ST.find(s=>s.id===(fb.pdStatus||"urgent"))||PD_ST[0];
            const tskSt = TASK_ST.find(s=>s.id===(fb.taskStatus||"review"))||TASK_ST[0];
            const isOver = fb.dueDate && fb.dueDate < today() && fb.taskStatus!=="done";
            const imgCount = (fb.images||[]).length;
            const assignees = fb.assignees||[];
            return (
              <div key={fb.id}
                style={{display:"grid",gridTemplateColumns:"86px 86px 80px 1fr 100px 90px 90px 50px 80px",
                  padding:"10px 16px",gap:8,
                  borderTop:i>0?`1px solid ${C.border}`:"none",
                  borderLeft:`3px solid ${pdSt.color}`,
                  background:tskSt.id==="done"?"#f8fffe":i%2===0?"#fff":"#fafafa",
                  alignItems:"center",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=pdSt.bg}
                onMouseLeave={e=>e.currentTarget.style.background=tskSt.id==="done"?"#f8fffe":i%2===0?"#fff":"#fafafa"}>
                <span style={{fontSize:12,color:C.sub}}>{fb.receivedDate||fb.date||"-"}</span>
                <span style={{fontSize:12,color:isOver?"#ef4444":C.sub,fontWeight:isOver?700:400}}>
                  {fb.dueDate||"-"}{isOver&&" ⚠️"}
                </span>
                <span>{fb.stage
                  ? (() => {
                      const ph = PROJECT_TEMPLATE.find(p=>p.id===fb.phaseId);
                      return (
                        <span style={{fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:99,
                          background:"#f5f3ff",color:"#7c3aed",border:"1px solid #ddd6fe",
                          whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:3}}>
                          {ph && <span style={{fontSize:9,background:"#7c3aed",color:"#fff",borderRadius:99,padding:"0 4px",marginRight:2}}>{ph.order}</span>}
                          {fb.stage}
                        </span>
                      );
                    })()
                  : <span style={{color:C.border,fontSize:12}}>-</span>}
                </span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:tskSt.id==="done"?"#94a3b8":C.dark,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                    textDecoration:tskSt.id==="done"?"line-through":"none"}}>
                    {fb.title||"(제목없음)"}
                  </div>
                  {(fb.tags||[]).length>0&&(
                    <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:3}}>
                      {(fb.tags||[]).map(t=><span key={t} style={{fontSize:10,padding:"1px 6px",borderRadius:99,
                        background:"#ecfeff",color:"#0891b2",border:"1px solid #a5f3fc",fontWeight:600}}>#{t}</span>)}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                  {assignees.length>0
                    ? assignees.map(a=><span key={a} style={{fontSize:10,padding:"1px 6px",borderRadius:99,background:"#eff6ff",color:"#2563eb",fontWeight:600,whiteSpace:"nowrap"}}>{a}</span>)
                    : <span style={{fontSize:12,color:C.faint}}>—</span>}
                </div>
                {/* PD 상태 */}
                <span>
                  <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:99,
                    background:pdSt.bg,color:pdSt.color,border:`1.5px solid ${pdSt.color}55`,whiteSpace:"nowrap"}}>
                    {pdSt.icon} {pdSt.label}
                  </span>
                </span>
                {/* 담당자 진행상태 - 담당자면 클릭해서 바로 변경 */}
                <div>
                  {isAssignee(fb)||isPD ? (
                    <select value={fb.taskStatus||"review"}
                      onChange={e=>{e.stopPropagation();quickUpdateTaskStatus(fb,e.target.value);}}
                      onClick={e=>e.stopPropagation()}
                      style={{fontSize:10,padding:"2px 4px",borderRadius:6,
                        border:`1.5px solid ${tskSt.color}66`,
                        background:tskSt.bg,color:tskSt.color,
                        fontWeight:700,cursor:"pointer",outline:"none",width:"100%"}}>
                      {TASK_ST.map(s=><option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                    </select>
                  ) : (
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:99,
                      background:tskSt.bg,color:tskSt.color,border:`1.5px solid ${tskSt.color}55`,whiteSpace:"nowrap"}}>
                      {tskSt.icon} {tskSt.label}
                    </span>
                  )}
                </div>
                <div style={{textAlign:"center",display:"flex",gap:3,justifyContent:"center",alignItems:"center"}}>
                  {fb.fileUrl&&<a href={fb.fileUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:15,textDecoration:"none"}}>📎</a>}
                  {imgCount>0&&<span onClick={()=>setLightbox({images:fb.images,idx:0})}
                    style={{fontSize:11,cursor:"pointer",background:"#eff6ff",color:"#2563eb",borderRadius:99,padding:"1px 6px",fontWeight:700}}>🖼{imgCount}</span>}
                  {(fb.comments||[]).length>0&&<span style={{fontSize:11,background:"#f0fdf4",color:"#16a34a",borderRadius:99,padding:"1px 6px",fontWeight:700}}>💬{(fb.comments||[]).length}</span>}
                  {!fb.fileUrl&&imgCount===0&&(fb.comments||[]).length===0&&<span style={{color:C.border}}>—</span>}
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setDetail(fb)}
                    style={{fontSize:11,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,
                      background:"#fff",cursor:"pointer",color:C.blue,fontWeight:600,whiteSpace:"nowrap"}}>
                    상세보기
                  </button>
                  <button onClick={()=>openEdit(fb)}
                    style={{fontSize:11,padding:"4px 6px",borderRadius:6,border:`1px solid ${C.border}`,
                      background:"#fff",cursor:"pointer",color:C.sub}}>✏️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 라이트박스 */}
      {lightbox&&(
        <div onClick={()=>setLightbox(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <img src={lightbox.images[lightbox.idx].url} alt="" onClick={e=>e.stopPropagation()} style={{maxWidth:"90vw",maxHeight:"80vh",borderRadius:8,objectFit:"contain",boxShadow:"0 8px 40px rgba(0,0,0,.5)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:16,marginTop:16}}>
            {lightbox.images.length>1&&<button onClick={e=>{e.stopPropagation();setLightbox(l=>({...l,idx:(l.idx-1+l.images.length)%l.images.length}));}} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"rgba(255,255,255,.2)",color:"#fff",cursor:"pointer",fontSize:18}}>‹</button>}
            <span style={{color:"rgba(255,255,255,.7)",fontSize:13}}>{lightbox.images[lightbox.idx].name} ({lightbox.idx+1}/{lightbox.images.length})</span>
            {lightbox.images.length>1&&<button onClick={e=>{e.stopPropagation();setLightbox(l=>({...l,idx:(l.idx+1)%l.images.length}));}} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"rgba(255,255,255,.2)",color:"#fff",cursor:"pointer",fontSize:18}}>›</button>}
            <button onClick={()=>setLightbox(null)} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"rgba(255,255,255,.15)",color:"#fff",cursor:"pointer",fontSize:13}}>✕ 닫기</button>
          </div>
          {lightbox.images.length>1&&<div style={{display:"flex",gap:8,marginTop:12}}>{lightbox.images.map((img,i)=><img key={i} src={img.url} alt="" onClick={e=>{e.stopPropagation();setLightbox(l=>({...l,idx:i}));}} style={{width:56,height:56,objectFit:"cover",borderRadius:6,cursor:"pointer",border:`2px solid ${i===lightbox.idx?"#60a5fa":"transparent"}`,opacity:i===lightbox.idx?1:0.6}}/>)}</div>}
        </div>
      )}

      {/* 세부내용 모달 */}
      {detail&&(
        <Modal title={detail.title||"피드백 상세"} onClose={()=>setDetail(null)}>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            {detail.stage&&<span style={{fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:99,background:"#f5f3ff",color:"#7c3aed",border:"1.5px solid #ddd6fe"}}>📍 {detail.stage}</span>}
            {(detail.tags||[]).map(t=><span key={t} style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:99,background:"#ecfeff",color:"#0891b2",border:"1px solid #a5f3fc"}}>#{t}</span>)}
            {(()=>{const s=PD_ST.find(x=>x.id===(detail.pdStatus||"urgent"))||PD_ST[0];return <span style={{fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:99,background:s.bg,color:s.color,border:`1.5px solid ${s.color}55`}}>PD · {s.icon} {s.label}</span>;})()}
            {(()=>{const s=TASK_ST.find(x=>x.id===(detail.taskStatus||"review"))||TASK_ST[0];return <span style={{fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:99,background:s.bg,color:s.color,border:`1.5px solid ${s.color}55`}}>담당 · {s.icon} {s.label}</span>;})()}
          </div>
          <div style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:12}}>
              <div><div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:3}}>수신일</div><div style={{fontSize:13,fontWeight:600}}>{detail.receivedDate||detail.date||"-"}</div></div>
              <div><div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:3}}>마감일</div><div style={{fontSize:13,fontWeight:600,color:detail.dueDate&&detail.dueDate<today()?"#ef4444":C.dark}}>{detail.dueDate||"-"}</div></div>
              <div><div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:3}}>담당자</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {(detail.assignees||[]).length>0
                    ? (detail.assignees||[]).map(a=><span key={a} style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"#eff6ff",color:"#2563eb",fontWeight:600}}>{a}</span>)
                    : <span style={{fontSize:12,color:C.faint}}>—</span>}
                </div>
              </div>
            </div>
            <div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:6}}>피드백 내용</div>
            <div style={{fontSize:13,color:C.dark,lineHeight:1.8,whiteSpace:"pre-wrap",background:"#fff",borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`}}>{detail.content||"(내용 없음)"}</div>
          </div>
          {detail.detail&&<div style={{marginBottom:12}}><div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:6}}>세부내용</div><div style={{fontSize:13,color:C.dark,lineHeight:1.7,whiteSpace:"pre-wrap",background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px"}}>{detail.detail}</div></div>}
          {detail.fileUrl&&<div style={{marginBottom:12}}><div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:6}}>첨부링크</div><a href={detail.fileUrl} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"#fff",color:C.blue,fontSize:13,textDecoration:"none",fontWeight:600}}>📎 링크 열기</a></div>}
          {(detail.images||[]).length>0&&<div style={{marginBottom:12}}><div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:8}}>첨부 이미지 ({detail.images.length})</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{detail.images.map((img,i)=><img key={i} src={img.url} alt={img.name} onClick={()=>setLightbox({images:detail.images,idx:i})} style={{width:80,height:80,objectFit:"cover",borderRadius:8,cursor:"pointer",border:`1px solid ${C.border}`}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>)}</div></div>}
          {/* 댓글 섹션 */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:4}}>
            <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:10}}>
              💬 댓글 {(detail.comments||[]).length>0?`(${detail.comments.length})`:""}
            </div>
            {/* 댓글 목록 */}
            {(detail.comments||[]).length===0
              ? <div style={{fontSize:12,color:C.faint,padding:"12px 0",textAlign:"center"}}>아직 댓글이 없습니다</div>
              : <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                  {(detail.comments||[]).map(c=>(
                    <div key={c.id} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <Avatar name={c.author} size={28}/>
                      <div style={{flex:1,background:"#f8fafc",borderRadius:"0 10px 10px 10px",
                        padding:"8px 12px",border:`1px solid ${C.border}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:700,color:C.dark}}>{c.author}</span>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <span style={{fontSize:10,color:C.faint}}>
                              {new Date(c.createdAt).toLocaleDateString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                            </span>
                            {(c.author===user.name||user.role==="PD"||user.role==="대표")&&(
                              <button onClick={()=>deleteComment(detail,c.id)}
                                style={{fontSize:10,color:C.faint,background:"none",border:"none",cursor:"pointer",padding:"0 2px"}}
                                title="삭제">✕</button>
                            )}
                          </div>
                        </div>
                        <div style={{fontSize:13,color:C.dark,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                          {c.text.split(/(@[^\s@]+)/g).map((part,i)=>
                            part.startsWith("@")
                              ? <span key={i} style={{color:"#2563eb",fontWeight:700,background:"#eff6ff",borderRadius:4,padding:"0 3px"}}>{part}</span>
                              : part
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            }
            {/* 댓글 입력 */}
            <div style={{display:"flex",gap:8,alignItems:"flex-start",marginTop:4}}>
              <Avatar name={user.name} size={28} style={{marginTop:4}}/>
              <div style={{flex:1}}>
                <CommentInput
                  accounts={accounts}
                  user={user}
                  onSubmit={(text) => addComment(detail, text)}
                />
              </div>
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:12}}>
            <Btn onClick={()=>{setDetail(null);openEdit(detail);}}>✏️ 수정</Btn>
            <Btn primary onClick={()=>setDetail(null)}>닫기</Btn>
          </div>
        </Modal>
      )}

      {/* 추가/수정 모달 */}
      {modal&&(
        <Modal title={modal==="add"?"피드백 추가":"피드백 수정"} onClose={()=>setModal(null)}>
          <Field label="제목 *">
            <input style={inp} autoFocus value={ff.title||""} onChange={e=>setFf(v=>({...v,title:e.target.value}))} placeholder="피드백 제목 (예: 1차 컷 수정 요청)"/>
          </Field>
          <Field label="단계 연결">
            <select style={inp} value={ff.phaseId||""} onChange={e=>{
              const phase = PROJECT_TEMPLATE.find(p=>p.id===e.target.value);
              setFf(v=>({...v, phaseId:e.target.value, stage:phase?phase.phase:""}));
            }}>
              <option value="">— 단계 선택 (선택사항) —</option>
              {PROJECT_TEMPLATE.map(p=>(
                <option key={p.id} value={p.id}>{p.order}. {p.phase}</option>
              ))}
            </select>
          </Field>
          <div style={{display:"flex",gap:12}}>
            <Field label="수신일 *" half><input style={inp} type="date" value={ff.receivedDate||""} onChange={e=>setFf(v=>({...v,receivedDate:e.target.value}))}/></Field>
            <Field label="마감일" half><input style={inp} type="date" value={ff.dueDate||""} onChange={e=>setFf(v=>({...v,dueDate:e.target.value}))}/></Field>
          </div>
          <Field label="태그">
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
              {["수정요청","컨펌","재촬영","색보정","자막","음악","VO","CG","로고","기타"].map(t=>{
                const sel=(ff.tags||[]).includes(t);
                return <button key={t} onClick={()=>toggleTag(t)}
                  style={{padding:"4px 10px",borderRadius:99,cursor:"pointer",fontSize:11,fontWeight:sel?700:400,
                    border:`1.5px solid ${sel?"#0891b2":C.border}`,
                    background:sel?"#ecfeff":"#fff",color:sel?"#0891b2":C.sub}}>
                  #{t}
                </button>;
              })}
            </div>
            <div style={{display:"flex",gap:6}}>
              <input style={{...inp,flex:1}} value={ff.customTag||""} placeholder="직접 입력 후 Enter"
                onChange={e=>setFf(v=>({...v,customTag:e.target.value}))}
                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addCustomTag();}}}/>
              <Btn onClick={addCustomTag}>추가</Btn>
            </div>
            {(ff.tags||[]).filter(t=>!["수정요청","컨펌","재촬영","색보정","자막","음악","VO","CG","로고","기타"].includes(t)).length>0&&(
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
                {(ff.tags||[]).filter(t=>!["수정요청","컨펌","재촬영","색보정","자막","음악","VO","CG","로고","기타"].includes(t)).map(t=>(
                  <span key={t} style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"#faf5ff",color:"#7c3aed",
                    border:"1px solid #ddd6fe",display:"flex",alignItems:"center",gap:4}}>
                    #{t}<button onClick={()=>toggleTag(t)} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:"#a78bfa",padding:0}}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </Field>
          <Field label="피드백 내용">
            <textarea style={{...inp,resize:"vertical",minHeight:80}} value={ff.content||""} onChange={e=>setFf(v=>({...v,content:e.target.value}))} placeholder="클라이언트 피드백 내용..."/>
          </Field>
          <Field label="세부내용">
            <textarea style={{...inp,resize:"vertical",minHeight:50}} value={ff.detail||""} onChange={e=>setFf(v=>({...v,detail:e.target.value}))} placeholder="추가 메모, 참고사항..."/>
          </Field>
          <Field label="담당자 (복수 선택)">
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {accounts.map(a=>{
                const sel=(ff.assignees||[]).includes(a.name);
                return <button key={a.id} onClick={()=>toggleAssignee(a.name)}
                  style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:99,cursor:"pointer",fontSize:12,
                    border:`1.5px solid ${sel?"#2563eb":C.border}`,background:sel?"#eff6ff":"#fff",
                    color:sel?"#2563eb":C.sub,fontWeight:sel?700:400}}>
                  <Avatar name={a.name} size={16}/>{a.name}{sel&&<span style={{fontSize:10}}>✓</span>}
                </button>;
              })}
            </div>
          </Field>
          <div style={{display:"flex",gap:12}}>
            <Field label="🔴 PD 상태 (긴급도)" half>
              <div style={{display:"flex",gap:6}}>
                {PD_ST.map(s=>(
                  <button key={s.id} onClick={()=>setFf(v=>({...v,pdStatus:s.id}))}
                    style={{flex:1,padding:"8px 4px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:ff.pdStatus===s.id?800:400,
                      outline:`2px solid ${ff.pdStatus===s.id?s.color:"transparent"}`,
                      background:ff.pdStatus===s.id?s.bg:"#fff",color:ff.pdStatus===s.id?s.color:C.sub}}>
                    {s.icon}<br/>{s.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="🔍 담당자 상태 (진행상태)" half>
              <div style={{display:"flex",gap:6}}>
                {TASK_ST.map(s=>(
                  <button key={s.id} onClick={()=>setFf(v=>({...v,taskStatus:s.id}))}
                    style={{flex:1,padding:"8px 4px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:ff.taskStatus===s.id?800:400,
                      outline:`2px solid ${ff.taskStatus===s.id?s.color:"transparent"}`,
                      background:ff.taskStatus===s.id?s.bg:"#fff",color:ff.taskStatus===s.id?s.color:C.sub}}>
                    {s.icon}<br/>{s.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <Field label="첨부파일 링크">
            <input style={inp} value={ff.fileUrl||""} onChange={e=>setFf(v=>({...v,fileUrl:e.target.value}))} placeholder="https://drive.google.com/..."/>
          </Field>
          <Field label="이미지 첨부">
            <label style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:8,border:`2px dashed ${C.border}`,cursor:"pointer",color:C.sub,fontSize:13,background:"#fafafa"}}>
              <span style={{fontSize:20}}>🖼</span>
              <span>{uploading?"업로드 중...":"이미지 선택 (여러 장 가능)"}</span>
              <input type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleImageUpload} disabled={uploading}/>
            </label>
            {uploadError&&<div style={{marginTop:6,fontSize:12,color:"#ef4444",padding:"6px 10px",background:"#fef2f2",borderRadius:6}}>{uploadError}</div>}
            {(ff.images||[]).length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>{ff.images.map((img,i)=><div key={i} style={{position:"relative"}}><img src={img.url} alt={img.name} onClick={()=>setLightbox({images:ff.images,idx:i})} style={{width:72,height:72,objectFit:"cover",borderRadius:8,cursor:"pointer",border:`1px solid ${C.border}`}}/><button onClick={()=>removeImage(i)} style={{position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:99,border:"none",background:"#ef4444",color:"#fff",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>✕</button></div>)}</div>}
          </Field>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:12}}>
            {modal==="edit"&&<Btn danger sm onClick={del}>삭제</Btn>}
            <div style={{flex:1}}/>
            <Btn onClick={()=>setModal(null)}>취소</Btn>
            <Btn primary onClick={save} disabled={!ff.title?.trim()||uploading}>저장</Btn>
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
                <div style={{fontWeight:isToday?800:400,marginBottom:2,textAlign:"center",
                  ...(isToday?{background:C.blue,color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 2px",fontSize:10}:{fontSize:11,color:dow===0?"#ef4444":dow===6?"#2563eb":C.dark})}}>
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
// 경영관리 대시보드
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
      <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:800}}>경영관리 대시보드</h2>

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

function ProjectSelector({ projects, selId, setSelId, proj, setAddProjModal }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{position:"relative",flex:1,minWidth:0}}>
      <button onClick={() => setOpen(v => !v)}
        style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",
          borderRadius:8,border:`1.5px solid ${open?C.blue:C.border}`,
          background:open?"#eff6ff":C.white,cursor:"pointer",
          width:"100%",maxWidth:320,transition:"all .15s",
          boxShadow:open?"0 0 0 3px #2563eb18":"none"}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:proj?.color||C.blue,flexShrink:0}}/>
        <span style={{fontSize:13,fontWeight:700,color:C.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,textAlign:"left"}}>
          {proj?.name||"프로젝트 선택"}
        </span>
        {proj?.status&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:99,background:proj.color+"22",color:proj.color,fontWeight:700,flexShrink:0}}>{proj.status}</span>}
        <span style={{fontSize:10,color:C.faint,flexShrink:0,transition:"transform .2s",display:"inline-block",transform:open?"rotate(180deg)":"none"}}>▼</span>
      </button>

      {open && (
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:300,
          background:C.white,borderRadius:12,border:`1px solid ${C.border}`,
          boxShadow:"0 8px 32px rgba(0,0,0,.12)",minWidth:260,maxWidth:360,overflow:"hidden"}}>
          <div style={{padding:"8px 12px",fontSize:11,fontWeight:700,color:C.faint,background:C.bg,borderBottom:`1px solid ${C.border}`,letterSpacing:.5}}>
            프로젝트 ({projects.length})
          </div>
          <div style={{maxHeight:320,overflowY:"auto"}}>
            {projects.map(p => {
              const sel = p.id === selId;
              const tasks = p.tasks || [];
              const done = tasks.filter(t => t.status === "done").length;
              return (
                <div key={p.id} onClick={() => { setSelId(p.id); setOpen(false); }}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                    cursor:"pointer",background:sel?"#eff6ff":C.white,
                    borderBottom:`1px solid ${C.border}`}}
                  onMouseEnter={e=>{if(!sel)e.currentTarget.style.background="#f8fafc"}}
                  onMouseLeave={e=>{e.currentTarget.style.background=sel?"#eff6ff":C.white}}>
                  <span style={{width:10,height:10,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:sel?700:500,color:sel?C.blue:C.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {p.name}
                    </div>
                    <div style={{fontSize:10,color:C.faint,marginTop:1}}>
                      {p.client&&`${p.client} · `}{tasks.length>0?`태스크 ${done}/${tasks.length}`:"태스크 없음"}{p.due&&` · 납품 ${p.due}`}
                    </div>
                  </div>
                  {sel && <span style={{color:C.blue,fontSize:14,fontWeight:800}}>✓</span>}
                </div>
              );
            })}
          </div>
          <div style={{padding:"8px 12px",borderTop:`1px solid ${C.border}`,background:C.bg}}>
            <button onClick={() => { setAddProjModal(true); setOpen(false); }}
              style={{width:"100%",padding:"7px",borderRadius:8,border:`1.5px dashed ${C.border}`,
                background:"none",cursor:"pointer",fontSize:12,color:C.faint,fontWeight:600}}>
              + 새 프로젝트
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function FigJamTab({ project, onChange }) {
  const urls = project.figjaUrls || [];
  const [input, setInput] = useState("");
  const [active, setActive] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState("");

  const toEmbedUrl = (url) => {
    // 피그마 공식 임베드: www.figma.com/embed?embed_host=XXX&url=ORIGINAL_URL
    try {
      new URL(url); // URL 유효성 검사
      if (!url.includes("figma.com")) return null;
      return "https://www.figma.com/embed?embed_host=cutflow-namucreative&url=" + encodeURIComponent(url);
    } catch { return null; }
  };

  const addUrl = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const embed = toEmbedUrl(trimmed);
    if (!embed) { alert("유효한 피그마잼 URL을 입력해주세요.\n예: https://www.figma.com/board/..."); return; }
    const newItem = { id: Date.now().toString(), url: trimmed, embed, label: "FigJam " + (urls.length + 1) };
    const updated = [...urls, newItem];
    onChange(p => ({ ...p, figjaUrls: updated }));
    setInput("");
    setActive(updated.length - 1);
  };

  const removeUrl = (idx) => {
    const updated = urls.filter((_, i) => i !== idx);
    onChange(p => ({ ...p, figjaUrls: updated }));
    setActive(Math.max(0, Math.min(active, updated.length - 1)));
  };

  const updateLabel = (idx, label) => {
    const updated = urls.map((u, i) => i === idx ? { ...u, label } : u);
    onChange(p => ({ ...p, figjaUrls: updated }));
    setEditing(false);
  };

  const cur = urls[active];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0,height:"calc(100vh - 180px)",minHeight:500}}>
      {/* 상단 탭 + 추가 */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",flexWrap:"wrap",borderBottom:"1px solid #e2e8f0",marginBottom:0}}>
        <div style={{display:"flex",gap:4,flex:1,flexWrap:"wrap"}}>
          {urls.map((u, i) => (
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:0,
              background:i===active?"#eff6ff":"#f8fafc",
              border:`1.5px solid ${i===active?"#2563eb":"#e2e8f0"}`,
              borderRadius:8,overflow:"hidden"}}>
              {editing===i
                ? <input autoFocus value={editLabel}
                    onChange={e=>setEditLabel(e.target.value)}
                    onBlur={()=>updateLabel(i, editLabel||u.label)}
                    onKeyDown={e=>{ if(e.key==="Enter") updateLabel(i,editLabel||u.label); if(e.key==="Escape") setEditing(false); }}
                    style={{border:"none",outline:"none",background:"transparent",fontSize:12,fontWeight:600,color:"#2563eb",width:90,padding:"5px 8px"}}/>
                : <button onClick={()=>setActive(i)}
                    onDoubleClick={()=>{setEditing(i);setEditLabel(u.label);}}
                    style={{border:"none",background:"transparent",cursor:"pointer",padding:"5px 10px",
                      fontSize:12,fontWeight:i===active?700:500,color:i===active?"#2563eb":"#64748b",
                      whiteSpace:"nowrap"}}>
                    🎨 {u.label}
                  </button>
              }
              <button onClick={()=>removeUrl(i)}
                style={{border:"none",background:"transparent",cursor:"pointer",
                  padding:"5px 6px",color:"#94a3b8",fontSize:12,lineHeight:1}}>×</button>
            </div>
          ))}
        </div>
        {/* URL 추가 입력 */}
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addUrl()}
            placeholder="피그마잼 URL 붙여넣기..."
            style={{padding:"6px 10px",borderRadius:8,border:"1px solid #e2e8f0",
              fontSize:12,width:240,outline:"none",color:"#1e293b"}}
          />
          <button onClick={addUrl}
            style={{padding:"6px 14px",borderRadius:8,border:"none",
              background:"#2563eb",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
            + 추가
          </button>
        </div>
      </div>

      {/* iframe 영역 */}
      {urls.length === 0 ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          gap:16,color:"#94a3b8",background:"#f8fafc",borderRadius:12,border:"2px dashed #e2e8f0",marginTop:12}}>
          <div style={{fontSize:48}}>🎨</div>
          <div style={{fontSize:16,fontWeight:700,color:"#475569"}}>피그마잼 연동</div>
          <div style={{fontSize:13,textAlign:"center",lineHeight:1.7,color:"#94a3b8"}}>
            피그마잼 URL을 위에 입력하면<br/>바로 미리보기 · 편집이 가능합니다
          </div>
          <div style={{fontSize:11,color:"#cbd5e1",background:"#f1f5f9",padding:"8px 16px",borderRadius:8}}>
            figma.com/board/... 또는 figma.com/file/... 형식
          </div>
        </div>
      ) : cur ? (
        <div style={{flex:1,position:"relative",marginTop:8,borderRadius:12,overflow:"hidden",
          border:"1px solid #e2e8f0",boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
          <iframe
            key={cur.id}
            src={cur.embed}
            style={{width:"100%",height:"100%",border:"none",display:"block"}}
            allow="clipboard-read; clipboard-write"
            allowFullScreen
          />
          {/* 원본 열기 버튼 */}
          <a href={cur.url} target="_blank" rel="noopener noreferrer"
            style={{position:"absolute",top:10,right:10,padding:"5px 12px",borderRadius:8,
              background:"rgba(255,255,255,.92)",border:"1px solid #e2e8f0",
              fontSize:11,fontWeight:700,color:"#2563eb",textDecoration:"none",
              boxShadow:"0 2px 8px rgba(0,0,0,.08)",backdropFilter:"blur(4px)"}}>
            ↗ 피그마에서 열기
          </a>
        </div>
      ) : null}
    </div>
  );
}


function App() {
  const [user,         setUser]         = useState(null);
  const [projects,     setProjects]     = useState(SEED_PROJECTS);
  const [selId,        setSelId]        = useState("p1");
  const [company,      setCompany]      = useState(DEFAULT_COMPANY);
  const [dailyTodos,   setDailyTodos]   = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotif,    setShowNotif]     = useState(false);
  const [formats,      setFormats]      = useState(()=>{
    try { return JSON.parse(localStorage.getItem("cf_formats")||"null") || FORMATS_DEFAULT; }
    catch(e) { return FORMATS_DEFAULT; }
  });
  const [accounts,     setAccounts]     = useState(SEED_ACCOUNTS);
  const [mainTab,      setMainTab]      = useState("tasks");
  const [addProjModal,  setAddProjModal]  = useState(false);
  const [editProjModal, setEditProjModal] = useState(false);
  const [pf,            setPf]            = useState({name:"",client:"",format:formats?.[0]||"TVC",due:"",startDate:"",director:"",pd:"",color:P_COLORS[0],quoteFmt:"A"});

  const [docTab,       setDocTab]       = useState("tasks");
  const [viewMode,     setViewMode]     = useState("phase");
  const [taskModal,    setTaskModal]    = useState(null);  // 수정 모달
  const [taskPanel,    setTaskPanel]    = useState(null);  // 상세 패널
  const [tf,           setTf]           = useState({});

  useEffect(() => {
    if (!isConfigured) return;
    const u1 = subscribeProjects(fb => { if(fb.length>0){setProjects(fb);setSelId(p=>fb.find(x=>x.id===p)?p:fb[0].id);} });
    const u2 = subscribeCompany(d => setCompany(p=>({...DEFAULT_COMPANY,...d})));
    const u3 = subscribeMembers(m => { if(m.length>0) setAccounts(m); });
    return () => { u1(); u2(); u3(); };
  }, []);
  // D-day 알림 자동 생성
  useEffect(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const notifs = [];
    projects.forEach(proj => {
      (proj.feedbacks||[]).forEach(fb => {
        if(!fb.dueDate || fb.taskStatus==="done") return;
        const due = new Date(fb.dueDate); due.setHours(0,0,0,0);
        const diff = Math.round((due-today)/(1000*60*60*24));
        if(diff<=1 && diff>=-1) {
          const label = diff<0?`D+${Math.abs(diff)} 초과`:diff===0?"오늘 마감":`내일 마감 (D-${diff})`;
          notifs.push({
            id: `fb-${fb.id}-due`,
            type: "due",
            urgent: diff<=0,
            label,
            projName: proj.name,
            fbTitle: fb.title||"(제목없음)",
            projId: proj.id,
            fbId: fb.id,
          });
        }
      });
      // 태스크 마감
      (proj.tasks||[]).forEach(task => {
        if(!task.due || task.stage==="ONAIR") return;
        const due = new Date(task.due); due.setHours(0,0,0,0);
        const diff = Math.round((due-today)/(1000*60*60*24));
        if(diff<=1 && diff>=-1) {
          const label = diff<0?`D+${Math.abs(diff)} 초과`:diff===0?"오늘 마감":`내일 마감`;
          notifs.push({
            id: `task-${task.id}-due`,
            type: "task",
            urgent: diff<=0,
            label,
            projName: proj.name,
            fbTitle: task.title,
            projId: proj.id,
          });
        }
      });
    });
    setNotifications(notifs);
  }, [projects]);

  if (!user) return <LoginScreen onLogin={setUser} accounts={accounts}/>;

  const proj     = projects.find(p=>p.id===selId)||projects[0];

  // 경영관리 탭: 대표/경영지원만 접근 가능
  const canAccessFinance = ["대표", "경영지원"].includes(user.role);
  // 프로젝트 견적서/예산서/결산서: 프로젝트별 허용 멤버 체크
  const financeAllowed = (proj?.allowedFinanceMembers||[]);
  const canAccessProjFinance = ["대표", "경영지원"].includes(user.role) ||
    financeAllowed.includes(String(user.id));

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
    const projMembers = accounts.filter(a=>
      [pf.pd, pf.director, pf.epd, pf.assistant].includes(a.name)
    );
    const initTasks = pf.useTemplate!==false ? generateTasksFromTemplate(id, projMembers) : [];
    const np = {
      id, ...pf, stage:"PLANNING", createdAt:todayStr(),
      tasks:initTasks,
      quote:{vat:true,agencyFeeRate:10,items:pf.quoteFmt==="B"?makeTemplateB():makeTemplate()},
      budget:{vouchers:[]},
      settlementDate:null, settled:false,
    };
    setProjects(ps=>[...ps,np]);
    setSelId(id);
    setAddProjModal(false);
    if(isConfigured) saveProject(np).catch(console.error);
    setPf({name:"",client:"",format:formats?.[0]||"TVC",due:"",director:"",pd:"",color:P_COLORS[0],useTemplate:true});
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
    setPf({name:"",client:"",format:formats?.[0]||"TVC",due:"",director:"",pd:"",color:P_COLORS[0],useTemplate:true});
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
      : [...proj.tasks, {...tf, id:"t"+Date.now(), createdBy:user.name, createdAt:new Date().toISOString()}];
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
        {/* 프로젝트 선택 드롭다운 */}
        <ProjectSelector
          projects={projects}
          selId={selId}
          setSelId={setSelId}
          proj={proj}
          setAddProjModal={setAddProjModal}
        />
        <button onClick={e=>{e.stopPropagation();openEditProj();}} title="현재 프로젝트 수정"
          style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${C.border}`,
            background:C.white,cursor:"pointer",fontSize:13,color:C.sub,whiteSpace:"nowrap",flexShrink:0}}>
          ✏️
        </button>
        {/* 메인탭 */}
        <div style={{display:"flex",gap:2,background:C.slateLight,borderRadius:8,padding:3}}>
          {[{id:"tasks",icon:"📋",label:"프로젝트"},{id:"finance",icon:"💰",label:"경영관리",locked:!canAccessFinance},{id:"daily-todo",icon:"✅",label:"데일리 TODO"},{id:"master-calendar",icon:"🗓",label:"종합캘린더"},{id:"crm",icon:"👥",label:"CRM"},{id:"settings",icon:"⚙️",label:"설정",locked:!user.canManageMembers}].map(t=>(
            <button key={t.id} onClick={()=>!t.locked&&setMainTab(t.id)} style={{padding:"5px 14px",borderRadius:6,border:"none",background:mainTab===t.id?C.white:"transparent",cursor:t.locked?"not-allowed":"pointer",fontSize:13,fontWeight:mainTab===t.id?700:500,color:mainTab===t.id?C.text:t.locked?C.faint:C.sub,boxShadow:mainTab===t.id?"0 1px 4px rgba(0,0,0,.08)":"none",transition:"all .15s"}}>
              {t.icon} {t.label}{t.locked?" 🔒":""}
            </button>
          ))}
        </div>
        {/* 알림 벨 */}
        <div style={{position:"relative"}}>
          <button onClick={()=>setShowNotif(v=>!v)}
            style={{position:"relative",padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,
              background:showNotif?"#eff6ff":"#fff",cursor:"pointer",fontSize:18,lineHeight:1}}>
            🔔
            {(()=>{
              const myNotifs = notifications.filter(n=>
                n.type==="due"||n.type==="task"||(n.to&&n.to===user.name)
              );
              const hasUrgent = myNotifs.some(n=>n.urgent||n.type==="mention");
              return myNotifs.length>0&&(
                <span style={{position:"absolute",top:-4,right:-4,minWidth:17,height:17,
                  borderRadius:99,background:hasUrgent?"#ef4444":"#f59e0b",
                  color:"#fff",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",
                  justifyContent:"center",padding:"0 3px",border:"2px solid #fff"}}>
                  {myNotifs.length}
                </span>
              );
            })()}
          </button>
          {showNotif&&(
            <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,width:320,
              background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,
              boxShadow:"0 8px 32px rgba(0,0,0,.12)",zIndex:200,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:14}}>알림</span>
                <span style={{fontSize:12,color:C.faint}}>{notifications.filter(n=>n.type==="due"||n.type==="task"||n.type==="assign"||n.type==="done"||n.type==="confirm_req"||n.type==="approved"||n.type==="rejected"||(n.to&&n.to===user.name)).length}건</span>
              </div>
              {notifications.length===0
                ? <div style={{padding:"24px",textAlign:"center",color:C.faint,fontSize:13}}>새 알림이 없습니다</div>
                : <div style={{maxHeight:360,overflowY:"auto"}}>
                    {notifications.filter(n=>n.type==="due"||n.type==="task"||n.type==="assign"||n.type==="done"||n.type==="confirm_req"||n.type==="approved"||n.type==="rejected"||(n.to&&n.to===user.name)).map(n=>(
                      <div key={n.id} onClick={()=>{
                          setShowNotif(false);
                          setMainTab("tasks");
                          if(n.taskId){
                            const t=proj?.tasks?.find(x=>x.id===n.taskId);
                            if(t) setTaskPanel({...t});
                          }
                        }}
                        style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,
                          cursor:"pointer",
                          background:n.type==="mention"?"#eff6ff":n.type==="assign"?"#eff6ff":n.type==="done"?"#f0fdf4":n.type==="confirm_req"?"#fffbeb":n.type==="approved"?"#f0fdf4":n.type==="rejected"?"#fff1f2":n.urgent?"#fff5f5":"#fff",
                          transition:"background .1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                        onMouseLeave={e=>e.currentTarget.style.background=n.type==="mention"?"#eff6ff":n.type==="assign"?"#eff6ff":n.type==="done"?"#f0fdf4":n.type==="confirm_req"?"#fffbeb":n.type==="approved"?"#f0fdf4":n.type==="rejected"?"#fff1f2":n.urgent?"#fff5f5":"#fff"}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                          <span style={{fontSize:13}}>
                            {n.type==="mention"?"💬":n.type==="assign"?"📨":n.type==="done"?"✅":n.type==="confirm_req"?"📋":n.type==="approved"?"✅":n.type==="rejected"?"🔁":n.urgent?"🔴":"🟡"}
                          </span>
                          <span style={{fontSize:11,fontWeight:700,padding:"1px 7px",borderRadius:99,
                            color:n.type==="mention"?"#2563eb":n.type==="assign"?"#2563eb":n.type==="done"?"#16a34a":n.type==="confirm_req"?"#d97706":n.type==="approved"?"#16a34a":n.type==="rejected"?"#ef4444":n.urgent?"#ef4444":"#f59e0b",
                            background:n.type==="mention"?"#dbeafe":n.type==="assign"?"#eff6ff":n.type==="done"?"#dcfce7":n.type==="confirm_req"?"#fef3c7":n.type==="approved"?"#dcfce7":n.type==="rejected"?"#fee2e2":n.urgent?"#fef2f2":"#fffbeb"}}>
                            {n.label}
                          </span>
                          {n.from&&<span style={{fontSize:11,color:C.faint}}>{n.from}{n.type==="assign"?" → "+((n.to)||""):" →"}</span>}
                        </div>
                        <div style={{fontSize:12,fontWeight:600,color:C.dark,marginBottom:2}}>{n.fbTitle}</div>
                        {n.commentText&&<div style={{fontSize:11,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{n.commentText}</div>}
                        <div style={{fontSize:11,color:C.faint}}>{n.projName}</div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}
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
            {/* 프로젝트 정보 카드 */}
            <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:20,overflow:"hidden"}}>
              {/* 컬러 액센트 바 */}
              <div style={{height:4,background:proj.color,width:"100%"}}/>
              {/* 상단: 프로젝트명 + 태그 + 스테이지 */}
              <div style={{padding:"14px 20px 12px",display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:19,color:C.dark,lineHeight:1.3}}>{proj.name}</div>
                  <div style={{marginTop:6,display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                    {proj.client&&<span style={{background:C.slateLight,borderRadius:6,padding:"3px 9px",fontSize:12,fontWeight:600,color:C.dark}}>{proj.client}</span>}
                    {proj.agency&&<span style={{background:C.slateLight,borderRadius:6,padding:"3px 9px",fontSize:12,color:C.sub}}>{proj.agency}</span>}
                    {proj.format&&<span style={{background:proj.color+"18",borderRadius:6,padding:"3px 9px",fontSize:12,color:proj.color,fontWeight:700}}>{proj.format}</span>}
                  </div>
                </div>
                <select value={proj.stage} onChange={e=>patchProj(p=>({...p,stage:e.target.value}))}
                  style={{padding:"7px 12px",borderRadius:8,border:`1.5px solid ${STAGES[proj.stage]?.color||C.border}`,fontSize:13,cursor:"pointer",background:STAGES[proj.stage]?.bg,color:STAGES[proj.stage]?.color,fontWeight:700,flexShrink:0}}>
                  {stageKeys.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              {/* 구분선 */}
              <div style={{height:1,background:C.border}}/>
              {/* 하단: 스탭 + 일정 정보 */}
              <div style={{padding:"10px 20px 12px",display:"flex",gap:4,flexWrap:"wrap",alignItems:"stretch"}}>
                {/* 스탭 정보 */}
                <div style={{display:"flex",gap:0,flexWrap:"wrap",flex:1}}>
                  {[
                    proj.director   && {icon:"🎬", label:"감독",   value:proj.director},
                    proj.epd        && {icon:"🎯", label:"EPD",    value:proj.epd},
                    proj.assistant  && {icon:"🎥", label:"조감독", value:proj.assistant},
                    proj.pd         && {icon:"📋", label:"PD",     value:proj.pd},
                    proj.contactName && {icon:"👤", label:"담당자", value:proj.contactName, sub:proj.contactPhone},
                  ].filter(Boolean).map((item,i,arr)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 16px 4px 0",marginRight:4,
                      borderRight: i<arr.length-1 ? `1px solid ${C.border}` : "none"}}>
                      <div style={{width:30,height:30,borderRadius:8,background:C.slateLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{item.icon}</div>
                      <div>
                        <div style={{fontSize:10,color:C.faint,lineHeight:1,marginBottom:2}}>{item.label}</div>
                        <div style={{fontSize:13,fontWeight:700,color:C.dark,lineHeight:1.2}}>{item.value}</div>
                        {item.sub&&<div style={{fontSize:11,color:C.sub,marginTop:1}}>{item.sub}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                {/* 일정 정보 */}
                {(proj.startDate||proj.due)&&(
                  <div style={{display:"flex",gap:8,alignItems:"center",borderLeft:`1px solid ${C.border}`,paddingLeft:16,flexShrink:0}}>
                    {proj.startDate&&(
                      <div style={{background:C.slateLight,borderRadius:10,padding:"6px 12px",textAlign:"center"}}>
                        <div style={{fontSize:10,color:C.faint,marginBottom:2}}>시작일</div>
                        <div style={{fontSize:13,fontWeight:700,color:C.dark}}>{proj.startDate}</div>
                      </div>
                    )}
                    {proj.startDate&&proj.due&&<div style={{color:C.faint,fontSize:16}}>→</div>}
                    {proj.due&&(()=>{
                      const isOver = proj.due < new Date().toISOString().slice(0,10);
                      return (
                        <div style={{background:isOver?"#fef2f2":C.blueLight,borderRadius:10,padding:"6px 12px",textAlign:"center",border:`1px solid ${isOver?"#fca5a5":C.blue+"44"}`}}>
                          <div style={{fontSize:10,color:isOver?"#ef4444":C.blue,marginBottom:2,fontWeight:600}}>납품일</div>
                          <div style={{fontSize:13,fontWeight:800,color:isOver?"#dc2626":C.blue}}>{proj.due}</div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* 태스크 탭 */}
            <TabBar
              tabs={[
                {id:"tasks",icon:"📋",label:"프로젝트"},
                {id:"feedback",icon:"💬",label:"피드백"},
                {id:"stafflist",icon:"👤",label:"스탭리스트"},
                {id:"calendar",icon:"📅",label:"캘린더"},
                {id:"figjam",icon:"🎨",label:"FigJam"},
                {id:"quote",icon:"💵",label:"견적서",locked:!canAccessProjFinance},
                {id:"budget",icon:"📒",label:"실행예산서",locked:!canAccessProjFinance},
                {id:"settlement",icon:"📊",label:"결산서",locked:!canAccessProjFinance},
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
                    <button onClick={()=>setViewMode("phase")} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${viewMode==="phase"?C.blue:C.border}`,background:viewMode==="phase"?C.blueLight:C.white,cursor:"pointer",fontSize:12,color:viewMode==="phase"?C.blue:C.sub}}>📋 단계별</button>
                    <button onClick={()=>setViewMode("flow")} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${viewMode==="flow"?C.blue:C.border}`,background:viewMode==="flow"?C.blueLight:C.white,cursor:"pointer",fontSize:12,color:viewMode==="flow"?C.blue:C.sub}}>🔀 협업흐름</button>
                    <button onClick={()=>setViewMode("list")} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${viewMode==="list"?C.blue:C.border}`,background:viewMode==="list"?C.blueLight:C.white,cursor:"pointer",fontSize:12,color:viewMode==="list"?C.blue:C.sub}}>☰ 리스트</button>
                    <button onClick={()=>setViewMode("kanban")} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${viewMode==="kanban"?C.blue:C.border}`,background:viewMode==="kanban"?C.blueLight:C.white,cursor:"pointer",fontSize:12,color:viewMode==="kanban"?C.blue:C.sub}}>⠿ 칸반</button>
                    <button onClick={()=>setViewMode("type")} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${viewMode==="type"?"#7c3aed":C.border}`,background:viewMode==="type"?"#f5f3ff":C.white,cursor:"pointer",fontSize:12,color:viewMode==="type"?"#7c3aed":C.sub}}>🏷 요청별</button>
                    <Btn primary sm onClick={()=>{setTaskModal({stage:"PLANNING",type:"내부",assignee:SEED_ACCOUNTS[0].name,priority:"보통"});setTf(v=>({...v,_edit:null}));}}>+ 태스크</Btn>
                  </div>
                </div>

                {viewMode==="phase"?(
                  <PhaseView
  tasks={proj.tasks||[]}
  feedbacks={proj.feedbacks||[]}
  template={PROJECT_TEMPLATE}
  user={user}
  accounts={accounts}
  projectRoles={proj.phaseRoles||{}}
  onEdit={t=>setTaskPanel({...t})}
  onUpdateTask={t=>{updateTasks((proj.tasks||[]).map(x=>x.id===t.id?t:x));}}
  onAddTask={(phaseId, phaseName)=>{
    setTaskModal({
      phaseId, phase:phaseName,
      stage:"PLANNING", type:"내부",
      priority:"보통", status:"대기",
      assignees:[], links:[], comments:[], meetings:[],
      createdBy:user.name, createdAt:new Date().toISOString(),
    });
  }}
  onAddSubTask={(parentTask)=>{
    setTaskModal({
      parentId: parentTask.id,
      parentTitle: parentTask.title,
      phaseId: parentTask.phaseId,
      phase: parentTask.phase,
      stage: parentTask.stage||"PLANNING",
      type: parentTask.type||"내부",
      priority:"보통", status:"대기",
      assignees:[], links:[], comments:[], meetings:[],
      createdBy:user.name, createdAt:new Date().toISOString(),
    });
  }}
  onDeleteTask={(taskId)=>{
    if(window.confirm("태스크를 삭제하시겠습니까?"))
      updateTasks((proj.tasks||[]).filter(t=>t.id!==taskId));
  }}
  onUpdatePhaseRole={(phaseId, roleForm)=>{
    patchProj(p=>({...p, phaseRoles:{...(p.phaseRoles||{}), [phaseId]:roleForm}}));
  }}
/>
                ):viewMode==="flow"?(
                  <FlowView tasks={filteredTasks} accounts={accounts} user={user} onEdit={t=>setTaskPanel({...t})} onAdd={()=>{setTaskModal({stage:"PLANNING",type:"내부",assignee:user.name,priority:"보통"});}} onUpdateTask={t=>{updateTasks((proj.tasks||[]).map(x=>x.id===t.id?t:x));}} onNotify={n=>setNotifications(p=>[n,...p])}/>
                ):viewMode==="kanban"?(
                  <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:12}}>
                    {stageKeys.map(s=><KanbanCol key={s} stage={s} tasks={filteredTasks.filter(t=>t.stage===s)} onEdit={t=>setTaskPanel({...t})}/>)}
                  </div>
                ):viewMode==="list"?(
                  <div style={{border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"2fr 100px 90px 90px 80px 32px",background:C.slateLight,padding:"9px 14px",fontSize:11,fontWeight:700,color:C.sub,gap:8}}>
                      <span>태스크</span><span>스테이지</span><span>마감일</span><span>담당자</span><span>우선순위</span><span/>
                    </div>
                    {filteredTasks.length===0&&<div style={{padding:"30px",textAlign:"center",color:C.faint,fontSize:14}}>태스크가 없습니다</div>}
                    {filteredTasks.map((t,i)=>(
                      <div key={t.id} style={{display:"grid",gridTemplateColumns:"2fr 100px 90px 90px 80px 32px",padding:"11px 14px",borderTop:`1px solid ${C.border}`,gap:8,alignItems:"center",background:i%2===0?C.white:"#fafbfc",cursor:"pointer"}}
                        onClick={()=>setTaskPanel({...t})}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:isOverdue(t)?C.red:C.text}}>{t.title}{isOverdue(t)?" ⚠":""}</div>
                          <div style={{display:"flex",gap:4,marginTop:3,alignItems:"center",flexWrap:"wrap"}}>
                            <span style={{fontSize:11,color:C.faint}}>{t.type}</span>
                            {(t.comments||[]).length>0&&(
                              <span style={{fontSize:9,padding:"1px 6px",borderRadius:99,
                                background:"#f0fdf4",color:"#16a34a",border:"1px solid #86efac",fontWeight:700}}>
                                💬 {t.comments.length}
                              </span>
                            )}
                            {(t.meetings||[]).length>0&&(
                              <span style={{fontSize:9,padding:"1px 6px",borderRadius:99,
                                background:"#f5f3ff",color:"#7c3aed",border:"1px solid #ddd6fe",fontWeight:700}}>
                                📅 {t.meetings.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:STAGES[t.stage]?.bg,color:STAGES[t.stage]?.color,fontWeight:600,whiteSpace:"nowrap"}}>{t.stage}</span>
                        <span style={{fontSize:12,color:isOverdue(t)?C.red:C.faint}}>{t.due||"-"}</span>
                        <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                          {(t.assignees&&t.assignees.length>0)
                            ? t.assignees.slice(0,2).map(n=><span key={n} style={{display:"flex",alignItems:"center",gap:2,fontSize:11}}><Avatar name={n} size={18}/>{n}</span>)
                            : t.assignee ? <span style={{display:"flex",alignItems:"center",gap:2,fontSize:12}}><Avatar name={t.assignee} size={22}/>{t.assignee}</span> : <span style={{fontSize:12,color:"#94a3b8"}}>미배정</span>
                          }
                        </div>
                        <span style={{fontSize:11,color:t.priority==="긴급"?C.red:t.priority==="높음"?C.amber:C.faint,fontWeight:600}}>{t.priority||"-"}</span>
                        <button onClick={e=>{e.stopPropagation();deleteTask(t.id);}} style={{border:"none",background:"none",cursor:"pointer",color:C.faint,fontSize:16}}>×</button>
                      </div>
                    ))}
                  </div>
                ):viewMode==="type"?(
                  <TypeView tasks={filteredTasks} onEdit={t=>setTaskPanel({...t})} onDelete={deleteTask}/>
                ):null}
              </div>
            )}

            {/* ── 피드백 ── */}
            {docTab==="feedback"&&<FeedbackTab project={proj} patchProj={patchProj} user={user} accounts={accounts} setNotifications={setNotifications}/>}

            {/* ── 캘린더 ── */}
            {docTab==="calendar"&&<MonthCalendar project={proj} onChange={patchProj} user={user}/>}

            {/* ── 스탭리스트 ── */}
            {docTab==="stafflist"&&<StaffList project={proj} onChange={patchProj} accounts={accounts}/>}

            {/* ── 견적서 ── */}
            {docTab==="quote"&&<QuoteEditor quote={proj.quote} onChange={updateQuote} exportProject={proj} company={company}/>}

            {/* ── 실행예산서 ── */}
            {docTab==="budget"&&<BudgetEditor project={proj} onSave={p=>patchProj(()=>p)}/>}

            {/* ── 결산서 ── */}
            {docTab==="settlement"&&<SettlementView project={proj} onConfirm={confirmSettlement} onSave={p=>patchProj(()=>p)}/>}

            {/* ── FigJam ── */}
            {docTab==="figjam"&&<FigJamTab project={proj} onChange={patchProj}/>}
          </>
        )}
      </div>

      {/* 태스크 모달 */}
      {/* 태스크 상세 패널 */}
      {taskPanel && (
        <TaskDetailPanel
          task={taskPanel}
          accounts={accounts}
          user={user}
          projName={proj?.name||""}
          onClose={()=>setTaskPanel(null)}
          onUpdate={(updated)=>{
            setTaskPanel(updated);
            updateTasks((proj.tasks||[]).map(t=>t.id===updated.id?updated:t));
          }}
          onDelete={(id)=>{
            updateTasks((proj.tasks||[]).filter(t=>t.id!==id));
            setTaskPanel(null);
          }}
          onNotify={(notif)=>setNotifications(prev=>[notif,...prev])}
          projTasks={proj?.tasks||[]}
        />
      )}

      {taskModal && (
        <Modal title={taskModal.id?"태스크 수정":"새 태스크"} onClose={()=>setTaskModal(null)}>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>

            {/* 상위 태스크 안내 (하위 추가 시) */}
            {taskModal.parentId && (
              <div style={{width:"100%",padding:"8px 12px",borderRadius:8,
                background:"#eff6ff",border:"1px solid #bfdbfe",
                fontSize:12,color:"#2563eb",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>↳</span>
                <span><strong>{taskModal.parentTitle}</strong>의 하위 태스크</span>
                <button type="button"
                  onClick={()=>setTaskModal(v=>({...v,parentId:null,parentTitle:null}))}
                  style={{marginLeft:"auto",border:"none",background:"none",
                    cursor:"pointer",color:"#64748b",fontSize:12}}>✕ 해제</button>
              </div>
            )}

            {/* ① 단계 연결 — 최상위 */}
            <Field label="단계 연결">
              <select style={inp} value={taskModal.phaseId||""} onChange={e=>{
                const ph = PROJECT_TEMPLATE.find(p=>p.id===e.target.value);
                setTaskModal(v=>({...v, phaseId:e.target.value, phase:ph?ph.phase:"", _showSugg:false}));
              }}>
                <option value="">- 단계 미연결 -</option>
                {PROJECT_TEMPLATE.map(p=>(
                  <option key={p.id} value={p.id}>{p.order}. {p.phase}</option>
                ))}
              </select>
            </Field>

            {/* ② 태스크명 + 추천 항목 버튼 */}
            <Field label="태스크명 *">
              <div style={{display:"flex",gap:6}}>
                <input style={{...inp,flex:1}} autoFocus value={taskModal.title||""}
                  onChange={e=>setTaskModal(v=>({...v,title:e.target.value}))}
                  placeholder="ex. 촬영 D-day 준비"/>
                {!taskModal.id && taskModal.phaseId && (PHASE_SUGGESTIONS[taskModal.phaseId]||[]).length>0 && (
                  <div style={{position:"relative"}}>
                    <button type="button"
                      onClick={()=>setTaskModal(v=>({...v,_showSugg:!v._showSugg}))}
                      style={{padding:"9px 12px",borderRadius:8,border:"1px solid #e2e8f0",
                        background:taskModal._showSugg?"#eff6ff":"#f8fafc",
                        color:taskModal._showSugg?"#2563eb":"#64748b",
                        cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>
                      📋 추천 항목
                    </button>
                    {taskModal._showSugg && (
                      <div style={{position:"absolute",top:"calc(100% + 4px)",right:0,
                        background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,
                        boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:100,
                        minWidth:220,padding:6,display:"flex",flexDirection:"column",gap:2}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",
                          padding:"4px 8px",letterSpacing:.8}}>
                          {taskModal.phase} — 추천 태스크
                        </div>
                        {(PHASE_SUGGESTIONS[taskModal.phaseId]||[]).map(name=>(
                          <button key={name} type="button"
                            onClick={()=>setTaskModal(v=>({...v,title:name,_showSugg:false}))}
                            style={{textAlign:"left",padding:"7px 10px",borderRadius:7,
                              border:"none",background:"transparent",cursor:"pointer",
                              fontSize:12,color:"#1e293b"}}
                            onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Field>

            {/* ③ 담당자 */}
            <Field label="담당자">
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {accounts.map(a=>{
                  const sel=(taskModal.assignees||[]).includes(a.name);
                  return (
                    <button key={a.id} type="button"
                      onClick={()=>setTaskModal(v=>{
                        const cur=v.assignees||[];
                        return {...v,assignees:sel?cur.filter(n=>n!==a.name):[...cur,a.name]};
                      })}
                      style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",
                        borderRadius:99,cursor:"pointer",fontSize:12,border:"none",
                        background:sel?"#eff6ff":"#f1f5f9",color:sel?"#2563eb":"#475569",
                        fontWeight:sel?700:400,outline:sel?"2px solid #2563eb":"none"}}>
                      <Avatar name={a.name} size={16}/>
                      {a.name}{sel&&<span style={{fontSize:10}}>✓</span>}
                    </button>
                  );
                })}
              </div>
              {(taskModal.assignees||[]).length===0&&(
                <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>담당자를 선택하세요</div>
              )}
            </Field>

            {/* ④ 상태 / 우선순위 */}
            <Field label="상태" half>
              <select style={inp} value={taskModal.status||"대기"} onChange={e=>setTaskModal(v=>({...v,status:e.target.value}))}>
                {["대기","진행중","완료","보류"].map(s=><option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="우선순위" half>
              <select style={inp} value={taskModal.priority||"보통"} onChange={e=>setTaskModal(v=>({...v,priority:e.target.value}))}>
                {["긴급","높음","보통","낮음"].map(p=><option key={p}>{p}</option>)}
              </select>
            </Field>

            {/* ⑤ 스테이지 / 요청 */}
            <Field label="스테이지" half>
              <select style={inp} value={taskModal.stage||"PLANNING"} onChange={e=>setTaskModal(v=>({...v,stage:e.target.value}))}>
                {stageKeys.map(s=><option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="요청" half>
              <select style={inp} value={taskModal.type||"내부"} onChange={e=>setTaskModal(v=>({...v,type:e.target.value}))}>
                {["내부","고객사","협력사"].map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>

            {/* ⑥ 마감일 */}
            <Field label="마감일" half>
              <input style={{...inp}} type="datetime-local" value={taskModal.due||""} onChange={e=>setTaskModal(v=>({...v,due:e.target.value}))}/>
            </Field>

            {/* ⑦ 설명 */}
            <Field label="설명">
              <textarea style={{...inp,resize:"vertical",minHeight:60}} value={taskModal.desc||""} onChange={e=>setTaskModal(v=>({...v,desc:e.target.value}))} placeholder="세부 내용..."/>
            </Field>

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
            <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:4}}>💰 경영관리 문서 접근 허용 멤버</div>
            <div style={{fontSize:11,color:C.faint,marginBottom:8}}>체크된 멤버만 이 프로젝트의 견적서·예산서·결산서 열람/편집 가능 (대표·경영지원은 항상 접근 가능)</div>
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
          {/* 워크플로우 템플릿 */}
          <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"12px 14px",marginBottom:4}}>
            <div style={{fontSize:13,fontWeight:700,color:"#16a34a",marginBottom:8}}>🗂 워크플로우 템플릿</div>
            {(proj.tasks||[]).filter(t=>t.phaseId).length > 0 ? (
              <div style={{fontSize:12,color:"#15803d",marginBottom:8}}>
                현재 템플릿 태스크 {(proj.tasks||[]).filter(t=>t.phaseId).length}개 연결됨
              </div>
            ) : (
              <div style={{fontSize:12,color:"#94a3b8",marginBottom:8}}>
                현재 템플릿이 적용되지 않은 프로젝트입니다
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{
                if(window.confirm("22단계 표준 템플릿을 적용합니다.\n기존 템플릿 태스크는 유지되고 누락된 단계만 추가됩니다.")) {
                  const existing = (proj.tasks||[]).filter(t=>t.phaseId);
                  const existingPhaseSteps = new Set(existing.map(t=>t.id));
                  const newTasks = generateTasksFromTemplate(proj.id, accounts.filter(a=>[pf.pd,pf.director,pf.epd,pf.assistant].includes(a.name)));
                  const toAdd = newTasks.filter(t => !existing.some(e=>e.phaseId===t.phaseId && e.title===t.title));
                  updateTasks([...(proj.tasks||[]), ...toAdd]);
                }
              }} style={{padding:"7px 14px",borderRadius:8,border:"1px solid #86efac",background:"#dcfce7",color:"#16a34a",cursor:"pointer",fontSize:12,fontWeight:600}}>
                + 템플릿 적용 (누락 단계 추가)
              </button>
              <button onClick={()=>{
                if(window.confirm("템플릿 태스크를 모두 초기화하고 새로 생성합니다.\n진행 상태가 초기화됩니다. 계속하시겠습니까?")) {
                  const nonTemplate = (proj.tasks||[]).filter(t=>!t.phaseId);
                  const newTasks = generateTasksFromTemplate(proj.id, accounts.filter(a=>[pf.pd,pf.director,pf.epd,pf.assistant].includes(a.name)));
                  updateTasks([...nonTemplate, ...newTasks]);
                }
              }} style={{padding:"7px 14px",borderRadius:8,border:"1px solid #fca5a5",background:"#fee2e2",color:"#ef4444",cursor:"pointer",fontSize:12,fontWeight:600}}>
                ↺ 템플릿 초기화
              </button>
            </div>
          </div>

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
          <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"12px 14px",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontWeight:700,fontSize:13,color:"#16a34a"}}>🗂 워크플로우 템플릿</div>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
                <input type="checkbox" checked={pf.useTemplate!==false}
                  onChange={e=>setPf(v=>({...v,useTemplate:e.target.checked}))}
                  style={{accentColor:"#16a34a",width:16,height:16}}/>
                <span style={{color:"#16a34a",fontWeight:600}}>22단계 표준 템플릿 적용</span>
              </label>
            </div>
            {pf.useTemplate!==false && (
              <div style={{fontSize:11,color:"#15803d"}}>
                비딩 → 기획 → 트리트먼트 → PPM → 촬영준비 → 촬영 → 편집 → 색보정 → 시사 × 3 → 납품 → 최종보고
                <div style={{marginTop:4,color:"#86efac"}}>총 22단계 · 65개 하위 태스크가 자동으로 생성됩니다</div>
              </div>
            )}
          </div>
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
