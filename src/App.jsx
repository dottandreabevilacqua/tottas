import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════
// MARI.A-ORTHO SYSTEM PROMPT
// ═══════════════════════════════════════════════════════
const MARIA_SYSTEM = `Sei Mari.a-ortho, l'assistente virtuale dello studio dentistico LAVILLA del Dr. Andrea. Rispondi ai pazienti con allineatori dentali.

## Carattere
- Calda, empatica, professionale ma mai fredda
- Tono motivazionale + consigli pratici
- Chiama il paziente per nome
- Emoji con moderazione (1-2 per messaggio)
- Italiano chiaro e conciso, risposte max 3-4 frasi
- Non fai diagnosi mediche

## Competenze

### Dolore/fastidio
- Prime 48-72h dopo cambio: pressione NORMALE
- Consiglio: mettere nuova mascherina la sera → adattamento nel sonno
- Dolore persiste >5-7 giorni o molto intenso → [ESCALATION: dolore persistente mascherina N]
- Irritazioni gengivali: cera ortodontica
- Bordi taglienti → venire in studio

### Cambio intervallo
- PUOI approvare allungamento 1-3 giorni se difficoltà (non portata abbastanza, malattia, viaggio)
- Se approvi: rispondi con [CAMBIO_INTERVALLO: +X giorni, mascherina N, motivo]
- NON PUOI accorciare intervallo → [ESCALATION: richiesta accorciamento intervallo]
- Dopo ogni cambio: [NOTIFICA_EMILIA: riepilogo]

### Consigli pratici
- Minimo 22h/giorno, togliere solo per mangiare e igiene
- Chewies: 5-10 min dopo inserimento
- Lavare con acqua FREDDA e spazzolino morbido (NO acqua calda!)
- Sempre nel porta-allineatore quando fuori (mai tovagliolo!)
- Macchie: ammollo acqua+bicarbonato 15 min
- Viaggio: portare mascherina precedente come backup
- Bevande: OK solo acqua naturale con mascherina
- Fumo: sconsigliato, macchia e rallenta

### Escalation → Dr. Andrea/team
- Dolore intenso >7 giorni
- Mascherina non calza (spazi evidenti)
- Dente si muove troppo/direzione sbagliata
- Vuole accorciare tempi o interrompere
- Caso clinico complesso
- Usa: [ESCALATION: motivo] e rassicura il paziente

## Paziente attuale
{context}`;

// ═══════════════════════════════════════════════════════
// MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════
const TEMPLATES = {
  inizio: [
    "Ciao {nome}! 🦷✨ Oggi inizia il tuo percorso verso il sorriso perfetto! Mascherina n°1 di {totali}. Le prime 48h potresti sentire pressione, è normalissimo — significa che sta funzionando! Indossala almeno 22h al giorno. Ce la farai alla grande! 💪",
    "Hey {nome}! 🎉 Benvenuto/a nel club dei sorrisi in evoluzione! Mascherina 1/{totali} — il primo passo è fatto! Pro tip: tieni sempre con te il porta-allineatore. Se senti fastidio, acqua fresca aiuta. Siamo qui per te!",
  ],
  cambio: [
    "Ciao {nome}! 🔄 Passa alla mascherina n°{n} di {totali}! Sei al {pct}% del percorso! Mettila prima di dormire così l'adattamento avviene nel sonno. Un piccolo gesto, un grande passo avanti! 🚀",
    "Hey {nome}! ✨ Nuova mascherina n°{n}/{totali}. Sei a {pct}%! Dopo il cambio, mastica un chewies per 5-10 min per far aderire bene l'allineatore. Keep going! 💪",
    "{nome}, upgrade time! 🆙 Mascherina n°{n}. Percorso: {pct}%. Ricorda: 22h al giorno è il segreto per restare nei tempi. Stai facendo un lavoro incredibile! 🌟",
  ],
  meta: [
    "{nome}!! 🎯 SEI A METÀ PERCORSO! Mascherina n°{n}/{totali} — quanta strada! Scattati una foto e confrontala con quella iniziale. Vedrai già cambiamenti! 📸✨",
  ],
  quasi_fine: [
    "{nome}, ci siamo quasi!! 🔥 Mascherina n°{n}/{totali} — mancano solo {rem} cambi! L'ultima fase è cruciale per la stabilità. Ogni ora conta! 💎",
  ],
  ultima: [
    "{nome}!!! 🎊🎉🦷 ULTIMA MASCHERINA! La n°{totali}/{totali}! Indossala con lo stesso impegno della prima — il finale è il più importante! Prenota il controllo finale. Siamo orgogliosi di te! 🏆💫",
  ],
};

function genMsg(p, n) {
  const total = p.totalAligners, pct = Math.round((n / total) * 100), rem = total - n;
  let phase = n === 1 ? "inizio" : n === total ? "ultima" : n === Math.ceil(total / 2) ? "meta" : rem <= 3 ? "quasi_fine" : "cambio";
  const arr = TEMPLATES[phase];
  return arr[Math.floor(Math.random() * arr.length)]
    .replace(/{nome}/g, p.firstName).replace(/{n}/g, n).replace(/{totali}/g, total)
    .replace(/{pct}/g, pct).replace(/{rem}/g, rem);
}

function intervalFor(phases, n) {
  if (!phases?.length) return 14;
  for (let i = phases.length - 1; i >= 0; i--) if (n >= phases[i].fromAligner) return phases[i].intervalDays;
  return phases[0].intervalDays;
}

function buildSchedule(p) {
  const sched = []; const start = new Date(p.deliveryDate); let cum = 0;
  for (let i = 1; i <= p.totalAligners; i++) {
    const d = new Date(start); d.setDate(d.getDate() + cum);
    const iv = intervalFor(p.phases, i);
    sched.push({ number: i, date: d, intervalDays: iv });
    cum += iv;
  }
  return sched;
}

function fmtDate(d) { return new Date(d).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }); }
function fmtPhone(ph) { return ph.replace(/\s/g, "").replace(/^(\+?\d{2,3})/, "$1 "); }

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function App() {
  const [patients, setPatients] = useState([]);
  const [view, setView] = useState("list"); // list | form | detail | chat
  const [selected, setSelected] = useState(null);
  const [editId, setEditId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    try { const r = localStorage.getItem("tottas-patients"); if (r) setPatients(JSON.parse(r)); } catch {}
    try { const r = localStorage.getItem("tottas-notifications"); if (r) setNotifications(JSON.parse(r)); } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => { if (!loaded) return;
    try { localStorage.setItem("tottas-patients", JSON.stringify(patients)); } catch {}
  }, [patients, loaded]);

  useEffect(() => { if (!loaded) return;
    try { localStorage.setItem("tottas-notifications", JSON.stringify(notifications)); } catch {}
  }, [notifications, loaded]);

  useEffect(() => { if (selected) { const u = patients.find(p => p.id === selected.id); if (u) setSelected(u); } }, [patients]);

  const save = (p) => {
    const sorted = { ...p, phases: [...p.phases].sort((a, b) => a.fromAligner - b.fromAligner) };
    if (editId) setPatients(prev => prev.map(x => x.id === editId ? { ...sorted, id: editId } : x));
    else setPatients(prev => [...prev, { ...sorted, id: Date.now().toString() }]);
    setEditId(null); setView("list");
  };
  const updCurrent = (id, v) => setPatients(prev => prev.map(p => p.id === id ? { ...p, currentAligner: Math.max(0, Math.min(v, p.totalAligners)) } : p));
  const del = (id) => { setPatients(prev => prev.filter(p => p.id !== id)); if (selected?.id === id) { setSelected(null); setView("list"); } };
  const addNotif = (n) => setNotifications(prev => [{ ...n, id: Date.now(), time: new Date().toISOString() }, ...prev].slice(0, 50));

  if (!loaded) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "'DM Sans',sans-serif", color: "#71717a" }}>Caricamento...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f0ec", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#f0f0ec}
        input,select,button,textarea{font-family:inherit}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#c5c5be;border-radius:3px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
        .anim-fade{animation:fadeUp .35s ease both}
        .anim-slide{animation:slideIn .35s ease both}
        .hover-lift{transition:all .2s}.hover-lift:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.07)!important}
        .hover-bright{transition:all .15s}.hover-bright:hover{filter:brightness(1.05);transform:scale(1.01)}
        .wa-bub{background:#d9fdd3;border-radius:0 12px 12px 12px;padding:10px 14px;font-size:14px;line-height:1.5;color:#1a1a1a;position:relative;white-space:pre-wrap}
        .wa-bub-ai{background:#fff;border-radius:0 12px 12px 12px;padding:10px 14px;font-size:14px;line-height:1.5;color:#1a1a1a;white-space:pre-wrap;box-shadow:0 1px 2px rgba(0,0,0,.05)}
        .wa-bub-out{background:#d9fdd3;border-radius:12px 0 12px 12px;padding:10px 14px;font-size:14px;line-height:1.5;color:#1a1a1a;white-space:pre-wrap;box-shadow:0 1px 2px rgba(0,0,0,.05)}
        .dot-pulse{width:7px;height:7px;border-radius:50%;background:#888;display:inline-block;margin:0 2px;animation:pulse 1.2s infinite}
        .phase-tag{display:inline-flex;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600}
        .progress-bar{transition:width .8s cubic-bezier(.22,1,.36,1)}
      `}</style>

      {/* ─── HEADER ─── */}
      <div style={H.bar}>
        <div style={H.inner}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {view !== "list" && <button onClick={() => { setView("list"); setEditId(null); }} style={H.back} className="hover-bright">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={H.logo}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2C9.5 2 7.5 3 6.5 4.5C5.5 6 5 7.5 5 9c0 2 .5 3.5 1 5s1 3.5 1.2 5c.2 1.5.8 3 1.8 3s1.5-1 2-3c.3-1.2.7-1.2 1-1.2s.7 0 1 1.2c.5 2 1 3 2 3s1.6-1.5 1.8-3c.2-1.5.7-3.5 1.2-5s1-3 1-5c0-1.5-.5-3-1.5-4.5C16.5 3 14.5 2 12 2z"/></svg></div>
              <div>
                <h1 style={H.title}>Tottas</h1>
                <p style={H.sub}>{view === "list" ? `${patients.length} pazient${patients.length === 1 ? "e" : "i"}` : view === "chat" ? `Chat Mari.a-ortho` : view === "detail" ? "Piano messaggi" : "Gestione paziente"}</p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {view === "list" && <>
              <button onClick={() => setView("notif")} style={{ ...H.btn, position: "relative" }} className="hover-bright" title="Notifiche Emilia">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                {notifications.length > 0 && <span style={H.badge}>{notifications.length}</span>}
              </button>
              <button onClick={() => { setEditId(null); setSelected(null); setView("form"); }} style={H.addBtn} className="hover-bright">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Aggiungi</span>
              </button>
            </>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 20px 80px" }}>
        {view === "list" && <PatientList patients={patients} onSelect={p => { setSelected(p); setView("detail"); }} onChat={p => { setSelected(p); setView("chat"); }} onEdit={p => { setEditId(p.id); setSelected(p); setView("form"); }} onDel={del} onUpdCurrent={updCurrent} onAdd={() => { setEditId(null); setSelected(null); setView("form"); }} />}
        {view === "form" && <PatientForm onSave={save} onCancel={() => { setView("list"); setEditId(null); }} initial={editId ? selected : null} />}
        {view === "detail" && selected && <Detail patient={selected} onChat={() => setView("chat")} />}
        {view === "chat" && selected && <ChatMaria patient={selected} onNotif={addNotif} onUpdatePatient={(id, changes) => setPatients(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))} />}
        {view === "notif" && <NotifLog notifications={notifications} onClear={() => setNotifications([])} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PATIENT LIST
// ═══════════════════════════════════════════════════════
function PatientList({ patients, onSelect, onChat, onEdit, onDel, onUpdCurrent, onAdd }) {
  if (!patients.length) return (
    <div className="anim-fade" style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>🦷</div>
      <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display',serif", color: "#1a1a1a", marginBottom: 8 }}>Nessun paziente</h3>
      <p style={{ fontSize: 15, color: "#71717a", maxWidth: 340, margin: "0 auto 24px" }}>Aggiungi il primo paziente per iniziare</p>
      <button onClick={onAdd} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 14, border: "none", background: "#1a1a1a", color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer" }} className="hover-bright">+ Aggiungi paziente</button>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 14 }}>
      {patients.map((p, i) => {
        const pct = Math.round(((p.currentAligner || 0) / p.totalAligners) * 100);
        const curIv = intervalFor(p.phases, p.currentAligner || 1);
        const done = pct >= 100;
        return (
          <div key={p.id} className="anim-fade hover-lift" style={{ ...C.card, animationDelay: `${i * .05}s` }}>
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={C.avatar}>{p.firstName[0]}{p.lastName[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>{p.firstName} {p.lastName}</div>
                <div style={{ fontSize: 12, color: "#71717a", display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  {fmtPhone(p.phone)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => onEdit(p)} style={C.ib} title="Modifica"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button onClick={() => onDel(p.id)} style={{ ...C.ib, color: "#ef4444" }} title="Elimina"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
              </div>
            </div>

            {/* Stepper */}
            <div style={C.stepBox}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Mascherina attuale</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <button onClick={() => onUpdCurrent(p.id, (p.currentAligner || 0) - 1)} style={C.stepBtn} className="hover-bright"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: "#6366f1", fontFamily: "'Playfair Display',serif" }}>{p.currentAligner || 0}</span>
                  <span style={{ fontSize: 15, color: "#a1a1aa", fontWeight: 500 }}> / {p.totalAligners}</span>
                </div>
                <button onClick={() => onUpdCurrent(p.id, (p.currentAligner || 0) + 1)} style={C.stepBtn} className="hover-bright"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
              </div>
              <div style={{ fontSize: 11, color: "#71717a", textAlign: "center", marginTop: 5 }}>Intervallo: <strong>{curIv}gg</strong></div>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: done ? "#10b981" : "#3f3f46" }}>{done ? "Completato" : `${pct}%`}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#6366f1" }}>{pct}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "#ebebeb", overflow: "hidden" }}>
                <div className="progress-bar" style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: done ? "#10b981" : "#6366f1" }} />
              </div>
            </div>

            {/* Phases */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {p.phases.map((ph, idx) => (
                <span key={idx} className="phase-tag" style={{ background: idx % 2 === 0 ? "#eef2ff" : "#fef3c7", color: idx % 2 === 0 ? "#4338ca" : "#92400e" }}>
                  {ph.fromAligner}→{idx < p.phases.length - 1 ? p.phases[idx + 1].fromAligner - 1 : p.totalAligners}: {ph.intervalDays}gg
                </span>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onSelect(p)} style={C.actBtn} className="hover-bright">📋 Piano messaggi</button>
              <button onClick={() => onChat(p)} style={C.chatBtn} className="hover-bright">💬 Chat Mari.a</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PATIENT FORM
// ═══════════════════════════════════════════════════════
function PatientForm({ onSave, onCancel, initial }) {
  const [f, setF] = useState(initial || { firstName: "", lastName: "", phone: "", totalAligners: 14, currentAligner: 1, deliveryDate: new Date().toISOString().split("T")[0], phases: [{ fromAligner: 1, intervalDays: 10 }] });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const uph = (i, k, v) => setF(p => { const ph = [...p.phases]; ph[i] = { ...ph[i], [k]: v }; return { ...p, phases: ph }; });

  let totalD = 0; for (let i = 1; i <= f.totalAligners; i++) totalD += intervalFor(f.phases, i);

  return (
    <div className="anim-fade">
      <div style={F.card}>
        <h2 style={F.title}>{initial ? "Modifica paziente" : "Nuovo paziente"}</h2>
        <p style={{ fontSize: 14, color: "#71717a", marginBottom: 24 }}>Dati paziente e configurazione fasi intervallo</p>
        <div style={F.grid}><div style={F.fi}><label style={F.la}>Nome *</label><input style={F.inp} value={f.firstName} onChange={e => s("firstName", e.target.value)} placeholder="Mario" /></div><div style={F.fi}><label style={F.la}>Cognome *</label><input style={F.inp} value={f.lastName} onChange={e => s("lastName", e.target.value)} placeholder="Rossi" /></div></div>
        <div style={F.fi}><label style={F.la}>Telefono *</label><input style={F.inp} value={f.phone} onChange={e => s("phone", e.target.value)} placeholder="+39 333 1234567" /></div>
        <div style={F.grid}><div style={F.fi}><label style={F.la}>Mascherine totali</label><input style={F.inp} type="number" min="1" max="99" value={f.totalAligners} onChange={e => s("totalAligners", parseInt(e.target.value) || 1)} /></div><div style={F.fi}><label style={F.la}>Attuale</label><input style={F.inp} type="number" min="0" max={f.totalAligners} value={f.currentAligner} onChange={e => s("currentAligner", parseInt(e.target.value) || 0)} /></div></div>
        <div style={F.fi}><label style={F.la}>Data consegna</label><input style={F.inp} type="date" value={f.deliveryDate} onChange={e => s("deliveryDate", e.target.value)} /></div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={F.la}>Fasi intervallo</label>
            <button onClick={() => setF(p => ({ ...p, phases: [...p.phases, { fromAligner: (p.phases[p.phases.length - 1]?.fromAligner || 1) + 6, intervalDays: 7 }] }))} style={F.addPh} className="hover-bright">+ Fase</button>
          </div>
          <p style={{ fontSize: 12, color: "#71717a", marginBottom: 10 }}>Es: mascherine 1-6 ogni 10gg, dalla 7 ogni 7gg</p>
          {f.phases.map((ph, i) => (
            <div key={i} style={F.phRow}>
              <div style={{ flex: 1 }}><label style={F.phLa}>Da masch. n°</label><input style={F.phInp} type="number" min="1" value={ph.fromAligner} onChange={e => uph(i, "fromAligner", parseInt(e.target.value) || 1)} disabled={i === 0} /></div>
              <div style={{ flex: 1 }}><label style={F.phLa}>Intervallo (gg)</label><input style={F.phInp} type="number" min="1" max="60" value={ph.intervalDays} onChange={e => uph(i, "intervalDays", parseInt(e.target.value) || 7)} /></div>
              {f.phases.length > 1 && <button onClick={() => setF(p => ({ ...p, phases: p.phases.filter((_, j) => j !== i) }))} style={F.rmPh}>✕</button>}
            </div>
          ))}
        </div>

        <div style={F.preview}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>📅 Durata stimata: <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{Math.ceil(totalD / 30)} mesi</span> <span style={{ fontWeight: 400, color: "#71717a" }}>({totalD} giorni)</span></div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={F.cancel} className="hover-bright">Annulla</button>
          <button onClick={() => { if (f.firstName && f.lastName && f.phone) onSave(f); }} style={F.save} className="hover-bright">{initial ? "Salva" : "Aggiungi"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DETAIL (MESSAGE TIMELINE)
// ═══════════════════════════════════════════════════════
function Detail({ patient: p, onChat }) {
  const sched = buildSchedule(p);
  const [msgs, setMsgs] = useState(sched.map(s => genMsg(p, s.number)));
  const [copied, setCopied] = useState(null);
  const [filter, setFilter] = useState("future");
  const cur = p.currentAligner || 0;
  const filtered = sched.filter(s => filter === "all" ? true : filter === "current" ? s.number === cur : s.number >= cur);

  const copy = (t, i) => { navigator.clipboard.writeText(t); setCopied(i); setTimeout(() => setCopied(null), 1500); };
  const wa = (t) => { window.open(`https://wa.me/${p.phone.replace(/[\s\-()]/g, "")}?text=${encodeURIComponent(t)}`, "_blank"); };
  const regen = (i) => { const m = [...msgs]; m[i] = genMsg(p, sched[i].number); setMsgs(m); };

  return (
    <div className="anim-slide">
      <div style={D.summary}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{ ...C.avatar, width: 50, height: 50, fontSize: 18, borderRadius: 15 }}>{p.firstName[0]}{p.lastName[0]}</div>
          <div><div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display',serif" }}>{p.firstName} {p.lastName}</div></div>
        </div>
        <div style={D.stats}>
          <div style={D.stat}><div style={D.statV}>{cur}/{p.totalAligners}</div><div style={D.statL}>attuale</div></div>
          <div style={D.div} /><div style={D.stat}><div style={D.statV}>{intervalFor(p.phases, cur || 1)}gg</div><div style={D.statL}>intervallo</div></div>
          <div style={D.div} /><div style={D.stat}><div style={D.statV}>{Math.round((cur / p.totalAligners) * 100)}%</div><div style={D.statL}>completato</div></div>
        </div>
        <button onClick={onChat} style={D.chatBtn} className="hover-bright">💬 Apri Chat Mari.a-ortho per questo paziente</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>Piano messaggi WhatsApp</h3>
        <div style={{ display: "flex", gap: 5 }}>
          {["all", "current", "future"].map(k => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", ...(filter === k ? { background: "#1a1a1a", color: "#fff", borderColor: "#1a1a1a" } : { background: "#fff", color: "#71717a", borderColor: "#e5e5e0" }) }} className="hover-bright">{k === "all" ? "Tutti" : k === "current" ? "Attuale" : "Da qui"}</button>
          ))}
        </div>
      </div>

      {filtered.map((s, i) => {
        const oi = sched.findIndex(x => x.number === s.number);
        const past = s.number < cur, isCur = s.number === cur;
        return (
          <div key={s.number} className="anim-fade" style={{ display: "flex", gap: 14, marginBottom: 20, opacity: past ? .4 : 1, animationDelay: `${i * .03}s` }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
              <div style={{ width: isCur ? 14 : 10, height: isCur ? 14 : 10, borderRadius: "50%", border: "2.5px solid", flexShrink: 0, borderColor: isCur ? "#f59e0b" : past ? "#10b981" : "#6366f1", background: isCur ? "#fef3c7" : past ? "#d1fae5" : "#eef2ff" }} />
              {i < filtered.length - 1 && <div style={{ width: 2, flex: 1, background: "#e5e5e0", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  #{s.number}/{p.totalAligners}
                  {isCur && <span style={{ fontSize: 9, fontWeight: 700, background: "#fef3c7", color: "#b45309", padding: "2px 7px", borderRadius: 5 }}>ATTUALE</span>}
                  <span style={{ fontSize: 9, fontWeight: 600, background: "#eef2ff", color: "#4338ca", padding: "2px 7px", borderRadius: 5 }}>{s.intervalDays}gg</span>
                </span>
                <span style={{ fontSize: 12, color: "#71717a" }}>{fmtDate(s.date)}</span>
              </div>
              <div className="wa-bub">{msgs[oi]}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <button onClick={() => regen(oi)} style={D.sm} className="hover-bright">🔄 Rigenera</button>
                <button onClick={() => copy(msgs[oi], oi)} style={D.sm} className="hover-bright">{copied === oi ? "✅ Copiato" : "📋 Copia"}</button>
                <button onClick={() => wa(msgs[oi])} style={D.waBtn} className="hover-bright">WhatsApp →</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MARI.A CHAT (AI-powered)
// ═══════════════════════════════════════════════════════
function ChatMaria({ patient: p, onNotif, onUpdatePatient }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inpRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const ctx = `Nome: ${p.firstName} ${p.lastName}\nMascherina: ${p.currentAligner || 0}/${p.totalAligners}\nIntervallo: ${intervalFor(p.phases, p.currentAligner || 1)} giorni\nFasi: ${p.phases.map((ph, i) => `da n°${ph.fromAligner}: ${ph.intervalDays}gg`).join(", ")}`;
  const sys = MARIA_SYSTEM.replace("{context}", ctx);

  const send = async (text) => {
    if (!text.trim()) return;
    const um = { role: "user", text: text.trim(), time: new Date() };
    setMsgs(prev => [...prev, um]); setInput(""); setLoading(true);

    const history = [...msgs, um].map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: sys, messages: history }),
      });
      const data = await res.json();
      const raw = data.content?.filter(i => i.type === "text").map(i => i.text).join("\n") || "Mi scuso, riprova tra un momento! 🙏";

      const clean = raw.replace(/\[CAMBIO_INTERVALLO:[^\]]*\]/g, "").replace(/\[ESCALATION:[^\]]*\]/g, "").replace(/\[NOTIFICA_EMILIA:[^\]]*\]/g, "").trim();
      const ivMatch = raw.match(/\[CAMBIO_INTERVALLO:\s*([^\]]+)\]/);
      const escMatch = raw.match(/\[ESCALATION:\s*([^\]]+)\]/);
      const emMatch = raw.match(/\[NOTIFICA_EMILIA:\s*([^\]]+)\]/);

      setMsgs(prev => [...prev, { role: "assistant", text: clean, time: new Date(), iv: ivMatch?.[1], esc: escMatch?.[1], em: emMatch?.[1] }]);

      // Handle notifications
      if (escMatch) {
        onNotif({ type: "escalation", patient: `${p.firstName} ${p.lastName}`, detail: escMatch[1] });
        setTimeout(() => setMsgs(prev => [...prev, { role: "system", text: `⚡ Escalation inviata al Dr. Andrea\n📩 Emilia notificata — Team LAVILLA`, time: new Date() }]), 600);
      } else if (emMatch) {
        onNotif({ type: "info", patient: `${p.firstName} ${p.lastName}`, detail: emMatch[1] });
        setTimeout(() => setMsgs(prev => [...prev, { role: "system", text: `📩 Notifica inviata a Emilia\n${emMatch[1]}`, time: new Date() }]), 600);
      }
      if (ivMatch) {
        onNotif({ type: "interval_change", patient: `${p.firstName} ${p.lastName}`, detail: ivMatch[1] });
      }
    } catch {
      setMsgs(prev => [...prev, { role: "assistant", text: "Problema tecnico — il team LAVILLA è stato avvisato! 🙏", time: new Date() }]);
    }
    setLoading(false); inpRef.current?.focus();
  };

  const ft = d => new Date(d).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const samples = [
    `Ciao! Ho la mascherina ${p.currentAligner || 7} ma non l'ho tenuta abbastanza ore questa settimana. Posso allungare di qualche giorno?`,
    `Ho un fastidio al molare da quando ho messo la nuova mascherina, è normale?`,
    `Posso bere caffè con la mascherina?`,
    `La mascherina si è macchiata, cosa faccio?`,
  ];

  return (
    <div className="anim-slide" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", background: "#e8e0d8", borderRadius: 18, overflow: "hidden", border: "1px solid #d5d0c8" }}>
      {/* Chat header */}
      <div style={{ background: "#1a3c34", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#25d366,#128c7e)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, position: "relative" }}>
          Ma<div style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: "#25d366", border: "2px solid #1a3c34" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Mari.a-ortho</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Chat con {p.firstName} {p.lastName} • Masch. {p.currentAligner || 0}/{p.totalAligners}</div>
        </div>
        <button onClick={() => setMsgs([])} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Reset chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
        {msgs.length === 0 && (
          <div style={{ padding: "10px 0" }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: "1px solid #e5e5e0" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🧪 Simula una conversazione paziente</div>
              <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.5 }}>Scrivi come se fossi {p.firstName}. Mari.a conosce già i suoi dati e risponderà come farebbe su WhatsApp.</div>
            </div>
            {samples.map((s, i) => (
              <button key={i} onClick={() => send(s)} style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e5e0", background: "#fff", textAlign: "left", marginBottom: 6, cursor: "pointer", transition: "all .15s" }} className="hover-bright">
                <span style={{ flexShrink: 0 }}>💬</span>
                <span style={{ fontSize: 13, color: "#3f3f46", lineHeight: 1.45 }}>{s}</span>
              </button>
            ))}
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className="anim-fade" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : m.role === "system" ? "center" : "flex-start", marginBottom: 2, animationDelay: `${i * .03}s` }}>
            {m.role === "system" ? (
              <div style={{ background: "rgba(255,255,255,.85)", padding: "8px 14px", borderRadius: 8, fontSize: 11, color: "#1a3c34", fontWeight: 600, textAlign: "center", maxWidth: "85%", whiteSpace: "pre-wrap", border: "1px solid rgba(37,211,102,.2)" }}>{m.text}</div>
            ) : (
              <div style={{ maxWidth: "82%" }}>
                <div className={m.role === "user" ? "wa-bub-out" : "wa-bub-ai"}>{m.text}</div>
                <div style={{ fontSize: 10, color: "#999", marginTop: 2, padding: "0 4px", textAlign: m.role === "user" ? "right" : "left" }}>
                  {m.role === "assistant" && "Mari.a • "}{ft(m.time)}
                  {m.iv && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#ecfdf5", color: "#059669" }}>🔄 Cambio intervallo</span>}
                  {m.esc && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#fef2f2", color: "#dc2626" }}>⚡ Escalation</span>}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="anim-fade" style={{ display: "flex" }}>
            <div className="wa-bub-ai"><span className="dot-pulse" /><span className="dot-pulse" style={{ animationDelay: ".2s" }} /><span className="dot-pulse" style={{ animationDelay: ".4s" }} /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ background: "#f0ebe3", padding: "8px 10px 10px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "#fff", borderRadius: 22, padding: "5px 5px 5px 14px", border: "1px solid #e0dbd3" }}>
          <textarea ref={inpRef} style={{ flex: 1, border: "none", outline: "none", fontSize: 14, resize: "none", background: "transparent", padding: "7px 0", maxHeight: 90, color: "#1a1a1a", lineHeight: 1.4 }} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder={`Scrivi come ${p.firstName}...`} rows={1} />
          <button onClick={() => send(input)} disabled={!input.trim() || loading} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: "#25d366", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: input.trim() && !loading ? 1 : .4, transition: "all .15s" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        <p style={{ fontSize: 10, color: "#999", textAlign: "center", marginTop: 5 }}>Prototipo di test • Carica il PDF per personalizzare il tono di Mari.a</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// NOTIFICATION LOG (for Emilia)
// ═══════════════════════════════════════════════════════
function NotifLog({ notifications, onClear }) {
  return (
    <div className="anim-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>📩 Notifiche per Emilia</h3>
        {notifications.length > 0 && <button onClick={onClear} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }} className="hover-bright">Cancella tutto</button>}
      </div>
      {!notifications.length ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#71717a" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
          <p>Nessuna notifica. Le notifiche appariranno qui quando Mari.a scala un caso o modifica un intervallo.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notifications.map(n => (
            <div key={n.id} className="anim-fade" style={{ background: "#fff", borderRadius: 14, padding: "14px 18px", border: "1px solid #e5e5e0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{n.type === "escalation" ? "⚡" : n.type === "interval_change" ? "🔄" : "📩"}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{n.patient}</span>
                <span style={{ fontSize: 11, color: "#71717a", marginLeft: "auto" }}>{new Date(n.time).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div style={{ fontSize: 13, color: "#3f3f46", lineHeight: 1.5 }}>{n.detail}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: n.type === "escalation" ? "#fef2f2" : "#ecfdf5", color: n.type === "escalation" ? "#dc2626" : "#059669" }}>
                  {n.type === "escalation" ? "ESCALATION" : n.type === "interval_change" ? "CAMBIO INTERVALLO" : "INFO"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const H = {
  bar: { background: "#1a1a1a", position: "sticky", top: 0, zIndex: 50 },
  inner: { maxWidth: 960, margin: "0 auto", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" },
  title: { fontSize: 19, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display',serif", letterSpacing: "-.02em" },
  sub: { fontSize: 11, color: "#a1a1aa", marginTop: 1 },
  back: { width: 34, height: 34, borderRadius: 9, border: "1px solid #333", background: "transparent", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  btn: { width: 36, height: 36, borderRadius: 10, border: "1px solid #333", background: "transparent", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  addBtn: { display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
};

const C = {
  card: { background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #e5e5e0" },
  avatar: { width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#a78bfa)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 },
  ib: { width: 30, height: 30, borderRadius: 8, border: "1px solid #e5e5e0", background: "#fafaf8", color: "#71717a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  stepBox: { background: "#fafaf8", borderRadius: 12, padding: "12px 16px", marginBottom: 12, border: "1px solid #e5e5e0" },
  stepBtn: { width: 32, height: 32, borderRadius: 8, border: "1.5px solid #e5e5e0", background: "#fff", color: "#3f3f46", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  actBtn: { flex: 1, padding: "9px 0", borderRadius: 10, border: "1.5px solid #6366f1", background: "transparent", color: "#6366f1", fontWeight: 600, fontSize: 12, cursor: "pointer", textAlign: "center" },
  chatBtn: { flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: "#25d366", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", textAlign: "center" },
};

const F = {
  card: { background: "#fff", borderRadius: 18, padding: 28, border: "1px solid #e5e5e0", maxWidth: 560, margin: "0 auto" },
  title: { fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display',serif", marginBottom: 4 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  fi: { marginBottom: 14 },
  la: { display: "block", fontSize: 11, fontWeight: 600, color: "#3f3f46", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" },
  inp: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e5e0", fontSize: 14, outline: "none", background: "#fafaf8", color: "#1a1a1a" },
  addPh: { padding: "5px 12px", borderRadius: 8, border: "1px solid #6366f1", background: "transparent", color: "#6366f1", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  phRow: { display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 8, background: "#fafaf8", borderRadius: 10, padding: "12px 14px", border: "1px solid #e5e5e0" },
  phLa: { display: "block", fontSize: 10, fontWeight: 600, color: "#71717a", marginBottom: 4, textTransform: "uppercase" },
  phInp: { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e5e5e0", fontSize: 13, outline: "none", background: "#fff", color: "#1a1a1a" },
  rmPh: { width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700 },
  preview: { background: "linear-gradient(135deg,#eef2ff,#f5f3ff)", borderRadius: 12, padding: "14px 18px", marginBottom: 20, border: "1px solid #e0e7ff" },
  cancel: { padding: "10px 22px", borderRadius: 10, border: "1.5px solid #e5e5e0", background: "#fff", color: "#71717a", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  save: { padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
};

const D = {
  summary: { background: "linear-gradient(135deg,#1a1a1a,#2d2d3a)", borderRadius: 18, padding: 24, marginBottom: 22, color: "#fff" },
  stats: { display: "flex", background: "rgba(255,255,255,.07)", borderRadius: 12, padding: "12px 0", marginBottom: 14 },
  stat: { flex: 1, textAlign: "center" },
  statV: { fontSize: 20, fontWeight: 700 },
  statL: { fontSize: 10, color: "#a1a1aa", textTransform: "uppercase", marginTop: 2, letterSpacing: ".05em" },
  div: { width: 1, height: 32, background: "rgba(255,255,255,.1)", alignSelf: "center" },
  chatBtn: { width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "#25d366", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "center" },
  sm: { padding: "5px 10px", borderRadius: 7, border: "1px solid #e5e5e0", background: "#fafaf8", color: "#52525b", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  waBtn: { padding: "5px 12px", borderRadius: 7, border: "none", background: "#25d366", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" },
};
