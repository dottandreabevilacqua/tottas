import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════
// MARI.A-ORTHO SYSTEM PROMPT
// ═══════════════════════════════════════════════════════
const MARIA_SYSTEM = `Sei Mari.a-ortho, l'assistente virtuale dello studio dentistico LAVILLA del Dr. Andrea. Rispondi ai pazienti che stanno facendo un trattamento con allineatori dentali trasparenti.

## Il tuo carattere
- Calda, empatica, professionale ma mai fredda
- Tono motivazionale misto a consigli pratici
- Chiama il paziente per nome
- Emoji con moderazione (1-2 per messaggio, mai esagerare)
- Italiano chiaro e conciso, risposte max 3-4 frasi
- Non fai diagnosi mediche, ma dai consigli basati sulla guida ufficiale dello studio

## Base di conoscenza (Guida Ufficiale Studio LAVILLA)

### Uso quotidiano
- Indossare circa 22 ore al giorno
- Togliere SOLO per mangiare, bere bevande diverse dall'acqua, e lavare i denti
- Se portate meno ore: i denti potrebbero non muoversi come previsto e il trattamento si allunga
- Per eventi speciali: si possono togliere, ma non superare 2 ore totali senza aligner nella giornata
- Per toglierle: rimuovere prima la parte posteriore, poi sfilare verso la parte anteriore
- Per rimetterle: posizionare prima sui denti anteriori, poi premere delicatamente sui molari

### Pulizia e igiene
- Lavare con acqua FREDDA o tiepida e spazzolino morbido con sapone neutro
- NO dentifricio: puo graffiare la plastica e renderla opaca
- NO acqua calda: il calore deforma l'allineatore
- Lavare almeno 2 volte al giorno (mattina e sera)
- Si possono usare pastiglie pulenti specifiche per aligner

### Fastidi e sensazioni normali
- Dolore/pressione al mattino: NORMALE, specialmente nei primi giorni di una nuova mascherina
- La pressione significa che l'allineatore sta guidando il movimento dentale
- Il fastidio dura di solito 24-72 ore dopo il cambio mascherina
- Antidolorifico: si puo prendere se necessario, ma raramente serve
- Parlare diversamente nei primi giorni: normale, la lingua si adatta rapidamente

### Problemi con le mascherine
- Mascherina rotta: contattare lo studio. Spesso si passa alla successiva o si usa la precedente temporaneamente
- Mascherina persa: avvisare subito lo studio
- Non aderisce bene: usare i chewies oppure indossarla piu ore
- Dimenticata una sera: rimetterla appena possibile e indossarla piu ore il giorno successivo
- Attacco staccato: contattare lo studio per valutazione

### Alimentazione
- MAI mangiare con gli allineatori
- Si puo bere SOLO acqua con le mascherine
- NO caffe con le mascherine: macchia e puo deformarle
- Lavare i denti dopo ogni pasto prima di rimettere le mascherine

### Durata trattamento
- Cambio mascherina in genere ogni 7-14 giorni (secondo il calendario del dentista)
- Se i denti non entrano perfettamente nella nuova mascherina: indossarla piu ore o contattare lo studio
- Il trattamento puo durare piu del previsto se le mascherine non vengono indossate a sufficienza
- Alla fine del trattamento: necessaria una contenzione per mantenere il risultato

## Elastici ortodontici
Se il paziente usa gli elastici (indicato nei dati paziente):
- Gli elastici vanno indossati come indicato dal Dr. Andrea (di solito 24h/giorno, tolti solo per mangiare)
- Cambiarli almeno 1 volta al giorno (perdono elasticita)
- Se un elastico si rompe: sostituirlo subito con uno nuovo dello stesso tipo
- Se il paziente ha FINITO gli elastici: rassicurarlo e usare [NOTIFICA_EMILIA: paziente ha finito gli elastici, da riordinare] per far preparare un nuovo set
- Se il paziente ha fastidio con gli elastici nei primi giorni: e normale
- Se il paziente non riesce ad agganciare gli elastici: consigliare di esercitarsi davanti allo specchio, e se continua a non riuscire -> [ESCALATION: difficolta con aggancio elastici]
- Se il paziente chiede di non usarli piu: spiegare che sono essenziali per il risultato e -> [ESCALATION: paziente vuole smettere elastici]

## Gestione cambio intervallo
- PUOI approvare un allungamento di 1-3 giorni se il paziente ha avuto difficolta
- Se approvi: rispondi con [CAMBIO_INTERVALLO: +X giorni, mascherina N, motivo]
- NON PUOI accorciare l'intervallo -> [ESCALATION: richiesta accorciamento intervallo]
- Dopo ogni cambio intervallo: [NOTIFICA_EMILIA: riepilogo del cambio]

## Quando fare escalation al Dr. Andrea/team LAVILLA
- Dolore intenso che non passa dopo 3 giorni
- Mascherina rotta o persa
- Mascherina che non calza bene nonostante uso chewies
- Attacco che si stacca
- Dente che sembra muoversi troppo o in direzione sbagliata
- Il paziente vuole accorciare i tempi o interrompere il trattamento
- Qualsiasi situazione clinica che va oltre i consigli della guida
- In questi casi usa: [ESCALATION: motivo] e rassicura il paziente che il team lo contattera presto

## Formato risposte
- Risposte brevi (max 3-4 frasi per messaggio)
- Inizia sempre rispondendo al problema specifico, poi aggiungi il consiglio pratico

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
  const [view, setView] = useState("list"); // list | form | detail | chat | patientview
  const [selected, setSelected] = useState(null);
  const [editId, setEditId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [sharedPatient, setSharedPatient] = useState(null);

  // Check if URL has patient data (shared link)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const d = params.get("d");
      if (d) {
        const json = JSON.parse(decodeURIComponent(escape(atob(d))));
        setSharedPatient({
          firstName: json.fn, lastName: json.ln, currentAligner: json.ca, totalAligners: json.ta,
          phases: json.ph, deliveryDate: json.dd, alignerBrand: json.ab,
          useElastics: json.ue, elasticsConfig: json.ec, phone: json.pn,
        });
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    try { const r = localStorage.getItem("tottas-patients"); if (r) setPatients(JSON.parse(r)); } catch(e) {}
    try { const r = localStorage.getItem("tottas-notifications"); if (r) setNotifications(JSON.parse(r)); } catch(e) {}
    setLoaded(true);
  }, []);

  useEffect(() => { if (!loaded) return;
    try { localStorage.setItem("tottas-patients", JSON.stringify(patients)); } catch(e) {}
  }, [patients, loaded]);

  useEffect(() => { if (!loaded) return;
    try { localStorage.setItem("tottas-notifications", JSON.stringify(notifications)); } catch(e) {}
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

  if (!loaded && !sharedPatient) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", color: "#6E6E73" }}>Caricamento...</div>;

  // If opened via shared patient link, show patient view directly
  if (sharedPatient) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f8f7f4,#efeee8)", fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Plus Jakarta Sans',sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .anim-fade{animation:fadeUp .35s ease both}
        .hover-bright{transition:all .15s}.hover-bright:hover{filter:brightness(1.05);transform:scale(1.01)}
        .progress-bar{transition:width .8s cubic-bezier(.22,1,.36,1)}
      `}</style>
      <div style={{ background: "linear-gradient(135deg,#1D1D1F,#2d2d3a)", padding: "14px 0" }}>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#5856D6,#7B7AE0)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16 }}>🦷</div>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: 500, letterSpacing: ".05em", textTransform: "uppercase" }}>Tottas.ai</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-.02em" }}>Il tuo percorso</div>
          </div>
        </div>
      </div>
      <PatientProgress patient={sharedPatient} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;background:#FAFAFA;-webkit-font-smoothing:antialiased}
        input,select,button,textarea{font-family:inherit}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:2px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
        .anim-fade{animation:fadeUp .5s cubic-bezier(.25,.46,.45,.94) both}
        .anim-slide{animation:slideIn .4s cubic-bezier(.25,.46,.45,.94) both}
        .hover-lift{transition:all .25s}.hover-lift:hover{transform:translateY(-1px);box-shadow:0 2px 20px rgba(0,0,0,.04)!important}
        .hover-bright{transition:all .2s;cursor:pointer}.hover-bright:hover{filter:brightness(1.03);transform:scale(1.005)}
        .hover-bright:active{transform:scale(.97)}
        .wa-bub{background:#d9fdd3;border-radius:0 14px 14px 14px;padding:12px 16px;font-size:14px;line-height:1.55;color:#1D1D1F;position:relative;white-space:pre-wrap}
        .wa-bub-ai{background:#fff;border-radius:0 14px 14px 14px;padding:12px 16px;font-size:14px;line-height:1.55;color:#1D1D1F;white-space:pre-wrap;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .wa-bub-out{background:#d9fdd3;border-radius:14px 0 14px 14px;padding:12px 16px;font-size:14px;line-height:1.55;color:#1D1D1F;white-space:pre-wrap;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .dot-pulse{width:6px;height:6px;border-radius:50%;background:#AEAEB2;display:inline-block;margin:0 2px;animation:pulse 1.2s infinite}
        .phase-tag{display:inline-flex;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:600;letter-spacing:.01em}
        .progress-bar{transition:width 1s cubic-bezier(.25,.46,.45,.94)}
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
                <p style={H.sub}>{view === "list" ? `${patients.length} pazient${patients.length === 1 ? "e" : "i"}` : view === "chat" ? `Chat Mari.a-ortho` : view === "detail" ? "Piano messaggi" : view === "patientview" ? "Vista paziente" : "Scheda paziente"}</p>
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
        {view === "list" && <PatientList patients={patients} onSelect={p => { setSelected(p); setView("detail"); }} onChat={p => { setSelected(p); setView("chat"); }} onEdit={p => { setEditId(p.id); setSelected(p); setView("form"); }} onDel={del} onUpdCurrent={updCurrent} onAdd={() => { setEditId(null); setSelected(null); setView("form"); }} onPatientView={p => { setSelected(p); setView("patientview"); }} />}
        {view === "form" && <PatientForm onSave={save} onCancel={() => { setView("list"); setEditId(null); }} initial={editId ? selected : null} />}
        {view === "detail" && selected && <Detail patient={selected} onChat={() => setView("chat")} />}
        {view === "chat" && selected && <ChatMaria patient={selected} onNotif={addNotif} onUpdatePatient={(id, changes) => setPatients(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))} />}
        {view === "notif" && <NotifLog notifications={notifications} onClear={() => setNotifications([])} />}
        {view === "patientview" && selected && <PatientProgress patient={selected} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PATIENT LIST
// ═══════════════════════════════════════════════════════
function PatientList({ patients, onSelect, onChat, onEdit, onDel, onUpdCurrent, onAdd, onPatientView }) {
  if (!patients.length) return (
    <div className="anim-fade" style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>🦷</div>
      <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-.02em", color: "#1D1D1F", marginBottom: 8 }}>Nessun paziente</h3>
      <p style={{ fontSize: 15, color: "#6E6E73", maxWidth: 340, margin: "0 auto 24px" }}>Aggiungi il primo paziente per iniziare</p>
      <button onClick={onAdd} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 14, border: "none", background: "#1D1D1F", color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer" }} className="hover-bright">+ Aggiungi paziente</button>
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
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", display: "flex", alignItems: "center", gap: 8 }}>
                  {p.firstName} {p.lastName}
                  {p.alignerBrand && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: p.alignerBrand === "invisalign" ? "#E6F1FB" : p.alignerBrand === "spark" ? "#FAECE7" : "#f4f4f5", color: p.alignerBrand === "invisalign" ? "#0072CE" : p.alignerBrand === "spark" ? "#E8593C" : "#6E6E73" }}>{p.alignerBrand === "invisalign" ? "Invisalign" : p.alignerBrand === "spark" ? "Spark" : "Altro"}</span>}
                </div>
                <div style={{ fontSize: 12, color: "#6E6E73", display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  {fmtPhone(p.phone)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => onEdit(p)} style={C.ib} title="Modifica"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button onClick={() => onDel(p.id)} style={{ ...C.ib, color: "#FF3B30" }} title="Elimina"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
              </div>
            </div>

            {/* Stepper */}
            <div style={C.stepBox}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#6E6E73", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Mascherina attuale</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <button onClick={() => onUpdCurrent(p.id, (p.currentAligner || 0) - 1)} style={C.stepBtn} className="hover-bright"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: "#5856D6", fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-.02em" }}>{p.currentAligner || 0}</span>
                  <span style={{ fontSize: 15, color: "#AEAEB2", fontWeight: 500 }}> / {p.totalAligners}</span>
                </div>
                <button onClick={() => onUpdCurrent(p.id, (p.currentAligner || 0) + 1)} style={C.stepBtn} className="hover-bright"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
              </div>
              <div style={{ fontSize: 11, color: "#6E6E73", textAlign: "center", marginTop: 5 }}>Intervallo: <strong>{curIv}gg</strong></div>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: done ? "#34C759" : "#48484A" }}>{done ? "Completato" : `${pct}%`}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#5856D6" }}>{pct}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "#ebebeb", overflow: "hidden" }}>
                <div className="progress-bar" style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: done ? "#34C759" : "#5856D6" }} />
              </div>
            </div>

            {/* Phases */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {p.startDate && <span className="phase-tag" style={{ background: "#F0FDF4", color: "#1B8C3D" }}>Inizio: {new Date(p.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}</span>}
              {p.useElastics && <span className="phase-tag" style={{ background: "#FFFBEB", color: "#7A5200" }}>Elastici</span>}
              {p.phases.map((ph, idx) => (
                <span key={idx} className="phase-tag" style={{ background: idx % 2 === 0 ? "#F2F1FF" : "#FFFBEB", color: idx % 2 === 0 ? "#4240B0" : "#7A5200" }}>
                  {ph.fromAligner}→{idx < p.phases.length - 1 ? p.phases[idx + 1].fromAligner - 1 : p.totalAligners}: {ph.intervalDays}gg
                </span>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button onClick={() => onSelect(p)} style={C.actBtn} className="hover-bright">📋 Messaggi</button>
              <button onClick={() => onChat(p)} style={C.chatBtn} className="hover-bright">💬 Mari.a</button>
              <button onClick={() => onPatientView(p)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "1.5px solid #FF9F0A", background: "#FFFBEB", color: "#7A5200", fontWeight: 600, fontSize: 12, cursor: "pointer", textAlign: "center" }} className="hover-bright">👁 Paziente</button>
            </div>
            <button onClick={() => {
              const data = btoa(unescape(encodeURIComponent(JSON.stringify({ fn: p.firstName, ln: p.lastName, ca: p.currentAligner, ta: p.totalAligners, ph: p.phases, dd: p.deliveryDate, ab: p.alignerBrand, ue: p.useElastics, ec: p.elasticsConfig, pn: p.phone }))));
              const link = `${window.location.origin}/p?d=${data}`;
              const msg = `Ciao ${p.firstName}! 😊 Ecco il link al tuo percorso allineatori su Tottas.ai:\n\n${link}\n\nPuoi controllare il tuo progresso, vedere quando cambiare mascherina e contattare Mari.a per qualsiasi domanda! 🦷✨`;
              const phone = p.phone.replace(/[\s\-()]/g, "");
              window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
            }} style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "1px dashed #34C759", background: "rgba(37,211,102,.06)", color: "#1B8C3D", fontWeight: 600, fontSize: 12, cursor: "pointer", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} className="hover-bright">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Invia link personale su WhatsApp
            </button>
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
  const [f, setF] = useState(initial || { firstName: "", lastName: "", phone: "", email: "", totalAligners: 14, currentAligner: 1, alignerBrand: "invisalign", useElastics: false, elasticsConfig: "", startDate: "", deliveryDate: new Date().toISOString().split("T")[0], phases: [{ fromAligner: 1, intervalDays: 10 }], acceptedService: false });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const uph = (i, k, v) => setF(p => { const ph = [...p.phases]; ph[i] = { ...ph[i], [k]: v }; return { ...p, phases: ph }; });

  let totalD = 0; for (let i = 1; i <= f.totalAligners; i++) totalD += intervalFor(f.phases, i);

  return (
    <div className="anim-fade">
      <div style={F.card}>
        <h2 style={F.title}>Scheda paziente</h2>
        <p style={{ fontSize: 14, color: "#6E6E73", marginBottom: 24 }}>Compila i dati del paziente per attivare il servizio Tottas.ai</p>
        <div style={F.grid}><div style={F.fi}><label style={F.la}>Nome *</label><input style={F.inp} value={f.firstName} onChange={e => s("firstName", e.target.value)} placeholder="Mario" /></div><div style={F.fi}><label style={F.la}>Cognome *</label><input style={F.inp} value={f.lastName} onChange={e => s("lastName", e.target.value)} placeholder="Rossi" /></div></div>
        <div style={F.grid}>
          <div style={F.fi}><label style={F.la}>Telefono *</label><input style={F.inp} value={f.phone} onChange={e => s("phone", e.target.value)} placeholder="+39 333 1234567" /></div>
          <div style={F.fi}><label style={F.la}>Email</label><input style={F.inp} type="email" value={f.email || ""} onChange={e => s("email", e.target.value)} placeholder="paziente@email.com" /></div>
        </div>

        <div style={F.fi}>
          <label style={F.la}>Tipo allineatore</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "invisalign", label: "Invisalign", color: "#0072CE", bg: "#E6F1FB" },
              { id: "spark", label: "Spark", color: "#E8593C", bg: "#FAECE7" },
              { id: "altro", label: "Altro", color: "#6E6E73", bg: "#f4f4f5" },
            ].map(b => (
              <button key={b.id} onClick={() => s("alignerBrand", b.id)} style={{
                flex: 1, padding: "10px 12px", borderRadius: 10, border: f.alignerBrand === b.id ? `2px solid ${b.color}` : "1.5px solid rgba(0,0,0,.06)",
                background: f.alignerBrand === b.id ? b.bg : "#FAFAFA", color: f.alignerBrand === b.id ? b.color : "#6E6E73",
                fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all .15s", textAlign: "center"
              }} className="hover-bright">{b.label}</button>
            ))}
          </div>
        </div>

        <div style={F.grid}>
          <div style={F.fi}><label style={F.la}>Mascherine totali</label><input style={F.inp} type="number" min="1" max="99" value={f.totalAligners} onChange={e => s("totalAligners", parseInt(e.target.value) || 1)} /></div>
          <div style={F.fi}>
            <label style={F.la}>Attuale</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input style={{ ...F.inp, flex: 1 }} type="number" min="0" max={f.totalAligners} value={f.currentAligner} onChange={e => s("currentAligner", parseInt(e.target.value) || 0)} />
              <button onClick={() => {
                if (!f.phone) { alert("Inserisci prima il numero di telefono"); return; }
                const nome = f.firstName || "paziente";
                const msg = `Ciao ${nome}! 😊 Qui Mari.a dello studio LAVILLA. Per aggiornare il tuo piano di trattamento, potresti dirmi a che numero di mascherina sei attualmente? Grazie! 🦷`;
                const phone = f.phone.replace(/[\s\-()]/g, "");
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
              }} title="Chiedi al paziente via WhatsApp" style={{ width: 42, height: 42, borderRadius: 10, border: "none", background: "#34C759", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} className="hover-bright">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </button>
            </div>
            <div style={{ fontSize: 10, color: "#34C759", marginTop: 4, fontWeight: 500 }}>Non sai il numero? Clicca il bottone verde per chiederlo via WhatsApp</div>
          </div>
        </div>
        <div style={F.grid}>
          <div style={F.fi}><label style={F.la}>Data inizio trattamento</label><input style={F.inp} type="date" value={f.startDate || ""} onChange={e => s("startDate", e.target.value)} /></div>
          <div style={F.fi}><label style={F.la}>Data consegna mascherine</label><input style={F.inp} type="date" value={f.deliveryDate} onChange={e => s("deliveryDate", e.target.value)} /></div>
        </div>

        <div style={F.fi}>
          <label style={F.la}>Elastici ortodontici</label>
          <div style={{ display: "flex", gap: 8, marginBottom: f.useElastics ? 10 : 0 }}>
            <button onClick={() => s("useElastics", false)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center", transition: "all .15s", border: !f.useElastics ? "2px solid #5856D6" : "1.5px solid rgba(0,0,0,.06)", background: !f.useElastics ? "#F2F1FF" : "#FAFAFA", color: !f.useElastics ? "#5856D6" : "#6E6E73" }} className="hover-bright">No elastici</button>
            <button onClick={() => s("useElastics", true)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center", transition: "all .15s", border: f.useElastics ? "2px solid #FF9F0A" : "1.5px solid rgba(0,0,0,.06)", background: f.useElastics ? "#FFFBEB" : "#FAFAFA", color: f.useElastics ? "#7A5200" : "#6E6E73" }} className="hover-bright">Usa elastici</button>
          </div>
          {f.useElastics && <input style={F.inp} value={f.elasticsConfig || ""} onChange={e => s("elasticsConfig", e.target.value)} placeholder="Es: Classe II, 3/16 medium, dalla mascherina 4 alla 14" />}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={F.la}>Fasi intervallo</label>
            <button onClick={() => setF(p => ({ ...p, phases: [...p.phases, { fromAligner: (p.phases[p.phases.length - 1]?.fromAligner || 1) + 6, intervalDays: 7 }] }))} style={F.addPh} className="hover-bright">+ Fase</button>
          </div>
          <p style={{ fontSize: 12, color: "#6E6E73", marginBottom: 10 }}>Es: mascherine 1-6 ogni 10gg, dalla 7 ogni 7gg</p>
          {f.phases.map((ph, i) => (
            <div key={i} style={F.phRow}>
              <div style={{ flex: 1 }}><label style={F.phLa}>Da masch. n°</label><input style={F.phInp} type="number" min="1" value={ph.fromAligner} onChange={e => uph(i, "fromAligner", parseInt(e.target.value) || 1)} disabled={i === 0} /></div>
              <div style={{ flex: 1 }}><label style={F.phLa}>Intervallo (gg)</label><input style={F.phInp} type="number" min="1" max="60" value={ph.intervalDays} onChange={e => uph(i, "intervalDays", parseInt(e.target.value) || 7)} /></div>
              {f.phases.length > 1 && <button onClick={() => setF(p => ({ ...p, phases: p.phases.filter((_, j) => j !== i) }))} style={F.rmPh}>✕</button>}
            </div>
          ))}
        </div>

        <div style={F.preview}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#5856D6" }}>📅 Durata stimata: <span style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F" }}>{Math.ceil(totalD / 30)} mesi</span> <span style={{ fontWeight: 400, color: "#6E6E73" }}>({totalD} giorni)</span></div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px", background: f.acceptedService ? "#F0FDF4" : "#FAFAFA", borderRadius: 12, border: f.acceptedService ? "1.5px solid #34C759" : "1.5px solid rgba(0,0,0,.06)", marginBottom: 20, cursor: "pointer", transition: "all .2s" }} onClick={() => s("acceptedService", !f.acceptedService)}>
          <div style={{ width: 22, height: 22, borderRadius: 6, border: f.acceptedService ? "2px solid #34C759" : "2px solid #d4d4d8", background: f.acceptedService ? "#34C759" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all .15s" }}>
            {f.acceptedService && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", marginBottom: 2 }}>Il paziente accetta di aderire al servizio Tottas.ai *</div>
            <div style={{ fontSize: 11, color: "#6E6E73", lineHeight: 1.5 }}>Acconsente al trattamento dei dati personali per la gestione del piano allineatori, l'invio di promemoria WhatsApp e l'assistenza tramite Mari.a-ortho.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={F.cancel} className="hover-bright">Annulla</button>
          <button onClick={() => { if (f.firstName && f.lastName && f.phone && f.acceptedService) onSave(f); }} style={{ ...F.save, opacity: (f.firstName && f.lastName && f.phone && f.acceptedService) ? 1 : .4 }} className="hover-bright">{initial ? "Salva" : "Aggiungi paziente"}</button>
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
          <div><div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-.02em" }}>{p.firstName} {p.lastName}</div></div>
        </div>
        <div style={D.stats}>
          <div style={D.stat}><div style={D.statV}>{cur}/{p.totalAligners}</div><div style={D.statL}>attuale</div></div>
          <div style={D.div} /><div style={D.stat}><div style={D.statV}>{intervalFor(p.phases, cur || 1)}gg</div><div style={D.statL}>intervallo</div></div>
          <div style={D.div} /><div style={D.stat}><div style={D.statV}>{Math.round((cur / p.totalAligners) * 100)}%</div><div style={D.statL}>completato</div></div>
        </div>
        <button onClick={onChat} style={D.chatBtn} className="hover-bright">💬 Apri Chat Mari.a-ortho per questo paziente</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-.02em" }}>Piano messaggi WhatsApp</h3>
        <div style={{ display: "flex", gap: 5 }}>
          {["all", "current", "future"].map(k => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", ...(filter === k ? { background: "#1D1D1F", color: "#fff", borderColor: "#1D1D1F" } : { background: "#fff", color: "#6E6E73", borderColor: "rgba(0,0,0,.06)" }) }} className="hover-bright">{k === "all" ? "Tutti" : k === "current" ? "Attuale" : "Da qui"}</button>
          ))}
        </div>
      </div>

      {filtered.map((s, i) => {
        const oi = sched.findIndex(x => x.number === s.number);
        const past = s.number < cur, isCur = s.number === cur;
        return (
          <div key={s.number} className="anim-fade" style={{ display: "flex", gap: 14, marginBottom: 20, opacity: past ? .4 : 1, animationDelay: `${i * .03}s` }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
              <div style={{ width: isCur ? 14 : 10, height: isCur ? 14 : 10, borderRadius: "50%", border: "2.5px solid", flexShrink: 0, borderColor: isCur ? "#FF9F0A" : past ? "#34C759" : "#5856D6", background: isCur ? "#FFFBEB" : past ? "#d1fae5" : "#F2F1FF" }} />
              {i < filtered.length - 1 && <div style={{ width: 2, flex: 1, background: "rgba(0,0,0,.06)", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  #{s.number}/{p.totalAligners}
                  {isCur && <span style={{ fontSize: 9, fontWeight: 700, background: "#FFFBEB", color: "#7A5200", padding: "2px 7px", borderRadius: 5 }}>ATTUALE</span>}
                  <span style={{ fontSize: 9, fontWeight: 600, background: "#F2F1FF", color: "#4240B0", padding: "2px 7px", borderRadius: 5 }}>{s.intervalDays}gg</span>
                </span>
                <span style={{ fontSize: 12, color: "#6E6E73" }}>{fmtDate(s.date)}</span>
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

  const brandLabel = p.alignerBrand === "invisalign" ? "Invisalign" : p.alignerBrand === "spark" ? "Spark" : "Altro";
  const elasticsInfo = p.useElastics ? `\nElastici: SI${p.elasticsConfig ? ` (${p.elasticsConfig})` : ""}` : "\nElastici: NO";
  const ctx = `Nome: ${p.firstName} ${p.lastName}\nAllineatore: ${brandLabel}\nMascherina: ${p.currentAligner || 0}/${p.totalAligners}\nIntervallo: ${intervalFor(p.phases, p.currentAligner || 1)} giorni${elasticsInfo}\nFasi: ${p.phases.map((ph, i) => `da n°${ph.fromAligner}: ${ph.intervalDays}gg`).join(", ")}`;
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
    } catch(e) {
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
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#34C759,#128c7e)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, position: "relative" }}>
          Ma<div style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: "#34C759", border: "2px solid #1a3c34" }} />
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
            <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: "1px solid rgba(0,0,0,.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🧪 Simula una conversazione paziente</div>
              <div style={{ fontSize: 12, color: "#6E6E73", lineHeight: 1.5 }}>Scrivi come se fossi {p.firstName}. Mari.a conosce già i suoi dati e risponderà come farebbe su WhatsApp.</div>
            </div>
            {samples.map((s, i) => (
              <button key={i} onClick={() => send(s)} style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,.06)", background: "#fff", textAlign: "left", marginBottom: 6, cursor: "pointer", transition: "all .15s" }} className="hover-bright">
                <span style={{ flexShrink: 0 }}>💬</span>
                <span style={{ fontSize: 13, color: "#48484A", lineHeight: 1.45 }}>{s}</span>
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
                  {m.iv && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#F0FDF4", color: "#1B8C3D" }}>🔄 Cambio intervallo</span>}
                  {m.esc && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "rgba(255,59,48,.05)", color: "#FF3B30" }}>⚡ Escalation</span>}
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
          <textarea ref={inpRef} style={{ flex: 1, border: "none", outline: "none", fontSize: 14, resize: "none", background: "transparent", padding: "7px 0", maxHeight: 90, color: "#1D1D1F", lineHeight: 1.4 }} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder={`Scrivi come ${p.firstName}...`} rows={1} />
          <button onClick={() => send(input)} disabled={!input.trim() || loading} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: "#34C759", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: input.trim() && !loading ? 1 : .4, transition: "all .15s" }}>
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
        <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-.02em" }}>📩 Notifiche per Emilia</h3>
        {notifications.length > 0 && <button onClick={onClear} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,59,48,.15)", background: "rgba(255,59,48,.05)", color: "#FF3B30", fontSize: 12, fontWeight: 600, cursor: "pointer" }} className="hover-bright">Cancella tutto</button>}
      </div>
      {!notifications.length ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#6E6E73" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
          <p>Nessuna notifica. Le notifiche appariranno qui quando Mari.a scala un caso o modifica un intervallo.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notifications.map(n => (
            <div key={n.id} className="anim-fade" style={{ background: "#fff", borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(0,0,0,.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{n.type === "escalation" ? "⚡" : n.type === "interval_change" ? "🔄" : "📩"}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>{n.patient}</span>
                <span style={{ fontSize: 11, color: "#6E6E73", marginLeft: "auto" }}>{new Date(n.time).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div style={{ fontSize: 13, color: "#48484A", lineHeight: 1.5 }}>{n.detail}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: n.type === "escalation" ? "rgba(255,59,48,.05)" : "#F0FDF4", color: n.type === "escalation" ? "#FF3B30" : "#1B8C3D" }}>
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
// PATIENT PROGRESS VIEW (what the patient sees)
// ═══════════════════════════════════════════════════════
function AlignerCalendar({ current, total, intervalDays, startDate }) {
  const [mo, setMo] = useState(0);
  const today = new Date();
  const vd = new Date(today.getFullYear(), today.getMonth() + mo, 1);
  const year = vd.getFullYear(), month = vd.getMonth();
  const monthName = vd.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const dayNames = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
  const changeDates = {};
  const start = new Date(startDate);
  for (let i = 1; i <= total; i++) { const d = new Date(start); d.setDate(d.getDate() + (i - 1) * intervalDays); changeDates[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = i; }
  let startDow = new Date(year, month, 1).getDay() - 1; if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = []; for (let i = 0; i < startDow; i++) cells.push(null); for (let d = 1; d <= daysInMonth; d++) cells.push(d); while (cells.length % 7) cells.push(null);
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setMo(o => o - 1)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(0,0,0,.06)", background: "#fff", color: "#48484A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 700, textTransform: "capitalize", fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-.02em" }}>{monthName}</div>
        <button onClick={() => setMo(o => o + 1)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(0,0,0,.06)", background: "#fff", color: "#48484A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
        {dayNames.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase", padding: "4px 0" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dk = `${year}-${month}-${day}`, an = changeDates[dk], isToday = dk === todayKey, isChange = !!an;
          const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isDone = isChange && an <= current, isCur = isChange && an === current, isNext = isChange && an === current + 1, isWe = (i % 7) >= 5;
          let bg = "#fff", bd = "1px solid #FAFAFA", nc = "#1D1D1F", sh = "none";
          if (isCur) { bg = "linear-gradient(135deg,#5856D6,#7B7AE0)"; nc = "#fff"; bd = "2px solid #4240B0"; sh = "0 0 12px rgba(99,102,241,.3)"; }
          else if (isDone) { bg = "#5856D6"; nc = "#fff"; bd = "1.5px solid #4240B0"; }
          else if (isNext) { bg = "#FFFBEB"; nc = "#7A5200"; bd = "2px dashed #FF9F0A"; }
          else if (isToday) { bd = "2px solid #1D1D1F"; }
          else if (isPast) { nc = "#c4c4c0"; }
          else if (isWe) { bg = "#FAFAFA"; }
          return (
            <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: bg, border: bd, boxShadow: sh, transition: "all .2s" }}>
              <div style={{ fontSize: 13, fontWeight: isToday || isChange ? 700 : 500, color: nc }}>{day}</div>
              {isChange && <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", fontSize: 7, fontWeight: 700, color: isDone || isCur ? "rgba(255,255,255,.8)" : isNext ? "#7A5200" : "#5856D6" }}>#{an}</div>}
              {isDone && !isCur && <div style={{ position: "absolute", top: 1, right: 3, fontSize: 8, color: "rgba(255,255,255,.7)" }}>✓</div>}
              {isCur && <div style={{ position: "absolute", top: -7, right: -4, fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 5, background: "#FF9F0A", color: "#fff" }}>ORA</div>}
              {isNext && <div style={{ position: "absolute", top: -7, right: -4, fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 5, background: "#fff", color: "#FF9F0A", border: "1px solid #FF9F0A" }}>NEXT</div>}
              {isToday && !isChange && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1D1D1F", position: "absolute", bottom: 4 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 12, fontSize: 10, color: "#6E6E73" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 4, background: "#5856D6", display: "inline-block" }} /> completata</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 4, background: "#FFFBEB", border: "1px dashed #FF9F0A", display: "inline-block" }} /> prossima</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 4, background: "#fff", border: "2px solid #1D1D1F", display: "inline-block" }} /> oggi</span>
      </div>
    </div>
  );
}

const MILESTONES = [
  { at: -1, icon: "🚀", label: "Inizio percorso", desc: "Hai iniziato il tuo viaggio!" },
  { at: 0.25, icon: "⭐", label: "25% completato", desc: "Un quarto di strada fatto!" },
  { at: 0.5, icon: "🏆", label: "Metà percorso!", desc: "Sei a metà — incredibile!" },
  { at: 0.75, icon: "🔥", label: "75% completato", desc: "L'ultimo tratto!" },
  { at: 1.0, icon: "👑", label: "Trattamento completato *", desc: "Ce l'hai fatta!" },
];

function PatientProgress({ patient: p }) {
  const pct = Math.round(((p.currentAligner || 0) / p.totalAligners) * 100);
  const nextDate = (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d; })();
  const [countdown, setCountdown] = useState({ d: 3, h: 0, m: 0 });
  const brandLabel = p.alignerBrand === "invisalign" ? "Invisalign" : p.alignerBrand === "spark" ? "Spark" : "Allineatori";

  useEffect(() => {
    const tick = () => { const diff = nextDate - new Date(); if (diff <= 0) return setCountdown({ d: 0, h: 0, m: 0 }); setCountdown({ d: Math.floor(diff / 864e5), h: Math.floor(diff % 864e5 / 36e5), m: Math.floor(diff % 36e5 / 6e4) }); };
    tick(); const t = setInterval(tick, 60000); return () => clearInterval(t);
  }, []);

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "20px 16px", background: "linear-gradient(180deg,#f8f7f4,#efeee8)", minHeight: "60vh" }}>
      <div className="anim-fade" style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-.02em" }}>Ciao {p.firstName}! 👋</div>
        <div style={{ fontSize: 14, color: "#6E6E73", marginTop: 4 }}>Il tuo trattamento {brandLabel}</div>
      </div>

      <div className="anim-fade" style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", border: "1px solid rgba(0,0,0,.06)", marginBottom: 14, animationDelay: ".1s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#5856D6", textTransform: "uppercase", letterSpacing: ".04em" }}>Progresso</span>
          <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-.02em" }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "#ebebeb", overflow: "hidden", marginBottom: 8 }}>
          <div className="progress-bar" style={{ height: "100%", borderRadius: 4, width: `${pct}%`, background: "linear-gradient(90deg,#5856D6,#7B7AE0)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6E6E73" }}>
          <span>Mascherina {p.currentAligner || 0} di {p.totalAligners}</span>
          <span>{p.totalAligners - (p.currentAligner || 0)} rimanenti</span>
        </div>
      </div>

      <div className="anim-fade" style={{ background: "#fff", borderRadius: 18, padding: "18px 16px", border: "1px solid rgba(0,0,0,.06)", marginBottom: 14, animationDelay: ".2s" }}>
        <AlignerCalendar current={p.currentAligner || 0} total={p.totalAligners} intervalDays={intervalFor(p.phases, p.currentAligner || 1)} startDate={p.deliveryDate} />
      </div>

      <div className="anim-fade" style={{ background: "linear-gradient(135deg,#1D1D1F,#2d2d3a)", borderRadius: 18, padding: "18px 20px", marginBottom: 14, color: "#fff", animationDelay: ".3s" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Prossimo cambio mascherina</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          {[{ v: countdown.d, l: "giorni" }, { v: countdown.h, l: "ore" }, { v: countdown.m, l: "min" }].map((c, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-.02em", lineHeight: 1 }}>{String(c.v).padStart(2, "0")}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", marginTop: 4, textTransform: "uppercase" }}>{c.l}</div>
            </div>
          ))}
        </div>
      </div>

      {p.useElastics && (
        <div className="anim-fade" style={{ background: "#FFFBEB", borderRadius: 18, padding: "14px 18px", border: "1.5px solid #FF9F0A", marginBottom: 14, animationDelay: ".35s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🔗</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7A5200" }}>Ricorda gli elastici!</div>
              <div style={{ fontSize: 12, color: "#7A5200" }}>Indossali come indicato e cambiali ogni giorno. Se li hai finiti, scrivimi!</div>
            </div>
          </div>
        </div>
      )}

      <div className="anim-fade" style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", border: "1px solid rgba(0,0,0,.06)", marginBottom: 14, animationDelay: ".4s" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#48484A", marginBottom: 14 }}>I tuoi traguardi</div>
        {MILESTONES.map((m, i) => {
          const earned = m.at === -1 ? (p.currentAligner || 0) >= 1 : (p.currentAligner || 0) / p.totalAligners >= m.at;
          const prevEarned = i === 0 ? true : (MILESTONES[i - 1].at === -1 ? (p.currentAligner || 0) >= 1 : (p.currentAligner || 0) / p.totalAligners >= MILESTONES[i - 1].at);
          const isNext = !earned && prevEarned;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", opacity: earned ? 1 : .4 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: earned ? "linear-gradient(135deg,#5856D6,#7B7AE0)" : "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, border: isNext ? "2px dashed #5856D6" : "none" }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: earned ? "#1D1D1F" : "#AEAEB2" }}>{m.label}</div>
                <div style={{ fontSize: 11, color: earned ? "#6E6E73" : "#d4d4d8" }}>{m.desc}</div>
              </div>
              {earned && <span style={{ fontSize: 11, fontWeight: 700, color: "#34C759", background: "#F0FDF4", padding: "3px 8px", borderRadius: 6 }}>Sbloccato</span>}
              {isNext && <span style={{ fontSize: 11, fontWeight: 600, color: "#5856D6", background: "#F2F1FF", padding: "3px 8px", borderRadius: 6 }}>Prossimo</span>}
            </div>
          );
        })}
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#FAFAFA", borderRadius: 10, border: "1px solid rgba(0,0,0,.06)" }}>
          <div style={{ fontSize: 10, color: "#6E6E73", lineHeight: 1.6 }}>* Per una verifica del trattamento completato è necessaria una visita specialistica con il dottore o la dottoressa di riferimento.</div>
        </div>
      </div>

      <div className="anim-fade" style={{ background: "linear-gradient(135deg,#F0FDF4,#d1fae5)", borderRadius: 18, padding: "18px 20px", border: "1.5px solid #34C759", marginBottom: 14, textAlign: "center", animationDelay: ".5s" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#065f46", marginBottom: 6 }}>Hai domande sul trattamento?</div>
        <div style={{ fontSize: 12, color: "#047857", marginBottom: 12 }}>Scrivimi su WhatsApp!</div>
        <button onClick={() => { const phone = p.phone?.replace(/[\s\-()]/g, ""); if (phone) window.open(`https://wa.me/${phone}`, "_blank"); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 14, border: "none", background: "#34C759", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }} className="hover-bright">💬 Scrivi a Mari.a</button>
      </div>

      <div style={{ textAlign: "center", padding: "16px 0 30px", fontSize: 11, color: "#AEAEB2" }}>Powered by <strong style={{ color: "#5856D6" }}>Tottas.ai</strong></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const H = {
  bar: { background: "rgba(255,255,255,.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,.06)", position: "sticky", top: 0, zIndex: 50 },
  inner: { maxWidth: 960, margin: "0 auto", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 32, height: 32, borderRadius: 9, background: "#5856D6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" },
  title: { fontSize: 17, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-.02em" },
  sub: { fontSize: 11, color: "#AEAEB2", marginTop: 1, fontWeight: 400 },
  back: { width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(0,0,0,.08)", background: "#fff", color: "#6E6E73", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  btn: { width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(0,0,0,.08)", background: "#fff", color: "#6E6E73", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#FF3B30", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  addBtn: { display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 12, border: "none", background: "#5856D6", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
};

const C = {
  card: { background: "#fff", borderRadius: 16, padding: 20, border: "1px solid rgba(0,0,0,.06)", transition: "box-shadow .3s" },
  avatar: { width: 42, height: 42, borderRadius: 12, background: "#5856D6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14, flexShrink: 0 },
  ib: { width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(0,0,0,.08)", background: "#fff", color: "#AEAEB2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  stepBox: { background: "#FAFAFA", borderRadius: 14, padding: "14px 16px", marginBottom: 14, border: "1px solid rgba(0,0,0,.04)" },
  stepBtn: { width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(0,0,0,.08)", background: "#fff", color: "#6E6E73", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  actBtn: { flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid rgba(0,0,0,.08)", background: "#fff", color: "#5856D6", fontWeight: 600, fontSize: 12, cursor: "pointer", textAlign: "center" },
  chatBtn: { flex: 1, padding: "10px 0", borderRadius: 12, border: "none", background: "#34C759", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", textAlign: "center" },
};

const F = {
  card: { background: "#fff", borderRadius: 20, padding: 32, border: "1px solid rgba(0,0,0,.06)", maxWidth: 540, margin: "0 auto" },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 4 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  fi: { marginBottom: 16 },
  la: { display: "block", fontSize: 11, fontWeight: 600, color: "#6E6E73", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" },
  inp: { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(0,0,0,.08)", fontSize: 15, outline: "none", background: "#fff", color: "#1D1D1F", transition: "border-color .2s, box-shadow .2s" },
  addPh: { padding: "5px 14px", borderRadius: 8, border: "none", background: "#F2F1FF", color: "#5856D6", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  phRow: { display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 8, background: "#FAFAFA", borderRadius: 12, padding: "14px", border: "1px solid rgba(0,0,0,.04)" },
  phLa: { display: "block", fontSize: 10, fontWeight: 500, color: "#AEAEB2", marginBottom: 4, textTransform: "uppercase" },
  phInp: { width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,.08)", fontSize: 13, outline: "none", background: "#fff", color: "#1D1D1F" },
  rmPh: { width: 34, height: 34, borderRadius: 10, border: "none", background: "rgba(255,59,48,.06)", color: "#FF3B30", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700 },
  preview: { background: "#F2F1FF", borderRadius: 14, padding: "16px 18px", marginBottom: 20, border: "none" },
  cancel: { padding: "12px 24px", borderRadius: 12, border: "1px solid rgba(0,0,0,.08)", background: "#fff", color: "#6E6E73", fontWeight: 600, fontSize: 14, cursor: "pointer" },
  save: { padding: "12px 28px", borderRadius: 12, border: "none", background: "#5856D6", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" },
};

const D = {
  summary: { background: "#1D1D1F", borderRadius: 20, padding: 24, marginBottom: 20, color: "#fff" },
  stats: { display: "flex", background: "rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 0", marginBottom: 14 },
  stat: { flex: 1, textAlign: "center" },
  statV: { fontSize: 22, fontWeight: 600, letterSpacing: "-.01em" },
  statL: { fontSize: 10, color: "rgba(255,255,255,.35)", textTransform: "uppercase", marginTop: 2, letterSpacing: ".06em", fontWeight: 500 },
  div: { width: 1, height: 32, background: "rgba(255,255,255,.08)", alignSelf: "center" },
  chatBtn: { width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#34C759", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", textAlign: "center" },
  sm: { padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,.08)", background: "#fff", color: "#6E6E73", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  waBtn: { padding: "6px 14px", borderRadius: 8, border: "none", background: "#34C759", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" },
};
