/* ═══════════════════════════════════════════════════════════════════
   Console SB · dati del locale (Rete SB, fase 1)

   Una pagina, cinque linguette, nell'ordine in cui si lavora:
     Acquisti  → fatture elettroniche e articoli con il loro prezzo
     Ricettario → piatti e grammature, costo del piatto
     Vendite   → il report della cassa, voci abbinate ai piatti
     Inventari → la conta della merce, scarti e carichi (anche dal tag NFC)
     Diagnosi  → tra due inventari: dove il locale perde food cost
     Persone e turni → chi timbra, il tag sulla cassa, le chiusure
     Dossier   → quello che Monitoring mostra e non nasce dai dati: contratto,
                 dotazione, storia, atteso/nota/mossa di ogni indicatore

   Qui c'è l'impalcatura comune; ogni linguetta sta nel suo file sez-*.js.
   I dati stanno solo nel backend, dietro la chiave del gestionale.
   ═══════════════════════════════════════════════════════════════════ */
import acquisti from './sez-acquisti.js?v=20261001x';
import ricettario from './sez-ricettario.js?v=20261001y';
import vendite from './sez-vendite.js?v=20261001u';
import inventari from './sez-inventari.js?v=20261002c';
import diagnosi from './sez-diagnosi.js?v=20261001c';
import persone from './sez-persone.js?v=20260929p';
import dossier from './sez-dossier.js?v=20261001x';

const SEZIONI = [acquisti, ricettario, vendite, inventari, diagnosi, persone, dossier];
const API = (() => { try { return localStorage.getItem('sb_rete_api'); } catch (e) { return null; } })()
  || 'https://web-production-f3794.up.railway.app';

const $ = s => document.querySelector(s);
function leggi(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function scrivi(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
const param = new URLSearchParams(location.search);

let TOKEN = leggi('sb_rete_token') || '';
let locali = [], cerca = '';
let sessione = 0;           // cresce a ogni uscita: le risposte di richieste partite prima si buttano

/* ─── il contesto che ogni linguetta riceve ───────────────────── */
const ctx = {
  locale: null,
  vista: SEZIONI.some(s => s.id === param.get('vista')) ? param.get('vista') : 'acquisti',
  param,
  d: {},                      // i dati del locale, caricati insieme
  esc: s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  euro: (n, dec) => n == null ? '—' : n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR',
    minimumFractionDigits: dec ?? 2, maximumFractionDigits: dec ?? (Math.abs(n) < 10 ? 3 : 2) }),
  qta: (n, dec = 3) => n == null ? '—' : n.toLocaleString('it-IT', { maximumFractionDigits: dec }),
  pct: n => n == null ? '—' : n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%',
  data: s => s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
  // numeri scritti a mano: «1.000,50», «1,5», «1.5», «€ 12». Una stringa che non è tutta un numero → null, mai un pezzo
  // le migliaia vanno a gruppi di tre: «1.2.3» o «1,2.3» non sono numeri
  num: v => {
    let s = String(v ?? '').replace(/[€\s]/g, '');
    // un punto solo è la virgola (0.500 = mezzo chilo, come nel motore); migliaia solo con due punti o con la virgola dopo
    if (/^-?\d{1,3}(\.\d{3}){2,}$|^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');   // 1.000.000 · 1.000,50
    else if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(s)) s = s.replace(/,/g, '');                          // 1,234.50
    else if (/^-?\d*[.,]?\d+$/.test(s)) s = s.replace(',', '.');                                     // 12 · 1,5 · 1.5 · ,5
    else return null;
    const x = Number(s); return Number.isFinite(x) ? x : null;
  },
  oggi: () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
  UNITA: { kg: 'kg', l: 'litri', pz: 'pezzi' },
  // grammature: si scrivono in g, ml o pezzi; nel backend l'articolo è in kg, l o pz
  PICCOLA: { kg: 'g', l: 'ml', pz: 'pz' },
  aPiccola: (q, u) => u === 'pz' ? q : q * 1000,
  daPiccola: (q, u) => u === 'pz' ? q : q / 1000,
  api, avviso, ridisegna: disegna, ricarica,
  sporco: () => moduloSporco(),           // c'è un modulo compilato a metà: non ridisegnare
  base: () => `/api/rete/locali/${ctx.locale.id}`,
  articolo: id => (ctx.d.articoli || []).find(a => a.id === id),
};

async function api(percorso, opz = {}) {
  const mia = sessione;
  const h = { 'X-Admin-Token': TOKEN, ...(opz.body && !(opz.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) };
  // una richiesta bloccata non deve lasciare la pagina in caricamento per sempre; i file hanno più tempo
  const { timeout = opz.body instanceof FormData ? 300000 : 30000, ...resto } = opz;
  const ferma = new AbortController(), t = setTimeout(() => ferma.abort(), timeout);
  let r, d;
  try {
    r = await fetch(API + percorso, { ...resto, signal: ferma.signal, headers: { ...h, ...(opz.headers || {}) } });
    // il tempo vale fino all'ultimo byte: anche il corpo della risposta può bloccarsi
    d = r.status !== 401 && r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  } catch (x) {
    throw new Error(x.name === 'AbortError' ? 'Il motore non risponde: riprova tra poco'
      : x instanceof SyntaxError ? 'Risposta del motore non leggibile' : 'Motore non raggiungibile: ' + x.message);
  } finally { clearTimeout(t); }
  if (mia !== sessione) throw new Error('Sessione chiusa');      // si è usciti mentre la richiesta era in corso
  if (r.status === 401) { esci(); throw new Error('Accesso scaduto'); }
  if (!r.ok) throw new Error(d?.error || 'Errore ' + r.status);
  return d;
}

let tAvviso = null;
function avviso(t, errore) {
  const el = $('#stato-salva');
  el.className = 'stato-salva ' + (errore ? 'errore' : 'salvato');
  el.innerHTML = `<span class="ico">${errore ? 'error' : 'check_circle'}</span> ${ctx.esc(t)}`;
  clearTimeout(tAvviso); tAvviso = setTimeout(() => { el.innerHTML = ''; }, errore ? 8000 : 3500);
}

/* ─── accesso ─────────────────────────────────────────────────── */
function esci() {
  // non basta nascondere: i dati del locale e dell'elenco si cancellano, chi entra dopo non li deve vedere
  sessione++;
  TOKEN = ''; scrivi('sb_rete_token', null);
  locali = []; ctx.locale = null; ctx.d = {};
  SEZIONI.forEach(s => s.azzera?.(ctx));
  for (const id of ['lista', 'banda', 'linguette', 'area', 'polso-rete']) { const el = document.getElementById(id); if (el) el.innerHTML = ''; }
  $('#telaio').hidden = true; $('#cancello').hidden = false;
}
$('#accesso').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#errore-accesso'), b = $('#entra');
  err.textContent = ''; b.disabled = true; b.textContent = 'Accesso…';
  try {
    // con l'email entra un consulente col suo accesso; con il nome utente, la chiave admin del gestionale
    const u = $('#utente').value.trim(), consulente = u.includes('@');
    // trenta secondi al massimo: se il server non risponde il tasto torna e si può riprovare
    const ferma = new AbortController(), t = setTimeout(() => ferma.abort(), 30000);
    let r, d;
    try {
      r = await fetch(API + (consulente ? '/api/rete/login' : '/api/admin/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ferma.signal,
        body: JSON.stringify(consulente ? { email: u, password: $('#parola').value } : { username: u, password: $('#parola').value }) });
      d = await r.json().catch(x => { if (x.name === 'AbortError') throw x; return {}; });
    } catch (x) { throw new Error(x.name === 'AbortError' ? 'Il server non risponde: riprova.' : 'Server non raggiungibile: riprova.'); }
    finally { clearTimeout(t); }
    if (!r.ok || !d.token) throw new Error(d.error || 'Credenziali non valide');
    TOKEN = d.token; scrivi('sb_rete_token', TOKEN); scrivi('sb_rete_ruolo', d.ruolo || 'admin'); $('#parola').value = '';
    // la direzione guarda e basta: il suo portale è la vista della rete
    if (d.ruolo === 'direzione') { location.href = 'rete.html'; return; }
    avvia();
  } catch (x) { err.textContent = x.message; }
  finally { b.disabled = false; b.textContent = 'Entra'; }
});

/* ─── elenco dei locali ───────────────────────────────────────── */
const SPIA = { buono: 'check_circle', attesa: 'error', fuori: 'cancel', vuoto: 'hourglass_empty' };
function riga2(l) {
  const d = l.diagnosi;
  if (d) return `food cost ${ctx.pct(d.food_cost_reale)} · obiettivo ${ctx.pct(d.obiettivo)}`;
  const cose = [l.da_collegare && `${l.da_collegare} da collegare`, !l.ricette && 'ricettario vuoto',
                l.voci_da_abbinare && `${l.voci_da_abbinare} voci da abbinare`, !l.ultimo_inventario && 'nessun inventario'].filter(Boolean);
  return 'da avviare' + (cose.length ? ': ' + cose.slice(0, 2).join(', ') : '');
}
function disegnaLista() {
  const vis = locali.filter(l => !cerca || (l.nome + ' ' + (l.citta || '')).toLowerCase().includes(cerca));
  const conta = s => locali.filter(l => l.semaforo === s).length;
  $('#polso-rete').innerHTML = locali.length ? `<b class="num">${locali.length}</b> ${locali.length === 1 ? 'locale' : 'locali'} · <b class="num fuori">${conta('fuori')}</b> fuori · <b class="num attesa">${conta('attesa')}</b> attenzione · <b class="num">${conta('vuoto')}</b> da avviare` : '';
  $('#lista').innerHTML = vis.map(l => `<button class="riga-locale" data-id="${l.id}" aria-current="${ctx.locale?.id === l.id}">
      <span class="ico spia ${l.semaforo || 'vuoto'}" aria-hidden="true">${SPIA[l.semaforo] || SPIA.vuoto}</span>
      <span><span class="n1">${ctx.esc(l.nome)}</span><span class="n2">${ctx.esc(l.citta || '')}${l.citta ? ' · ' : ''}${ctx.esc(riga2(l))}</span></span><span></span>
    </button>`).join('') || `<div class="vuoto">${locali.length ? 'Nessun locale con questo nome.' : 'Nessun locale: si creano dalla scheda d\'incontro.'}</div>`;
  document.querySelectorAll('#lista .riga-locale').forEach(b => b.addEventListener('click', () => apri(+b.dataset.id)));
}
$('#setaccio').addEventListener('input', e => { cerca = e.target.value.trim().toLowerCase(); disegnaLista(); });

async function apri(id) {
  ctx.locale = locali.find(l => l.id === id) || null;
  ctx.d = {};
  SEZIONI.forEach(s => s.azzera?.(ctx));
  const u = new URL(location); u.searchParams.set('locale', id); history.replaceState(null, '', u);
  // via subito i moduli del locale di prima: un salvataggio partito da lì finirebbe in questo
  $('#area').innerHTML = '<div class="vuoto-grande">Carico i dati del locale…</div>';
  disegnaLista(); await ricarica();
}

async function ricarica(opz = {}) {
  if (!ctx.locale) return disegna();
  // se nel frattempo si apre un altro locale, la risposta di questo non deve toccare niente:
  // finirebbe nei dati (e nell'id) del locale nuovo, e le modifiche andrebbero al locale sbagliato
  const loc = ctx.locale, b = ctx.base();
  const chiavi = { locale: '', collegare: '/da-collegare', fatture: '/fatture', articoli: '/articoli', ricette: '/ricette',
                   voci: '/voci', giorni: '/vendite', report: '/vendite/report', analisi: '/vendite/analisi', inventari: '/inventari', movimenti: '/movimenti' };
  try {
    const val = await Promise.all(Object.values(chiavi).map(p => api(b + p)));
    if (ctx.locale !== loc) return;
    Object.keys(chiavi).forEach((k, i) => { ctx.d[k] = val[i]; });
    // impostazioni (obiettivo, cassa collegata) fresche anche nell'elenco
    if (ctx.d.locale?.id === loc.id) Object.assign(loc, ctx.d.locale);
  } catch (x) { if (ctx.locale !== loc) return; avviso(x.message, true); }
  await SEZIONI.find(s => s.id === ctx.vista)?.prepara?.(ctx);
  if (ctx.locale !== loc) return;
  // una rilettura automatica non ridisegna sopra un modulo che si è cominciato a scrivere mentre caricava
  if (opz.auto && moduloSporco()) return;
  disegna();
  // il semaforo del locale cambia con i dati: la colonna si rilegge senza fermare la pagina
  api('/api/rete/riepilogo').then(r => { locali = r; disegnaLista(); }).catch(() => {});
}

// quando si torna su questa pagina si rilegge: lo staff timbra e chiude dal tag, un collega può aver caricato qualcosa.
// Se c'è un modulo compilato a metà non si tocca niente, per non perdere quello che si stava scrivendo.
function moduloSporco() {
  return [...document.querySelectorAll('main input, main textarea, main select')].some(el =>
    el.type === 'file' ? false : el.tagName === 'SELECT' ? [...el.options].some(o => o.selected !== o.defaultSelected)
      : (el.type === 'checkbox' || el.type === 'radio') ? el.checked !== el.defaultChecked : el.value !== el.defaultValue);
}
let rilettoAlle = 0;
async function rileggi() {
  if (!ctx.locale || document.hidden || Date.now() - rilettoAlle < 5000 || moduloSporco()) return;
  rilettoAlle = Date.now();
  const y = window.scrollY; await ricarica({ auto: true }); window.scrollTo(0, y);
}
window.addEventListener('focus', rileggi);
document.addEventListener('visibilitychange', rileggi);

/* ─── testata e linguette ─────────────────────────────────────── */
function disegnaBanda() {
  if (!ctx.locale) { $('#banda').innerHTML = '<div class="vuoto-grande">Scegli un locale dall\'elenco.</div>'; $('#linguette').innerHTML = ''; return; }
  const d = ctx.d, imp = ctx.locale.impostazioni || {};
  // il prezzo vero viene dalle fatture; finché non c'è vale quello stimato del catalogo (e lo si dice)
  const art = d.articoli || [], daFattura = art.filter(a => a.prezzo != null).length, stimati = art.filter(a => a.prezzo == null && a.prezzo_stima != null).length;
  const passi = [
    [`Articoli con prezzo · ${daFattura} da fattura${stimati ? `, ${stimati} stimati` : ''}`, daFattura + stimati],
    ['Piatti nel ricettario', (d.ricette || []).length],
    ['Giorni di vendite', (d.giorni || []).length + (d.report || []).reduce((s, r) => s + r.giorni, 0)],
    ['Inventari chiusi', (d.inventari || []).filter(i => i.chiuso).length],
  ];
  $('#banda').innerHTML = `
    <div class="testa-incontro">
      <div>
        <span class="tit">Dati del locale</span>
        <h1>${ctx.esc(ctx.locale.nome)}</h1>
        <div class="sotto">${ctx.esc(ctx.locale.citta || '')}${ctx.locale.citta ? ' · ' : ''}obiettivo food cost ${imp.obiettivo ?? 30}% · IVA sulle vendite ${imp.iva ?? 10}%
          <button type="button" class="link-mini" id="imposta">cambia</button></div>
      </div>
    </div>
    <div class="passi-locale">${passi.map(([t, n]) => `<div class="${n ? 'ok' : ''}"><b class="num">${n}</b><i>${t}</i></div>`).join('')}</div>`;
  $('#imposta').addEventListener('click', async () => {
    const ob = prompt('Obiettivo di food cost, in %', imp.obiettivo ?? 30); if (ob == null) return;
    const iva = prompt('IVA sulle vendite, in % (di solito 10 per la ristorazione)', imp.iva ?? 10); if (iva == null) return;
    try {
      ctx.locale.impostazioni = { ...imp, ...(await api(ctx.base() + '/impostazioni', { method: 'PATCH', body: JSON.stringify({ obiettivo: ctx.num(ob), iva: ctx.num(iva) }) })) };
      await ricarica();
    } catch (x) { avviso(x.message, true); }
  });

  $('#linguette').innerHTML = SEZIONI.map(s => {
    const n = s.conta?.(ctx);
    return `<button role="tab" data-v="${s.id}" aria-selected="${ctx.vista === s.id}"><span class="ico">${s.ico}</span>${s.titolo}${n ? `<span class="conta num">${n}</span>` : ''}</button>`;
  }).join('');
  document.querySelectorAll('#linguette button').forEach(b => b.addEventListener('click', async () => {
    ctx.vista = b.dataset.v;
    const u = new URL(location); u.searchParams.set('vista', ctx.vista); u.searchParams.delete('articolo'); history.replaceState(null, '', u);
    await SEZIONI.find(s => s.id === ctx.vista)?.prepara?.(ctx);
    disegna();
  }));
}

function disegna() {
  disegnaBanda();
  const s = SEZIONI.find(x => x.id === ctx.vista);
  if (!ctx.locale || !s) { $('#area').innerHTML = ''; return; }
  $('#area').innerHTML = s.html(ctx);
  s.lega(ctx);
}

async function avvia() {
  $('#cancello').hidden = true; $('#telaio').hidden = false;
  try {
    locali = await api('/api/rete/riepilogo');
    const primo = locali.find(l => l.id === +param.get('locale')) || locali[0];
    if (primo) await apri(primo.id); else { disegnaLista(); disegna(); }
  } catch (x) { if (TOKEN) avviso(x.message, true); }
}
if (TOKEN && leggi('sb_rete_ruolo') === 'direzione') location.replace('rete.html');
else TOKEN ? avvia() : esci();
