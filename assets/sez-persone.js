/* Linguetta «Persone e turni» (fase 2): chi lavora nel locale, i PIN per timbrare,
   l'accesso del titolare, il link del tag del locale, i turni e le chiusure.
   Qui il consulente vede anche «Il quadro», lo stesso che legge il titolare. */

let dati = null, modifica = null, tuttiTurni = false;    // modifica: persona in modifica (o {} per una nuova)
// il ruolo è l'accesso: chi legge il quadro e chi timbra soltanto. Cosa fa la persona lo dice la mansione.
const RUOLI = { staff: 'Staff', responsabile: 'Responsabile', titolare: 'Titolare' };
const ACCESSI = { staff: 'Staff · timbra soltanto', responsabile: 'Responsabile · timbra e legge il quadro', titolare: 'Titolare · legge il quadro' };
let VOCI_SQ = { mansioni: {}, reparti: {}, contratti: [] };
const VOCI = { celle: 'celle', gas: 'gas', luci: 'luci', cassa: 'cassa', porte: 'porte' };

function oraBreve(iso) { return iso ? iso.slice(11, 16) : '—'; }
function giornoBreve(c, iso) { return iso ? c.data(iso.slice(0, 10)) : '—'; }

function htmlQuadro(c, q) {
  if (!q) return '';
  const fc = q.food_cost;
  return `<div class="quadro-anteprima">
    <p class="aiuto-lista">Il quadro che legge il titolare, settimana dal ${c.data(q.dal)} al ${c.data(q.al)}:</p>
    <p class="q-frase">${c.esc(q.frase)}</p>
    <div class="passi-locale">
      <div><b class="num">${c.euro(q.incasso.euro, 0)}</b><i>incasso${q.incasso.variazione != null ? ` · ${q.incasso.variazione > 0 ? '+' : ''}${c.pct(q.incasso.variazione)}` : ''}</i></div>
      <div><b class="num">${c.pct(q.personale.percento)}</b><i>personale · ${c.qta(q.personale.ore, 1)} ore${q.personale.senza_costo_orario ? ` · ${q.personale.senza_costo_orario} senza costo orario` : ''}</i></div>
      <div><b class="num">${fc ? c.pct(fc.vero) : '—'}</b><i>food cost${fc ? ' · obiettivo ' + c.pct(fc.obiettivo) : ''}</i></div>
      <div><b class="num">${q.chiusure.segnate}/${q.chiusure.giorni}</b><i>chiusure segnate</i></div>
    </div></div>`;
}

/* ─── il turno previsto: la settimana tipo, due fasce al giorno (turni spezzati) ───
   Una fascia che finisce prima di cominciare passa la mezzanotte (19:00-01:00 = 6 ore). */
const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const minuti = h => { const m = /^(\d{1,2}):(\d{2})$/.exec(h || ''); return m ? +m[1] * 60 + +m[2] : null; };
const oreFascia = f => { const d = minuti(f.da), a = minuti(f.a); return d == null || a == null || d === a ? 0 : (((a - d) % 1440) + 1440) % 1440 / 60; };
const oreSettimana = o => (o || []).reduce((s, f) => s + oreFascia(f), 0);
// ore nel mese in corso: ogni giorno del mese col suo giorno della settimana
function oreMese(o) {
  const oggi = new Date(), a = oggi.getFullYear(), m = oggi.getMonth(), n = new Date(a, m + 1, 0).getDate();
  let tot = 0;
  for (let g = 1; g <= n; g++) { const wd = (new Date(a, m, g).getDay() + 6) % 7; tot += (o || []).filter(f => f.g === wd).reduce((s, f) => s + oreFascia(f), 0); }
  return tot;
}
const MESE = () => new Date().toLocaleDateString('it-IT', { month: 'long' });

function htmlOrario(c, o) {
  const del = g => (o || []).filter(f => f.g === g);
  return `<div class="orario-sett" id="orario">
    <div class="os-testa"><b>Turno previsto</b><span>La settimana tipo: lascia vuoto il giorno di riposo. La seconda fascia serve ai turni spezzati.</span></div>
    ${GIORNI.map((nome, g) => { const [f1, f2] = del(g); return `<div class="os-giorno" data-g="${g}">
      <span class="os-nome">${nome}</span>
      <span class="os-fascia"><input type="time" data-f="0" data-k="da" value="${f1?.da || ''}" aria-label="${nome}, inizio"><i>–</i><input type="time" data-f="0" data-k="a" value="${f1?.a || ''}" aria-label="${nome}, fine"></span>
      <span class="os-fascia"><input type="time" data-f="1" data-k="da" value="${f2?.da || ''}" aria-label="${nome}, inizio seconda fascia"><i>–</i><input type="time" data-f="1" data-k="a" value="${f2?.a || ''}" aria-label="${nome}, fine seconda fascia"></span>
      <span class="os-ore num" data-ore></span></div>`; }).join('')}
    <div class="os-totale" id="os-totale"></div>
  </div>`;
}
function leggiOrario() {
  const out = [];
  document.querySelectorAll('#orario .os-giorno').forEach(r => [0, 1].forEach(i => {
    const da = r.querySelector(`[data-f="${i}"][data-k="da"]`).value, a = r.querySelector(`[data-f="${i}"][data-k="a"]`).value;
    if (da && a) out.push({ g: +r.dataset.g, da, a });
  }));
  return out;
}
function aggiornaTotale(c, f) {
  const o = leggiOrario(), costo = c.num(f.costo_orario.value);
  document.querySelectorAll('#orario .os-giorno').forEach(r => {
    const h = o.filter(x => x.g === +r.dataset.g).reduce((s, x) => s + oreFascia(x), 0);
    r.querySelector('[data-ore]').textContent = h ? c.qta(h, 2) + ' h' : 'riposo';
  });
  const hs = oreSettimana(o), hm = oreMese(o), hc = c.num(f.ore_contratto?.value);
  document.getElementById('os-totale').innerHTML = hs
    ? `<span><b class="num">${c.qta(hs, 1)} ore</b> a settimana</span><span><b class="num">${costo != null ? c.euro(hs * costo, 0) : '—'}</b> a settimana</span><span><b class="num">${costo != null ? c.euro(hm * costo, 0) : '—'}</b> a ${MESE()} (${c.qta(hm, 0)} ore)</span>${costo == null ? '<span class="tenue">scrivi il costo orario per vedere quanto costa</span>' : ''}
      ${hc && hs > hc + 0.5 ? `<span class="os-oltre"><span class="ico">warning</span>${c.qta(hs - hc, 1)} ore oltre le ${c.qta(hc, 0)} da contratto: straordinario o supplementare</span>` : ''}`
    : '<span class="tenue">Nessun turno previsto: il costo si vedrà solo dalle timbrature.</span>';
}

// la mansione: le voci della ristorazione divise per reparto, più «Altro» da scrivere
function htmlMansione(c, p) {
  const per = {};
  Object.entries(VOCI_SQ.mansioni).forEach(([m, r]) => (per[r] ||= []).push(m));
  const nota = p.mansione && !(p.mansione in VOCI_SQ.mansioni);
  return `<label>Mansione<select name="mansione"><option value="">—</option>
      ${Object.entries(per).map(([r, ms]) => `<optgroup label="${c.esc(VOCI_SQ.reparti[r] || r)}">${ms.map(m => `<option ${p.mansione === m ? 'selected' : ''}>${c.esc(m)}</option>`).join('')}</optgroup>`).join('')}
      <option value="__altro" ${nota ? 'selected' : ''}>Altro…</option></select>
      <input name="mansione_altro" class="${nota ? '' : 'nascosto'}" value="${nota ? c.esc(p.mansione) : ''}" maxlength="40" placeholder="Scrivi la mansione"></label>`;
}

function htmlModifica(c) {
  const p = modifica, nuova = !p.id, conAccesso = p.ruolo === 'titolare' || p.ruolo === 'responsabile';
  return `<form class="scheda-piatto" id="persona">
    <div class="sp-testa"><b>${nuova ? 'Nuova persona' : c.esc(p.nome)}</b>
      <button type="button" class="pulsante piccolo" id="annulla-p"><span class="ico">close</span> Annulla</button></div>
    <div class="sp-campi">
      <label>Nome<input name="nome" value="${c.esc(p.nome || '')}" maxlength="80" required placeholder="Come lo chiamano nel locale"></label>
      ${htmlMansione(c, p)}
      <label>Reparto<select name="reparto"><option value="">—</option>${Object.entries(VOCI_SQ.reparti).map(([k, t]) => `<option value="${k}" ${p.reparto === k ? 'selected' : ''}>${c.esc(t)}</option>`).join('')}</select></label>
      <label>Contratto<select name="contratto"><option value="">—</option>${VOCI_SQ.contratti.map(t => `<option ${p.contratto === t ? 'selected' : ''}>${c.esc(t)}</option>`).join('')}</select></label>
      <label>Ore a settimana da contratto<input name="ore_contratto" inputmode="decimal" value="${p.ore_contratto ?? ''}" placeholder="es. 40, oppure 24 per un part-time"></label>
      <label>Costo orario (€)<input name="costo_orario" inputmode="decimal" value="${p.costo_orario ?? ''}" placeholder="Lordo azienda, es. 14"></label>
      <label>Telefono<input name="telefono" value="${c.esc(p.telefono || '')}" maxlength="30" inputmode="tel"></label>
      <label>Assunto il<input name="assunto_il" type="date" value="${p.assunto_il || ''}"></label>
      <label>Accesso<select name="ruolo">${Object.entries(ACCESSI).map(([k, t]) => `<option value="${k}" ${(p.ruolo || 'staff') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>PIN per timbrare<input name="pin" inputmode="numeric" maxlength="6" placeholder="${p.ha_pin ? 'già impostato: scrivi per cambiarlo' : '4-6 cifre'}" autocomplete="off"></label>
      <label class="${conAccesso ? '' : 'nascosto'}" data-accesso>Email per il quadro<input name="email" type="email" value="${c.esc(p.email || '')}" placeholder="titolare@locale.it"></label>
      <label class="${conAccesso ? '' : 'nascosto'}" data-accesso>Password del quadro<input name="password" type="text" minlength="8" placeholder="${p.ha_password ? 'già impostata: scrivi per cambiarla' : 'almeno 8 caratteri'}" autocomplete="off"></label>
      <label class="largo-sp">Note<input name="note" value="${c.esc(p.note || '')}" maxlength="300" placeholder="Es. fa anche le pizze fritte, disponibile il lunedì"></label>
    </div>
    <p class="aiuto-lista">Il PIN serve solo a timbrare dal tag del locale. Il titolare di solito non timbra: gli basta email e password per leggere il quadro. Consegna PIN e password a voce o su carta: qui non si rivedono.</p>
    ${htmlOrario(c, p.orario)}
    <div class="g-azioni"><span style="flex:1"></span>
      ${!nuova ? '<button type="button" class="pulsante piccolo" id="disattiva"><span class="ico">person_off</span> Togli</button>' : ''}
      <button type="submit" class="pulsante pieno"><span class="ico">save</span> Salva</button></div>
  </form>`;
}

function htmlPersone(c) {
  const ps = dati.persone || [];
  return `<div class="sez-testa"><h3 class="cat" style="margin:0">Chi lavora nel locale</h3>
      <button type="button" class="pulsante pieno piccolo" id="nuova-p"><span class="ico">person_add</span> Aggiungi</button></div>
    ${modifica ? htmlModifica(c) : ''}
    ${ps.length ? (() => {
      const attive = ps.filter(p => p.attiva), tot = k => attive.reduce((s, p) => s + (p.previsto?.[k] || 0), 0);
      const conTurno = attive.filter(p => p.previsto?.ore_settimana);
      return `<div class="tabella-scroll"><table class="tab-dati">
      <thead><tr><th>Nome</th><th>Mansione</th><th>Contratto</th><th class="dx">Costo orario</th><th class="dx">Turno previsto</th><th class="dx">Costo previsto</th><th>Timbra</th><th>Quadro</th><th></th></tr></thead>
      <tbody>${ps.map(p => { const pv = p.previsto || {}, oltre = p.ore_contratto && pv.ore_settimana > p.ore_contratto + 0.5; return `<tr class="${p.attiva ? '' : 'spenta'}"><td><b>${c.esc(p.nome)}</b>${p.ruolo !== 'staff' ? ` <span class="targa spenta">${RUOLI[p.ruolo]}</span>` : ''}${p.attiva ? '' : ' <span class="targa spenta">non più attiva</span>'}</td>
        <td>${p.mansione ? c.esc(p.mansione) + (p.reparto ? `<span class="tenue"> · ${c.esc(VOCI_SQ.reparti[p.reparto] || p.reparto)}</span>` : '') : '<span class="tenue">da indicare</span>'}</td>
        <td>${p.contratto ? c.esc(p.contratto) + (p.ore_contratto ? `<span class="tenue"> · ${c.qta(p.ore_contratto, 0)} h</span>` : '') : '<span class="tenue">—</span>'}</td>
        <td class="dx num">${p.costo_orario != null ? c.euro(p.costo_orario, 2) : '<span class="tenue">manca</span>'}</td>
        <td class="dx num">${pv.ore_settimana ? c.qta(pv.ore_settimana, 1) + ' h/sett.' + (oltre ? ' <span class="targa attesa" title="Più ore di quelle da contratto">oltre contratto</span>' : '') : '<span class="tenue">da impostare</span>'}</td>
        <td class="dx num">${pv.costo_settimana != null && pv.ore_settimana ? `${c.euro(pv.costo_settimana, 0)} <span class="tenue">· ${c.euro(pv.costo_mese, 0)} a ${MESE()}</span>` : '<span class="tenue">—</span>'}</td>
        <td>${p.ha_pin ? 'con PIN' : '<span class="tenue">senza PIN</span>'}</td><td>${p.email && p.ha_password ? c.esc(p.email) : '<span class="tenue">—</span>'}</td>
        <td class="dx"><button type="button" class="togli-riga" data-mod="${p.id}" aria-label="Modifica"><span class="ico">edit</span></button></td></tr>`; }).join('')}
        ${conTurno.length ? `<tr class="totale"><td><b>Squadra</b></td><td></td><td></td><td></td><td class="dx num"><b>${c.qta(tot('ore_settimana'), 1)} h/sett.</b></td>
          <td class="dx num"><b>${c.euro(tot('costo_settimana'), 0)}</b> <span class="tenue">· <b>${c.euro(tot('costo_mese'), 0)}</b> a ${MESE()}</span></td><td colspan="3"></td></tr>` : ''}</tbody></table></div>
      ${(() => { // il costo previsto diviso per reparto
        const rep = {};
        conTurno.forEach(p => { const k = p.reparto || ''; rep[k] = (rep[k] || 0) + (p.previsto.costo_settimana || 0); });
        const v = Object.entries(rep).filter(([, e]) => e > 0).sort((a, b) => b[1] - a[1]);
        return v.length > 1 || (v.length && v[0][0]) ? `<p class="aiuto-lista">Previsto a settimana per reparto: ${v.map(([k, e]) => `<b>${c.esc(VOCI_SQ.reparti[k] || 'senza reparto')}</b> ${c.euro(e, 0)}`).join(' · ')}</p>` : '';
      })()}
      ${conTurno.length < attive.filter(p => p.ruolo !== 'titolare').length ? `<p class="aiuto-lista">${attive.filter(p => p.ruolo !== 'titolare' && !p.previsto?.ore_settimana).map(p => c.esc(p.nome)).join(', ')}: turno previsto da impostare (matita). Senza turno il costo si vede solo dopo, dalle timbrature.</p>` : ''}`;
    })()
    : '<div class="vuoto-grande">Aggiungi chi lavora nel locale: nome, mansione, contratto, costo orario, turno previsto e un PIN per timbrare.</div>'}`;
}

function htmlRiassunto(c, t) {
  // ultimi 7 giorni per persona: ore e costo, il numero che poi va nel quadro
  const da = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), per = {};
  const costi = Object.fromEntries((dati.persone || []).map(p => [p.id, p.costo_orario]));
  t.filter(x => x.ore != null && x.inizio.slice(0, 10) >= da).forEach(x => {
    const r = per[x.persona_id] ||= { nome: x.nome, turni: 0, ore: 0 };
    r.turni++; r.ore += x.ore;
  });
  const righe = Object.entries(per).sort((a, b) => b[1].ore - a[1].ore);
  if (!righe.length) return '';
  const tot = righe.reduce((s, [id, r]) => s + r.ore * (costi[id] || 0), 0);
  return `<div class="tabella-scroll"><table class="tab-dati">
    <thead><tr><th>Ultimi 7 giorni</th><th class="dx">Turni</th><th class="dx">Ore</th><th class="dx">Costo</th></tr></thead>
    <tbody>${righe.map(([id, r]) => `<tr><td><b>${c.esc(r.nome)}</b></td><td class="dx num">${r.turni}</td><td class="dx num">${c.qta(r.ore, 1)}</td>
      <td class="dx num">${costi[id] ? c.euro(r.ore * costi[id], 0) : '<span class="tenue">manca il costo orario</span>'}</td></tr>`).join('')}
      <tr class="totale"><td><b>Totale</b></td><td></td><td class="dx num"><b>${c.qta(righe.reduce((s, [, r]) => s + r.ore, 0), 1)}</b></td><td class="dx num"><b>${c.euro(tot, 0)}</b></td></tr></tbody></table></div>`;
}

function htmlTurni(c) {
  const tutti = dati.turni?.turni || [], ch = dati.turni?.chiusure || [];
  const dimenticati = tutti.filter(x => x.dimenticato);
  const t = tuttiTurni ? tutti : dimenticati;
  return `<h3 class="cat">Turni</h3>
    ${htmlRiassunto(c, tutti)}
    ${dimenticati.length ? `<p class="aiuto-lista"><b>${dimenticati.length} ${dimenticati.length === 1 ? 'turno ha' : 'turni hanno'} la fine dimenticata</b>: scrivi l'ora in cui la persona è uscita e premi Chiudi.</p>` : ''}
    ${tutti.length ? `<button type="button" class="pulsante piccolo" id="tutti-turni"><span class="ico">${tuttiTurni ? 'expand_less' : 'list'}</span> ${tuttiTurni ? 'Nascondi il dettaglio' : `Tutti i turni degli ultimi 14 giorni (${tutti.length})`}</button>` : ''}
    ${t.length ? `<div class="tabella-scroll"><table class="tab-dati">
      <thead><tr><th>Giorno</th><th>Chi</th><th>Inizio</th><th>Fine</th><th class="dx">Ore</th></tr></thead>
      <tbody>${t.map(x => `<tr class="${x.dimenticato ? 'da-fare' : ''}"><td class="num">${giornoBreve(c, x.inizio)}</td><td>${c.esc(x.nome)}</td>
        <td class="num">${oraBreve(x.inizio)}</td>
        <td class="num">${x.dimenticato ? `<span class="fattore"><input type="datetime-local" data-turno="${x.id}" value="${x.inizio.slice(0, 16)}" class="data-mini"><button type="button" class="pulsante piccolo" data-chiudi-turno="${x.id}">Chiudi</button></span>`
          : x.aperto ? '<span class="targa buono">in servizio</span>' : oraBreve(x.fine)}</td>
        <td class="dx num">${x.ore != null ? c.qta(x.ore, 2) : '—'}${x.corretto ? ' <span class="tenue">(corretto)</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
`
    : tutti.length ? '' : '<div class="vuoto-grande">Ancora nessun turno timbrato.</div>'}
    <h3 class="cat">Chiusure</h3>
    ${ch.length ? `<table class="tab-dati interna"><tbody>${ch.map(x => {
      const manca = Object.keys(VOCI).filter(k => !x.voci?.[k]);
      return `<tr><td class="num">${c.data(x.giorno)}</td><td>${c.esc(x.nome || '')} · ${oraBreve(x.ora)}</td>
        <td>${manca.length ? '<span class="targa attesa">da ricontrollare: ' + manca.map(k => VOCI[k]).join(', ') + '</span>' : '<span class="targa buono">tutto a posto</span>'}</td>
        <td class="tenue">${c.esc(x.voci?.nota || '')}</td></tr>`; }).join('')}</tbody></table>` : '<p class="aiuto-lista">Ancora nessuna chiusura segnata.</p>'}`;
}

export default {
  id: 'persone', titolo: 'Persone e turni', ico: 'badge',
  azzera() { dati = null; modifica = null; },
  async prepara(c) {
    try {
      const b = c.base();
      const [persone, app, turni, quadro, voci] = await Promise.all([c.api(b + '/persone'), c.api(b + '/app'), c.api(b + '/turni'), c.api(b + '/quadro'),
        VOCI_SQ.contratti.length ? Promise.resolve(VOCI_SQ) : c.api('/api/rete/squadra/voci')]);
      dati = { persone, app, turni, quadro };
      VOCI_SQ = voci;
    } catch (x) { c.avviso(x.message, true); dati = dati || { persone: [] }; }
  },
  html(c) {
    if (!dati) return '<div class="vuoto-grande">Caricamento…</div>';
    const a = dati.app;
    return `${a ? `<div class="cassa-box collegata"><div><b>App del locale</b><span>Il link da scrivere sul tag NFC del locale, sulla cassa o in un punto ben in vista: lo staff lo tocca col telefono, sceglie il nome e timbra.</span></div>
        <div class="g-azioni"><code class="link-tag">${c.esc(a.tag)}</code>
          <button type="button" class="pulsante piccolo" data-copia="${c.esc(a.tag)}"><span class="ico">content_copy</span> Copia</button>
          <a class="pulsante piccolo" target="_blank" rel="noopener" href="placca.html?nome=${encodeURIComponent(c.locale.nome)}&link=${encodeURIComponent(a.tag)}"><span class="ico">print</span> Placca da stampare</a>
          <button type="button" class="pulsante piccolo" id="nuovo-codice" title="Il vecchio tag smette di funzionare"><span class="ico">autorenew</span> Nuovo codice</button></div>
        <span>Il titolare legge il quadro su <b>${c.esc(a.quadro.replace('https://', ''))}</b> con la sua email e password.</span></div>` : ''}
      ${htmlQuadro(c, dati.quadro)}
      ${htmlPersone(c)}
      ${htmlTurni(c)}`;
  },
  lega(c) {
    const ricarica = async () => { await this.prepara(c); c.ridisegna(); };
    document.querySelectorAll('[data-copia]').forEach(b => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.dataset.copia); c.avviso('Link copiato: scrivilo sul tag con un\'app come NFC Tools'); }
      catch (e) { prompt('Link del tag del locale', b.dataset.copia); }
    }));
    document.getElementById('nuovo-codice')?.addEventListener('click', async () => {
      if (!confirm('Nuovo codice: il tag attuale smette di funzionare e va riscritto. Procedere?')) return;
      try { await c.api(c.base() + '/app/nuovo-codice', { method: 'POST' }); await ricarica(); } catch (x) { c.avviso(x.message, true); }
    });
    document.getElementById('nuova-p').addEventListener('click', () => { modifica = { ruolo: 'staff' }; c.ridisegna(); });
    document.querySelectorAll('[data-mod]').forEach(b => b.addEventListener('click', () => {
      modifica = { ...dati.persone.find(p => p.id === +b.dataset.mod) }; c.ridisegna();
    }));
    const f = document.getElementById('persona');
    if (f) {
      f.ruolo.addEventListener('change', () => {
        const si = f.ruolo.value !== 'staff';
        f.querySelectorAll('[data-accesso]').forEach(el => el.classList.toggle('nascosto', !si));
      });
      document.getElementById('annulla-p').addEventListener('click', () => { modifica = null; c.ridisegna(); });
      document.getElementById('disattiva')?.addEventListener('click', async () => {
        if (!confirm(`Togliere ${modifica.nome}? Se ha già dei turni resta nello storico come non più attiva.`)) return;
        try { await c.api(`${c.base()}/persone/${modifica.id}`, { method: 'DELETE' }); modifica = null; await ricarica(); } catch (x) { c.avviso(x.message, true); }
      });
      f.querySelectorAll('#orario input').forEach(i => i.addEventListener('input', () => aggiornaTotale(c, f)));
      f.costo_orario.addEventListener('input', () => aggiornaTotale(c, f));
      f.ore_contratto.addEventListener('input', () => aggiornaTotale(c, f));
      // la mansione porta il suo reparto (si può sempre cambiare); «Altro» apre la casella da scrivere
      f.mansione.addEventListener('change', () => {
        const altro = f.mansione.value === '__altro';
        f.mansione_altro.classList.toggle('nascosto', !altro);
        if (altro) f.mansione_altro.focus();
        const r = VOCI_SQ.mansioni[f.mansione.value];
        if (r) f.reparto.value = r;
      });
      aggiornaTotale(c, f);
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const mansione = f.mansione.value === '__altro' ? f.mansione_altro.value.trim() : f.mansione.value;
        const corpo = { nome: f.nome.value.trim(), ruolo: f.ruolo.value, costo_orario: f.costo_orario.value.trim().replace(',', '.'), orario: leggiOrario(),
                        mansione, reparto: f.reparto.value, contratto: f.contratto.value, ore_contratto: f.ore_contratto.value.trim().replace(',', '.'),
                        telefono: f.telefono.value.trim(), assunto_il: f.assunto_il.value, note: f.note.value.trim() };
        const mezze = [...document.querySelectorAll('#orario .os-fascia')].filter(s => { const [a, b] = s.querySelectorAll('input'); return !!a.value !== !!b.value; });
        if (mezze.length) { [...mezze[0].querySelectorAll('input')].find(i => !i.value)?.focus(); return c.avviso('Una fascia ha solo l\'inizio o solo la fine: completala o svuotala', true); }
        if (f.pin.value.trim()) corpo.pin = f.pin.value.trim();
        if (f.ruolo.value !== 'staff') { corpo.email = f.email.value.trim(); if (f.password.value) corpo.password = f.password.value; }
        try {
          await c.api(modifica.id ? `${c.base()}/persone/${modifica.id}` : `${c.base()}/persone`, { method: modifica.id ? 'PATCH' : 'POST', body: JSON.stringify(corpo) });
          c.avviso(`${corpo.nome} salvato`); modifica = null; await ricarica();
        } catch (x) { c.avviso(x.message, true); }
      });
    }
    document.getElementById('tutti-turni')?.addEventListener('click', () => { tuttiTurni = !tuttiTurni; c.ridisegna(); });
    document.querySelectorAll('[data-chiudi-turno]').forEach(b => b.addEventListener('click', async () => {
      const v = document.querySelector(`[data-turno="${b.dataset.chiudiTurno}"]`).value;
      try { await c.api(`${c.base()}/turni/${b.dataset.chiudiTurno}`, { method: 'PATCH', body: JSON.stringify({ fine: v }) }); c.avviso('Turno chiuso'); await ricarica(); }
      catch (x) { c.avviso(x.message, true); }
    }));
  },
};
