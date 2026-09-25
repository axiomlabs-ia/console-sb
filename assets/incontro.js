/* ═══════════════════════════════════════════════════════════════════
   Console SB · scheda dell'incontro iniziale con il ristoratore

   Il consulente la compila durante la riunione (anche da iPad). Ogni
   modifica si salva da sola sul backend (/api/rete/locali); se la rete
   cade, la sezione resta in coda sul dispositivo e riparte da sola.

   Il modulo è disegnato da SCHEMA: per aggiungere una domanda si
   aggiunge una riga lì, non si tocca il disegno.
   ═══════════════════════════════════════════════════════════════════ */

const API = (() => { try { return localStorage.getItem('sb_rete_api'); } catch (e) { return null; } })()
  || 'https://web-production-f3794.up.railway.app';

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const RUOLI = ['Titolare', 'Chef', 'Cuoco', 'Pizzaiolo', 'Aiuto cuoco', 'Lavapiatti',
               'Responsabile di sala', 'Cameriere', 'Barista', 'Cassa', 'Altro'];

/* tipi: testo · numero · data · area · scelta · spunte · tabella · file · conferma
   dove: 'col' = colonna del locale (nome, tipo, città, consulente) invece che scheda
   obbl: conta per il completamento della sezione */
const SCHEMA = [
  { id: 'locale', titolo: 'Il locale', ico: 'storefront', campi: [
    { k: 'nome', t: 'testo', l: 'Nome del locale', obbl: true, dove: 'col' },
    { k: 'tipo', t: 'scelta', l: 'Tipologia', obbl: true, dove: 'col',
      op: ['Pizzeria', 'Trattoria', 'Ristorante', 'Bistrot', 'Bar', 'Pub', 'Altro'] },
    { k: 'indirizzo', t: 'testo', l: 'Indirizzo' },
    { k: 'citta', t: 'testo', l: 'Città', obbl: true, dove: 'col' },
    { k: 'coperti', t: 'numero', l: 'Coperti', obbl: true },
    { k: 'tavoli', t: 'numero', l: 'Tavoli', obbl: true, aiuto: 'Una placca del menù per tavolo' },
    { k: 'sale', t: 'testo', l: 'Sale e dehors', aiuto: 'Es. sala interna, veranda, 6 tavoli fuori d\'estate' },
    { k: 'giorni', t: 'spunte', l: 'Giorni di apertura', obbl: true, op: GIORNI },
    { k: 'orari', t: 'testo', l: 'Orari', obbl: true, aiuto: 'Es. 12:00-15:00 e 19:00-23:30' },
    { k: 'chiusure', t: 'testo', l: 'Chiusure stagionali o ferie' },
    { k: 'celle', t: 'numero', l: 'Celle frigorifere' },
    { k: 'frigo', t: 'numero', l: 'Frigoriferi e banchi frigo' },
    { k: 'abbattitori', t: 'numero', l: 'Abbattitori' },
    { k: 'wifi', t: 'scelta', l: 'Wi-Fi in cucina', obbl: true, op: ['Buono', 'Debole', 'Assente'],
      aiuto: 'Serve alle sonde di temperatura' },
  ]},
  { id: 'persone', titolo: 'Persone e turni', ico: 'groups', campi: [
    { k: 'staff', t: 'tabella', l: 'Chi lavora nel locale', obbl: true, righe: 3, col: [
      { k: 'nome', l: 'Nome', t: 'testo' },
      { k: 'ruolo', l: 'Ruolo', t: 'scelta', op: RUOLI },
      { k: 'reparto', l: 'Reparto', t: 'scelta', op: ['Cucina', 'Pizzeria', 'Sala', 'Bar'] },
      { k: 'ore', l: 'Ore a settimana', t: 'numero' },
    ]},
    { k: 'turni', t: 'area', l: 'Turni tipo della settimana', obbl: true,
      aiuto: 'Chi lavora quando: servono per confrontare le ore previste con quelle timbrate' },
    { k: 'turni_file', t: 'file', l: 'Foto o file dei turni', chiave: 'turni' },
    { k: 'chi_chiude', t: 'testo', l: 'Chi chiude il locale di solito', obbl: true },
    { k: 'presenze', t: 'scelta', l: 'Come segnano le presenze oggi',
      op: ['Nessun sistema', 'Foglio o quaderno', 'App', 'Badge o lettore', 'Non so'] },
  ]},
  { id: 'numeri', titolo: 'Cassa e fatture', ico: 'point_of_sale', campi: [
    { k: 'cassa_marca', t: 'testo', l: 'Cassa: marca e programma', obbl: true,
      aiuto: 'Decide come leggiamo le vendite: è la domanda più importante' },
    { k: 'cassa_modello', t: 'testo', l: 'Modello' },
    { k: 'cassa_cloud', t: 'scelta', l: 'È in cloud?', obbl: true, op: ['Sì', 'No', 'Non so'] },
    { k: 'cassa_export', t: 'scelta', l: 'Si possono esportare le vendite per piatto?', op: ['Sì', 'No', 'Non so'] },
    { k: 'cassa_assistenza', t: 'testo', l: 'Chi l\'ha installata (contatto assistenza)' },
    { k: 'commercialista', t: 'testo', l: 'Commercialista (nome e contatto)' },
    { k: 'fatture', t: 'scelta', l: 'Accesso alle fatture elettroniche', obbl: true,
      op: ['Cassetto fiscale del titolare', 'Programma di fatturazione', 'Tramite il commercialista', 'Non so'] },
    { k: 'fatture_programma', t: 'testo', l: 'Quale programma di fatturazione' },
    { k: 'fornitori', t: 'tabella', l: 'Fornitori principali', obbl: true, righe: 3, col: [
      { k: 'nome', l: 'Fornitore', t: 'testo' },
      { k: 'cosa', l: 'Cosa porta', t: 'testo' },
      { k: 'consegne', l: 'Consegne', t: 'scelta', op: ['Ogni giorno', '2-3 a settimana', 'Una a settimana', 'Al bisogno'] },
    ]},
    { k: 'incasso', t: 'numero', l: 'Incasso medio mensile (€)', aiuto: 'Anche indicativo' },
  ]},
  { id: 'cucina', titolo: 'Menù e cucina', ico: 'restaurant_menu', campi: [
    { k: 'menu_file', t: 'file', l: 'Menù attuale con i prezzi', obbl: true, chiave: 'menu',
      aiuto: 'PDF, foto della carta o file: va bene tutto' },
    { k: 'ricette_file', t: 'file', l: 'Ricette o schede tecniche, se ci sono', chiave: 'ricette' },
    { k: 'ricette_note', t: 'area', l: 'Grammature dette a voce',
      aiuto: 'Es. margherita: 250 g impasto, 120 g fiordilatte, 80 g pomodoro' },
    { k: 'prodotti', t: 'tabella', l: 'I prodotti che pesano di più sul food cost', obbl: true, righe: 5,
      aiuto: 'Dieci-quindici: saranno quelli dell\'inventario settimanale', col: [
      { k: 'prodotto', l: 'Prodotto', t: 'testo' },
      { k: 'fornitore', l: 'Fornitore', t: 'testo' },
      { k: 'unita', l: 'Unità', t: 'scelta', op: ['kg', 'litri', 'pezzi', 'colli'] },
      { k: 'consumo', l: 'Consumo a settimana', t: 'testo' },
    ]},
  ]},
  { id: 'obiettivi', titolo: 'Obiettivi', ico: 'flag', campi: [
    { k: 'perdite', t: 'area', l: 'Dove sente di perdere soldi', obbl: true },
    { k: 'vedere', t: 'area', l: 'Cosa vuole vedere nel suo quadro', obbl: true },
    { k: 'tre_mesi', t: 'area', l: 'Cosa deve essere cambiato fra tre mesi' },
    { k: 'note', t: 'area', l: 'Note del consulente' },
  ]},
  { id: 'formalita', titolo: 'Formalità', ico: 'contract', campi: [
    { k: 'data', t: 'data', l: 'Data dell\'incontro', obbl: true },
    { k: 'consulente', t: 'testo', l: 'Consulente SB', obbl: true, dove: 'col' },
    { k: 'ref_nome', t: 'testo', l: 'Referente del locale', obbl: true },
    { k: 'ref_ruolo', t: 'testo', l: 'Ruolo del referente' },
    { k: 'ref_tel', t: 'testo', l: 'Telefono del referente', obbl: true },
    { k: 'ref_email', t: 'testo', l: 'Email del referente' },
    { k: 'informativa', t: 'scelta', l: 'Informativa privacy per lo staff (timbrature)', obbl: true,
      op: ['Da consegnare', 'Consegnata', 'Firmata da tutti'] },
    { k: 'consenso', t: 'conferma', l: 'Il titolare autorizza SB a leggere i dati di cassa e le fatture elettroniche del locale', obbl: true },
  ]},
];
const COLONNE = ['nome', 'tipo', 'citta', 'consulente'];
const STATI = { incontro: 'Incontro in corso', avvio: 'Pronto per l\'avvio', attivo: 'Attivo', sospeso: 'Sospeso' };

/* ─── stato ───────────────────────────────────────────────────── */
const $ = s => document.querySelector(s);
let TOKEN = leggi('sb_rete_token') || '';
let locali = [], corrente = null, sezione = 'locale', cerca = '';
const coda = {};           // sezioni o colonne da salvare, per locale
let timer = null, inVolo = false;

function leggi(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function scrivi(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function api(percorso, opz = {}) {
  const h = { 'X-Admin-Token': TOKEN, ...(opz.body && !(opz.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) };
  const r = await fetch(API + percorso, { ...opz, headers: { ...h, ...(opz.headers || {}) } });
  if (r.status === 401) { esci(); throw new Error('Accesso scaduto'); }
  const d = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  if (!r.ok) throw new Error(d?.error || 'Errore ' + r.status);
  return d;
}

/* ─── accesso ─────────────────────────────────────────────────── */
function esci() { TOKEN = ''; scrivi('sb_rete_token', null); $('#telaio').hidden = true; $('#cancello').hidden = false; }
$('#accesso').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#errore-accesso'), b = $('#entra');
  err.textContent = ''; b.disabled = true; b.textContent = 'Accesso…';
  try {
    const r = await fetch(API + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('#utente').value.trim(), password: $('#parola').value }) });
    const d = await r.json();
    if (!r.ok || !d.token) throw new Error(d.error || 'Credenziali non valide');
    TOKEN = d.token; scrivi('sb_rete_token', TOKEN); $('#parola').value = '';
    avvia();
  } catch (x) { err.textContent = x.message === 'Failed to fetch' ? 'Server non raggiungibile: riprova.' : x.message; }
  b.disabled = false; b.textContent = 'Entra';
});

/* ─── completamento ───────────────────────────────────────────── */
function valore(l, sez, c) {
  if (c.dove === 'col') return l[c.k];
  if (c.t === 'file') return l.allegati?.[c.chiave];
  return l.scheda?.[sez]?.[c.k];
}
function pieno(c, v) {
  if (c.t === 'tabella') return Array.isArray(v) && v.some(r => Object.values(r || {}).some(x => String(x ?? '').trim()));
  if (c.t === 'spunte') return Array.isArray(v) && v.length > 0;
  if (c.t === 'conferma') return v === true;
  if (c.t === 'file') return !!v;
  return v != null && String(v).trim() !== '';
}
function avanzamento(l, sez) {
  const s = SCHEMA.find(x => x.id === sez), obb = s.campi.filter(c => c.obbl);
  return { fatti: obb.filter(c => pieno(c, valore(l, sez, c))).length, tot: obb.length };
}
function totale(l) {
  let f = 0, t = 0;
  SCHEMA.forEach(s => { const a = avanzamento(l, s.id); f += a.fatti; t += a.tot; });
  return { f, t, pc: t ? Math.round(f / t * 100) : 0 };
}

/* ─── elenco ──────────────────────────────────────────────────── */
function disegnaLista() {
  const vis = locali.filter(l => !cerca || (l.nome + ' ' + (l.citta || '')).toLowerCase().includes(cerca));
  $('#lista').innerHTML = vis.map(l => {
    const pc = l.scheda ? totale(l).pc : null;
    return `<button class="riga-locale" data-id="${l.id}" aria-current="${corrente?.id === l.id}">
      <span class="ico spia ${l.stato === 'incontro' ? 'attesa' : 'buono'}" aria-hidden="true">${l.stato === 'incontro' ? 'edit_note' : 'check_circle'}</span>
      <span><span class="n1">${esc(l.nome)}</span><span class="n2">${esc(l.citta || '—')} · ${esc(STATI[l.stato] || l.stato)}</span></span>
      ${pc != null ? `<span class="pc num">${pc}%</span>` : '<span></span>'}
    </button>`;
  }).join('') || `<div class="vuoto">${locali.length ? 'Nessun locale con questo nome.' : 'Ancora nessun incontro. Comincia da «Nuovo incontro».'}</div>`;
  document.querySelectorAll('#lista .riga-locale').forEach(b => b.addEventListener('click', () => apri(+b.dataset.id)));
}
$('#setaccio').addEventListener('input', e => { cerca = e.target.value.trim().toLowerCase(); disegnaLista(); });

$('#nuovo').addEventListener('click', async () => {
  const nome = prompt('Nome del locale');
  if (!nome || !nome.trim()) return;
  try {
    const l = await api('/api/rete/locali', { method: 'POST', body: JSON.stringify({ nome: nome.trim() }) });
    locali.unshift(l); sezione = 'locale'; corrente = l; disegnaTutto();
  } catch (x) { avviso(x.message, true); }
});

async function apri(id) {
  await svuotaCoda();
  try { corrente = await api('/api/rete/locali/' + id); }
  catch (x) { return avviso(x.message, true); }
  const i = locali.findIndex(l => l.id === id); if (i >= 0) locali[i] = corrente;
  ripristinaBozza(); disegnaTutto();
}

/* ─── testata e linguette ─────────────────────────────────────── */
function disegnaBanda() {
  if (!corrente) { $('#banda').innerHTML = '<div class="vuoto-grande">Scegli un incontro dall\'elenco, o comincia da «Nuovo incontro».</div>'; $('#linguette').innerHTML = ''; return; }
  const t = totale(corrente);
  $('#banda').innerHTML = `
    <div class="testa-incontro">
      <div>
        <span class="tit">Scheda d'incontro</span>
        <h1>${esc(corrente.nome)}</h1>
        <div class="sotto">${esc([corrente.tipo, corrente.citta, corrente.consulente && 'consulente ' + corrente.consulente].filter(Boolean).join(' · ') || 'Da compilare')}</div>
      </div>
      <div class="anello" style="--p:${t.pc}" aria-label="Compilata al ${t.pc}%"><b class="num">${t.pc}%</b><i>${t.f} di ${t.t}</i></div>
    </div>
    <div class="azioni-incontro">
      <span class="targa ${corrente.stato === 'incontro' ? 'attesa' : 'buono'}">${esc(STATI[corrente.stato])}</span>
      ${corrente.stato === 'incontro'
        ? `<button type="button" class="pulsante" id="pronto" ${t.f < t.t ? 'title="Mancano ' + (t.t - t.f) + ' risposte obbligatorie"' : ''}><span class="ico">task_alt</span> Pronto per l'avvio</button>`
        : `<button type="button" class="pulsante" id="riapri"><span class="ico">edit</span> Riapri la scheda</button>`}
    </div>`;
  $('#pronto')?.addEventListener('click', () => cambiaStato('avvio', t));
  $('#riapri')?.addEventListener('click', () => cambiaStato('incontro', t));

  $('#linguette').innerHTML = SCHEMA.map(s => {
    const a = avanzamento(corrente, s.id), ok = a.fatti === a.tot;
    return `<button role="tab" data-s="${s.id}" aria-selected="${sezione === s.id}"><span class="ico">${s.ico}</span>${s.titolo}
      <span class="conta num ${ok ? 'ok' : ''}">${ok ? '✓' : a.fatti + '/' + a.tot}</span></button>`;
  }).join('');
  document.querySelectorAll('#linguette button').forEach(b => b.addEventListener('click', () => {
    sezione = b.dataset.s; disegnaBanda(); disegnaArea(); $('#area').scrollIntoView({ block: 'nearest' });
  }));
}
async function cambiaStato(stato, t) {
  if (stato === 'avvio' && t.f < t.t && !confirm('Mancano ' + (t.t - t.f) + ' risposte obbligatorie. Segnare lo stesso come pronto per l\'avvio?')) return;
  await svuotaCoda();
  try { corrente = await api('/api/rete/locali/' + corrente.id, { method: 'PATCH', body: JSON.stringify({ stato }) }); aggiornaInElenco(); disegnaTutto(); }
  catch (x) { avviso(x.message, true); }
}

/* ─── il modulo ───────────────────────────────────────────────── */
function campoHtml(sez, c) {
  const v = valore(corrente, sez, c), id = `f-${sez}-${c.k}`;
  const et = `<label for="${id}">${esc(c.l)}${c.obbl ? ' <span class="obbl" aria-label="obbligatorio">•</span>' : ''}</label>`;
  const aiuto = c.aiuto ? `<p class="aiuto">${esc(c.aiuto)}</p>` : '';
  const largo = ['area', 'tabella', 'spunte', 'conferma', 'file'].includes(c.t) ? ' largo' : '';
  let dentro = '';
  if (c.t === 'testo' || c.t === 'numero' || c.t === 'data')
    dentro = `<input id="${id}" data-k="${c.k}" type="${c.t === 'numero' ? 'number' : c.t === 'data' ? 'date' : 'text'}" ${c.t === 'numero' ? 'inputmode="decimal" min="0"' : ''} value="${esc(v ?? '')}">`;
  else if (c.t === 'area')
    dentro = `<textarea id="${id}" data-k="${c.k}" rows="3">${esc(v ?? '')}</textarea>`;
  else if (c.t === 'scelta')
    dentro = `<div class="pillole" role="radiogroup" aria-label="${esc(c.l)}">${c.op.map(o =>
      `<button type="button" class="pillola" data-k="${c.k}" data-v="${esc(o)}" aria-pressed="${v === o}">${esc(o)}</button>`).join('')}</div>`;
  else if (c.t === 'spunte')
    dentro = `<div class="pillole">${c.op.map(o =>
      `<button type="button" class="pillola" data-k="${c.k}" data-multi="1" data-v="${esc(o)}" aria-pressed="${(v || []).includes(o)}">${esc(o)}</button>`).join('')}</div>`;
  else if (c.t === 'conferma')
    dentro = `<button type="button" class="conferma" data-k="${c.k}" aria-pressed="${v === true}"><span class="ico">${v === true ? 'check_box' : 'check_box_outline_blank'}</span>${esc(c.l)}</button>`;
  else if (c.t === 'file')
    dentro = v
      ? `<div class="file-pieno"><span class="ico">description</span><span class="fn">${esc(v.nome)}</span>
           <button type="button" class="pulsante piccolo" data-scarica="${c.chiave}">Apri</button>
           <button type="button" class="pulsante piccolo" data-togli="${c.chiave}">Togli</button></div>`
      : `<label class="file-vuoto" for="${id}"><input id="${id}" type="file" data-chiave="${c.chiave}"
           accept="application/pdf,image/*,.xlsx,.xls,.csv"><span class="ico">upload_file</span> Carica o scatta una foto</label>`;
  else if (c.t === 'tabella') {
    const righe = (Array.isArray(v) && v.length ? v : []).concat(Array.from({ length: Math.max(0, (c.righe || 3) - (Array.isArray(v) ? v.length : 0)) }, () => ({})));
    dentro = `<div class="tabella-scroll"><table class="tab-modulo" data-k="${c.k}">
      <thead><tr>${c.col.map(x => `<th>${esc(x.l)}</th>`).join('')}<th aria-label="Togli"></th></tr></thead>
      <tbody>${righe.map((r, i) => `<tr data-r="${i}">${c.col.map(x => `<td>${
        x.t === 'scelta'
          ? `<select data-c="${x.k}" aria-label="${esc(x.l)}"><option value=""></option>${x.op.map(o => `<option${r[x.k] === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`
          : `<input data-c="${x.k}" aria-label="${esc(x.l)}" type="${x.t === 'numero' ? 'number' : 'text'}" ${x.t === 'numero' ? 'inputmode="decimal" min="0"' : ''} value="${esc(r[x.k] ?? '')}">`
      }</td>`).join('')}<td><button type="button" class="togli-riga" aria-label="Togli la riga"><span class="ico">close</span></button></td></tr>`).join('')}</tbody>
    </table></div><button type="button" class="pulsante piccolo aggiungi-riga" data-k="${c.k}"><span class="ico">add</span> Aggiungi una riga</button>`;
  }
  return `<div class="campo${largo}" data-campo="${c.k}">${c.t === 'conferma' ? '' : et}${dentro}${aiuto}</div>`;
}

function disegnaArea() {
  if (!corrente) { $('#area').innerHTML = ''; return; }
  const s = SCHEMA.find(x => x.id === sezione), i = SCHEMA.indexOf(s);
  $('#area').innerHTML = `<p class="tit">${esc(s.titolo)}</p>
    <div class="modulo" data-sez="${s.id}">${s.campi.map(c => campoHtml(s.id, c)).join('')}</div>
    <div class="passi">
      ${i > 0 ? `<button type="button" class="pulsante" data-vai="${SCHEMA[i - 1].id}"><span class="ico">arrow_back</span> ${SCHEMA[i - 1].titolo}</button>` : '<span></span>'}
      ${i < SCHEMA.length - 1 ? `<button type="button" class="pulsante pieno" data-vai="${SCHEMA[i + 1].id}">${SCHEMA[i + 1].titolo} <span class="ico">arrow_forward</span></button>` : ''}
    </div>`;
  collega(s);
}

function tabellaDati(tab, c) {
  return [...tab.querySelectorAll('tbody tr')].map(tr => {
    const r = {}; c.col.forEach(x => { const el = tr.querySelector(`[data-c="${x.k}"]`); r[x.k] = el.value.trim(); });
    return r;
  }).filter(r => Object.values(r).some(Boolean));
}

function collega(s) {
  const area = $('#area'), campo = k => s.campi.find(c => c.k === k);
  area.querySelectorAll('input[data-k], textarea[data-k]').forEach(el => el.addEventListener('input', () => {
    const c = campo(el.dataset.k);
    imposta(s.id, c, c.t === 'numero' ? (el.value === '' ? null : Number(el.value)) : el.value);
  }));
  area.querySelectorAll('.pillola').forEach(b => b.addEventListener('click', () => {
    const c = campo(b.dataset.k);
    if (b.dataset.multi) {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
      imposta(s.id, c, [...area.querySelectorAll(`.pillola[data-k="${c.k}"][aria-pressed="true"]`)].map(x => x.dataset.v));
    } else {
      const giaScelto = b.getAttribute('aria-pressed') === 'true';
      area.querySelectorAll(`.pillola[data-k="${c.k}"]`).forEach(x => x.setAttribute('aria-pressed', 'false'));
      if (!giaScelto) b.setAttribute('aria-pressed', 'true');
      imposta(s.id, c, giaScelto ? null : b.dataset.v);
    }
  }));
  area.querySelectorAll('.conferma').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on); b.querySelector('.ico').textContent = on ? 'check_box' : 'check_box_outline_blank';
    imposta(s.id, campo(b.dataset.k), on);
  }));
  area.querySelectorAll('.tab-modulo').forEach(tab => {
    const c = campo(tab.dataset.k), salva = () => imposta(s.id, c, tabellaDati(tab, c));
    tab.addEventListener('input', salva); tab.addEventListener('change', salva);
    tab.addEventListener('click', e => { const t = e.target.closest('.togli-riga'); if (t) { t.closest('tr').remove(); salva(); } });
  });
  area.querySelectorAll('.aggiungi-riga').forEach(b => b.addEventListener('click', () => {
    const tab = area.querySelector(`.tab-modulo[data-k="${b.dataset.k}"] tbody`), primo = tab.querySelector('tr');
    const nuovo = primo.cloneNode(true); nuovo.querySelectorAll('input,select').forEach(x => x.value = ''); tab.appendChild(nuovo);
    nuovo.querySelector('input,select')?.focus();
  }));
  area.querySelectorAll('input[type=file]').forEach(el => el.addEventListener('change', () => carica(el)));
  area.querySelectorAll('[data-scarica]').forEach(b => b.addEventListener('click', () => scarica(b.dataset.scarica)));
  area.querySelectorAll('[data-togli]').forEach(b => b.addEventListener('click', () => togli(b.dataset.togli)));
  area.querySelectorAll('[data-vai]').forEach(b => b.addEventListener('click', () => { sezione = b.dataset.vai; disegnaBanda(); disegnaArea(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
}

/* ─── salvataggio mentre si scrive ────────────────────────────── */
function imposta(sez, c, v) {
  const q = coda[corrente.id] = coda[corrente.id] || { scheda: {} };
  if (c.dove === 'col') { corrente[c.k] = v; q[c.k] = v; }
  else {
    corrente.scheda = corrente.scheda || {};
    corrente.scheda[sez] = { ...(corrente.scheda[sez] || {}), [c.k]: v };
    q.scheda[sez] = corrente.scheda[sez];
  }
  salvaBozza(); aggiornaInElenco(); statoSalva('modifiche');
  aggiornaContatori();
  clearTimeout(timer); timer = setTimeout(svuotaCoda, 1200);
}
function aggiornaContatori() {
  const t = totale(corrente), an = document.querySelector('.anello');
  if (an) { an.style.setProperty('--p', t.pc); an.querySelector('b').textContent = t.pc + '%'; an.querySelector('i').textContent = `${t.f} di ${t.t}`; }
  SCHEMA.forEach(s => {
    const a = avanzamento(corrente, s.id), el = document.querySelector(`#linguette [data-s="${s.id}"] .conta`);
    if (el) { const ok = a.fatti === a.tot; el.textContent = ok ? '✓' : a.fatti + '/' + a.tot; el.classList.toggle('ok', ok); }
  });
  const h1 = document.querySelector('.testa-incontro h1'); if (h1) h1.textContent = corrente.nome || '';
}
async function svuotaCoda() {
  clearTimeout(timer);
  if (inVolo) return;
  const ids = Object.keys(coda); if (!ids.length) return;
  inVolo = true; statoSalva('salvo');
  try {
    for (const id of ids) {
      const corpo = coda[id]; delete coda[id];
      try { await api('/api/rete/locali/' + id, { method: 'PATCH', body: JSON.stringify(corpo) }); }
      catch (x) { coda[id] = fondi(corpo, coda[id]); throw x; }
    }
    scrivi('sb_rete_bozze', null); statoSalva('salvato');
  } catch (x) {
    statoSalva('errore', x.message); salvaBozza();
    setTimeout(svuotaCoda, 10000);          // riprova da sola
  } finally { inVolo = false; }
}
function fondi(vecchio, nuovo) {
  if (!nuovo) return vecchio;
  return { ...vecchio, ...nuovo, scheda: { ...(vecchio.scheda || {}), ...(nuovo.scheda || {}) } };
}
/* La coda vive anche sul dispositivo: se si chiude la pagina senza rete, al
   ritorno le modifiche riappaiono e ripartono. */
function salvaBozza() { scrivi('sb_rete_bozze', JSON.stringify(coda)); }
function ripristinaBozza() {
  let b; try { b = JSON.parse(leggi('sb_rete_bozze') || '{}'); } catch (e) { b = {}; }
  const q = b[corrente?.id]; if (!q) return;
  COLONNE.forEach(k => { if (k in q) corrente[k] = q[k]; });
  corrente.scheda = { ...(corrente.scheda || {}), ...(q.scheda || {}) };
  coda[corrente.id] = fondi(q, coda[corrente.id]); timer = setTimeout(svuotaCoda, 500);
}
window.addEventListener('online', svuotaCoda);
window.addEventListener('beforeunload', e => { if (Object.keys(coda).length) { salvaBozza(); e.preventDefault(); } });

function statoSalva(s, dett) {
  const el = $('#stato-salva');
  const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  el.className = 'stato-salva ' + s;
  el.innerHTML = s === 'salvo' ? '<span class="ico">sync</span> Salvataggio…'
    : s === 'salvato' ? `<span class="ico">cloud_done</span> Salvato alle ${ora}`
    : s === 'modifiche' ? '<span class="ico">edit</span> Modifiche da salvare'
    : `<span class="ico">cloud_off</span> Non salvato: ${esc(dett || 'connessione assente')}. Riprovo da solo.`;
}
function avviso(t, errore) { statoSalva(errore ? 'errore' : 'salvato', t); }

/* ─── file ────────────────────────────────────────────────────── */
async function carica(el) {
  const f = el.files[0]; if (!f) return;
  if (f.size > 6 * 1024 * 1024) { el.value = ''; return avviso('Il file supera i 6 MB', true); }
  const fd = new FormData(); fd.append('file', f);
  statoSalva('salvo');
  try {
    const r = await api(`/api/rete/locali/${corrente.id}/allegati/${el.dataset.chiave}`, { method: 'POST', body: fd });
    corrente.allegati = r.allegati; aggiornaInElenco(); statoSalva('salvato'); disegnaBanda(); disegnaArea();
  } catch (x) { el.value = ''; avviso(x.message, true); }
}
async function scarica(chiave) {
  try {
    const r = await fetch(`${API}/api/rete/locali/${corrente.id}/allegati/${chiave}`, { headers: { 'X-Admin-Token': TOKEN } });
    if (!r.ok) throw new Error('File non disponibile');
    const url = URL.createObjectURL(await r.blob()); window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (x) { avviso(x.message, true); }
}
async function togli(chiave) {
  if (!confirm('Togliere questo file dalla scheda?')) return;
  try { const r = await api(`/api/rete/locali/${corrente.id}/allegati/${chiave}`, { method: 'DELETE' }); corrente.allegati = r.allegati; aggiornaInElenco(); disegnaBanda(); disegnaArea(); }
  catch (x) { avviso(x.message, true); }
}

/* ─── avvio ───────────────────────────────────────────────────── */
function aggiornaInElenco() {
  const i = locali.findIndex(l => l.id === corrente.id);
  if (i >= 0) locali[i] = { ...locali[i], ...corrente };
  disegnaLista();
}
function disegnaTutto() { disegnaLista(); disegnaBanda(); disegnaArea(); }

async function avvia() {
  $('#cancello').hidden = true; $('#telaio').hidden = false;
  try {
    locali = await api('/api/rete/locali');
    corrente = null; disegnaTutto();
    const primo = locali.find(l => l.stato === 'incontro') || locali[0];
    if (primo) await apri(primo.id);
  } catch (x) { if (TOKEN) avviso(x.message, true); }
}
TOKEN ? avvia() : esci();
