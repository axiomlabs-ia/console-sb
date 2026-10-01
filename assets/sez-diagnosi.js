/* Linguetta «Diagnosi» (passo 6): tra due inventari chiusi, dove il locale perde food cost.
   Dal costo che le ricette giustificano al costo vero, un pezzo alla volta:
   prezzi d'acquisto, scarti registrati, consumo oltre ricetta. Ogni numero si
   spiega riga per riga al titolare. */

let periodo = null, diag = null, errore = null;

// −0,4 € si legge «0 €», non «−0 €»
const zero = v => Math.abs(v) < 0.5 ? 0 : v;

function punti(c, p) { return p == null ? '—' : (p > 0 ? '+' : '') + p.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' punti'; }

function htmlCascata(c, d) {
  const teo = d.food_cost_teorico || 0, pezzi = [
    ['prezzo', 'Prezzi d\'acquisto', 'rispetto a prima del periodo'],
    ['scarto', 'Scarti registrati', 'merce buttata e segnata'],
    ['consumo', 'Consumo oltre ricetta', 'usato più di quanto le vendite giustificano'],
  ];
  let corsa = teo;
  const passi = pezzi.map(([k, t, s]) => { const v = d.voci[k].punti || 0, da = corsa; corsa += v; return { k, t, s, v, da, a: corsa, euro: d.voci[k].euro }; });
  const max = Math.max(teo, d.food_cost_reale || 0, ...passi.map(p => Math.max(p.da, p.a)), d.obiettivo) * 1.08;
  const x = v => (v / max * 100).toFixed(2) + '%';
  const barra = (da, a, cls) => `<span class="barra ${cls}" style="left:${x(Math.min(da, a))};width:${x(Math.abs(a - da))}"></span>`;
  // la linea dell'obiettivo attraversa ogni pista, l'etichetta sta solo sulla prima
  const ob = (etichetta) => `<span class="obiettivo" style="left:${x(d.obiettivo)}">${etichetta ? `<i ${d.obiettivo / max > .6 ? 'class="a-sinistra"' : ''}>obiettivo ${c.pct(d.obiettivo)}</i>` : ''}</span>`;
  return `<div class="cascata" role="img" aria-label="Dal food cost delle ricette, ${c.pct(teo)}, al food cost vero, ${c.pct(d.food_cost_reale)}">
    <div class="c-riga"><div class="c-nome"><b>Quello che le ricette giustificano</b><span>vendite × grammature, ai prezzi di prima</span></div>
      <div class="c-pista">${ob(true)}${barra(0, teo, 'base')}</div><div class="c-val"><b class="num">${c.pct(teo)}</b><span>${c.euro(d.costo_teorico, 0)}</span></div></div>
    ${passi.map(p => `<div class="c-riga"><div class="c-nome"><b>${p.t}</b><span>${p.s}</span></div>
      <div class="c-pista">${ob()}${barra(p.da, p.a, p.v > 0 ? 'perdita' : 'guadagno')}</div>
      <div class="c-val"><b class="num ${p.v > 0.05 ? 'fuori' : p.v < -0.05 ? 'buono' : ''}">${punti(c, p.v)}</b><span>${c.euro(p.euro, 0)}</span></div></div>`).join('')}
    <div class="c-riga totale"><div class="c-nome"><b>Food cost vero</b><span>quello che è uscito dal magazzino</span></div>
      <div class="c-pista">${ob()}${barra(0, d.food_cost_reale || 0, 'reale')}</div><div class="c-val"><b class="num">${c.pct(d.food_cost_reale)}</b><span>${c.euro(d.costo_reale, 0)}</span></div></div>
  </div>`;
}

function htmlArticoli(c, d) {
  const righe = d.articoli.filter(a => Math.abs(a.consumo) >= 0.5 || Math.abs(a.scarto) >= 0.5 || Math.abs(a.prezzo) >= 0.5);
  if (!righe.length) return '';
  const top = d.articoli[0];
  const spiega = top && top.consumo > 0.5 ? `<p class="spiega"><b>${c.esc(top.nome)}</b>: usati ${c.qta(top.reale, 1)} ${top.unita}, le vendite ne giustificano ${c.qta(top.teorico, 1)}${top.scarti ? ` e ${c.qta(top.scarti, 1)} sono stati buttati` : ''}. Ne mancano ${c.qta(top.reale - top.teorico - top.scarti, 1)} ${top.unita}${top.oltre_pct != null ? ` (${c.pct(top.oltre_pct)} oltre ricetta)` : ''}: ${c.euro(top.consumo, 2)}. È il primo posto dove guardare: grammature, porzionatura, o merce che esce senza scontrino.</p>` : '';
  return `<h3 class="cat">Articolo per articolo</h3>${spiega}
    <div class="tabella-scroll"><table class="tab-dati">
      <thead><tr><th>Articolo</th><th class="dx">Usato</th><th class="dx">Giustificato</th><th class="dx">Oltre</th><th class="dx">Consumo</th><th class="dx">Scarti</th><th class="dx">Prezzo</th></tr></thead>
      <tbody>${righe.map(a => `<tr>
        <td><b>${c.esc(a.nome)}</b><span class="tenue"> · ${a.prezzo_prima !== a.prezzo_periodo ? `${c.euro(a.prezzo_prima)} → ${c.euro(a.prezzo_periodo)}` : c.euro(a.prezzo_periodo)} / ${a.unita}</span></td>
        <td class="dx num">${c.qta(a.reale, 1)} ${a.unita}</td><td class="dx num">${c.qta(a.teorico, 1)}</td>
        <td class="dx num ${a.oltre_pct > 5 ? 'fuori' : a.oltre_pct < -5 ? 'buono' : ''}">${a.oltre_pct == null ? '—' : Math.abs(a.oltre_pct) < 0.05 ? '0,0%' : (a.oltre_pct > 0 ? '+' : '') + c.pct(a.oltre_pct)}</td>
        <td class="dx num">${c.euro(zero(a.consumo), 0)}</td><td class="dx num">${c.euro(zero(a.scarto), 0)}</td><td class="dx num">${c.euro(zero(a.prezzo), 0)}</td></tr>`).join('')}</tbody></table></div>`;
}

export default {
  id: 'diagnosi', titolo: 'Diagnosi', ico: 'query_stats',
  azzera() { periodo = null; diag = null; errore = null; },
  async prepara(c) {
    const chiusi = (c.d.inventari || []).filter(i => i.chiuso).sort((a, b) => b.giorno.localeCompare(a.giorno));
    if (!periodo || !chiusi.some(i => i.id === periodo.al) || !chiusi.some(i => i.id === periodo.dal)) {
      periodo = chiusi.length >= 2 ? { dal: chiusi[1].id, al: chiusi[0].id } : null;
    }
    diag = null; errore = null;
    if (!periodo) { errore = 'Servono due inventari chiusi: la diagnosi guarda cosa è successo tra l\'uno e l\'altro.'; return; }
    const p = periodo, base = c.base();
    let d = null, err = null;
    try { d = await c.api(`${base}/diagnosi?dal=${p.dal}&al=${p.al}`); } catch (x) { err = x.message; }
    if (periodo !== p || c.base() !== base) return;      // intanto è cambiato locale o periodo
    diag = d; errore = err;
  },
  html(c) {
    const chiusi = (c.d.inventari || []).filter(i => i.chiuso).sort((a, b) => b.giorno.localeCompare(a.giorno));
    const coppie = chiusi.slice(0, -1).map((b, i) => ({ dal: chiusi[i + 1], al: b }));
    const scelta = coppie.length > 1 ? `<label class="periodo">Periodo<select id="periodo">${coppie.map(p => `<option value="${p.dal.id}-${p.al.id}" ${periodo?.dal === p.dal.id && periodo?.al === p.al.id ? 'selected' : ''}>dal ${c.data(p.dal.giorno)} al ${c.data(p.al.giorno)}</option>`).join('')}</select></label>` : '';
    if (errore) return `<div class="sez-testa">${scelta}</div><div class="vuoto-grande">${c.esc(errore)}</div>`;
    if (!diag) return '<div class="vuoto-grande">Calcolo…</div>';
    const d = diag;
    const sopra = d.food_cost_reale != null && d.food_cost_reale > d.obiettivo;
    return `<div class="sez-testa"><p class="aiuto-lista">Dal ${c.data(d.dal)} al ${c.data(d.al)} · ${d.giorni} giorni · ${c.euro(d.ricavi_netti, 0)} di ricavi senza IVA dai piatti del ricettario.</p>${scelta}</div>
      <div class="verdetto ${d.voci.consumo.punti >= 0.3 || sopra ? 'male' : 'bene'}">
        <p>${c.esc(d.frase || '')}</p>
        <div class="cifre-diag">
          <div><b class="num">${c.pct(d.food_cost_reale)}</b><i>food cost vero</i></div>
          <div><b class="num">${c.pct(d.food_cost_teorico)}</b><i>quello delle ricette</i></div>
          <div><b class="num">${c.pct(d.obiettivo)}</b><i>obiettivo</i></div>
        </div>
      </div>
      <h3 class="cat">Dalle ricette al costo vero</h3>
      ${htmlCascata(c, d)}
      ${htmlArticoli(c, d)}
      ${d.avvisi.length ? `<h3 class="cat">Da sistemare per un numero più preciso</h3><ul class="avvisi">${d.avvisi.map(a => `<li>${c.esc(a)}</li>`).join('')}</ul>` : ''}
      ${d.piatti.length ? `<h3 class="cat">I piatti venduti nel periodo</h3><div class="piatti-venduti">${d.piatti.slice(0, 10).map(p => `<span><b class="num">${c.qta(p.quantita, 0)}</b> ${c.esc(p.nome)}</span>`).join('')}</div>` : ''}`;
  },
  lega(c) {
    document.getElementById('periodo')?.addEventListener('change', async e => {
      const [dal, al] = e.target.value.split('-').map(Number);
      const p = periodo = { dal, al }, base = c.base(); diag = null; c.ridisegna();
      // la risposta vale solo se locale e periodo sono ancora quelli chiesti
      let d = null, err = null;
      try { d = await c.api(`${base}/diagnosi?dal=${dal}&al=${al}`); } catch (x) { err = x.message; }
      if (periodo !== p || c.base() !== base) return;
      diag = d; errore = err;
      c.ridisegna();
    });
  },
};
