function StaffList({ project, onChange, accounts }) {
  const staff = project.staff || [];
  const [modal, setModal] = useState(null);
  const [sf, setSf] = useState({});
  const [filterGroup, setFilterGroup] = useState("전체");

  const STAFF_GROUPS = ["감독팀","제작팀","촬영팀","조명팀","미술팀","편집팀","CG팀","사운드팀","캐스팅","기타"];

  const filtered = filterGroup === "전체" ? staff : staff.filter(s => s.group === filterGroup);

  const openAdd = () => {
    setSf({ name:"", role:"", group:"기타", phone:"", email:"", note:"", memberId:"" });
    setModal("add");
  };
  const openEdit = (s) => { setSf({...s}); setModal("edit"); };

  const save = () => {
    if (!sf.name?.trim() && !sf.memberId) return;
    const entry = { ...sf, id: sf.id || "st" + Date.now() };
    const list = modal === "edit"
      ? staff.map(s => s.id === entry.id ? entry : s)
      : [...staff, entry];
    onChange(p => ({ ...p, staff: list }));
    setModal(null);
  };

  const del = () => {
    onChange(p => ({ ...p, staff: staff.filter(s => s.id !== sf.id) }));
    setModal(null);
  };

  const memberFromId = (id) => accounts.find(a => a.id === id);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["전체", ...STAFF_GROUPS].map(g => (
            <button key={g} onClick={() => setFilterGroup(g)}
              style={{ padding:"4px 12px", borderRadius:99, border:`1.5px solid ${filterGroup===g?"#2563eb":C.border}`,
                background:filterGroup===g?"#eff6ff":"#fff", color:filterGroup===g?"#2563eb":C.sub,
                fontSize:12, fontWeight:filterGroup===g?700:400, cursor:"pointer" }}>
              {g}
            </button>
          ))}
        </div>
        <Btn primary onClick={openAdd}>+ 스탭 추가</Btn>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding:"48px 0", textAlign:"center", color:C.faint, fontSize:13, border:`1px dashed ${C.border}`, borderRadius:12 }}>
          스탭이 없습니다
        </div>
      ) : (
        <div style={{ border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 100px 140px 140px 80px",
            background:C.slateLight, padding:"9px 16px", fontSize:11, fontWeight:700, color:C.sub, gap:8 }}>
            <span>이름</span><span>직책/파트</span><span>그룹</span><span>연락처</span><span>이메일</span><span/>
          </div>
          {filtered.map((s, i) => {
            const linked = s.memberId ? memberFromId(s.memberId) : null;
            return (
              <div key={s.id}
                style={{ display:"grid", gridTemplateColumns:"1fr 100px 100px 140px 140px 80px",
                  padding:"10px 16px", gap:8, borderTop:i>0?`1px solid ${C.border}`:"none",
                  background:"#fff", alignItems:"center", transition:"background .1s" }}
                onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Avatar name={linked ? linked.name : s.name} size={28}/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{s.name || linked?.name}</div>
                    {s.note && <div style={{ fontSize:11, color:C.faint }}>{s.note}</div>}
                  </div>
                </div>
                <span style={{ fontSize:12, color:C.sub }}>{s.role}</span>
                <span style={{ fontSize:11, padding:"2px 8px", borderRadius:99,
                  background:"#f1f5f9", color:C.sub, fontWeight:500 }}>{s.group}</span>
                <span style={{ fontSize:12, color:C.sub }}>{s.phone || "-"}</span>
                <span style={{ fontSize:12, color:C.sub }}>{s.email || "-"}</span>
                <button onClick={() => openEdit(s)}
                  style={{ fontSize:12, padding:"4px 10px", borderRadius:6, border:`1px solid ${C.border}`,
                    background:"#fff", cursor:"pointer", color:C.sub }}>수정</button>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "스탭 추가" : "스탭 수정"} onClose={() => setModal(null)}>
          <Field label="구성원 연결 (선택)">
            <select style={inp} value={sf.memberId || ""} onChange={e => {
              const acc = accounts.find(a => a.id === e.target.value);
              setSf(v => ({ ...v, memberId: e.target.value, name: acc?.name || v.name, role: acc?.role || v.role }));
            }}>
              <option value="">— 직접 입력 —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
            </select>
          </Field>
          <div style={{ display:"flex", gap:12 }}>
            <Field label="이름 *" half>
              <input style={inp} value={sf.name || ""} onChange={e => setSf(v => ({ ...v, name: e.target.value }))} placeholder="홍길동"/>
            </Field>
            <Field label="직책/파트" half>
              <input style={inp} value={sf.role || ""} onChange={e => setSf(v => ({ ...v, role: e.target.value }))} placeholder="감독"/>
            </Field>
          </div>
          <Field label="그룹">
            <select style={inp} value={sf.group || "기타"} onChange={e => setSf(v => ({ ...v, group: e.target.value }))}>
              {STAFF_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <div style={{ display:"flex", gap:12 }}>
            <Field label="연락처" half>
              <input style={inp} value={sf.phone || ""} onChange={e => setSf(v => ({ ...v, phone: e.target.value }))} placeholder="010-0000-0000"/>
            </Field>
            <Field label="이메일" half>
              <input style={inp} value={sf.email || ""} onChange={e => setSf(v => ({ ...v, email: e.target.value }))} placeholder="name@email.com"/>
            </Field>
          </div>
          <Field label="메모">
            <input style={inp} value={sf.note || ""} onChange={e => setSf(v => ({ ...v, note: e.target.value }))} placeholder="역할 메모..."/>
          </Field>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:12 }}>
            {modal === "edit" && <Btn danger sm onClick={del}>삭제</Btn>}
            <div style={{ flex:1 }}/>
            <Btn onClick={() => setModal(null)}>취소</Btn>
            <Btn primary onClick={save} disabled={!sf.name?.trim() && !sf.memberId}>저장</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

