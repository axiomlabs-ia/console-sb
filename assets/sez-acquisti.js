/* Linguetta «Acquisti» (passo 2): documenti d'acquisto (XML, PDF, foto di fatture e bolle,
   anche mischiati in uno ZIP), prodotti da collegare, articoli.
   Ogni prodotto si collega una volta a un articolo del locale dicendo quanto articolo
   c'è in una unità della riga (1 pezzo di «FIORDILATTE 3KG» = 3 kg); dopo, da solo. */

// ?sotto=guardare|collegare|fatture|articoli apre direttamente quella scheda (i link da Monitoring)
let DA_URL = new URLSearchParams(location.search).get('sotto');
let sotto = DA_URL || 'collegare', aperta = null;
// la lettura in corso di PDF e foto e il resoconto dell'ultimo caricamento
let lettura = null, resoconto = null;

const DOC = { fattura: 'Fattura', nota_credito: 'Nota di credito', ddt: 'Bolla', scontrino: 'Scontrino' };
const FONTE = { xml: 'XML', pdf: 'da PDF', foto: 'da foto' };

// «FIORDILATTE JULIENNE 3KG LOTTO 12» → «Fiordilatte julienne»
function nomeProposto(d) {
  const s = String(d || '').replace(/\b(lotto|lot|scad\.?|scadenza)\b.*$/i, '')
    .replace(/(\d+\s*x\s*)?\d+([.,]\d+)?\s*(kg|g|gr|l|lt|ml|cl|x)\b.*$/i, '').trim();
  return (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).slice(0, 80) || d;
}

function htmlCollegare(c) {
  const gruppi = c.d.collegare || [], articoli = c.d.articoli || [];
  if (!gruppi.length) return `<div class="vuoto-grande">${(c.d.fatture || []).length ? 'Tutti i prodotti delle fatture sono collegati. Le prossime fatture degli stessi fornitori si collegano da sole.' : 'Carica le prime fatture del locale: i prodotti compariranno qui, i più pesanti in euro per primi.'}</div>`;
  const opzioni = articoli.map(a => `<option value="${a.id}" data-u="${a.unita}">${c.esc(a.nome)} (${a.unita})</option>`).join('');
  return `<p class="aiuto-lista">Parti dall'alto: i primi prodotti fanno quasi tutta la spesa. Per ognuno scegli l'articolo e scrivi quanto ce n'è in una unità della fattura.</p>
  <div class="gruppi">${gruppi.map((g, i) => `<form class="gruppo" data-i="${i}">
      <div class="g-testa">
        <div><b>${c.esc(g.descrizione)}</b><span>${c.esc(g.fornitore || '')}${g.codice ? ' · cod. ' + c.esc(g.codice) : ''}</span></div>
        <div class="g-cifre"><b class="num">${c.euro(g.totale)}</b><span>${c.qta(g.quantita)} ${c.esc(g.unita || '')} · ${g.righe} ${g.righe === 1 ? 'riga' : 'righe'}</span></div>
      </div>
      <div class="g-scelta">
        <label>Articolo<select name="articolo"><option value="nuovo">+ Nuovo articolo</option>${opzioni}</select></label>
        <label class="solo-nuovo">Nome<input name="nome" value="${c.esc(nomeProposto(g.descrizione))}" maxlength="160"></label>
        <label class="solo-nuovo">Unità<select name="unita">${Object.entries(c.UNITA).map(([k, t]) => `<option value="${k}" ${k === 'kg' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>1 ${c.esc(g.unita || 'unità')} =<span class="fattore"><input name="fattore" inputmode="decimal" value="${g.fattore_kg ?? ''}" placeholder="?"><i class="u">kg</i></span></label>
      </div>
      <div class="g-azioni">
        <button type="submit" class="pulsante pieno piccolo"><span class="ico">link</span> Collega</button>
        <button type="button" class="pulsante piccolo ignora"><span class="ico">block</span> Non è cibo</button>
      </div>
    </form>`).join('')}</div>`;
}

function legaCollegare(c) {
  document.querySelectorAll('.gruppo').forEach(f => {
    const g = c.d.collegare[+f.dataset.i];
    const aggiorna = () => {
      const nuovo = f.articolo.value === 'nuovo';
      f.querySelectorAll('.solo-nuovo').forEach(el => { el.hidden = !nuovo; });
      const u = nuovo ? f.unita.value : f.articolo.selectedOptions[0].dataset.u;
      f.querySelector('.u').textContent = u;
      if (!f.fattore.dataset.toccato) f.fattore.value = g['fattore_' + u] ?? '';
    };
    f.articolo.addEventListener('change', aggiorna);
    f.unita.addEventListener('change', aggiorna);
    f.fattore.addEventListener('input', () => { f.fattore.dataset.toccato = '1'; });
    aggiorna();
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const fattore = c.num(f.fattore.value);
      if (!(fattore > 0)) { f.fattore.focus(); return c.avviso('Scrivi quanto articolo c\'è in una unità della fattura', true); }
      const corpo = { chiave: g.chiave, fattore };
      if (f.articolo.value === 'nuovo') {
        if (!f.nome.value.trim()) { f.nome.focus(); return c.avviso('Dai un nome all\'articolo', true); }
        corpo.articolo = { nome: f.nome.value.trim(), unita: f.unita.value };
      } else corpo.articolo_id = +f.articolo.value;
      // un clic solo: un doppio clic con «Nuovo articolo» creerebbe due articoli
      if (f.dataset.invio) return;
      f.dataset.invio = '1';
      f.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try {
        const r = await c.api(c.base() + '/collega', { method: 'POST', body: JSON.stringify(corpo) });
        c.avviso(`${r.articolo.nome}: ${c.euro(r.articolo.prezzo)} al ${r.articolo.unita === 'pz' ? 'pezzo' : r.articolo.unita}`);
        await dopoCollegato(c, f);
      } catch (x) { c.avviso(x.message, true); }
      finally { delete f.dataset.invio; f.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
    });
    f.querySelector('.ignora').addEventListener('click', async () => {
      try {
        await c.api(c.base() + '/collega', { method: 'POST', body: JSON.stringify({ chiave: g.chiave, ignora: true }) });
        c.avviso('Tolto dal food cost'); await dopoCollegato(c, f);
      } catch (x) { c.avviso(x.message, true); }
    });
  });
}

// i documenti letti da PDF e foto con un dubbio, non ancora confermati
function daGuardare(c) {
  return (c.d.fatture || []).filter(f => { const e = f.etichette || {}; return ((e.controlla || []).length || e.note) && !e.visto; });
}

function htmlGuardare(c) {
  const docs = c.d.guardare || [];
  if (!daGuardare(c).length) return '<div class="vuoto-grande">Niente da guardare: tutti i documenti letti da PDF e foto sono confermati.</div>';
  const cifra = v => v == null ? '' : String(v).replace('.', ',');
  return `<p class="aiuto-lista">Documenti letti da PDF e foto con qualcosa da verificare. Confronta con la carta, correggi le cifre sbagliate (si salvano da sole) e premi «Va bene così».</p>
  <div class="da-guardare">${docs.map(f => {
    const e = f.etichette || {}, ddt = f.tipo === 'DDT';
    return `<article class="doc-guarda" data-id="${f.id}">
      <header class="dg-testa">
        <div class="dg-campi">
          <label>Fornitore<input data-campo="fornitore" value="${c.esc(f.fornitore)}" maxlength="200"></label>
          <label>Numero<input data-campo="numero" value="${c.esc(f.numero)}" maxlength="60"></label>
          <label>Data<input data-campo="data" type="date" value="${f.data}"></label>
        </div>
        <div class="dg-targhe"><span class="targa ${ddt ? 'doc' : 'spenta'}">${DOC[e.documento] || 'Fattura'}</span>
          ${e.fonte && e.fonte !== 'xml' ? `<span class="targa spenta">${FONTE[e.fonte]}</span>` : ''}${e.categoria ? `<span class="targa-cat">${c.esc(e.categoria)}</span>` : ''}
          <span class="tenue">${c.esc(f.file_nome || '')}</span></div>
      </header>
      <ul class="dg-dubbi">${e.note ? `<li class="nota"><span class="ico">local_shipping</span><b>Sulla consegna:</b> ${c.esc(e.note)}</li>` : ''}${(e.controlla || []).map(x => `<li><span class="ico">error</span>${c.esc(x)}</li>`).join('')}</ul>
      <div class="tabella-scroll"><table class="tab-dati interna dg-righe"><thead><tr><th>Descrizione</th><th class="dx">Quantità</th><th>Unità</th><th class="dx">${ddt ? '' : 'Importo senza IVA'}</th><th>È cibo o bevanda</th></tr></thead><tbody>
        ${(f.dettaglio || []).map(r => `<tr data-riga="${r.id}">
          <td>${c.esc(r.descrizione)}</td>
          <td class="dx"><input class="cifra" data-r="quantita" inputmode="decimal" value="${cifra(r.quantita)}"></td>
          <td>${c.esc(r.unita || '')}</td>
          <td class="dx">${ddt ? '' : `<input class="cifra" data-r="totale" inputmode="decimal" value="${cifra(r.totale)}">`}</td>
          <td><input type="checkbox" data-r="cibo" ${r.ignorata ? '' : 'checked'} aria-label="È cibo o bevanda"></td></tr>`).join('')}
      </tbody></table></div>
      <footer class="dg-azioni">${ddt ? '' : `<span class="tenue">Imponibile <b class="num" data-imp>${c.euro(f.imponibile)}</b></span>`}
        <button type="button" class="pulsante piccolo" data-via><span class="ico">delete</span> Elimina</button>
        <button type="button" class="pulsante pieno piccolo" data-ok><span class="ico">task_alt</span> Va bene così</button></footer>
    </article>`;
  }).join('')}</div>`;
}

function legaGuardare(c) {
  document.querySelectorAll('.doc-guarda').forEach(art => {
    const id = art.dataset.id, base = `${c.base()}/fatture/${id}`;
    // «salvato» è solo il valore partito con la richiesta: quello scritto intanto resta da salvare
    art.querySelectorAll('[data-campo]').forEach(inp => inp.addEventListener('change', async () => {
      const inviato = inp.value;
      try { await c.api(base, { method: 'PATCH', body: JSON.stringify({ [inp.dataset.campo]: inviato }) }); inp.defaultValue = inviato; c.avviso('Salvato'); }
      catch (x) { c.avviso(x.message, true); if (inp.value === inviato) inp.value = inp.defaultValue; }
    }));
    art.querySelectorAll('tr[data-riga] [data-r]').forEach(inp => inp.addEventListener('change', async () => {
      const campo = inp.dataset.r, inviato = campo === 'cibo' ? inp.checked : inp.value;
      const corpo = { [campo]: campo === 'cibo' ? inviato : (inviato.trim() === '' ? null : c.num(inviato)) };
      const n = c.num(inp.value);
      if (campo !== 'cibo' && inp.value.trim() !== '' && (n === null || n < 0)) { inp.focus(); return c.avviso('Scrivi un numero', true); }
      try {
        await c.api(`${base}/righe/${inp.closest('tr').dataset.riga}`, { method: 'PATCH', body: JSON.stringify(corpo) });
        if (campo === 'cibo') inp.defaultChecked = inviato; else inp.defaultValue = inviato;
        const f = await c.api(base); const imp = art.querySelector('[data-imp]'); if (imp) imp.textContent = c.euro(f.imponibile);
        c.avviso('Salvato');
      } catch (x) { c.avviso(x.message, true); }
    }));
    art.querySelector('[data-ok]').addEventListener('click', async () => {
      // una correzione non ancora salvata (in corso, rifiutata o fallita) ha il valore diverso da quello salvato
      const aperte = [...art.querySelectorAll('[data-campo], [data-r]')].filter(x => x.type === 'checkbox' ? x.checked !== x.defaultChecked : x.value !== x.defaultValue);
      if (aperte.length) { aperte[0].focus(); return c.avviso('C\'è una correzione non salvata: sistemala prima di confermare', true); }
      try {
        await c.api(base, { method: 'PATCH', body: JSON.stringify({ visto: true }) }); c.avviso('Confermato');
        // le correzioni a metà sugli altri documenti non si perdono: se ce ne sono, va via solo questo
        const altri = c.sporco();
        await c.ricarica({ auto: true });
        if (altri) art.remove();
      } catch (x) { c.avviso(x.message, true); }
    });
    art.querySelector('[data-via]').addEventListener('click', async () => {
      if (!confirm('Eliminare questo documento?')) return;
      try { await c.api(base, { method: 'DELETE' }); c.avviso('Documento eliminato'); await c.ricarica(); }
      catch (x) { c.avviso(x.message, true); }
    });
  });
}

function htmlFatture(c) {
  const fatture = c.d.fatture || [];
  if (!fatture.length) return '<div class="vuoto-grande">Ancora nessuna fattura per questo locale.</div>';
  const art = Object.fromEntries((c.d.articoli || []).map(a => [a.id, a]));
  return `<div class="tabella-scroll"><table class="tab-dati">
    <thead><tr><th>Data</th><th>Fornitore</th><th>Numero</th><th class="dx">Imponibile</th><th class="dx">Collegate</th><th></th></tr></thead>
    <tbody>${fatture.map(f => {
      const et = f.etichette || {}, ddt = f.tipo === 'DDT', nc = f.segno === -1;
      const dubbi = (et.controlla || []).length + (et.note ? 1 : 0);
      const targhe = [
        ddt || nc || et.documento === 'scontrino' ? `<span class="targa ${ddt ? 'doc' : 'spenta'}">${DOC[et.documento] || (nc ? 'nota di credito' : 'bolla')}</span>` : '',
        et.fonte && et.fonte !== 'xml' ? `<span class="targa spenta">${FONTE[et.fonte]}</span>` : '',
        et.categoria ? `<span class="targa-cat">${c.esc(et.categoria)}</span>` : '',
        dubbi && !et.visto ? `<span class="targa attesa" title="${c.esc([...(et.controlla || []), et.note].filter(Boolean).join(' · '))}"><span class="ico">error</span>da guardare</span>` : '',
      ].join(' ');
      const riga = `<tr class="apri" data-id="${f.id}" aria-expanded="${aperta?.id === f.id}">
        <td class="num">${c.data(f.data)}</td><td>${c.esc(f.fornitore)} ${targhe}</td>
        <td class="num">${c.esc(f.numero)}</td><td class="dx num">${ddt ? '<span class="tenue">non conta</span>' : c.euro(nc ? -f.imponibile : f.imponibile)}</td>
        <td class="dx num">${f.collegate}/${f.righe_merce}</td>
        <td class="dx"><button type="button" class="togli-riga" data-elimina="${f.id}" aria-label="Elimina il documento"><span class="ico">delete</span></button></td></tr>`;
      if (aperta?.id !== f.id) return riga;
      const ea = aperta.etichette || {};
      const info = [
        ea.note ? `<b>Sulla consegna:</b> ${c.esc(ea.note)}` : '',
        (ea.controlla || []).length ? `<b>Da ricontrollare:</b> ${(ea.controlla).map(c.esc).join(' · ')}` : '',
        ea.riferimenti ? `<b>Riferimenti:</b> ${c.esc(ea.riferimenti)}` : '',
        ddt ? 'Le bolle servono a controllare le consegne: gli importi arrivano con la fattura, per non contarli due volte.' : '',
        ea.fonte && ea.fonte !== 'xml' ? `Letto ${FONTE[ea.fonte]}${ea.leggibilita ? ' · leggibilità ' + c.esc(ea.leggibilita) : ''} · file ${c.esc(aperta.file_nome || '')}` : '',
      ].filter(Boolean);
      return riga + `<tr class="dettaglio"><td colspan="6">${info.length ? `<div class="doc-info">${info.map(x => `<p>${x}</p>`).join('')}</div>` : ''}<table class="tab-dati interna"><tbody>${aperta.dettaglio.map(r => `<tr>
        <td>${c.esc(r.descrizione)}</td><td class="dx num">${r.quantita == null ? '' : c.qta(r.quantita) + ' ' + c.esc(r.unita || '')}</td>
        <td class="dx num">${r.totale == null ? '' : c.euro(r.totale)}</td><td>${r.articolo_id ? '→ ' + c.esc(art[r.articolo_id]?.nome || '') + ' · ' + c.qta(r.quantita_articolo) + ' ' + (art[r.articolo_id]?.unita || '')
          + ` <button type="button" class="link-mini" data-ricollega="${r.id}">correggi</button>` : r.ignorata ? '<span class="tenue">non è cibo</span>' : '<span class="tenue">non collegata</span>'}</td></tr>`).join('')}</tbody></table></td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function legaFatture(c) {
  document.querySelectorAll('tr.apri').forEach(tr => tr.addEventListener('click', async e => {
    if (e.target.closest('[data-elimina]')) return;
    const id = +tr.dataset.id;
    if (aperta?.id === id) { aperta = null; return c.ridisegna(); }
    try { aperta = await c.api(`${c.base()}/fatture/${id}`); c.ridisegna(); } catch (x) { c.avviso(x.message, true); }
  }));
  // un collegamento sbagliato (1 pezzo = 0,001 kg) fa prezzi impossibili: si corregge il fattore, vale per tutte le fatture
  document.querySelectorAll('[data-ricollega]').forEach(b => b.addEventListener('click', async e => {
    e.stopPropagation();
    const r = aperta.dettaglio.find(x => x.id === +b.dataset.ricollega), a = c.articolo(r.articolo_id);
    const ora = r.quantita ? r.quantita_articolo / r.quantita : null;
    const v = prompt(`«${r.descrizione}» → ${a.nome}\nQuanti ${a.unita === 'pz' ? 'pezzi' : a.unita} di ${a.nome} ci sono in 1 ${r.unita || 'unità'} della fattura?`, ora == null ? '' : String(+ora.toFixed(4)).replace('.', ','));
    if (v == null) return;
    const f = c.num(v);
    if (!(f > 0)) return c.avviso('Scrivi un numero maggiore di zero', true);
    try {
      const x = await c.api(c.base() + '/collega', { method: 'POST', body: JSON.stringify({ chiave: r.chiave, fattore: f, articolo_id: a.id }) });
      c.avviso(`${x.articolo.nome}: ${c.euro(x.articolo.prezzo)} al ${x.articolo.unita === 'pz' ? 'pezzo' : x.articolo.unita} · ${x.righe} ${x.righe === 1 ? 'riga corretta' : 'righe corrette'}`);
      aperta = await c.api(`${c.base()}/fatture/${aperta.id}`); await c.ricarica();
    } catch (x) { c.avviso(x.message, true); }
  }));
  document.querySelectorAll('[data-elimina]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Eliminare questa fattura? I prezzi degli articoli si ricalcolano.')) return;
    try { await c.api(`${c.base()}/fatture/${b.dataset.elimina}`, { method: 'DELETE' }); aperta = null; await c.ricarica(); c.avviso('Fattura eliminata'); }
    catch (x) { c.avviso(x.message, true); }
  }));
}

// fuori da questi prezzi per unità quasi sempre è il fattore del collegamento (stesso controllo di Monitoring)
const PLAUSIBILE = { kg: [0.3, 90], l: [0.3, 70], pz: [0.05, 60] };
const prezzoStrano = a => a.prezzo != null && PLAUSIBILE[a.unita] && (a.prezzo < PLAUSIBILE[a.unita][0] || a.prezzo > PLAUSIBILE[a.unita][1]);

function htmlArticoli(c) {
  const articoli = c.d.articoli || [];
  if (!articoli.length) return '<div class="vuoto-grande">Gli articoli nascono collegando i prodotti delle fatture.</div>';
  return `<p class="aiuto-lista">Il pulsante <span class="ico" style="font-size:15px;vertical-align:-3px">nfc</span> copia l'indirizzo da scrivere sul tag NFC dello scaffale: chi lo tocca apre l'inventario proprio su quell'articolo.</p>
  <div class="tabella-scroll"><table class="tab-dati">
    <thead><tr><th>Articolo</th><th>Unità</th><th class="dx">Prezzo</th><th>Dalla fattura del</th><th></th></tr></thead>
    <tbody>${articoli.map(a => `<tr>
      <td><b>${c.esc(a.nome)}</b></td><td>${c.UNITA[a.unita]}</td>
      <td class="dx num">${a.prezzo == null ? '—' : c.euro(a.prezzo) + ' / ' + a.unita}${prezzoStrano(a) ? ' <span class="targa fuori" title="Quasi sempre è il fattore del collegamento: apri il documento in «Documenti» e premi «correggi» sulla riga">prezzo strano</span>' : ''}</td>
      <td class="num">${c.data(a.prezzo_data)}</td>
      <td class="dx nowrap"><button type="button" class="togli-riga" data-tag="${a.id}" aria-label="Copia il link per il tag NFC" title="Link per il tag NFC"><span class="ico">nfc</span></button>
        <button type="button" class="togli-riga" data-rinomina="${a.id}" aria-label="Rinomina"><span class="ico">edit</span></button></td></tr>`).join('')}</tbody></table></div>`;
}

function legaArticoli(c) {
  document.querySelectorAll('[data-rinomina]').forEach(b => b.addEventListener('click', async () => {
    const a = c.articolo(+b.dataset.rinomina);
    const nome = prompt('Nome dell\'articolo', a.nome);
    if (!nome || !nome.trim() || nome.trim() === a.nome) return;
    try { await c.api(`${c.base()}/articoli/${a.id}`, { method: 'PATCH', body: JSON.stringify({ nome: nome.trim() }) }); await c.ricarica(); }
    catch (x) { c.avviso(x.message, true); }
  }));
  document.querySelectorAll('[data-tag]').forEach(b => b.addEventListener('click', async () => {
    const u = new URL('locale.html', location.href);
    u.search = `?locale=${c.locale.id}&vista=inventari&articolo=${b.dataset.tag}`;
    try { await navigator.clipboard.writeText(u.href); c.avviso('Link copiato: scrivilo sul tag con un\'app come NFC Tools'); }
    catch (e) { prompt('Link da scrivere sul tag NFC', u.href); }
  }));
}

// il resoconto dell'ultimo caricamento: resta finché non lo si chiude
function htmlResoconto(c) {
  if (lettura && !lettura.finita) {
    const p = lettura.totale ? Math.round(lettura.fatti / lettura.totale * 100) : 0;
    return `<div class="resoconto in-corso" id="resoconto"><div class="rs-testa"><span class="ico gira">progress_activity</span>
      <b>Leggo PDF e foto: <span class="num" id="rs-fatti">${lettura.fatti}</span> di ${lettura.totale}</b>
      <span class="tenue">puoi continuare a lavorare, le fatture compaiono man mano</span></div>
      <i class="rs-barra"><i id="rs-barra" style="width:${p}%"></i></i></div>`;
  }
  if (!resoconto) return '';
  const r = resoconto, doc = n => `${n} ${n === 1 ? 'documento' : 'documenti'}`;
  const blocco = (ico, cls, titolo, righe) => righe.length ? `<details class="rs-blocco ${cls}" ${cls === 'ok' ? '' : 'open'}><summary><span class="ico">${ico}</span>${titolo}</summary><ul>${righe.join('')}</ul></details>` : '';
  return `<div class="resoconto" id="resoconto"><div class="rs-testa"><span class="ico">task_alt</span>
      <b>${doc(r.importate.length)} ${r.importate.length === 1 ? 'caricato' : 'caricati'}${r.doppie.length ? ` · ${r.doppie.length} già presenti` : ''}${r.errori.length ? ` · ${r.errori.length} non letti` : ''}</b>
      <button type="button" class="togli-riga" id="rs-chiudi" aria-label="Chiudi il resoconto"><span class="ico">close</span></button></div>
    ${r.da_controllare.length ? `<div class="rs-apri"><span class="ico">error</span><span><b>${r.da_controllare.length} ${r.da_controllare.length === 1 ? 'documento da guardare' : 'documenti da guardare'}</b> prima di contarli nel food cost</span>
      <button type="button" class="pulsante pieno piccolo" id="rs-guarda"><span class="ico">fact_check</span> Apri e conferma</button></div>` : ''}
    ${blocco('cancel', 'fuori', `Non letti (${r.errori.length})`, r.errori.map(e => `<li><b>${c.esc(e.file)}</b> ${c.esc(e.errore)}</li>`))}
    ${blocco('check_circle', 'ok', `Caricati (${r.importate.length})`, r.importate.map(f => `<li><b>${c.esc(f.fornitore)}</b> ${DOC[f.etichette?.documento] || 'Fattura'} n. ${c.esc(f.numero)} del ${c.data(f.data)}${f.etichette?.categoria ? ' · ' + c.esc(f.etichette.categoria) : ''}${f.etichette?.fonte && f.etichette.fonte !== 'xml' ? ' · ' + FONTE[f.etichette.fonte] : ''}</li>`))}
    ${blocco('content_copy', 'ok', `Già presenti (${r.doppie.length})`, r.doppie.map(d => `<li><b>${c.esc(d.file)}</b> ${d.uguale_a ? 'è ' + c.esc(d.uguale_a) : 'già caricata'}</li>`))}
    ${blocco('swap_horiz', 'ok', `Sostituiti dall'XML (${(r.sostituite || []).length})`, (r.sostituite || []).map(d => `<li><b>${c.esc(d.fornitore)} n. ${c.esc(d.numero)}</b> prende il posto di ${c.esc(d.prima)}</li>`))}
    ${(r.saltati || []).length ? `<p class="tenue rs-saltati">Saltati perché non sono documenti d'acquisto: ${r.saltati.map(c.esc).join(', ')}</p>` : ''}
  </div>`;
}

async function segui(c, base) {
  // la lettura va avanti sul server: qui si aggiorna solo il riquadro, e la lista quando entra qualcosa di nuovo
  // la lettura è di un locale preciso: si segue lì anche se intanto se ne apre un altro,
  // e il riquadro e la lista si toccano solo quando quel locale è di nuovo quello aperto
  const qui = () => c.base() === base;
  let visti = lettura.fatti;
  while (lettura && !lettura.finita) {
    await new Promise(r => setTimeout(r, 1500));
    try { lettura = await c.api(`${base}/letture/${lettura.id}`); }
    catch (x) { lettura = null; c.avviso(x.message, true); break; }
    if (!qui()) continue;
    const f = document.getElementById('rs-fatti'), b = document.getElementById('rs-barra');
    if (f) f.textContent = lettura.fatti;
    if (b) b.style.width = Math.round(lettura.fatti / lettura.totale * 100) + '%';
    // la lista si rilegge quando entra un documento nuovo, ma non sopra un modulo compilato a metà
    if (lettura.fatti !== visti && !lettura.finita && !c.sporco()) { visti = lettura.fatti; await c.ricarica({ auto: true }); }
  }
  if (lettura?.finita) {
    if (!qui()) { lettura = null; return c.avviso('Lettura dei documenti finita sull\'altro locale: la trovi in Acquisti'); }
    resoconto = lettura; lettura = null;
    if (resoconto.da_controllare?.length) sotto = 'guardare'; else if (resoconto.da_collegare) sotto = 'collegare';
    if (c.sporco()) return c.avviso('Lettura finita: salva quello che stai scrivendo, poi torna su questa finestra per vedere il resoconto');
    c.avviso('Lettura finita');
    await c.ricarica();
  }
}

let inviando = false;            // un invio alla volta: il blocco scatta prima della richiesta, non dopo
async function carica(c, files) {
  if (!files?.length) return;
  if (inviando || (lettura && !lettura.finita)) return c.avviso('Aspetta che finisca il caricamento in corso', true);
  const fd = new FormData();
  [...files].slice(0, 60).forEach(f => fd.append('file', f));
  // oltre 60 si dice chiaro quanti restano fuori, così si caricano dopo
  c.avviso(files.length > 60 ? `Invio dei primi 60 documenti su ${files.length}: gli altri ${files.length - 60} caricali quando finisce` : 'Invio dei documenti…', files.length > 60);
  const base = c.base();         // i documenti sono di questo locale, anche se intanto se ne apre un altro
  inviando = true;
  try {
    const r = await c.api(base + '/fatture', { method: 'POST', body: fd });
    if (r.lettura) {
      lettura = { ...r, ...r.lettura }; resoconto = null; sotto = 'fatture';
      segui(c, base);
      if (c.base() === base) await c.ricarica();
    } else if (c.base() !== base) {
      c.avviso('Documenti caricati sull\'altro locale: li trovi in Acquisti');
    } else {
      resoconto = r;
      if (r.da_collegare) sotto = 'collegare';
      c.avviso(r.importate.length ? 'Documenti caricati' : 'Nessun documento nuovo', !r.importate.length && r.errori.length > 0);
      await c.ricarica();
    }
  } catch (x) { c.avviso(x.message, true); }
  finally { inviando = false; }
}

// il dettaglio dei documenti da guardare (righe comprese), prima di disegnare la scheda
async function prepara(c) {
  if (sotto !== 'guardare') return;
  // i dettagli valgono per il locale da cui partono: se intanto se n'è aperto un altro, si buttano
  const base = c.base(), d = c.d;
  try {
    const g = await Promise.all(daGuardare(c).map(f => c.api(`${base}/fatture/${f.id}`)));
    if (c.locale && c.base() === base && c.d === d) c.d.guardare = g;
  } catch (x) { if (c.locale && c.base() === base && c.d === d) { c.d.guardare = []; c.avviso(x.message, true); } }
}

// dopo aver collegato (o tolto) un prodotto: si ridisegna tutto solo se negli altri prodotti non c'è niente di
// scritto a metà; se c'è, si toglie solo questo modulo e le bozze degli altri restano dove sono
async function dopoCollegato(c, f) {
  f.querySelectorAll('input, select, textarea').forEach(x => {
    if (x.tagName === 'SELECT') [...x.options].forEach(o => { o.defaultSelected = o.selected; });
    else if (x.type === 'checkbox' || x.type === 'radio') x.defaultChecked = x.checked; else x.defaultValue = x.value;
  });
  const altri = c.sporco();
  await c.ricarica({ auto: true });
  if (altri) f.remove();
}

export default {
  id: 'acquisti', titolo: 'Acquisti', ico: 'receipt_long',
  // la sottoscheda chiesta dal link (?sotto=) si usa alla prima apertura vera di un locale, non a un'uscita
  azzera(c) { aperta = null; resoconto = null; if (!c?.locale) return; sotto = DA_URL || 'collegare'; DA_URL = null; },
  conta: c => (c.d.collegare || []).length + daGuardare(c).length,
  prepara,
  html(c) {
    const f = c.d.fatture || [];
    const tot = f.reduce((s, x) => s + (x.imponibile || 0) * (x.segno ?? 1), 0);
    const g = daGuardare(c).length;
    const schede = [...(g || sotto === 'guardare' ? [['guardare', 'Da guardare', g]] : []), ['collegare', 'Da collegare', (c.d.collegare || []).length], ['fatture', 'Documenti', f.length], ['articoli', 'Articoli', (c.d.articoli || []).length]];
    return `<div class="sez-testa">
        <div class="sotto-schede">${schede.map(([k, t, n]) => `<button type="button" data-s="${k}" aria-pressed="${sotto === k}">${t} <span class="num">${n}</span></button>`).join('')}</div>
        <label class="carica-fatture" id="zona">
          <input type="file" id="file-fatture" multiple accept=".xml,.p7m,.zip,.pdf,application/xml,text/xml,application/zip,application/pdf,image/*">
          <span class="ico">upload_file</span>
          <span><b>Carica documenti</b><i>fatture e bolle: XML, ZIP, PDF o foto, anche mischiati · ${f.length} caricati, ${c.euro(tot, 0)}</i></span>
        </label>
      </div>` + htmlResoconto(c) + (sotto === 'guardare' ? htmlGuardare(c) : sotto === 'collegare' ? htmlCollegare(c) : sotto === 'fatture' ? htmlFatture(c) : htmlArticoli(c));
  },
  lega(c) {
    document.querySelectorAll('.sotto-schede button').forEach(b => b.addEventListener('click', async () => {
      sotto = b.dataset.s; aperta = null;
      if (sotto === 'guardare') await prepara(c);
      c.ridisegna();
    }));
    document.getElementById('rs-guarda')?.addEventListener('click', async () => { sotto = 'guardare'; await prepara(c); c.ridisegna(); window.scrollTo({ top: 0 }); });
    const inp = document.getElementById('file-fatture'), zona = document.getElementById('zona');
    inp.addEventListener('change', () => { carica(c, inp.files); inp.value = ''; });
    document.getElementById('rs-chiudi')?.addEventListener('click', () => { resoconto = null; c.ridisegna(); });
    zona.addEventListener('dragover', e => { e.preventDefault(); zona.classList.add('sopra'); });
    zona.addEventListener('dragleave', () => zona.classList.remove('sopra'));
    zona.addEventListener('drop', e => { e.preventDefault(); zona.classList.remove('sopra'); carica(c, e.dataTransfer.files); });
    if (sotto === 'guardare') legaGuardare(c); else if (sotto === 'collegare') legaCollegare(c); else if (sotto === 'fatture') legaFatture(c); else legaArticoli(c);
  },
};
