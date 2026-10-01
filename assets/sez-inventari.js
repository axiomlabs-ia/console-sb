/* Linguetta «Inventari» (passo 5): la conta della merce a fine giornata, gli scarti
   e la merce entrata senza fattura. Pensata per il telefono: il tag NFC sullo
   scaffale apre questa pagina già sull'articolo (…&vista=inventari&articolo=12). */

let scelto = null, evidenzia = null;

// si contano gli ingredienti del ricettario e quello che arriva dalle fatture: cambiando il ricettario cambia la lista
const daContare = c => (c.d.articoli || []).filter(a => a.da_contare !== false);

// la scorta minima: quanto serve per reggere il menù per N giorni, dal consumo medio delle vendite × ricette
// i pezzi si arrotondano per eccesso: 40,3 cornetti vuol dire 41
const scorta = a => a.scorta_minima == null ? null : a.unita === 'pz' ? Math.ceil(a.scorta_minima - 1e-9) : a.scorta_minima;
const sotto = (a, q) => scorta(a) != null && q != null && q < scorta(a);
const minimo = (c, a) => scorta(a) != null ? `min ${c.qta(scorta(a), a.unita === 'pz' ? 0 : scorta(a) < 0.1 ? 3 : 2)} ${a.unita}` : '';

function htmlScorta(c, articoli, inv) {
  const a0 = articoli.find(a => a.giorni_vendite) || {};
  if (!a0.giorni_vendite) return '<p class="aiuto-lista">La scorta minima arriva con le vendite e il ricettario: carica il report della cassa.</p>';
  const n = articoli.filter(a => sotto(a, inv.righe[a.id])).length;
  return `<div class="scorta-inv">
    <label class="mini">Scorta minima per <input type="number" min="1" max="30" step="1" id="giorni-scorta" value="${a0.giorni_scorta}" class="data-mini"> giorni di menù</label>
    <span class="tenue">calcolata sul consumo medio di ${a0.giorni_vendite} giorni di vendite, piatto per piatto con le ricette${n ? ` · <b class="sotto-n">${n} sotto la scorta</b>` : ''}</span>
  </div>`;
}

function htmlConta(c, inv) {
  const articoli = [...daContare(c)].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  const contati = Object.keys(inv.righe).length;
  return `<div class="conta-inv">
    <div class="sp-testa">
      <div><b>Inventario del ${c.data(inv.giorno)}</b><span class="tenue"> · ${contati} di ${articoli.length} articoli contati</span></div>
      <button type="button" class="pulsante ${inv.chiuso ? '' : 'pieno'} piccolo" id="chiudi-inv"><span class="ico">${inv.chiuso ? 'lock_open' : 'lock'}</span> ${inv.chiuso ? 'Riapri' : 'Chiudi l\'inventario'}</button>
    </div>
    ${inv.chiuso ? '<p class="aiuto-lista">Chiuso: entra nella diagnosi. Per correggere una quantità riaprilo.</p>' : '<p class="aiuto-lista">Scrivi quanto c\'è adesso, nell\'unità indicata. Si salva da solo. Lascia vuoto quello che non hai contato. La lista sono gli ingredienti del ricettario e gli articoli delle fatture: se cambi una ricetta, cambia anche qui.</p>'}
    ${htmlScorta(c, articoli, inv)}
    <div class="righe-inv">${articoli.map(a => `<label class="riga-inv ${evidenzia === a.id ? 'evidenzia' : ''} ${sotto(a, inv.righe[a.id]) ? 'sotto' : ''}" id="art-${a.id}">
      <span><button type="button" class="nome-inv" data-scheda="${a.id}" title="Ricette, consegne e prezzi">${c.esc(a.nome)}</button>${a.in_ricette ? `<i class="tenue"> · in ${a.in_ricette} ${a.in_ricette === 1 ? 'ricetta' : 'ricette'}</i>` : a.da_fattura ? '<i class="tenue"> · dalle fatture</i>' : ''}${a.scorta_minima != null ? `<b class="min-inv">${minimo(c, a)}</b>` : ''}</span>
      <span class="fattore"><input inputmode="decimal" data-art="${a.id}" value="${inv.righe[a.id] != null ? String(inv.righe[a.id]).replace('.', ',') : ''}" ${inv.chiuso ? 'disabled' : ''} placeholder="—"><i class="u">${a.unita}</i></span>
    </label>`).join('') || '<div class="vuoto-grande">Nessun articolo da contare: nascono dal ricettario e collegando le fatture.</div>'}</div>
  </div>`;
}

function htmlMovimenti(c) {
  const art = [...daContare(c)].sort((a, b) => a.nome.localeCompare(b.nome, 'it')), mov = (c.d.movimenti || []).slice(0, 12);
  return `<form class="movimento" id="movimento">
    <h3 class="cat">Scarti e merce senza fattura</h3>
    <div class="sp-campi">
      <label>Tipo<select name="tipo"><option value="scarto">Scarto (buttato)</option><option value="carico">Entrata senza fattura</option></select></label>
      <label>Articolo<select name="articolo">${art.map(a => `<option value="${a.id}" data-u="${a.unita}">${c.esc(a.nome)}</option>`).join('')}</select></label>
      <label>Quantità<span class="fattore"><input name="quantita" inputmode="decimal" placeholder="0"><i class="u">${art[0]?.unita || 'kg'}</i></span></label>
      <label>Giorno<input type="date" name="giorno" value="${c.oggi()}"></label>
      <label class="largo">Nota<input name="nota" maxlength="200" placeholder="Es. mozzarella scaduta, teglia bruciata"></label>
    </div>
    <div class="g-azioni"><span style="flex:1"></span><button type="submit" class="pulsante piccolo"><span class="ico">add</span> Registra</button></div>
    ${mov.length ? `<table class="tab-dati interna"><tbody>${mov.map(m => { const a = c.articolo(m.articolo_id); return `<tr>
      <td class="num">${c.data(m.giorno)}</td><td>${m.tipo === 'scarto' ? 'Scarto' : 'Entrata'}</td><td>${c.esc(a?.nome || '')}</td>
      <td class="dx num">${c.qta(m.quantita)} ${a?.unita || ''}</td><td class="tenue">${c.esc(m.nota || '')}</td>
      <td class="dx"><button type="button" class="togli-riga" data-mov="${m.id}" aria-label="Elimina"><span class="ico">delete</span></button></td></tr>`; }).join('')}</tbody></table>` : ''}
  </form>`;
}

// la scheda dell'ingrediente: si apre toccando il nome nell'inventario
async function apriScheda(c, aid) {
  let d;
  try { d = await c.api(`${c.base()}/articoli/${aid}/scheda`); } catch (x) { return c.avviso(x.message, true); }
  const a = d.articolo, u = a.unita, p = c.PICCOLA[u];
  const prezzo = a.prezzo != null ? `${c.euro(a.prezzo)} al ${u === 'pz' ? 'pezzo' : u} · dall'ultima fattura`
    : a.prezzo_stima != null ? `${c.euro(a.prezzo_stima)} al ${u === 'pz' ? 'pezzo' : u} · stimato (nessuna fattura collegata)` : 'senza prezzo';
  const q = (v, dec = 2) => `${c.qta(v, u === 'pz' ? 0 : v < 0.1 ? 3 : dec)} ${u}`;
  const uc = d.ultima_consegna;
  let dlg = document.getElementById('scheda-art');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'scheda-art'; dlg.className = 'scheda-art'; document.body.appendChild(dlg); }
  dlg.innerHTML = `<form method="dialog" class="sa-testa"><div><h3>${c.esc(a.nome)}</h3><span class="tenue">${prezzo}</span></div>
      <button class="togli-riga" aria-label="Chiudi"><span class="ico">close</span></button></form>
    ${d.consumo_giorno != null ? `<p class="sa-consumo">Se ne usano <b>${q(d.consumo_giorno)}</b> al giorno · scorta minima per ${d.giorni_scorta} giorni: <b>${q(u === 'pz' ? Math.ceil(d.scorta_minima - 1e-9) : d.scorta_minima)}</b>
      <span class="tenue">(media delle vendite dal ${c.data(d.vendite.dal)} al ${c.data(d.vendite.al)})</span></p>` : ''}
    <h4>In ${d.ricette.length} ${d.ricette.length === 1 ? 'ricetta' : 'ricette'}</h4>
    ${d.ricette.length ? `<table class="tab-dati interna"><tbody>${d.ricette.map(r => `<tr><td>${c.esc(r.nome)}${r.automatica ? '<i class="tenue"> · grammatura standard</i>' : ''}</td>
      <td class="dx num">${c.qta(c.aPiccola(r.per_porzione, u), 1)} ${p} a porzione</td></tr>`).join('')}</tbody></table>` : '<p class="tenue">In nessuna ricetta: arriva dalle fatture.</p>'}
    <h4>Ultima consegna</h4>
    ${uc ? `<p class="sa-ultima"><b>${c.data(uc.data)}</b> · ${c.esc(uc.fornitore || 'fornitore non indicato')} · ${uc.documento} n. ${c.esc(uc.numero || '')}<br>
      ${uc.quantita != null ? q(uc.quantita) : ''}${uc.prezzo_unitario != null ? ` a <b>${c.euro(uc.prezzo_unitario)}</b> al ${u === 'pz' ? 'pezzo' : u}` : ' · senza prezzo (bolla)'}
      ${uc.totale != null ? ` · ${c.euro(uc.totale)} in tutto` : ''}</p>`
      : '<p class="tenue">Nessuna consegna collegata: quando colleghi la fattura in Acquisti qui compaiono data, fornitore e prezzo veri.</p>'}
    ${d.consegne.length > 1 ? `<h4>Le consegne</h4><table class="tab-dati interna"><thead><tr><th>Data</th><th>Fornitore</th><th class="dx">Quantità</th><th class="dx">Prezzo</th></tr></thead><tbody>${d.consegne.map(x => `<tr>
      <td class="num">${c.data(x.data)}</td><td>${c.esc(x.fornitore || '')}${x.documento !== 'fattura' ? `<i class="tenue"> · ${x.documento}</i>` : ''}</td>
      <td class="dx num">${x.quantita != null ? q(x.quantita) : '—'}</td><td class="dx num">${x.prezzo_unitario != null ? c.euro(x.prezzo_unitario) : '—'}</td></tr>`).join('')}</tbody></table>` : ''}
    ${d.movimenti.length ? `<h4>Scarti e carichi</h4><table class="tab-dati interna"><tbody>${d.movimenti.map(m => `<tr>
      <td class="num">${c.data(m.data)}</td><td>${m.tipo === 'scarto' ? 'Scarto' : 'Entrata senza fattura'}</td><td class="dx num">${q(m.quantita)}</td><td class="tenue">${c.esc(m.nota || '')}</td></tr>`).join('')}</tbody></table>` : ''}`;
  dlg.showModal();
}

async function assicuraOggi(c) {
  const oggi = c.oggi();
  let inv = (c.d.inventari || []).find(i => i.giorno === oggi);
  if (!inv) {
    inv = await c.api(c.base() + '/inventari', { method: 'POST', body: JSON.stringify({ giorno: oggi }) });
    c.d.inventari = [inv, ...(c.d.inventari || [])];
  }
  return inv;
}

export default {
  id: 'inventari', titolo: 'Inventari', ico: 'inventory',
  azzera() { scelto = null; evidenzia = null; },
  async prepara(c) {
    // arrivo dal tag NFC: l'inventario di oggi, sull'articolo del tag
    const dalTag = +c.param.get('articolo');
    if (dalTag && evidenzia == null) {
      evidenzia = dalTag;
      try { scelto = (await assicuraOggi(c)).id; } catch (x) { c.avviso(x.message, true); }
    }
    if (!scelto || !(c.d.inventari || []).some(i => i.id === scelto)) {
      const inv = c.d.inventari || [];
      scelto = (inv.find(i => !i.chiuso) || inv[0])?.id ?? null;
    }
  },
  conta: c => (c.d.inventari || []).filter(i => !i.chiuso).length,
  html(c) {
    const inv = c.d.inventari || [], cur = inv.find(i => i.id === scelto);
    return `<div class="sez-testa">
        <div class="sotto-schede">${inv.slice(0, 8).map(i => `<button type="button" data-inv="${i.id}" aria-pressed="${i.id === scelto}">
          <span class="ico" style="font-size:15px">${i.chiuso ? 'lock' : 'edit'}</span> ${c.data(i.giorno)}</button>`).join('')}</div>
        <div class="g-azioni"><input type="date" id="giorno-inv" value="${c.oggi()}" class="data-mini">
          <button type="button" class="pulsante pieno piccolo" id="nuovo-inv"><span class="ico">add</span> Nuovo inventario</button></div>
      </div>
      ${cur ? htmlConta(c, cur) : '<div class="vuoto-grande">Nessun inventario. La diagnosi ne vuole due: uno all\'inizio e uno alla fine del periodo, di solito a una settimana o un mese di distanza.</div>'}
      ${htmlMovimenti(c)}`;
  },
  lega(c) {
    document.querySelectorAll('[data-inv]').forEach(b => b.addEventListener('click', () => { scelto = +b.dataset.inv; evidenzia = null; c.ridisegna(); }));
    document.getElementById('nuovo-inv').addEventListener('click', async () => {
      try {
        const i = await c.api(c.base() + '/inventari', { method: 'POST', body: JSON.stringify({ giorno: document.getElementById('giorno-inv').value }) });
        scelto = i.id; await c.ricarica();
      } catch (x) { c.avviso(x.message, true); }
    });
    const cur = (c.d.inventari || []).find(i => i.id === scelto);
    document.querySelectorAll('[data-scheda]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); apriScheda(c, +b.dataset.scheda); }));
    document.getElementById('giorni-scorta')?.addEventListener('change', async e => {
      const g = c.num(e.target.value);
      if (!(g >= 1 && g <= 30)) return c.avviso('I giorni di scorta vanno da 1 a 30', true);
      try { await c.api(c.base() + '/impostazioni', { method: 'PATCH', body: JSON.stringify({ giorni_scorta: g }) }); await c.ricarica(); }
      catch (x) { c.avviso(x.message, true); }
    });
    document.getElementById('chiudi-inv')?.addEventListener('click', async () => {
      try { await c.api(`${c.base()}/inventari/${cur.id}`, { method: 'PATCH', body: JSON.stringify({ chiuso: !cur.chiuso }) }); await c.ricarica(); }
      catch (x) { c.avviso(x.message, true); }
    });
    document.querySelectorAll('input[data-art]').forEach(inp => inp.addEventListener('change', async () => {
      const v = inp.value.trim(), q = v === '' ? null : c.num(v);
      if (v !== '' && (q == null || q < 0)) { inp.classList.add('errato'); return c.avviso('Quantità non valida', true); }
      inp.classList.remove('errato');
      try {
        const r = await c.api(`${c.base()}/inventari/${cur.id}`, { method: 'PATCH', body: JSON.stringify({ righe: { [inp.dataset.art]: q } }) });
        Object.assign(cur, r); inp.classList.add('salvato'); setTimeout(() => inp.classList.remove('salvato'), 900);
        const a = c.articolo(+inp.dataset.art);
        if (a) inp.closest('.riga-inv')?.classList.toggle('sotto', sotto(a, q));
        const n = daContare(c).filter(x => sotto(x, r.righe[x.id])).length, sn = document.querySelector('.scorta-inv .tenue');
        if (sn) sn.innerHTML = sn.innerHTML.replace(/ · <b class="sotto-n">.*<\/b>$/, '') + (n ? ` · <b class="sotto-n">${n} sotto la scorta</b>` : '');
        document.querySelector('.conta-inv .tenue').textContent = ` · ${Object.keys(r.righe).length} di ${daContare(c).length} articoli contati`;
      } catch (x) { c.avviso(x.message, true); }
    }));
    if (evidenzia) {
      const el = document.getElementById('art-' + evidenzia);
      el?.scrollIntoView({ block: 'center' }); el?.querySelector('input')?.focus({ preventScroll: true });
    }
    const m = document.getElementById('movimento');
    m.articolo.addEventListener('change', () => { m.querySelector('.u').textContent = m.articolo.selectedOptions[0]?.dataset.u || ''; });
    m.addEventListener('submit', async e => {
      e.preventDefault();
      const q = c.num(m.quantita.value);
      if (!(q > 0)) return c.avviso('Scrivi la quantità', true);
      try {
        await c.api(c.base() + '/movimenti', { method: 'POST', body: JSON.stringify({ tipo: m.tipo.value, articolo_id: +m.articolo.value, quantita: q, giorno: m.giorno.value, nota: m.nota.value }) });
        c.avviso('Registrato'); await c.ricarica();
      } catch (x) { c.avviso(x.message, true); }
    });
    document.querySelectorAll('[data-mov]').forEach(b => b.addEventListener('click', async () => {
      try { await c.api(`${c.base()}/movimenti/${b.dataset.mov}`, { method: 'DELETE' }); await c.ricarica(); } catch (x) { c.avviso(x.message, true); }
    }));
  },
};
