/* Linguetta «Ricettario» (passo 3): piatti, grammature, costo e food cost del piatto.
   Le grammature si scrivono in g, ml o pezzi; il costo usa i prezzi delle fatture. */

let aperta = null;          // ricetta in modifica: {id?, nome, categoria, prezzo, resa, righe:[{articolo_id, quantita}]}

function iva(c) { return (c.locale.impostazioni || {}).iva ?? 10; }
function obiettivo(c) { return (c.locale.impostazioni || {}).obiettivo ?? 30; }
function colore(c, fc) { return fc == null ? 'spenta' : fc <= obiettivo(c) ? 'buono' : fc <= obiettivo(c) + 5 ? 'attesa' : 'fuori'; }

function costo(c, r) {
  // come nel motore: il prezzo della fattura, se no quello stimato dal catalogo (e lo si dice)
  let tot = 0, manca = false, stima = false;
  for (const x of r.righe) {
    const a = c.articolo(+x.articolo_id);
    if (!a || !(x.quantita > 0)) continue;
    const p = a.prezzo ?? a.prezzo_stima;
    if (p == null) { manca = true; continue; }
    if (a.prezzo == null) stima = true;
    tot += x.quantita * p;
  }
  const porz = tot / (r.resa || 1);
  const netto = r.prezzo ? r.prezzo / (1 + iva(c) / 100) : null;
  return { porz: manca ? null : porz, fc: !manca && netto ? porz / netto * 100 : null, manca, stima };
}

function htmlTotale(c, k) {
  return `<span>Costo a porzione${k.stima ? ' (in parte stimato)' : ''}</span><b class="num">${k.porz != null ? c.euro(k.porz) : '—'}</b>
        <span class="targa ${colore(c, k.fc)}">${k.fc != null ? 'food cost ' + c.pct(k.fc) : k.manca ? 'manca un prezzo' : 'scrivi il prezzo'}</span>`;
}

function htmlElenco(c) {
  const ricette = c.d.ricette || [];
  const perCat = new Map();                      // una Map: una categoria che si chiama «constructor» non rompe niente
  ricette.forEach(r => { const k = r.categoria || 'Senza categoria'; perCat.set(k, [...(perCat.get(k) || []), r]); });
  const dalleVendite = ricette.filter(r => r.automatica && r.in_vendita).length, proposte = ricette.filter(r => r.automatica && r.in_vendita === false).length;
  return `<div class="sez-testa"><p class="aiuto-lista">${dalleVendite ? `<b>${dalleVendite} ricette</b> create dai prodotti venduti, con le grammature standard: quando pesi un piatto correggilo e diventa tuo. ` : ''}${proposte ? `<b>${proposte} ${proposte === 1 ? 'proposta' : 'proposte'}</b> non ${proposte === 1 ? 'corrisponde' : 'corrispondono'} a niente nelle vendite. ` : ''}${dalleVendite || proposte ? '«Costo stimato» = qualche ingrediente ha ancora il prezzo medio di mercato, finché non colleghi la sua fattura. ' : ''}Parti dai 15 piatti più venduti: di solito fanno il 70-80% dell'incasso. Il costo si aggiorna da solo con le fatture.</p>
      <button type="button" class="pulsante pieno" id="nuovo-piatto"><span class="ico">add</span> Nuovo piatto</button></div>
    ${ricette.length ? [...perCat.entries()].map(([cat, rs]) => `<h3 class="cat">${c.esc(cat)}</h3><div class="piatti">${rs.map(r => `
      <button type="button" class="card-piatto" data-id="${r.id}">
        <span class="p-nome">${c.esc(r.nome)}${r.automatica && r.in_vendita === false ? '<i class="p-auto" title="Ricetta creata in automatico che non corrisponde a niente nelle vendite caricate">proposta</i>' : ''}</span>
        <span class="p-cifre"><span>${r.prezzo != null ? c.euro(r.prezzo, 2) : 'senza prezzo'}</span><span>costo ${r.costo != null ? c.euro(r.costo) + (r.prezzi_stimati?.length ? ' stimato' : '') : '—'}</span></span>
        <span class="targa ${colore(c, r.food_cost)}">${r.food_cost != null ? 'food cost ' + c.pct(r.food_cost) : r.mancano_prezzi.length ? 'manca il prezzo di ' + c.esc(r.mancano_prezzi.join(', ')) : 'da completare'}</span>
      </button>`).join('')}</div>`).join('')
    : '<div class="vuoto-grande">Il ricettario è vuoto. Aggiungi il primo piatto con le sue grammature.</div>'}`;
}

function htmlScheda(c) {
  const r = aperta, articoli = c.d.articoli || [], k = costo(c, r);
  const opz = sel => `<option value="">Scegli…</option>` + articoli.map(a => `<option value="${a.id}" ${+sel === a.id ? 'selected' : ''}>${c.esc(a.nome)}</option>`).join('');
  return `<form class="scheda-piatto" id="scheda">
    <div class="sp-testa">
      <button type="button" class="pulsante piccolo" id="torna"><span class="ico">arrow_back</span> Ricettario</button>
      <div class="sp-totale" id="sp-totale">${htmlTotale(c, k)}</div>
    </div>
    <div class="sp-campi">
      <label>Piatto<input name="nome" value="${c.esc(r.nome || '')}" maxlength="160" required placeholder="Es. Margherita"></label>
      <label>Categoria<input name="categoria" value="${c.esc(r.categoria || '')}" maxlength="60" list="categorie" placeholder="Pizze, Primi…"></label>
      <label>Prezzo in menù (€)<input name="prezzo" inputmode="decimal" value="${c.esc(r.prezzoTesto ?? r.prezzo ?? '')}" placeholder="8,00"></label>
      <label>Porzioni<input name="resa" inputmode="decimal" value="${c.esc(r.resaTesto ?? r.resa ?? 1)}" title="Quante porzioni escono dalle quantità scritte sotto"></label>
    </div>
    <datalist id="categorie">${[...new Set((c.d.ricette || []).map(x => x.categoria).filter(Boolean))].map(x => `<option value="${c.esc(x)}">`).join('')}</datalist>
    <div class="tabella-scroll"><table class="tab-dati righe-ricetta">
      <thead><tr><th>Ingrediente</th><th class="dx">Quantità</th><th class="dx">Costo</th><th></th></tr></thead>
      <tbody>${r.righe.map((x, i) => {
        const a = c.articolo(+x.articolo_id), u = a?.unita || 'kg';
        const qp = x.quantita != null ? +c.aPiccola(x.quantita, u).toFixed(3) : '';
        return `<tr data-i="${i}"><td><select name="art">${opz(x.articolo_id)}</select></td>
          <td class="dx"><span class="fattore"><input name="q" inputmode="decimal" value="${x.sbagliata ? c.esc(x.testo) : qp}"><i class="u">${c.PICCOLA[u]}</i></span></td>
          <td class="dx num">${a?.prezzo != null && x.quantita ? c.euro(x.quantita * a.prezzo) : '—'}</td>
          <td class="dx"><button type="button" class="togli-riga" data-togli="${i}" aria-label="Togli"><span class="ico">close</span></button></td></tr>`;
      }).join('')}</tbody></table></div>
    ${articoli.length ? '' : '<p class="aiuto-lista">Non ci sono ancora articoli: nascono collegando le fatture nella linguetta Acquisti.</p>'}
    <div class="g-azioni">
      <button type="button" class="pulsante piccolo" id="aggiungi"><span class="ico">add</span> Ingrediente</button>
      <span style="flex:1"></span>
      ${r.id ? '<button type="button" class="pulsante piccolo" id="elimina"><span class="ico">delete</span> Elimina</button>' : ''}
      <button type="submit" class="pulsante pieno"><span class="ico">save</span> Salva il piatto</button>
    </div>
  </form>`;
}

function leggiScheda(c) {
  const f = document.getElementById('scheda');
  aperta.nome = f.nome.value; aperta.categoria = f.categoria.value;
  // quello scritto resta com'è anche dopo un ridisegno: un numero sbagliato si corregge, non sparisce
  const tp = f.prezzo.value.trim(), tr = f.resa.value.trim(), p = c.num(tp), rs = c.num(tr);
  aperta.prezzoTesto = tp; aperta.resaTesto = tr;
  aperta.prezzoSbagliato = tp !== '' && (p == null || p < 0);
  aperta.resaSbagliata = tr !== '' && (rs == null || rs <= 0);
  aperta.prezzo = aperta.prezzoSbagliato ? aperta.prezzo : p;
  aperta.resa = aperta.resaSbagliata ? aperta.resa : (rs || 1);
  f.querySelectorAll('tbody tr').forEach(tr => {
    const x = aperta.righe[+tr.dataset.i], id = +tr.querySelector('[name=art]').value || null;
    const testo = tr.querySelector('[name=q]').value.trim(), a = c.articolo(id), q = c.num(testo);
    x.articolo_id = id; x.quantita = q != null && a ? c.daPiccola(q, a.unita) : null; x.testo = testo;
    // scritta ma non un numero (o negativa): la riga non si salva in silenzio, si ferma tutto
    x.sbagliata = testo !== '' && (q == null || q < 0);
  });
}

export default {
  id: 'ricettario', titolo: 'Ricettario', ico: 'menu_book',
  azzera() { aperta = null; },
  conta: c => (c.d.ricette || []).length,
  html: c => aperta ? htmlScheda(c) : htmlElenco(c),
  lega(c) {
    if (!aperta) {
      document.getElementById('nuovo-piatto').addEventListener('click', () => {
        aperta = { nome: '', categoria: '', prezzo: null, resa: 1, righe: [{}, {}, {}] }; c.ridisegna();
      });
      document.querySelectorAll('.card-piatto').forEach(b => b.addEventListener('click', () => {
        const r = (c.d.ricette || []).find(x => x.id === +b.dataset.id);
        aperta = JSON.parse(JSON.stringify(r)); if (!aperta.righe.length) aperta.righe.push({}); c.ridisegna();
      }));
      return;
    }
    const f = document.getElementById('scheda');
    // una quantità o un prezzo cambiato aggiorna solo il costo (il modulo resta com'è, il clic su Salva non si perde);
    // un ingrediente cambiato ridisegna la riga, perché cambia l'unità (g, ml, pz)
    f.addEventListener('change', e => {
      leggiScheda(c);
      if (e.target.name !== 'art') { document.getElementById('sp-totale').innerHTML = htmlTotale(c, costo(c, aperta)); return; }
      const tr = e.target.closest('tr')?.dataset.i;
      c.ridisegna();
      document.querySelector(`#scheda tr[data-i="${tr}"] [name="q"]`)?.focus();
    });
    document.getElementById('torna').addEventListener('click', () => { aperta = null; c.ridisegna(); });
    document.getElementById('aggiungi').addEventListener('click', () => { leggiScheda(c); aperta.righe.push({}); c.ridisegna(); });
    document.querySelectorAll('[data-togli]').forEach(b => b.addEventListener('click', () => {
      leggiScheda(c); aperta.righe.splice(+b.dataset.togli, 1); c.ridisegna();
    }));
    document.getElementById('elimina')?.addEventListener('click', async () => {
      if (!confirm(`Eliminare «${aperta.nome}» dal ricettario?`)) return;
      try { await c.api(`${c.base()}/ricette/${aperta.id}`, { method: 'DELETE' }); aperta = null; await c.ricarica(); }
      catch (x) { c.avviso(x.message, true); }
    });
    f.addEventListener('submit', async e => {
      e.preventDefault(); leggiScheda(c);
      if (!aperta.nome.trim()) return c.avviso('Scrivi il nome del piatto', true);
      if (aperta.prezzoSbagliato) { f.prezzo.focus(); return c.avviso('Il prezzo in menù non è un numero: correggilo prima di salvare', true); }
      if (aperta.resaSbagliata) { f.resa.focus(); return c.avviso('Le porzioni devono essere un numero più grande di zero', true); }
      const male = aperta.righe.findIndex(x => x.sbagliata);
      if (male >= 0) { document.querySelector(`#scheda tr[data-i="${male}"] [name="q"]`)?.focus(); return c.avviso('C\'è una quantità che non è un numero: correggila prima di salvare', true); }
      const corpo = { nome: aperta.nome.trim(), categoria: aperta.categoria.trim(), prezzo: aperta.prezzo, resa: aperta.resa,
                      righe: aperta.righe.filter(x => x.articolo_id && x.quantita > 0) };
      // la ricetta e il locale per cui si salva: se intanto se ne apre un'altra, quella non si tocca
      const scheda = aperta, base = c.base();
      try {
        await c.api(scheda.id ? `${base}/ricette/${scheda.id}` : `${base}/ricette`,
                    { method: scheda.id ? 'PATCH' : 'POST', body: JSON.stringify(corpo) });
        c.avviso(`«${corpo.nome}» salvato`);
        if (aperta === scheda) aperta = null;
        if (c.base() === base) await c.ricarica();
      } catch (x) { c.avviso(x.message, true); }
    });
  },
};
