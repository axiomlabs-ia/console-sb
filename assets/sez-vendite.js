/* Linguetta «Vendite» (passo 4): il report della cassa, qualunque marca.
   Si carica il file, si dice una volta quale colonna è cosa, poi ogni voce della
   cassa si abbina a un piatto del ricettario (o si lascia fuori: coperto, bibite).
   Un report senza la colonna della data (il report prodotti di SumUp) copre un periodo:
   dal… al… si legge dal nome del file e il report resta un blocco, che si può togliere. */

let anteprima = null;       // {file, base, intestazioni, righe, totale_righe, proposta, periodo}
const CAMPI = [['voce', 'Piatto', true], ['quantita', 'Quantità venduta', true], ['incasso', 'Incasso IVA compresa', false], ['data', 'Data', false],
  ['netto', 'Incasso senza IVA', false], ['iva', 'IVA', false], ['sconti', 'Sconti', false], ['costo', 'Prezzo d\'acquisto', false], ['margine', 'Margine', false]];

function htmlAnteprima(c) {
  const a = anteprima, p = a.proposta || {};
  const opz = campo => `<option value="">—</option>` + a.intestazioni.map((h, i) => `<option value="${i}" ${p[campo] === i ? 'selected' : ''}>${c.esc(h || 'colonna ' + (i + 1))}</option>`).join('');
  const usate = Object.fromEntries(Object.entries(p).map(([k, v]) => [v, k]));
  return `<form class="mappa" id="mappa">
    <div class="sp-testa"><div><b>${c.esc(a.file.name)}</b><span class="tenue"> · ${a.totale_righe} righe</span></div>
      <button type="button" class="pulsante piccolo" id="annulla"><span class="ico">close</span> Annulla</button></div>
    <p class="aiuto-lista">Dimmi quale colonna è cosa. Lo chiedo solo la prima volta: il prossimo report della stessa cassa si abbina da solo.</p>
    <div class="sp-campi">${CAMPI.map(([k, t, obbl]) => `<label>${t}${obbl ? ' *' : ''}<select name="${k}">${opz(k)}</select></label>`).join('')}
      <label class="periodo" ${p.data != null ? 'hidden' : ''}>Dal<input type="date" name="dal" value="${a.periodo?.dal || c.oggi()}"></label>
      <label class="periodo" ${p.data != null ? 'hidden' : ''}>Al<input type="date" name="al" value="${a.periodo?.al || c.oggi()}"></label></div>
    ${p.data == null ? `<p class="aiuto-lista">${a.periodo ? `Il report non ha la data di ogni vendita: copre il periodo scritto nel nome del file. Resta un blocco unico e conta solo nei periodi che copre per intero: per avere le settimane, scaricalo settimana per settimana; per il food cost, da un inventario all'altro.` : 'Il report non ha la colonna della data: scrivi il giorno (dal e al uguali) o il periodo che copre.'}</p>` : ''}
    <div class="tabella-scroll"><table class="tab-dati"><thead><tr>${a.intestazioni.map((h, i) => `<th class="${usate[i] ? 'scelta' : ''}">${c.esc(h)}${usate[i] ? `<i>${CAMPI.find(x => x[0] === usate[i])[1]}</i>` : ''}</th>`).join('')}</tr></thead>
      <tbody>${a.righe.map(r => `<tr>${r.map(v => `<td>${c.esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="g-azioni"><span style="flex:1"></span><button type="submit" class="pulsante pieno"><span class="ico">download_done</span> Importa le vendite</button></div>
  </form>`;
}

function htmlSumup(c) {
  const su = (c.locale.impostazioni || {}).sumup;
  if (!su) return `<form class="cassa-box" id="sumup-collega">
      <div><b>Cassa SumUp</b><span>Se il locale usa SumUp, le vendite si scaricano da sole: niente report da esportare.</span></div>
      <div class="g-azioni"><input type="password" name="chiave" placeholder="Chiave API di SumUp" autocomplete="off" class="data-mini largo">
        <button type="submit" class="pulsante piccolo"><span class="ico">link</span> Collega</button></div>
      <p class="aiuto-lista">La chiave si crea dal pannello SumUp del locale, nella sezione per sviluppatori, con il permesso di leggere le transazioni. Si salva cifrata e non torna mai sullo schermo.</p>
    </form>`;
  const dal = su.ultimo || new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  return `<form class="cassa-box collegata" id="sumup-scarica">
      <div><b>Cassa SumUp · ${c.esc(su.nome)}</b><span>${su.ultimo ? 'Vendite scaricate fino al ' + c.data(su.ultimo) : 'Collegata: scarica le prime vendite'}</span></div>
      <div class="g-azioni"><label class="mini">dal<input type="date" name="dal" value="${dal}" class="data-mini"></label>
        <label class="mini">al<input type="date" name="al" value="${c.oggi()}" class="data-mini"></label>
        <button type="submit" class="pulsante pieno piccolo"><span class="ico">download</span> Scarica le vendite</button>
        <button type="button" class="pulsante piccolo" id="sumup-scollega"><span class="ico">link_off</span></button></div>
    </form>`;
}

function htmlReport(c) {
  const rep = c.d.report || [];
  if (!rep.length) return '';
  return `<div class="tabella-scroll"><table class="tab-dati report-periodo">
    <thead><tr><th>Report di periodo</th><th class="dx">Giorni</th><th class="dx">Prodotti</th><th class="dx">Incasso</th><th class="dx">Senza IVA</th>
      <th class="dx">Sconti</th><th class="dx">Storni</th><th></th></tr></thead>
    <tbody>${rep.map(r => `<tr><td>dal ${c.data(r.dal)} al ${c.data(r.al)}<span class="tenue"> · ${c.esc(r.nome_file || '')}</span></td>
      <td class="dx num">${r.giorni}</td><td class="dx num">${r.voci}</td><td class="dx num">${c.euro(r.incasso, 0)}</td>
      <td class="dx num">${c.euro(r.netto, 0)}</td><td class="dx num">${c.euro(r.sconti, 0)}</td>
      <td class="dx num">${r.resi_quantita ? `${c.qta(r.resi_quantita, 0)} pz · ${c.euro(r.resi_incasso, 0)}` : '—'}</td>
      <td class="dx"><button type="button" class="pulsante piccolo" data-togli-report="${r.id}" title="Togli il report"><span class="ico">delete</span></button></td></tr>`).join('')}</tbody></table></div>`;
}

function htmlAnalisi(c) {
  const a = c.d.analisi;
  if (!a) return '';
  const ai = a.ai ? (a.ai.stato === 'fatta' ? `Claude ha guardato ${a.ai.voci} voci che il catalogo non conosceva e ne ha riconosciute ${a.ai.riconosciute}.`
    : `Le ${a.ai.voci} voci che il catalogo non conosce restano da guardare: l'AI non è disponibile (${c.esc(a.ai.motivo)}).`) : '';
  return `<div class="analisi-vendite">
    <div class="av-testa"><span class="ico">insights</span><div><b>Analisi delle vendite</b>
      <span>${a.voci_cassa} voci della cassa → ${a.prodotti} prodotti · ${c.pct(a.quota_con_ricetta)} dell'incasso con una ricetta · ${a.ricette_automatiche} ricette create dai prodotti venduti</span></div>
      <button type="button" class="pulsante piccolo" id="rifai-analisi"><span class="ico">refresh</span> Rifai</button>
      ${(a.non_riconosciute || []).length ? '<button type="button" class="pulsante piccolo" id="analisi-ai"><span class="ico">auto_awesome</span> Chiedi all\'AI le voci rimaste</button>' : ''}</div>
    <div class="av-categorie">${(a.categorie || []).map(x => `<span><b>${c.esc(x.nome)}</b> ${c.euro(x.incasso, 0)} <i>${c.pct(x.quota)}</i></span>`).join('')}</div>
    ${(a.unite || []).length ? `<details><summary>${a.unite.length} prodotti scritti in più modi in cassa, ora uniti</summary><ul>${a.unite.map(u => `<li><b>${c.esc(u.nome)}</b> ← ${u.voci.map(c.esc).join(' · ')}</li>`).join('')}</ul></details>` : ''}
    ${(a.da_chiarire || []).length ? `<details><summary>Da chiarire col locale: ${a.da_chiarire.length} voci generiche (${c.euro(a.da_chiarire.reduce((s, x) => s + x.incasso, 0), 0)})</summary><ul>${a.da_chiarire.map(x => `<li>${c.esc(x.voce)} · ${c.euro(x.incasso, 0)}</li>`).join('')}</ul><p class="aiuto-lista">«Varie», «A scelta», «Menu»: dentro può esserci qualsiasi cosa. Chiedi al locale cosa battono con questi tasti e abbinali qui sotto.</p></details>` : ''}
    ${(a.non_riconosciute || []).length ? `<details><summary>Non riconosciute: ${a.non_riconosciute.length} voci (${c.euro(a.non_riconosciute.reduce((s, x) => s + x.incasso, 0), 0)})</summary><ul>${a.non_riconosciute.map(x => `<li>${c.esc(x.voce)} · ${c.euro(x.incasso, 0)}</li>`).join('')}</ul></details>` : ''}
    ${ai ? `<p class="aiuto-lista">${ai}</p>` : ''}
  </div>`;
}

function htmlVoci(c) {
  const voci = c.d.voci || [], giorni = c.d.giorni || [], ricette = c.d.ricette || [], rep = c.d.report || [];
  const incasso = giorni.reduce((s, g) => s + g.incasso, 0);
  const incRep = rep.reduce((s, r) => s + r.incasso, 0);
  const daFare = voci.filter(v => v.da_fare).length;
  const opz = v => `<option value="" ${v.da_fare ? 'selected' : ''} disabled>Da abbinare…</option>`
    + ricette.map(r => `<option value="${r.id}" ${v.ricetta_id === r.id ? 'selected' : ''}>${c.esc(r.nome)}</option>`).join('')
    + `<option value="fuori" ${v.ignorata ? 'selected' : ''}>Fuori dal food cost</option>`;
  return `<div class="sez-testa">
      <p class="aiuto-lista">${giorni.length ? `${giorni.length} giorni di vendite, dal ${c.data(giorni.at(-1).giorno)} al ${c.data(giorni[0].giorno)} · ${c.euro(incasso, 0)} di incasso.` : ''}
        ${rep.length ? `${rep.length} ${rep.length === 1 ? 'report' : 'report'} di periodo · ${c.euro(incRep, 0)} di incasso.` : ''}
        ${!giorni.length && !rep.length ? 'Ancora nessuna vendita.' : ''}
        ${daFare ? `<b>${daFare} ${daFare === 1 ? 'voce' : 'voci'} da abbinare</b>: le più vendute sono in cima.` : voci.length ? 'Tutte le voci sono abbinate.' : ''}</p>
      <label class="carica-fatture" id="zona-report">
        <input type="file" id="file-report" accept=".csv,.txt,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">
        <span class="ico">point_of_sale</span><span><b>Carica il report della cassa</b><i>CSV o Excel, vendite per piatto</i></span>
      </label></div>
    ${htmlSumup(c)}
    ${htmlReport(c)}
    ${htmlAnalisi(c)}
    ${voci.length ? `<div class="tabella-scroll"><table class="tab-dati voci">
      <thead><tr><th>Prodotto</th><th>Categoria</th><th class="dx">Venduti</th><th class="dx">Incasso</th><th>Piatto del ricettario</th></tr></thead>
      <tbody>${voci.map(v => `<tr class="${v.da_fare ? 'da-fare' : ''}"><td>${c.esc(v.nome)}${v.uniti?.length ? `<span class="v-uniti">unisce: ${v.uniti.map(c.esc).join(' · ')}</span>` : ''}</td>
        <td><span class="v-cat">${c.esc(v.categoria || '—')}</span>${v.automatico ? '<i class="v-auto" title="Abbinata dall\'analisi delle vendite">auto</i>' : ''}</td><td class="dx num">${c.qta(v.quantita, 0)}</td>
        <td class="dx num">${c.euro(v.incasso, 0)}</td><td><select data-voce="${c.esc(v.voce)}">${opz(v)}</select></td></tr>`).join('')}</tbody></table></div>`
    : '<div class="vuoto-grande">Carica il report delle vendite per piatto: lo esporta la cassa, di solito dal menù «Statistiche» o «Report articoli».</div>'}
    ${voci.length && !ricette.length ? '<p class="aiuto-lista">Per abbinare le voci servono i piatti: aggiungili nella linguetta Ricettario.</p>' : ''}`;
}

async function scegliFile(c, file) {
  if (!file) return;
  // l'anteprima vale per il locale da cui è partita: se intanto se ne apre un altro, si butta
  const base = c.base(), fd = new FormData(); fd.append('file', file);
  try {
    const a = await c.api(base + '/vendite/anteprima', { method: 'POST', body: fd });
    if (c.base() !== base) return;
    anteprima = { file, base, ...a }; c.ridisegna();
  } catch (x) { if (c.base() === base) c.avviso(x.message, true); }
}

export default {
  id: 'vendite', titolo: 'Vendite', ico: 'point_of_sale',
  azzera() { anteprima = null; },
  conta: c => (c.d.voci || []).filter(v => v.da_fare).length,
  html: c => anteprima ? htmlAnteprima(c) : htmlVoci(c),
  lega(c) {
    if (anteprima) {
      const f = document.getElementById('mappa');
      f.addEventListener('change', e => {
        if (!CAMPI.some(([k]) => k === e.target.name)) return;
        anteprima.proposta = Object.fromEntries(CAMPI.map(([k]) => [k, f[k].value === '' ? undefined : +f[k].value]).filter(([, v]) => v != null));
        const dal = f.dal.value, al = f.al.value; c.ridisegna();
        const n = document.getElementById('mappa'); n.dal.value = dal; n.al.value = al;
      });
      document.getElementById('annulla').addEventListener('click', () => { anteprima = null; c.ridisegna(); });
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const col = Object.fromEntries(CAMPI.map(([k]) => [k, f[k].value]).filter(([, v]) => v !== ''));
        if (col.voce == null || col.quantita == null) return c.avviso('Scegli almeno le colonne del piatto e della quantità', true);
        const fd = new FormData();
        fd.append('file', anteprima.file); fd.append('colonne', JSON.stringify(col));
        if (col.data == null) {
          if (!f.dal.value || !f.al.value || f.dal.value > f.al.value) return c.avviso('Scrivi il periodo del report, dal giorno più vecchio al più recente', true);
          fd.append('dal', f.dal.value); fd.append('al', f.al.value);
        }
        try {
          if (anteprima.base !== c.base()) { anteprima = null; c.ridisegna(); return c.avviso('Hai cambiato locale: ricarica il report', true); }
          const mia = anteprima;                  // l'importazione di questa anteprima: un'altra aperta dopo non si tocca
          const r = await c.api(mia.base + '/vendite', { method: 'POST', body: fd });
          const nuove = r.voci_da_abbinare ? ` · ${r.voci_da_abbinare} ${r.voci_da_abbinare === 1 ? 'voce nuova' : 'voci nuove'} da abbinare` : '';
          const an = r.analisi ? ` · analisi: ${r.analisi.prodotti} prodotti, ${c.pct(r.analisi.quota_con_ricetta)} dell'incasso con ricetta` : '';
          c.avviso(r.periodo ? `Report dal ${c.data(r.dal)} al ${c.data(r.al)} ${r.sostituito ? 'sostituito' : 'caricato'}: ${r.righe} voci, ${c.euro(r.report.incasso, 0)}${an}${nuove}`
            : `${r.giorni} ${r.giorni === 1 ? 'giorno' : 'giorni'} di vendite importati${an}${nuove}`);
          if (anteprima === mia) anteprima = null;
          if (c.base() === mia.base) await c.ricarica();
        } catch (x) { c.avviso(x.message, true); }
      });
      return;
    }
    const inp = document.getElementById('file-report'), zona = document.getElementById('zona-report');
    inp.addEventListener('change', () => scegliFile(c, inp.files[0]));
    zona.addEventListener('dragover', e => { e.preventDefault(); zona.classList.add('sopra'); });
    zona.addEventListener('dragleave', () => zona.classList.remove('sopra'));
    zona.addEventListener('drop', e => { e.preventDefault(); zona.classList.remove('sopra'); scegliFile(c, e.dataTransfer.files[0]); });
    document.getElementById('sumup-collega')?.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const r = await c.api(c.base() + '/sumup', { method: 'POST', body: JSON.stringify({ chiave: e.target.chiave.value.trim() }) });
        c.avviso('Collegata a ' + r.nome); await c.ricarica();
      } catch (x) { c.avviso(x.message, true); }
    });
    document.getElementById('sumup-scarica')?.addEventListener('submit', async e => {
      e.preventDefault();
      const b = e.target.querySelector('[type=submit]'); b.disabled = true; c.avviso('Scarico da SumUp… con molti giorni ci vuole qualche minuto');
      try {
        const r = await c.api(c.base() + '/sumup/scarica', { method: 'POST', body: JSON.stringify({ dal: e.target.dal.value, al: e.target.al.value }), timeout: 600000 });
        c.avviso(`${r.transazioni} scontrini letti, ${r.giorni} giorni${r.voci_da_abbinare ? ` · ${r.voci_da_abbinare} ${r.voci_da_abbinare === 1 ? 'voce nuova' : 'voci nuove'} da abbinare` : ''}`);
        await c.ricarica();
      } catch (x) { c.avviso(x.message, true); b.disabled = false; }
    });
    document.getElementById('sumup-scollega')?.addEventListener('click', async () => {
      if (!confirm('Scollegare la cassa SumUp? Le vendite già scaricate restano.')) return;
      try { await c.api(c.base() + '/sumup', { method: 'DELETE' }); await c.ricarica(); } catch (x) { c.avviso(x.message, true); }
    });
    document.getElementById('rifai-analisi')?.addEventListener('click', async e => {
      e.target.closest('button').disabled = true;
      try { await c.api(c.base() + '/vendite/analisi', { method: 'POST', body: JSON.stringify({}) }); c.avviso('Analisi rifatta'); await c.ricarica(); }
      catch (x) { c.avviso(x.message, true); e.target.closest('button').disabled = false; }
    });
    document.getElementById('analisi-ai')?.addEventListener('click', async e => {
      if (!confirm('Chiedere a Claude le voci che il catalogo non conosce? Costa qualche centesimo.')) return;
      e.target.closest('button').disabled = true; c.avviso('Chiedo all\'AI… ci vuole fino a un minuto');
      try {
        const r = await c.api(c.base() + '/vendite/analisi', { method: 'POST', body: JSON.stringify({ ai: true }), timeout: 150000 });
        c.avviso(r.ai?.stato === 'fatta' ? `L'AI ha riconosciuto ${r.ai.riconosciute} voci su ${r.ai.voci}` : 'AI non disponibile: ' + (r.ai?.motivo || ''), r.ai?.stato !== 'fatta');
        await c.ricarica();
      } catch (x) { c.avviso(x.message, true); e.target.closest('button').disabled = false; }
    });
    document.querySelectorAll('[data-togli-report]').forEach(b => b.addEventListener('click', async () => {
      const r = (c.d.report || []).find(x => x.id === +b.dataset.togliReport);
      if (!confirm(`Togliere il report dal ${c.data(r.dal)} al ${c.data(r.al)}? Le sue vendite spariscono da Monitoring e dal quadro del titolare.`)) return;
      try { await c.api(`${c.base()}/vendite/report/${r.id}`, { method: 'DELETE' }); c.avviso('Report tolto'); await c.ricarica(); }
      catch (x) { c.avviso(x.message, true); }
    }));
    document.querySelectorAll('select[data-voce]').forEach(s => s.addEventListener('change', async () => {
      const corpo = s.value === 'fuori' ? { voce: s.dataset.voce, ignora: true } : { voce: s.dataset.voce, ricetta_id: +s.value };
      try { await c.api(c.base() + '/voci', { method: 'POST', body: JSON.stringify(corpo) }); await c.ricarica(); }
      catch (x) { c.avviso(x.message, true); }
    }));
  },
};
