/* ═══════════════════════════════════════════════════════════════════
   Monitoring · il portale della direzione: tutta la rete, sola lettura.

   È il prototipo della console (prototipo.html, app.js) sui dati veri. Le sette
   schede sono le stesse: Diagnosi, Parametri, Personale, Magazzino, Dotazione,
   Storia, Contratto. I numeri arrivano dal dossier del locale
   (/api/rete/locali/<id>/dossier): cassa, fatture, timbrature, inventari, più
   quello che il consulente scrive in Managing (note, mosse, storia, contratto).

   Qui si guarda e basta: il blocco vero è nel server (ruolo «direzione»).
   ═══════════════════════════════════════════════════════════════════ */
import { grafico as diagramma } from './grafici.js';

const API = (() => { try { return localStorage.getItem('sb_rete_api'); } catch (e) { return null; } })()
  || 'https://web-production-f3794.up.railway.app';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function leggi(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function scrivi(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }

const ICONA = { buono: 'check_circle', attesa: 'error', fuori: 'cancel', vuoto: 'hourglass_empty' };
const PAROLA = { buono: 'Entro i parametri', attesa: 'Attenzione', fuori: 'Fuori parametro', vuoto: 'Da avviare' };
const VERDETTO = { buono: 'in linea', attesa: 'da guardare', fuori: 'fuori parametro', vuoto: 'manca il dato' };
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const RUOLO = { titolare: 'Titolare', responsabile: 'Responsabile', staff: 'Staff' };

const dec = (n, c = 1) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: c, maximumFractionDigits: c });
const euro = (n, c = 0) => n == null ? '—' : Number(n).toLocaleString('it-IT', { minimumFractionDigits: c, maximumFractionDigits: c }) + ' €';
const giorno = s => { if (!s) return '—'; const d = new Date(s + 'T12:00:00'); return `${d.getDate()} ${MESI[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`; };
function num(v, u) {
  if (v == null) return '—';
  const n = Number.isInteger(v) || Math.abs(v) >= 100 ? dec(v, 0) : dec(v, 1);
  return u === '€' ? n + ' €' : u === '%' ? n + '%' : u === 'punti' ? (v > 0 ? '+' : '') + n : n;
}
const unitaDopo = u => u && !['%', '€', 'punti'].includes(u) ? ' ' + u : '';

/* ─── stato ─────────────────────────────────────────────────────── */
let TOKEN = leggi('sb_rete_token') || '', locali = [], filtro = 'tutti', cerca = '';
let sessione = 0;           // cresce a ogni uscita: le risposte di richieste partite prima si buttano
let scelto = null, D = null, linguetta = 'diagnosi', parDiag = null, parSel = null;

function statoLocale(l) {
  const k = l.indicatori?.conta || {};
  return k.fuori ? 'fuori' : k.attesa ? 'attesa' : k.buono ? 'buono' : 'vuoto';
}

async function api(p, attesa = 60000) {
  const mia = sessione;
  // un minuto al massimo, corpo compreso: il dossier calcola anche il confronto con gli altri locali
  const ferma = new AbortController(), t = setTimeout(() => ferma.abort(), attesa);
  let r, d;
  try {
    r = await fetch(API + p, { headers: { 'X-Admin-Token': TOKEN }, signal: ferma.signal });
    d = await r.json().catch(x => { if (x.name === 'AbortError') throw x; return null; });
  } catch (x) {
    throw new Error(x.name === 'AbortError' ? 'Il motore non risponde: riprova tra poco' : 'Motore non raggiungibile: ' + x.message);
  } finally { clearTimeout(t); }
  if (mia !== sessione) throw new Error('Sessione chiusa');     // si è usciti mentre la richiesta era in corso
  if (r.status === 401) { esci(); throw new Error('Accesso scaduto'); }
  if (!r.ok) throw new Error(d?.error || 'Errore ' + r.status);
  return d;
}

/* ─── accesso: la direzione con la sua email, oppure l'amministratore ─── */
function esci() {
  // non basta nascondere: dossier, elenco e risposte di chi esce si cancellano, chi entra dopo non li deve vedere
  sessione++;
  TOKEN = ''; scrivi('sb_rete_token', null);
  locali = []; scelto = null; D = null; domandeDi = null; parDiag = null; parSel = null;
  for (const id of ['banda', 'linguette', 'area', 'lista', 'polso', 'polso-dida', 'dom-risposta']) { const el = document.getElementById(id); if (el) el.innerHTML = ''; }
  const t = document.getElementById('dom-testo'); if (t) t.value = '';
  const b = document.getElementById('dom-barra'); if (b) b.hidden = true;
  $('#telaio').hidden = true; $('#cancello').hidden = false;
}
$('#esci').addEventListener('click', esci);
$('#accesso').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#errore-accesso'), b = $('#entra'), u = $('#utente').value.trim(), cons = u.includes('@');
  err.textContent = ''; b.disabled = true;
  try {
    // trenta secondi al massimo: se il server non risponde il tasto torna e si può riprovare
    const ferma = new AbortController(), t = setTimeout(() => ferma.abort(), 30000);
    let r, d;
    try {
      r = await fetch(API + (cons ? '/api/rete/login' : '/api/admin/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ferma.signal,
        body: JSON.stringify(cons ? { email: u, password: $('#parola').value } : { username: u, password: $('#parola').value }) });
      d = await r.json().catch(x => { if (x.name === 'AbortError') throw x; return {}; });
    } catch (x) { throw new Error(x.name === 'AbortError' ? 'Il server non risponde: riprova.' : 'Server non raggiungibile: riprova.'); }
    finally { clearTimeout(t); }
    if (!r.ok || !d.token) throw new Error(d.error || 'Credenziali non valide');
    TOKEN = d.token; scrivi('sb_rete_token', TOKEN); scrivi('sb_rete_ruolo', d.ruolo || 'admin'); scrivi('sb_rete_nome', d.nome || '');
    $('#parola').value = '';
    avvia();
  } catch (x) { err.textContent = x.message; }
  finally { b.disabled = false; }
});

/* ─── la rete, a sinistra ───────────────────────────────────────── */
function disegnaPolso() {
  const st = locali.map(statoLocale);
  $('#polso').innerHTML = st.map(s => `<i class="${s === 'vuoto' ? 'spento' : s}"></i>`).join('');
  $('#polso-dida').innerHTML = `<b class="num">${locali.length}</b> ${locali.length === 1 ? 'locale' : 'locali'} · <b class="num fuori">${st.filter(s => s === 'fuori').length}</b> fuori parametro · <b class="num attesa">${st.filter(s => s === 'attesa').length}</b> in attenzione`;
}

function disegnaLista() {
  const ordine = { fuori: 0, attesa: 1, buono: 2, vuoto: 3 };
  const vis = locali.map(l => ({ l, s: statoLocale(l) }))
    .filter(x => filtro === 'tutti' || x.s === filtro)
    .filter(x => !cerca || [x.l.nome, x.l.citta, x.l.consulente].join(' ').toLowerCase().includes(cerca))
    .sort((a, b) => ordine[a.s] - ordine[b.s] || a.l.nome.localeCompare(b.l.nome));
  $('#lista').innerHTML = vis.map(({ l, s }) => {
    const n = (l.indicatori?.conta?.fuori || 0) + (l.indicatori?.conta?.attesa || 0);
    return `<button class="riga-locale" data-id="${l.id}" aria-current="${l.id === scelto}">
      <span class="ico spia ${s}" aria-hidden="true">${ICONA[s]}</span>
      <span><span class="n1">${esc(l.nome)}</span><span class="n2">${esc([l.citta, (l.consulente || '').split(' ')[0]].filter(Boolean).join(' · '))}</span></span>
      ${n ? `<span class="quanti num" title="${n} indicatori da guardare o fuori">${n}</span>` : '<span></span>'}
    </button>`;
  }).join('') || '<div class="vuoto">Nessun locale con questi criteri.</div>';
}

$('#filtri').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  filtro = b.dataset.f;
  document.querySelectorAll('#filtri button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  disegnaLista();
});
$('#setaccio').addEventListener('input', e => { cerca = e.target.value.trim().toLowerCase(); disegnaLista(); });
$('#lista').addEventListener('click', e => {
  const b = e.target.closest('.riga-locale'); if (!b) return;
  apri(+b.dataset.id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

async function apri(id, silenzioso) {
  if (id !== scelto) {
    parDiag = null; parSel = null;
    // un altro locale: via testata e barra delle domande finché il suo dossier non è arrivato,
    // così una domanda non parte mai per un locale diverso da quello sullo schermo
    // anche le linguette e il dossier di prima: niente da cliccare finché non arriva quello giusto (o dopo un errore)
    D = null; $('#banda').innerHTML = ''; $('#linguette').innerHTML = '';
    $('#dom-barra').hidden = true; $('#dom-risposta').innerHTML = ''; domandeDi = null;
  }
  scelto = id;
  const u = new URL(location); u.searchParams.set('locale', id); history.replaceState(null, '', u);
  disegnaLista();
  if (!silenzioso) { $('#area').innerHTML = '<div class="area"><p class="nota-piccola">Carico il dossier del locale…</p></div>'; }
  let d;
  try { d = await api(`/api/rete/locali/${id}/dossier`); }
  catch (x) { if (!silenzioso && scelto === id) $('#area').innerHTML = `<div class="area"><p class="nota-piccola">${esc(x.message)}</p></div>`; return; }
  if (scelto !== id) return;      // nel frattempo si è aperto un altro locale: questo dossier non serve più
  D = d;
  disegnaBanda(); disegnaArea();
  preparaDomande(id);
}

/* ─── la testata del dossier ────────────────────────────────────── */
const ind = id => D.indicatori.find(p => p.id === id);
function statoDossier() { const k = D.conta; return k.fuori ? 'fuori' : k.attesa ? 'attesa' : k.buono ? 'buono' : 'vuoto'; }

function disegnaBanda() {
  const L = D.locale, s = statoDossier();
  const mono = L.nome.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).map(x => x[0]).join('').slice(0, 3).toUpperCase();
  const tre = ['food', 'pers', 'eora', 'acq', 'inc'].map(ind).filter(p => p && p.valore != null).slice(0, 3);
  // tutto quello che arriva dai dati passa da esc; il markup lo mettiamo solo noi
  const sotto = [esc(L.tipo || 'locale'), esc([L.indirizzo, L.zona || L.citta].filter(Boolean).join(', ')),
    L.coperti ? `<span class="num">${num(L.coperti)}</span> coperti` : '', L.titolare ? `titolare <b>${esc(L.titolare)}</b>` : '',
    L.consulente ? `consulente <b>${esc(L.consulente)}</b>` : ''].filter(Boolean);
  $('#banda').innerHTML = `
    <div class="materia" style="--g:${(L.id * 37) % 360}deg" aria-hidden="true"><span class="monogramma">${esc(mono)}</span></div>
    <div class="angolo">
      <span class="targa ${s === 'vuoto' ? 'spenta' : s}"><span class="ico">${ICONA[s]}</span>${PAROLA[s]}</span>
      <span class="sigillo" title="${L.bollino === 'auto' ? 'Automatico: attivo se nessun indicatore è fuori parametro' : 'Deciso dal consulente'}">
        <span>${L.bollino_attivo ? 'Bollino<br>attivo' : 'Bollino<br>sospeso'}</span>
        <span class="disco ${L.bollino_attivo ? '' : 'spento'}">SB</span>
      </span>
    </div>
    <div class="sopra">
      <h1>${esc(L.nome)}</h1>
      <div class="sotto">${sotto.join(' · ')}</div>
      <div class="cifre">${tre.map(p => `<span class="cifra vetro">
          <b class="num ${p.stato}">${num(p.valore, p.unita)}</b>
          <i>${esc(p.nome)}<br>atteso ${num(p.atteso, p.unita)}${unitaDopo(p.unita)}</i></span>`).join('')}</div>
    </div>`;

  const voci = [['diagnosi', 'Diagnosi', 'troubleshoot'], ['parametri', 'Parametri', 'monitoring'], ['personale', 'Personale', 'groups'],
                ['magazzino', 'Magazzino', 'inventory_2'], ['dotazione', 'Dotazione', 'settings_input_component'],
                ['storia', 'Storia', 'history'], ['contratto', 'Contratto', 'description']];
  $('#linguette').innerHTML = voci.map(([k, t, ic]) =>
    `<button role="tab" data-l="${k}" aria-selected="${linguetta === k}"><span class="ico">${ic}</span>${t}</button>`).join('');
  document.querySelectorAll('#linguette button').forEach(b => b.addEventListener('click', () => { linguetta = b.dataset.l; disegnaBanda(); disegnaArea(); }));
}

/* ─── quadrante: identico al prototipo, più lo stato «manca il dato» ─── */
function quadrante(p, aperto) {
  const st = p.stato, R = 46, C = 60, GIRO = 270, DA = 135;
  const toll = p.toll || Math.max(Math.abs(p.atteso) * 0.1, 1);
  const min = p.verso === 'basso' ? Math.min(0, p.atteso - 3 * toll) : p.atteso - 3 * toll, max = p.atteso + 3 * toll;
  const q = x => Math.min(1, Math.max(0, (x - min) / (max - min)));
  const punto = (t, r = R) => { const a = (DA + GIRO * t) * Math.PI / 180; return [(C + r * Math.cos(a)).toFixed(2), (C + r * Math.sin(a)).toFixed(2)]; };
  const arco = (da, a, r = R) => { const [x1, y1] = punto(da, r), [x2, y2] = punto(a, r); return `M${x1},${y1} A${r},${r} 0 ${GIRO * (a - da) > 180 ? 1 : 0} 1 ${x2},${y2}`; };
  const bDa = p.verso === 'basso' ? 0 : q(p.atteso - p.toll), bA = p.verso === 'basso' ? q(p.atteso + p.toll) : 1;
  const [tx1, ty1] = punto(q(p.atteso), R - 9), [tx2, ty2] = punto(q(p.atteso), R + 9);
  const lim = p.verso === 'basso' ? bA : bDa, v = p.valore;
  return `<button type="button" class="quadrante ${st} ${aperto ? 'aperto' : ''}" data-par="${p.id}" aria-pressed="${aperto}"
      aria-label="${esc(p.nome)}: ${num(v, p.unita)}, atteso ${num(p.atteso, p.unita)}. ${VERDETTO[st]}">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="${arco(0, 1)}" class="pista"/>
      ${st === 'vuoto' ? '' : `<path d="${arco(bDa, bA)}" class="fascia"/>
      <line x1="${tx1}" y1="${ty1}" x2="${tx2}" y2="${ty2}" class="tacca"/>
      <line x1="${punto(lim, R - 9)[0]}" y1="${punto(lim, R - 9)[1]}" x2="${punto(lim, R + 9)[0]}" y2="${punto(lim, R + 9)[1]}" class="limite"/>
      <path d="${arco(0, Math.max(.004, q(v)))}" class="valore"/>
      <circle cx="${punto(q(v))[0]}" cy="${punto(q(v))[1]}" r="5" class="punta"/>`}
    </svg>
    <span class="dentro">${v == null && p.mostra ? `<b class="num mostra">${esc(p.mostra.replace(' previsti', ''))}</b><i>${p.mostra.includes('previsti') ? 'previsti a settimana' : 'questa settimana'}</i>` : `<b class="num">${num(v, p.unita)}</b>${v != null && unitaDopo(p.unita) ? `<i>${esc(p.unita)}</i>` : ''}`}</span>
    <span class="nome">${esc(p.nome)}</span>
    <span class="atteso">${st === 'vuoto' ? (p.manca_breve ? '' : esc(p.manca || '')) : `atteso <span class="num">${num(p.atteso, p.unita)}</span>`}</span>
    <span class="verdetto"><span class="ico">${ICONA[st]}</span>${st === 'vuoto' && p.manca_breve ? 'manca: ' + esc(p.manca_breve) : VERDETTO[st]}</span>
  </button>`;
}

/* ─── da dove arriva il numero, e le misure dietro ─── */
function sorgenti(p) {
  const dot = Object.fromEntries(D.dotazione.map(x => [x.id, x]));
  return `<div class="sorgenti">
    <h4><span class="ico">sensors</span>Da dove arriva questo numero</h4>
    <div class="flussi">${p.sorgenti.map(k => { const s = D.strumenti[k], d = dot[k] || {};
      return `<div class="flusso ${d.stato === 'attivo' ? '' : 'spento'}"><span class="ico">${s.ico}</span>
        <div><b>${esc(s.nome)}</b><span class="fr">${esc(s.freq)} · ${esc(d.stato || '')}</span><p>${esc(s.raccoglie)} ${d.descrizione ? `<em>${esc(d.descrizione)}.</em>` : ''}</p></div></div>`; }).join('')}</div>
  </div>`;
}
function bloccoMisure(p, aperto) {
  if (!p.misure?.length) return '';
  return `<details class="misure" ${aperto ? 'open' : ''}>
    <summary><span class="ico">table_rows</span>Le misure dietro il numero <span class="quante">${p.misure.length} ${p.misure.length === 1 ? 'tabella' : 'tabelle'}</span></summary>
    <div class="dentro-misure">${p.misure.map(b => `<div class="tavola">${diagramma(b)}</div>`).join('')}</div>
  </details>`;
}
const notaConsulente = p => p.nota ? `<div class="mossa nota-consulente"><b><span class="ico">person</span>Il consulente</b>${esc(p.nota)}</div>` : '';

/* ─── dove si guarda e dove si inserisce il dato di ogni anello ───
   tab: la scheda di Monitoring col dettaglio; m: [vista, sotto, nome] della pagina di Managing dove il consulente lo inserisce */
const RIFERIMENTI = {
  food: { tab: 'magazzino', m: ['diagnosi', null, 'Diagnosi del food cost'] },
  teo: { tab: 'parametri', m: ['ricettario', null, 'Ricettario'] },
  oltre: { tab: 'magazzino', m: ['inventari', null, 'Inventari'] },
  acq: { tab: 'magazzino', m: ['acquisti', 'fatture', 'Acquisti · Documenti'] },
  rinc: { tab: 'magazzino', m: ['acquisti', 'articoli', 'Acquisti · Articoli'] },
  spr: { tab: 'magazzino', m: ['inventari', null, 'Inventari · scarti'] },
  pers: { tab: 'personale', m: ['persone', null, 'Persone e turni'] },
  persp: { tab: 'personale', m: ['persone', null, 'Persone e turni · turno previsto'] },
  prev: { tab: 'personale', m: ['persone', null, 'Persone e turni'] },
  eora: { tab: 'personale', m: ['persone', null, 'Persone e turni'] },
  turni: { tab: 'personale', m: ['persone', null, 'Persone e turni · turni da chiudere'] },
  inc: { tab: 'parametri', m: ['vendite', null, 'Vendite · cassa'] },
  ric: { tab: 'parametri', m: ['vendite', null, 'Vendite · voci da abbinare'] },
  sco: { tab: 'dotazione', m: ['vendite', null, 'Vendite · cassa collegata'] },
  sconti: { tab: 'parametri', m: ['vendite', null, 'Vendite · report della cassa'] },
  storni: { tab: 'parametri', m: ['vendite', null, 'Vendite · report della cassa'] },
  chk: { tab: 'personale', m: ['persone', null, 'Persone e turni · chiusure'] },
  inv: { tab: 'magazzino', m: ['inventari', null, 'Inventari'] },
  cassa: { tab: 'dotazione', m: ['vendite', null, 'Vendite · cassa'] },
  cons: { tab: 'magazzino', m: ['acquisti', 'guardare', 'Acquisti · Da guardare'] },
  doc: { tab: 'magazzino', m: ['acquisti', 'guardare', 'Acquisti · Da guardare'] },
  rec: { tab: 'dotazione', m: ['dossier', 'dotazione', 'Dossier · Dotazione'] },
  temp: { tab: 'dotazione', m: ['dossier', 'dotazione', 'Dossier · Dotazione'] },
};
const NOME_TAB = { diagnosi: 'Diagnosi', parametri: 'Parametri', personale: 'Personale', magazzino: 'Magazzino', dotazione: 'Dotazione', storia: 'Storia', contratto: 'Contratto' };
function riferimenti(p) {
  const r = RIFERIMENTI[p.id];
  if (!r) return '';
  const [vista, sotto, nome] = r.m;
  const link = `locale.html?locale=${D.locale.id}&vista=${vista}${sotto ? '&sotto=' + sotto : ''}`;
  return `<div class="riferimenti">
    <button type="button" class="vai-rif" data-vai="${r.tab}" data-par-sel="${p.id}"><span class="ico">arrow_forward</span><span><small>Il dettaglio in Monitoring</small><b>${NOME_TAB[r.tab]}</b></span></button>
    <a class="vai-rif" href="${link}" target="_blank" rel="noopener"><span class="ico">edit_note</span><span><small>Dove si inserisce il dato · Managing</small><b>${esc(nome)}</b></span></a>
  </div>`;
}

function peggiore() {
  const o = { fuori: 0, attesa: 1, buono: 2, vuoto: 3 };
  return [...D.indicatori].filter(p => p.gruppo !== 'presto').sort((a, b) => o[a.stato] - o[b.stato])[0]?.id;
}

/* ─── le sette linguette ────────────────────────────────────────── */
function disegnaArea() {
  const area = $('#area'), P = D.indicatori, L = D.locale;

  /* ── Diagnosi ── */
  if (linguetta === 'diagnosi') {
    if (!parDiag || !P.some(x => x.id === parDiag)) parDiag = peggiore();
    const p = P.find(x => x.id === parDiag), dg = D.diagnosi;
    const food = ['food', 'oltre', 'teo'].includes(p.id) && dg;
    let pannello;
    if (food && dg.cause.length) {
      pannello = `<div class="diagnosi ${dg.scostamento > 0 ? '' : 'sereno'}">
        <div class="capo">
          <div class="conto"><span class="grande num ${dg.scostamento > 0 ? 'fuori' : 'buono'}">${dg.scostamento > 0 ? '+' : ''}${dec(dg.scostamento, 1)} punti</span>
            <span class="via">Food cost: <span class="num">${num(dg.reale, '%')}</span> contro <span class="num">${num(dg.obiettivo, '%')}</span> di obiettivo · ricette <span class="num">${num(dg.teorico, '%')}</span> · ${esc(dg.periodo)}</span></div>
          <h2>Da dove viene lo scostamento</h2>
          <p>${esc(dg.sintesi || '')}</p>
          ${notaConsulente(p)}
        </div>
        <div class="cause">${dg.cause.map(c => `<div class="causa">
            <div class="peso"><b class="num">+${dec(c.punti, 2)}</b><span>punti · ${euro(c.euro)}</span></div>
            <div><h3>${esc(c.titolo)}</h3><p class="dett">${esc(c.dettaglio)}</p>
              <div class="prova"><span class="ico">fact_check</span><span>${esc(c.prova)}</span></div>
              ${c.nota ? `<div class="prova"><span class="ico">person</span><span>${esc(c.nota)}</span></div>` : ''}
              <div class="mossa"><b><span class="ico">bolt</span>Cosa facciamo</b>${esc(c.mossa)}</div></div>
          </div>`).join('')}</div>
        ${dg.avvisi.length ? `<div class="area" style="padding-top:0"><p class="nota-piccola"><span class="ico" style="font-size:15px;vertical-align:-3px">info</span> ${dg.avvisi.map(esc).join(' ')}</p></div>` : ''}
        <div class="area" style="padding-top:20px"><div class="prove">
          ${dg.piatti.length ? `<div>${diagramma({ titolo: 'I piatti più venduti nel periodo', colonne: ['Piatto', 'Venduti', 'Food cost', 'Giudizio'], righe: dg.piatti, nota: 'Food cost di ogni piatto dalla sua ricetta, ai prezzi di oggi.' })}</div>` : ''}
          ${dg.ingredienti ? `<div>${diagramma(dg.ingredienti)}</div>` : ''}
        </div></div>
      </div>`;
    } else if (p.stato === 'vuoto') {
      pannello = `<div class="diagnosi attenzione"><div class="capo"><h2>${esc(p.nome)}: manca ancora il dato</h2>
        <p>Per accenderlo: ${esc(p.manca || 'servono i dati del locale')}. La mossa prevista quando uscirà dall'intervallo: ${esc(p.mossa)}.</p></div></div>`;
    } else {
      const scarto = Math.abs(p.valore - p.atteso);
      const testi = {
        fuori: [`${p.nome}: fuori dall'intervallo`, `Oggi ${num(p.valore, p.unita)}${unitaDopo(p.unita)} contro ${num(p.atteso, p.unita)} attesi: ${num(scarto, p.unita === '%' ? '' : p.unita)}${p.unita === '%' ? ' punti' : ''} di distanza, oltre la tolleranza di ${num(p.toll, p.unita === '%' ? '' : p.unita)}. Qui sotto le misure che lo compongono.`, ''],
        attesa: [`${p.nome}: dentro tolleranza, ma in movimento`, `Oggi ${num(p.valore, p.unita)}${unitaDopo(p.unita)} contro ${num(p.atteso, p.unita)} attesi: ancora dentro l'intervallo concordato. Non si apre una diagnosi per un numero che non è un problema; qui sotto si vede se sta scendendo o se è rumore.`, 'attenzione'],
        buono: [`${p.nome}: entro i parametri`, `Oggi ${num(p.valore, p.unita)}${unitaDopo(p.unita)} contro ${num(p.atteso, p.unita)} attesi. Qui sotto ci sono comunque le misure che il locale sta producendo: servono a tenerlo lì.`, 'sereno'],
      }[p.stato];
      pannello = `<div class="diagnosi ${testi[2]}"><div class="capo"><h2>${esc(testi[0])}</h2><p>${esc(testi[1])}</p></div>
        <div class="area" style="padding-top:0">${notaConsulente(p)}<div class="mossa"><b><span class="ico">bolt</span>${p.stato === 'buono' ? 'Se esce, cosa facciamo' : 'Cosa facciamo'}</b>${esc(p.mossa)}</div></div></div>`;
    }
    const k = D.conta;
    area.innerHTML = `<div class="area">
      <div class="capo-quadranti"><h2 class="tit">Come sta il locale</h2>
        <p class="nota-piccola">${k.fuori ? `${k.fuori} ${k.fuori === 1 ? 'indicatore è fuori' : 'indicatori sono fuori'} dall'intervallo concordato${k.attesa ? `, ${k.attesa} da guardare` : ''}. Clicca un quadrante per vedere da dove viene.`
          : k.attesa ? `${k.attesa} ${k.attesa === 1 ? 'indicatore è' : 'indicatori sono'} da guardare. Clicca un quadrante per vedere da dove viene.`
          : 'Gli indicatori accesi sono dentro l\'intervallo concordato. Clicca un quadrante per vedere le misure che lo compongono.'}
          ${k.vuoto ? ` ${k.vuoto} aspettano ancora il loro dato.` : ''}</p></div>
      ${D.gruppi.map(([g, t]) => { const del = P.filter(x => x.gruppo === g); return del.length ? `<h4 class="gruppo-tit">${esc(t)}</h4><div class="quadranti">${del.map(x => quadrante(x, x.id === parDiag)).join('')}</div>
        ${del.some(x => x.id === parDiag) ? `<div class="pannello-ind" id="pannello-ind">${pannello}${riferimenti(p)}${p.sorgenti?.length ? sorgenti(p) : ''}${bloccoMisure(p, !food)}</div>` : ''}` : ''; }).join('')}
      <p class="nota-piccola">Lo scostamento si scompone incrociando le vendite della cassa, il ricettario, le fatture dei fornitori, gli inventari e le timbrature. Ogni causa porta la sua prova e la sua mossa: è la differenza fra sapere che un numero è alto e sapere perché.</p>
    </div>`;
    // il pannello si apre sotto il gruppo dell'anello cliccato, e lo schermo ci arriva
    document.querySelectorAll('.quadrante').forEach(b => b.addEventListener('click', () => {
      const y = scrollY; parDiag = b.dataset.par; disegnaArea(); scrollTo(0, y);
      document.getElementById('pannello-ind')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }));
    document.querySelectorAll('[data-vai]').forEach(b => b.addEventListener('click', () => {
      linguetta = b.dataset.vai; if (linguetta === 'parametri') parSel = b.dataset.parSel;
      disegnaBanda(); disegnaArea(); document.getElementById('linguette').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  /* ── Parametri ── */
  if (linguetta === 'parametri') {
    const accesi = P.filter(x => x.valore != null);
    if (!accesi.length) { area.innerHTML = `<div class="area"><p class="nota-piccola">Ancora nessun indicatore acceso: arrivano con cassa, fatture, timbrature e inventari.</p></div>`; return; }
    const p = accesi.find(x => x.id === parSel) || accesi.find(x => x.stato === 'fuori') || accesi[0];
    parSel = p.id;
    const serie = (p.serie || []);
    const simili = (D.confronto[p.id] || []).slice().sort((a, b) => p.verso === 'basso' ? a.valore - b.valore : b.valore - a.valore);
    const mx = Math.max(...simili.map(z => Math.abs(z.valore)), 1e-9);
    area.innerHTML = `<div class="area">
      <div class="numeri">${accesi.map(x => `<div class="cella clic" data-par="${x.id}" aria-current="${x.id === parSel}">
        <small>${esc(x.nome)}</small><b class="num ${x.stato === 'buono' ? '' : x.stato}">${num(x.valore, x.unita)}${unitaDopo(x.unita) ? `<span class="u">${esc(x.unita)}</span>` : ''}</b>
        <span>atteso <span class="num">${num(x.atteso, x.unita)}</span></span></div>`).join('')}</div>
      <div class="tavola" style="margin-top:22px">
        <h3>${esc(p.nome)}</h3>
        <p>Le ultime otto settimane. La fascia verde è l'intervallo concordato col locale. Il dato arriva da: ${esc(p.fonte.toLowerCase())}.</p>
        ${serie.filter(v => v != null).length > 1 ? andamento(p, serie) : '<p class="nota-piccola">L\'andamento settimana per settimana arriva con qualche settimana di dati.</p>'}
        <div class="legenda"><span><i></i>andamento del locale</span><span class="fascia"><i></i>intervallo entro i parametri</span><span class="att"><i></i>atteso</span></div>
      </div>
      <h2 class="tit">${esc(p.nome)} rispetto agli altri locali della rete dello stesso tipo</h2>
      ${simili.length > 1 ? `<div class="barre">${simili.map(z => `<div class="barra ${z.io ? 'io' : ''}">
          <span>${esc(z.nome.replace(/^(Pizzeria|Trattoria|Osteria|Ristorante|Bistrot|Bar) /, ''))}</span>
          <span class="traccia"><span class="riempi" style="width:${(Math.abs(z.valore) / mx * 100).toFixed(1)}%"></span></span>
          <span class="num" style="text-align:right">${num(z.valore, p.unita)}</span></div>`).join('')}</div>`
        : '<p class="nota-piccola">Il confronto arriva quando nella rete ci sono altri locali dello stesso tipo con questo dato.</p>'}
      <p class="nota-piccola">Il confronto vale solo fra locali dello stesso tipo seguiti con lo stesso metodo. È il dato che nessun consulente ha finché non ha una rete.</p>
    </div>`;
    collegaPunti();
    document.querySelectorAll('.numeri .cella.clic').forEach(c => c.addEventListener('click', () => { parSel = c.dataset.par; disegnaArea(); }));
  }

  /* ── Personale ── */
  if (linguetta === 'personale') {
    const o = D.personale, pers = ind('pers'), mx = Math.max(...o.sera, 1);
    area.innerHTML = `<div class="area">
      <div class="numeri">
        <div class="cella"><small>Organico</small><b class="num">${o.organico}</b><span>persone che timbrano</span></div>
        <div class="cella"><small>Ore della settimana</small><b class="num">${num(o.ore)}</b><span>timbrate, non pianificate</span></div>
        <div class="cella"><small>Costo della settimana</small><b class="num">${euro(o.costo)}</b><span>${o.costo_ora ? `<span class="num">${dec(o.costo_ora, 2)} €</span> l'ora in media` : 'serve il costo orario'}</span></div>
        <div class="cella"><small>Costo del personale</small><b class="num ${pers.stato === 'buono' ? '' : pers.stato}">${num(pers.valore, '%')}</b><span>atteso <span class="num">${num(pers.atteso, '%')}</span></span></div>
      </div>
      ${o.prossima ? `<div class="numeri" style="margin-top:12px">
        <div class="cella"><small>Previsto, prossimi 7 giorni</small><b class="num">${euro(o.prossima.euro)}</b><span><span class="num">${num(o.prossima.ore)}</span> ore dal turno previsto</span></div>
        <div class="cella"><small>Previsto a ${MESI[o.prossima.mese - 1]}</small><b class="num">${euro(o.prossima.euro_mese)}</b><span><span class="num">${num(o.prossima.ore_mese)}</span> ore nel mese</span></div>
        <div class="cella"><small>Settimana passata</small><b class="num">${num(o.ore)}<span class="u">di ${num(o.previsto?.ore)} h</span></b><span>ore timbrate contro previste</span></div>
        <div class="cella"><small>Costo previsto sull'incasso</small><b class="num ${ind('persp')?.stato === 'buono' ? '' : ind('persp')?.stato || ''}">${num(ind('persp')?.valore, '%')}</b><span>${ind('persp')?.valore == null ? 'serve la cassa' : 'sull\'incasso medio delle ultime 4 settimane'}</span></div>
      </div>${o.prossima.senza_orario ? `<p class="nota-piccola">${o.prossima.senza_orario} ${o.prossima.senza_orario === 1 ? 'persona non ha' : 'persone non hanno'} ancora il turno previsto.</p>` : ''}`
        : '<p class="nota-piccola">Il turno previsto non è ancora impostato: il consulente lo scrive in Managing → Persone e turni, e da lì si vede quanto costerà la settimana prima che cominci.</p>'}
      <h2 class="tit staccato">Chi c'è, sera per sera</h2>
      <div class="settimana">${o.sera.map((n, i) => { const pv = o.sera_prevista?.[i]; return `<div class="giorno ${pv != null && n > pv + .5 ? 'troppo' : ''}"><div class="g">${GIORNI[i]}</div><div class="p num">${dec(n, n % 1 ? 1 : 0)}</div><div class="c">in turno${pv != null ? ` · ${pv} previst${pv === 1 ? 'o' : 'i'}` : ''}</div></div>`; }).join('')}</div>
      <p class="nota-piccola">Media delle ultime quattro settimane, dalle timbrature${o.sera_prevista ? ', contro il turno previsto: in giallo le sere con più persone del previsto' : ''}. È la differenza fra chi era previsto e chi c'era davvero.${o.senza_costo_orario ? ` ${o.senza_costo_orario} ${o.senza_costo_orario === 1 ? 'persona non ha' : 'persone non hanno'} il costo orario: fuori dal costo del personale.` : ''}</p>
      <h2 class="tit staccato">La squadra</h2>
      ${o.reparti?.length && (o.reparti.length > 1 || o.reparti[0].id) ? diagramma({ titolo: 'Il costo per reparto', colonne: ['Reparto', 'Persone', 'Ore timbrate', 'Costo timbrato', 'Costo previsto'],
        nota: 'Timbrato negli ultimi sette giorni, previsto nei prossimi sette. Il reparto viene dalla mansione di ogni persona.',
        righe: o.reparti.map(r => [r.nome, String(r.persone), dec(r.ore, 1) + ' h', euro(r.costo), euro(r.costo_previsto)]) }) : ''}
      ${o.persone.length ? diagramma({ titolo: 'Ultimi sette giorni, persona per persona', colonne: ['Persona', 'Mansione', 'Contratto', 'Previsto', 'Timbrato', 'Costo previsto nel mese'],
        righe: o.persone.map(x => [x.nome, x.mansione || RUOLO[x.ruolo] || x.ruolo, x.contratto ? x.contratto + (x.ore_contratto ? ` · ${dec(x.ore_contratto, 0)} h` : '') : '—',
          x.ore_previste != null ? dec(x.ore_previste, 1) + ' h' : '—', dec(x.ore, 1) + ' h',
          x.costo_mese != null ? euro(x.costo_mese) : (x.costo_orario ? 'turno da impostare' : 'manca il costo orario')]) }) : '<p class="nota-piccola">Il consulente non ha ancora inserito chi lavora nel locale.</p>'}
      <h2 class="tit staccato">Le chiusure della sera</h2>
      ${o.chiusure.length ? diagramma({ titolo: 'Le ultime due settimane', colonne: ['Sera', 'Chi', 'Ora', 'Da ricontrollare', 'Nota'],
        righe: o.chiusure.map(c => [giorno(c.giorno), c.chi, c.ora || '—', c.manca.join(', ') || 'niente', c.nota || '—']) })
        : '<p class="nota-piccola">Nessuna chiusura segnata dal tag sulla cassa nelle ultime due settimane.</p>'}
      <p class="nota-piccola">Chi chiude segna celle, gas, luci, cassa e porte dal tag sulla cassa. L'ora è registrata: una chiusura segnata alle quattro del pomeriggio non è una chiusura.</p>
    </div>`;
  }

  /* ── Magazzino ── */
  if (linguetta === 'magazzino') {
    const m = D.magazzino, g = m.giacenze, dc = m.da_collegare;
    const q = (v, u) => v == null ? '—' : `${dec(v, Math.abs(v) < 10 && v % 1 ? 1 : 0)} ${u === 'l' ? 'L' : u}`;
    area.innerHTML = `<div class="area">
      <div class="numeri">
        <div class="cella"><small>Merce in magazzino</small><b class="num">${euro(g.valore)}</b><span>stimata oggi, ai prezzi dell'ultima fattura</span></div>
        <div class="cella"><small>Articoli</small><b class="num">${g.righe.length}</b><span>${g.da ? 'dall\'inventario del ' + giorno(g.da) : 'nessun inventario: si parte da zero'}</span></div>
        <div class="cella"><small>Entrato dalle fatture</small><b class="num">${euro(g.entrate_euro)}</b><span>${g.da ? 'dopo l\'ultimo inventario' : 'da quando ci sono fatture'}</span></div>
        <div class="cella"><small>Da collegare</small><b class="num ${dc.prodotti ? 'attesa' : ''}">${dc.prodotti}</b><span>${dc.prodotti ? `prodotti, ${euro(dc.euro)} fuori dal magazzino` : 'tutto collegato'}</span></div>
      </div>
      ${dc.prodotti ? `<div class="avviso-mag attesa"><span class="ico">link_off</span><p><b>${dc.prodotti} ${dc.prodotti === 1 ? 'prodotto delle fatture non entra' : 'prodotti delle fatture non entrano'} in magazzino</b> (${dc.righe} ${dc.righe === 1 ? 'riga' : 'righe'}, ${euro(dc.euro)}): il sistema non sa ancora che articolo sono. Il consulente li collega una volta in Managing → Acquisti → Da collegare; dopo, le fatture dello stesso fornitore entrano da sole.</p></div>` : ''}
      ${m.prezzi_strani.length ? `<div class="avviso-mag fuori"><span class="ico">warning</span><p><b>Prezzi da controllare:</b> ${m.prezzi_strani.map(x => `${esc(x.nome)} ${dec(x.prezzo, 2)} € al ${x.unita === 'pz' ? 'pezzo' : x.unita}`).join(' · ')}. Quasi sempre è il collegamento con il fattore sbagliato (quanti kg o pezzi ci sono in una unità della fattura): si corregge in Managing → Acquisti → Documenti.</p></div>` : ''}
      <h2 class="tit staccato">Cosa dovrebbe esserci oggi</h2>
      ${g.righe.length ? `<div class="tabella scorre"><table class="giacenze"><thead><tr><th>Articolo</th><th class="n">${g.da ? 'Inventario' : 'Partenza'}</th><th class="n">+ Entrato</th><th class="n">− Venduto</th><th class="n">− Scarti</th><th class="n">= Stimato</th><th class="n">Valore</th><th>Ultimo acquisto</th></tr></thead>
        <tbody>${g.righe.map(r => `<tr class="${r.negativa ? 'neg' : ''}"><td><b>${esc(r.nome)}</b>${r.prezzo_strano ? ' <span class="targa fuori mini">prezzo?</span>' : ''}</td>
          <td class="n num">${r.inventario == null ? '0' : q(r.inventario, r.unita)}</td><td class="n num">${r.entrate ? q(r.entrate, r.unita) : '—'}</td>
          <td class="n num">${r.uscite ? q(r.uscite, r.unita) : '—'}</td><td class="n num">${r.scarti ? q(r.scarti, r.unita) : '—'}</td>
          <td class="n num"><b>${q(r.stima, r.unita)}</b></td><td class="n num">${euro(r.valore)}</td><td>${r.ultimo_acquisto ? giorno(r.ultimo_acquisto) : '—'}</td></tr>`).join('')}</tbody></table></div>
        <p class="nota-piccola">Ultimo inventario, più quello che entra dalle fatture collegate, meno quello che esce con le vendite della cassa secondo le ricette, meno gli scarti. Una giacenza negativa (in rosso) vuol dire che manca un pezzo: una fattura non caricata, una ricetta che pesa troppo o un inventario da rifare.</p>`
        : '<p class="nota-piccola">Il magazzino si riempie quando i prodotti delle fatture sono collegati agli articoli, o con il primo inventario.</p>'}
      <h2 class="tit staccato">Le ultime entrate dalle fatture</h2>
      ${m.entrate.length ? `<div class="tabella scorre"><table class="giacenze"><thead><tr><th>Giorno</th><th>Fornitore</th><th>Riga della fattura</th><th>Articolo</th><th class="n">Entrato</th><th class="n">Importo</th></tr></thead>
        <tbody>${m.entrate.map(e => `<tr class="${e.quantita < 0 ? 'neg' : ''}"><td>${giorno(e.giorno)}</td><td>${esc(e.fornitore)}</td><td class="tenue-t">${esc(e.descrizione)}</td><td><b>${esc(e.articolo)}</b></td>
          <td class="n num">${q(e.quantita, e.unita)}</td><td class="n num">${euro(e.totale, 2)}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="nota-piccola">Ancora nessuna riga di fattura collegata a un articolo.</p>'}
      <h2 class="tit staccato">Consumo reale contro teorico</h2>
      ${m.consumo.length ? diagramma({ titolo: 'Tra gli ultimi due inventari', verso: 'basso',
          colonne: ['Ingrediente', 'Teorico', 'Reale', 'Scostamento', 'Giudizio'],
          righe: m.consumo.map(a => [a.nome, `${dec(a.teorico, 1)} ${a.unita}`, `${dec(a.reale, 1)} ${a.unita}`, a.oltre_pct == null ? '—' : (a.oltre_pct > 0 ? '+' : '') + dec(a.oltre_pct, 1) + '%',
            a.oltre_pct > 8 ? 'alto' : a.oltre_pct > 3 ? 'da guardare' : 'in linea']) })
        : '<p class="nota-piccola">Arriva con due inventari chiusi, il ricettario e la cassa: è la differenza fra quello che è uscito davvero e quello che le vendite giustificano.</p>'}
      <h2 class="tit staccato">L'ultimo inventario${m.ultimo ? ' · ' + giorno(m.ultimo) : ''}${m.aperto ? ` <span class="targa attesa mini">uno aperto del ${giorno(m.aperto)}</span>` : ''}</h2>
      ${m.conteggio.length ? diagramma({ titolo: 'Cosa c\'era in magazzino', colonne: ['Articolo', 'Contato', 'Valore'],
          righe: m.conteggio.map(a => [a.nome, `${dec(a.quantita, 1)} ${a.unita}`, a.prezzo ? euro(a.quantita * a.prezzo) : '—']) })
        : '<p class="nota-piccola">Nessun inventario chiuso: il primo si fa alla visita del consulente.</p>'}
      <h2 class="tit staccato">Scarichi e carichi registrati</h2>
      ${m.movimenti.length ? diagramma({ titolo: 'Gli ultimi movimenti', colonne: ['Giorno', 'Articolo', 'Tipo', 'Quantità', 'Motivo'],
          righe: m.movimenti.map(x => [giorno(x.giorno), x.nome, x.tipo, `${dec(x.quantita, 1)} ${x.unita}`, x.nota || '—']) })
        : '<p class="nota-piccola">Nessuno scarto registrato.</p>'}
    </div>`;
  }

  /* ── Dotazione ── */
  if (linguetta === 'dotazione') {
    const targa = st => st === 'attivo' ? ['buono', 'check_circle', 'attivo'] : st === 'da sistemare' ? ['attesa', 'error', 'da sistemare'] : ['spenta', 'remove', 'non installato'];
    area.innerHTML = `<div class="area">
      <h2 class="tit">Cosa è installato in questo locale</h2>
      <div class="pezzi">${D.dotazione.map(x => { const [cl, icona, parola] = targa(x.stato);
        return `<div class="pezzo ${x.stato === 'attivo' ? '' : 'spento'}"><span class="ico">${x.ico}</span>
          <span><span class="t">${esc(x.nome)}</span><span class="d">${esc(x.descrizione)}${x.automatico ? ' <em class="auto">· dai dati</em>' : ''}</span>
            <span class="produce"><span class="voce"><span class="ico">database</span><span>${esc(x.raccoglie)} <em>${esc(x.freq)}</em></span></span>
              <span class="voce"><span class="ico">arrow_forward</span><span>Alimenta: ${esc(x.alimenta)}</span></span></span></span>
          <span class="targa ${cl}"><span class="ico">${icona}</span>${parola}</span></div>`; }).join('')}</div>
      <p class="nota-piccola">Lo stato di cassa, fatture, timbrature, chiusure e inventari si legge dai dati che arrivano. Il resto lo segna il consulente in Managing. Niente telecamere: servirebbero accordo sindacale o Ispettorato.</p>
    </div>`;
  }

  /* ── Storia ── */
  if (linguetta === 'storia') {
    area.innerHTML = `<div class="area"><h2 class="tit">Cosa è successo in questo locale</h2>
      <div class="storia">${D.storia.map(e => `<div class="tappa ${e.chiave ? 'chiave' : ''} ${e.auto ? 'auto' : ''}">
        <div class="q">${giorno(e.giorno)}</div><div class="t">${esc(e.auto ? e.tipo : e.tipo.charAt(0).toUpperCase() + e.tipo.slice(1))}${e.autore ? ` · ${esc(e.autore)}` : ''}</div><div class="d">${esc(e.testo)}</div></div>`).join('')}</div>
      <p class="nota-piccola">Le visite, le chiamate e le decisioni le scrive il consulente in Managing; le tappe grigie si leggono dai dati.</p></div>`;
  }

  /* ── Contratto ── */
  if (linguetta === 'contratto') {
    const r = (t, v, cls = '') => `<tr><td>${t}</td><td class="d ${cls}">${v == null || v === '' ? '<span class="manca">da compilare in Managing</span>' : v}</td></tr>`;
    area.innerHTML = `<div class="area">
      <div class="numeri">
        <div class="cella"><small>Pacchetto</small><b>${esc(L.pacchetto || '—')}</b><span>${L.dal ? 'dal ' + giorno(L.dal) : ''}</span></div>
        <div class="cella"><small>Canone mensile</small><b class="num">${euro(L.canone)}</b><span>fatturato il primo del mese</span></div>
        <div class="cella"><small>Consulente</small><b style="font-size:15px">${esc(L.consulente || '—')}</b><span>${L.ultima_visita ? 'ultima visita ' + giorno(L.ultima_visita) : 'nessuna visita segnata'}</span></div>
        <div class="cella"><small>Voto del titolare</small><b class="num">${L.voto_titolare != null ? dec(L.voto_titolare, 1) : '—'}</b><span>su 5</span></div>
      </div>
      <h2 class="tit staccato">Anagrafica</h2>
      <div class="tabella"><table><tbody>
        ${r('Insegna', `<b>${esc(L.nome)}</b>`)}${r('Tipologia', esc(L.tipo || ''))}
        ${r('Indirizzo', esc([L.indirizzo, L.zona, L.citta].filter(Boolean).join(', ')))}${r('Coperti', L.coperti != null ? num(L.coperti) : null, 'num')}
        ${r('Titolare', esc(L.titolare || ''))}${r('Telefono', esc(L.telefono || ''), 'num')}${r('Referente nel locale', esc(L.referente_locale || ''))}
        ${r('Cassa', esc(L.cassa || ''))}${r('In formazione sul locale', esc(L.in_formazione || ''))}
        ${r('Ultima visita', L.ultima_visita ? giorno(L.ultima_visita) : null)}${r('Prossima visita', L.prossima_visita ? `<b>${giorno(L.prossima_visita)}</b>` : null)}
        ${r('Bollino', L.bollino_attivo ? 'attivo' : 'sospeso, indicatori fuori intervallo' + (L.bollino === 'auto' ? '' : ' (deciso dal consulente)'))}
      </tbody></table></div>
    </div>`;
  }
}

/* ─── l'andamento di otto settimane, come nel prototipo ─── */
function andamento(p, serie) {
  const dati = serie.map(v => v == null ? null : v), pieni = dati.filter(v => v != null);
  const W = 760, H = 210, ml = 56, mr = 20, mt = 16, mb = 30, n = dati.length, toll = p.toll || Math.max(Math.abs(p.atteso) * .1, 1);
  const min = Math.min(...pieni, p.atteso - toll) - toll * .7, max = Math.max(...pieni, p.atteso + toll) + toll * .7;
  const x = i => ml + (W - ml - mr) * (i / (n - 1)), y = v => mt + (H - mt - mb) * (1 - (v - min) / (max - min));
  const alto = p.verso === 'basso' ? p.atteso + (p.toll || 0) : max, basso = p.verso === 'basso' ? min : p.atteso - (p.toll || 0);
  let d = '', su = false;
  dati.forEach((v, i) => { if (v == null) { su = false; return; } d += `${su ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `; su = true; });
  const iu = dati.map((v, i) => v == null ? -1 : i).filter(i => i >= 0).pop(), vu = dati[iu];
  const col = `var(--${p.stato === 'vuoto' ? 'tenue' : p.stato})`;
  const tacche = [min, (min + max) / 2, max].map(v => `<line x1="${ml}" x2="${W - mr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--griglia)"/>
    <text x="${ml - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-size="10.5" font-family="Geist Mono, monospace" fill="var(--tenue)">${num(Math.round(v * 10) / 10, p.unita)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.nome)}: otto settimane. Atteso ${num(p.atteso, p.unita)}, ultima ${num(vu, p.unita)}">
    <rect x="${ml}" y="${y(alto).toFixed(1)}" width="${W - ml - mr}" height="${Math.abs(y(basso) - y(alto)).toFixed(1)}" fill="var(--buono-velo)"/>
    ${tacche}
    <line x1="${ml}" x2="${W - mr}" y1="${y(p.atteso).toFixed(1)}" y2="${y(p.atteso).toFixed(1)}" stroke="var(--buono)" stroke-width="1.5" stroke-dasharray="5 4"/>
    <path d="${d}" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(iu).toFixed(1)}" cy="${y(vu).toFixed(1)}" r="4.5" fill="${col}" stroke="var(--pannello)" stroke-width="2"/>
    <text x="${(x(iu) - 8).toFixed(1)}" y="${(y(vu) - 13).toFixed(1)}" text-anchor="end" font-size="13.5" font-weight="700" font-family="Geist Mono, monospace" fill="${col}">${num(vu, p.unita)}</text>
    <text x="${ml}" y="${H - 8}" font-size="10.5" fill="var(--tenue)">8 settimane fa</text>
    <text x="${W - mr}" y="${H - 8}" text-anchor="end" font-size="10.5" fill="var(--tenue)">ultima settimana</text>
    ${dati.map((v, i) => v == null ? '' : `<circle class="pt" data-i="${i}" data-n="${n}" data-v="${num(v, p.unita)}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="11" fill="transparent"/>`).join('')}
  </svg>`;
}
function collegaPunti() {
  const b = $('#bolla');
  document.querySelectorAll('.pt').forEach(c => {
    c.addEventListener('mouseenter', () => {
      const q = (+c.dataset.n - 1) - (+c.dataset.i);
      b.innerHTML = `<span class="num">${c.dataset.v}</span> · ${q === 0 ? 'ultima settimana' : q + (q === 1 ? ' settimana fa' : ' settimane fa')}`;
      const r = c.getBoundingClientRect();
      b.style.left = (r.left + r.width / 2 - 62) + 'px'; b.style.top = (r.top - 42) + 'px'; b.style.opacity = '1';
    });
    c.addEventListener('mouseleave', () => { b.style.opacity = '0'; });
  });
}

/* ─── domande ai dati: risponde solo con i dati di questo locale (il motore lo impone all'AI) ─── */
// la risposta arriva con un po' di markdown: grassetti, elenchi a trattino. Prima si fa l'escape di tutto, poi si formatta.
function formatta(testo) {
  const righe = esc(testo).split('\n');
  let html = '', lista = false;
  for (const r of righe) {
    const voce = r.match(/^\s*[-*•]\s+(.*)$/);
    if (voce && !lista) { html += '<ul>'; lista = true; }
    if (!voce && lista) { html += '</ul>'; lista = false; }
    const riga = (voce ? voce[1] : r).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    html += voce ? `<li>${riga}</li>` : (riga.trim() ? `<p>${riga}</p>` : '');
  }
  return html + (lista ? '</ul>' : '');
}
let domandeDi = null;
function preparaDomande(id) {
  const f = $('#dom-barra');
  f.hidden = false;
  if (domandeDi === id) return;               // l'aggiornamento automatico non cancella la risposta che si sta leggendo
  domandeDi = id;
  $('#dom-testo').value = '';
  $('#dom-risposta').innerHTML = `<p class="dom-nota">Risponde solo con i numeri di ${esc(D.locale.nome)}: cassa, fatture, ricette, inventari, persone. Se un dato non c'è, te lo dice.</p>`;
}
$('#dom-barra').addEventListener('submit', async e => {
  e.preventDefault();
  const q = $('#dom-testo').value.trim(), id = scelto, b = $('#dom-chiedi'), out = $('#dom-risposta');
  if (!q || !id) return;
  b.disabled = true;
  out.innerHTML = '<p class="dom-nota"><span class="ico">hourglass_top</span> Leggo i dati del locale…</p>';
  try {
    const r = await api(`/api/rete/locali/${id}/domanda?q=${encodeURIComponent(q)}`, 120000);
    if (scelto !== id) return;                // intanto si è aperto un altro locale
    out.innerHTML = `<p class="dom-domanda">${esc(q)}</p><div class="dom-testo">${formatta(r.risposta)}</div>`;
  } catch (x) {
    if (scelto === id) out.innerHTML = `<p class="dom-errore"><span class="ico">error</span> ${esc(x.message)}</p>`;
  } finally { b.disabled = false; }
});

/* ─── avvio e aggiornamento: i dati li cambia il consulente da un'altra pagina ─── */
async function avvia() {
  $('#cancello').hidden = true; $('#telaio').hidden = false;
  const nome = leggi('sb_rete_nome'), ruolo = leggi('sb_rete_ruolo');
  $('#chi').innerHTML = `<span class="ico">visibility</span> ${esc(nome || (ruolo === 'admin' ? 'Amministratore' : 'Direzione'))} · sola lettura`;
  try { locali = await api('/api/rete/riepilogo'); }
  catch (x) {
    // il motore non risponde: lo si dice, con un tasto per riprovare, invece di lasciare la pagina vuota
    $('#area').innerHTML = `<div class="area"><p class="nota-piccola">Non riesco a leggere i locali: ${esc(x.message)}</p>
      <button type="button" class="vai-rif" id="riprova"><span class="ico">refresh</span><span><b>Riprova</b></span></button></div>`;
    $('#riprova').addEventListener('click', avvia);
    return;
  }
  disegnaPolso(); disegnaLista();
  const id = +new URLSearchParams(location.search).get('locale');
  const primo = locali.find(l => l.id === id) || [...locali].sort((a, b) => ({ fuori: 0, attesa: 1, buono: 2, vuoto: 3 })[statoLocale(a)] - ({ fuori: 0, attesa: 1, buono: 2, vuoto: 3 })[statoLocale(b)])[0];
  if (primo) apri(primo.id);
  else { $('#banda').innerHTML = ''; $('#area').innerHTML = '<div class="area"><p class="nota-piccola">Ancora nessun locale nella rete.</p></div>'; }
}
let ultimo = 0;
let aggiornando = false;          // un aggiornamento alla volta: con il motore lento non si accumulano richieste
async function aggiorna() {
  if (aggiornando || !TOKEN || document.hidden || $('#telaio').hidden || Date.now() - ultimo < 5000) return;
  aggiornando = true; ultimo = Date.now();
  try {
    try { locali = await api('/api/rete/riepilogo'); } catch (x) { return; }
    disegnaPolso(); disegnaLista();
    if (scelto) { const y = scrollY; await apri(scelto, true); scrollTo(0, y); }
  } finally { aggiornando = false; }
}
window.addEventListener('focus', aggiorna);
document.addEventListener('visibilitychange', aggiorna);
setInterval(aggiorna, 30000);
TOKEN ? avvia() : esci();
