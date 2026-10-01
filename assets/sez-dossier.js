/* Linguetta «Dossier»: tutto quello che Monitoring mostra e che non nasce dai dati.
   Anagrafica e contratto, cosa è installato nel locale, la storia (visite, chiamate,
   decisioni) e, per ogni indicatore, l'atteso concordato, la nota e la mossa del consulente.
   Ogni campo si salva da solo quando si esce dalla casella. */

// ?sotto=contratto|dotazione|storia|indicatori apre direttamente quella scheda (i link da Monitoring)
let DA_URL = new URLSearchParams(location.search).get('sotto');
let sotto = DA_URL || 'contratto', dos = null;

const TIPI = ['Pizzeria', 'Trattoria', 'Ristorante', 'Bistrot', 'Bar', 'Pub', 'Altro'];
const PACCHETTI = ['Avvio', 'Mantenimento', 'Rilancio'];
const STATI_DOT = [['', 'Dai dati'], ['attivo', 'Attivo'], ['da sistemare', 'Da sistemare'], ['assente', 'Non installato']];
const TIPI_EVENTO = [['visita', 'Visita'], ['chiamata', 'Chiamata'], ['decisione', 'Decisione'], ['nota', 'Nota']];
const CAUSE = [['food.prezzo', 'Diagnosi · prezzi d\'acquisto saliti'], ['food.consumo', 'Diagnosi · consumo oltre ricetta'], ['food.scarto', 'Diagnosi · scarti registrati']];

// i campi dell'anagrafica e del contratto: [percorso, etichetta, tipo, opzioni/aiuto]
const CAMPI = [
  ['Il locale', [
    ['col.tipo', 'Tipologia', 'scelta', TIPI], ['col.citta', 'Città', 'testo'], ['locale.indirizzo', 'Indirizzo', 'testo'],
    ['dossier.zona', 'Zona o quartiere', 'testo'], ['locale.coperti', 'Coperti', 'numero'], ['locale.tavoli', 'Tavoli', 'numero'],
    ['numeri.cassa_marca', 'Cassa (marca e programma)', 'testo'],
    ['numeri.incasso', 'Incasso medio mensile dichiarato (€)', 'numero'],
  ]],
  ['Le persone', [
    ['dossier.titolare', 'Titolare', 'testo'], ['dossier.telefono', 'Telefono del titolare', 'testo'],
    ['formalita.ref_nome', 'Referente nel locale', 'testo'], ['formalita.ref_tel', 'Telefono del referente', 'testo'],
    ['col.consulente', 'Consulente SB', 'testo'], ['dossier.in_formazione', 'In formazione sul locale', 'testo'],
  ]],
  ['Il contratto', [
    ['dossier.pacchetto', 'Pacchetto', 'scelta', PACCHETTI], ['dossier.canone', 'Canone mensile (€)', 'numero'],
    ['dossier.dal', 'Cliente dal', 'data'], ['dossier.prossima_visita', 'Prossima visita', 'data'],
    ['dossier.voto_titolare', 'Voto del titolare (1-5)', 'numero'],
    ['dossier.bollino', 'Bollino SB', 'scelta', [['auto', 'Automatico: attivo se nessun indicatore è fuori'], ['attivo', 'Attivo'], ['sospeso', 'Sospeso']]],
  ]],
];

function valore(c, percorso) {
  if (percorso.startsWith('col.')) return c.locale[percorso.slice(4)] ?? '';
  return dos?.locale?.campi?.[percorso] ?? '';
}

function campo(c, [percorso, etichetta, tipo, op]) {
  const v = valore(c, percorso), id = 'f-' + percorso.replace('.', '-');
  let input;
  if (tipo === 'scelta') {
    const opz = (op || []).map(o => Array.isArray(o) ? o : [o, o]);
    input = `<select id="${id}" data-p="${percorso}">${percorso === 'dossier.bollino' ? '' : '<option value="">—</option>'}${opz.map(([k, t]) =>
      `<option value="${c.esc(k)}" ${String(v || (percorso === 'dossier.bollino' ? 'auto' : '')) === k ? 'selected' : ''}>${c.esc(t)}</option>`).join('')}</select>`;
  } else {
    input = `<input id="${id}" data-p="${percorso}" ${tipo === 'numero' ? 'inputmode="decimal"' : ''} type="${tipo === 'data' ? 'date' : 'text'}"
      value="${c.esc(tipo === 'numero' && v !== '' ? String(v).replace('.', ',') : v)}" maxlength="300">`;
  }
  return `<label class="dz-campo" for="${id}">${c.esc(etichetta)}${input}</label>`;
}

function htmlContratto(c) {
  return `<p class="aiuto-lista">Quello che Monitoring mostra nella testata del locale e nella scheda «Contratto». I campi della scheda d'incontro sono gli stessi: cambiarli qui li cambia anche lì.</p>
  ${CAMPI.map(([t, campi]) => `<section class="dz-gruppo"><h3 class="cat">${t}</h3><div class="dz-griglia">${campi.map(x => campo(c, x)).join('')}</div></section>`).join('')}`;
}

function htmlDotazione(c) {
  return `<p class="aiuto-lista">Cassa, fatture, timbrature, chiusure e inventari si leggono dai dati. Qui si segna il resto (sonde, placche, tag di magazzino) o si corregge quello che i dati non sanno: «Dai dati» torna a leggerlo da solo.</p>
  <div class="dz-dotazione">${dos.dotazione.map(x => `<div class="dz-pezzo" data-id="${x.id}">
      <span class="ico">${x.ico}</span>
      <div><b>${c.esc(x.nome)}</b><span class="tenue">Dai dati: ${c.esc(x.dai_dati)}</span></div>
      <label>Stato<select data-dot="stato">${STATI_DOT.map(([k, t]) => `<option value="${k}" ${(x.automatico ? '' : x.stato) === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="largo">Nota<input data-dot="nota" value="${c.esc(x.automatico ? '' : (x.descrizione === x.dai_dati ? '' : x.descrizione))}" maxlength="300" placeholder="Es. due celle, sonde ordinate il 3 ottobre"></label>
    </div>`).join('')}</div>`;
}

function htmlStoria(c) {
  const ev = dos.storia;
  return `<form class="dz-evento" id="evento">
      <label>Giorno<input type="date" name="giorno" value="${c.oggi()}" required></label>
      <label>Cosa<select name="tipo">${TIPI_EVENTO.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
      <label class="largo">Cosa è successo<textarea name="testo" rows="2" maxlength="2000" required placeholder="Es. Visita mensile: il fornitore dei latticini ha alzato i prezzi due volte, nessuno se ne era accorto."></textarea></label>
      <label class="spunta-dz"><input type="checkbox" name="chiave"> Tappa importante</label>
      <button type="submit" class="pulsante pieno piccolo"><span class="ico">add</span> Aggiungi alla storia</button>
    </form>
    <div class="dz-storia">${ev.map(e => `<div class="dz-tappa ${e.chiave ? 'chiave' : ''} ${e.auto ? 'auto' : ''}">
      <span class="q">${c.data(e.giorno)}</span>
      <div><b>${c.esc(e.auto ? e.tipo : (TIPI_EVENTO.find(t => t[0] === e.tipo)?.[1] || e.tipo))}</b>${e.autore ? ` <span class="tenue">· ${c.esc(e.autore)}</span>` : ''}${e.auto ? ' <span class="tenue">· dai dati</span>' : ''}<p>${c.esc(e.testo)}</p></div>
      ${e.id ? `<button type="button" class="togli-riga" data-togli="${e.id}" aria-label="Togli dalla storia"><span class="ico">delete</span></button>` : '<span></span>'}
    </div>`).join('') || '<div class="vuoto-grande">Ancora niente nella storia.</div>'}</div>`;
}

function htmlIndicatori(c) {
  const par = c.locale.impostazioni?.parametri || {};
  const cifra = v => v == null ? '' : String(v).replace('.', ',');
  const righe = dos.indicatori.filter(p => p.gruppo !== 'presto');
  return `<p class="aiuto-lista">Per ogni indicatore: l'atteso concordato col locale (vuoto = quello standard per il tipo di locale), la nota che spiega il numero e la mossa. Monitoring le mostra sotto il quadrante.</p>
  <div class="dz-indicatori">${righe.map(p => `<div class="dz-ind" data-id="${p.id}">
      <div class="dz-ind-testa"><b>${c.esc(p.nome)}</b>
        <span class="targa ${p.stato === 'vuoto' ? 'spenta' : p.stato}">${p.valore == null ? 'manca il dato' : c.esc(String(p.valore).replace('.', ',')) + (p.unita && p.unita !== 'punti' ? ' ' + c.esc(p.unita) : '')}</span></div>
      <div class="dz-ind-campi">
        <label>Atteso<input data-par="atteso" inputmode="decimal" value="${cifra(par[p.id]?.atteso)}" placeholder="${cifra(p.atteso)}"></label>
        <label>Tolleranza<input data-par="toll" inputmode="decimal" value="${cifra(par[p.id]?.toll)}" placeholder="${cifra(p.toll)}"></label>
        <label class="largo">Nota del consulente<input data-ind="nota" value="${c.esc(p.nota || '')}" maxlength="1000" placeholder="Perché il numero è così, detto a Simone"></label>
        <label class="largo">La mossa<input data-ind="mossa" value="${c.esc(dos.note?.[p.id]?.mossa || '')}" maxlength="500" placeholder="${c.esc(p.mossa)}"></label>
      </div></div>`).join('')}
    ${CAUSE.map(([id, nome]) => `<div class="dz-ind" data-id="${id}"><div class="dz-ind-testa"><b>${c.esc(nome)}</b></div>
      <div class="dz-ind-campi"><label class="largo">Nota del consulente<input data-ind="nota" value="${c.esc(dos.note?.[id]?.nota || '')}" maxlength="1000"></label>
        <label class="largo">La mossa<input data-ind="mossa" value="${c.esc(dos.note?.[id]?.mossa || '')}" maxlength="500" placeholder="Quella proposta in automatico"></label></div></div>`).join('')}
  </div>`;
}

async function salvaDossier(c, corpo, base = c.base()) {
  // il salvataggio è del locale da cui parte (`base`, preso quando si è fatta la modifica); dopo si rilegge
  // il dossier intero, così cambiando sottoscheda non ricompaiono valori vecchi (solo se il locale è ancora quello)
  const r = await c.api(base + '/dossier', { method: 'PATCH', body: JSON.stringify(corpo) });
  c.avviso('Salvato');
  if (c.locale && c.base() === base) await prepara(c);
  return r;
}

// una coda per ogni riga: i salvataggi partono uno dopo l'altro, ognuno col locale e i valori del momento
// in cui si è fatta la modifica. Così due modifiche di fila non si scavalcano e non finiscono su un altro locale;
// dopo un'uscita (nessun locale aperto) quello che restava in coda non parte.
function inCoda(riga, c, lavoro) {
  const base = c.base();
  riga._coda = (riga._coda || Promise.resolve()).then(() => (c.locale ? lavoro(base) : null)).catch(x => c.avviso(x.message, true));
}

function lega(c) {
  document.querySelectorAll('.dz-sotto button').forEach(b => b.addEventListener('click', () => { sotto = b.dataset.s; c.ridisegna(); }));

  // anagrafica e contratto
  document.querySelectorAll('[data-p]').forEach(el => el.addEventListener('change', () => {
    // «salvato» è solo il valore partito con la richiesta: quello scritto intanto resta da salvare
    const p = el.dataset.p, inviato = el.value, v = inviato.trim(), loc = c.locale;
    // un numero scritto male non si salva: diventerebbe vuoto e cancellerebbe quello di prima
    if (el.inputMode === 'decimal' && v && c.num(v) === null) { el.value = el.defaultValue; el.focus(); return c.avviso('Scrivi un numero', true); }
    // in fila per campo, con locale e valore di questa modifica: due modifiche di fila non si scavalcano
    inCoda(el, c, async base => {
      if (p.startsWith('col.')) {
        const k = p.slice(4);
        await c.api(`/api/rete/locali/${loc.id}`, { method: 'PATCH', body: JSON.stringify({ [k]: v }) });
        loc[k] = v; c.avviso('Salvato');            // il locale di partenza, anche se intanto se n'è aperto un altro
      } else {
        await salvaDossier(c, { campi: { [p]: el.inputMode === 'decimal' && v ? c.num(v) : v } }, base);
      }
      if (el.tagName === 'SELECT') [...el.options].forEach(o => { o.defaultSelected = o.value === inviato; }); else el.defaultValue = inviato;
    });
  }));

  // dotazione
  // un salvataggio alla volta per ogni pezzo, coi valori di quel momento: due modifiche di fila non si scavalcano
  document.querySelectorAll('.dz-pezzo').forEach(r => r.querySelectorAll('[data-dot]').forEach(el => el.addEventListener('change', () => {
    const st = r.querySelector('[data-dot=stato]'), nt = r.querySelector('[data-dot=nota]');
    const stato = st.value, testo = nt.value, nota = testo.trim();
    inCoda(r, c, async base => {
      await salvaDossier(c, { dotazione: { [r.dataset.id]: stato || nota ? { stato, nota } : null } }, base);
      st.querySelectorAll('option').forEach(o => { o.defaultSelected = o.value === stato; });
      nt.defaultValue = testo;
    });
  })));

  // storia
  const f = document.getElementById('evento');
  f?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await c.api(c.base() + '/storia', { method: 'POST', body: JSON.stringify({ giorno: f.giorno.value, tipo: f.tipo.value, testo: f.testo.value, chiave: f.chiave.checked }) });
      f.testo.value = ''; f.testo.defaultValue = ''; c.avviso('Aggiunto alla storia');
      await prepara(c); c.ridisegna();
    } catch (x) { c.avviso(x.message, true); }
  });
  document.querySelectorAll('[data-togli]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Togliere questo evento dalla storia?')) return;
    try { await c.api(`${c.base()}/storia/${b.dataset.togli}`, { method: 'DELETE' }); await prepara(c); c.ridisegna(); }
    catch (x) { c.avviso(x.message, true); }
  }));

  // indicatori: atteso e tolleranza vanno nelle impostazioni del locale, nota e mossa nel dossier
  document.querySelectorAll('.dz-ind').forEach(r => {
    r.querySelectorAll('[data-par]').forEach(el => el.addEventListener('change', async () => {
      const a = r.querySelector('[data-par=atteso]').value.trim(), t = r.querySelector('[data-par=toll]').value.trim();
      if ((a === '') !== (t === '')) return c.avviso('Scrivi atteso e tolleranza insieme (o svuota tutti e due)', true);
      const loc = c.locale, inviati = new Map([...r.querySelectorAll('[data-par]')].map(x => [x, x.value]));
      try {
        const imp = await c.api(`/api/rete/locali/${loc.id}/impostazioni`, { method: 'PATCH', body: JSON.stringify({ parametri: { [r.dataset.id]: a === '' ? null : { atteso: c.num(a), toll: c.num(t) } } }) });
        loc.impostazioni = { ...(loc.impostazioni || {}), ...imp };
        inviati.forEach((v, x) => { x.defaultValue = v; });       // salvato è quello partito, non quello scritto intanto
        c.avviso('Salvato: Monitoring usa il nuovo atteso');
      } catch (x) { c.avviso(x.message, true); }
    }));
    r.querySelectorAll('[data-ind]').forEach(el => el.addEventListener('change', () => {
      const nota = r.querySelector('[data-ind=nota]').value.trim(), mossa = r.querySelector('[data-ind=mossa]').value.trim();
      const inviati = new Map([...r.querySelectorAll('[data-ind]')].map(x => [x, x.value]));
      inCoda(r, c, async base => {
        await salvaDossier(c, { indicatori: { [r.dataset.id]: nota || mossa ? { nota, mossa } : null } }, base);
        inviati.forEach((v, x) => { x.defaultValue = v; });
      });
    }));
  });
}

async function prepara(c) {
  // se intanto si apre un altro locale, questo dossier non si mostra: i campi si salverebbero sull'altro
  const base = c.base();
  try {
    const d = await c.api(base + '/dossier');
    const loc = await c.api(base);
    if (c.base() !== base) return;
    dos = { ...d, note: loc.scheda?.dossier?.indicatori || {} };
  } catch (x) { if (c.base() === base) c.avviso(x.message, true); }
}

export default {
  id: 'dossier', titolo: 'Dossier', ico: 'folder_open',
  // la sottoscheda chiesta dal link (?sotto=) si usa alla prima apertura vera di un locale, non a un'uscita
  azzera(c) { dos = null; if (!c?.locale) return; sotto = DA_URL || 'contratto'; DA_URL = null; },
  prepara,
  html(c) {
    if (!dos) return '<div class="vuoto-grande">Caricamento…</div>';
    const schede = [['contratto', 'Anagrafica e contratto'], ['dotazione', 'Dotazione'], ['storia', 'Storia'], ['indicatori', 'Indicatori']];
    return `<div class="sez-testa"><div class="sotto-schede dz-sotto">${schede.map(([k, t]) => `<button type="button" data-s="${k}" aria-pressed="${sotto === k}">${t}</button>`).join('')}</div>
        <a class="pulsante piccolo" href="rete.html?locale=${c.locale.id}" target="_blank" rel="noopener"><span class="ico">visibility</span> Come lo vede Monitoring</a></div>`
      + (sotto === 'contratto' ? htmlContratto(c) : sotto === 'dotazione' ? htmlDotazione(c) : sotto === 'storia' ? htmlStoria(c) : htmlIndicatori(c));
  },
  lega,
};
