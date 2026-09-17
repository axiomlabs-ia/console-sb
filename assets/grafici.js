/* ═══════════════════════════════════════════════════════════════════
   Dalla tabella al grafico.

   Ogni blocco di dati arriva come colonne + righe. Qui si guarda cosa
   contiene e si sceglie la forma:

   · due colonne numeriche con la stessa unità  → barre appaiate
     (teorico contro reale, presente contro atteso, detto contro vero)
   · una sola colonna numerica                  → barre semplici
   · prima colonna sequenziale (settimana, mese, giorno) → colonne

   Le colonne di giudizio ("alto", "in linea", "coda") non diventano
   barre: colorano la barra della riga, così lo stato si legge prima
   del numero. I numeri restano sempre disponibili sotto il grafico.
   ═══════════════════════════════════════════════════════════════════ */

/* ─── lettura dei valori ───────────────────────────────────────── */
const SEQUENZA = ['settimana','giorno','mese','periodo'];

/* Le colonne che valgono come riferimento: il valore con cui il dato
   va confrontato. Solo queste fanno scattare il confronto appaiato. */
const RIF = /teorico|attes|previst|pianificat|capienza|listino|ordinat|detta|media rete|obiettivo|vendut|all'ingresso|standard|concordat|soglia|toller/i;

/* Le intestazioni che sono periodi: fanno scattare l'andamento */
const PERIODO = /sett|mese|mesi|giorno|trimestre|anno|20\d\d|gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic/i;

function leggi(cella){
  if (typeof cella === 'number') return { n: cella, u: '' };
  const t = String(cella).trim();
  if (!t || t === '—') return null;
  /* Numero più unità breve: 18,4 kg · 43% · 5.510 € · 177,6 pz · 40 h.
     Il punto separa le migliaia e solo quelle: 07.40 è un orario, non
     un numero, e 12.09 è una data. */
  const m = t.match(/^([+-]?\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*(%|€|[a-zA-Z]{1,3})?$/);
  if (!m) return null;
  return { n: parseFloat(m[1].replace(/\./g, '').replace(',', '.')), u: m[2] || '' };
}

const GIUDIZIO = {
  fuori:  /^(alto|sotto|basso|coda|sovracoperto|scoperto|troppa copertura|sotto organico|forno fermo|nessuna|non attendibile)$/i,
  attesa: /^(da guardare|in salita|al limite|sotto capienza|due su cinque|parziale)$/i,
  buono:  /^(in linea|regolare|rientro|tutte|completa)$/i,
};
function giudizio(testo){
  const t = String(testo).trim();
  for (const k of Object.keys(GIUDIZIO)) if (GIUDIZIO[k].test(t)) return k;
  return null;
}

/* Profilo del blocco: quali colonne sono numeri, quale è il giudizio */
function profilo(blocco){
  const { colonne, righe } = blocco;
  const numeriche = [], unita = [];
  for (let c = 1; c < colonne.length; c++){
    const letti = righe.map(r => leggi(r[c]));
    if (letti.filter(Boolean).length >= Math.ceil(righe.length * .8)){
      numeriche.push(c);
      const u = letti.find(Boolean).u;
      unita.push(letti.every(x => !x || x.u === u) ? u : '?');
    }
  }
  const colGiudizio = colonne.findIndex((_, c) =>
    c > 0 && !numeriche.includes(c) && righe.every(r => giudizio(r[c])));
  const sequenza = SEQUENZA.some(s => colonne[0].toLowerCase().includes(s))
    || righe.every(r => /^(lun|mar|mer|gio|ven|sab|dom)$/i.test(String(r[0])));
  return { numeriche, unita, colGiudizio, sequenza };
}

/* ─── disegno ──────────────────────────────────────────────────── */
const fmt = v => (Math.abs(v) >= 1000 ? v.toLocaleString('it-IT')
                 : String(Math.round(v * 10) / 10).replace('.', ','));

export function grafico(blocco){
  const { titolo, colonne, righe } = blocco;
  const P = profilo(blocco);
  if (!P.numeriche.length) return tabellaSemplice(blocco);

  /* Due colonne si confrontano se, riga per riga, parlano della stessa
     unità. Se l'unità è la stessa in tutta la tabella le righe stanno
     sulla stessa scala; se cambia da riga a riga (chili e litri) ogni
     riga si misura su sé stessa, che è l'unico confronto onesto. */
  /* Tre o più colonne numeriche della stessa unità sono un andamento:
     ogni riga diventa una serie di colonnine, l'ultima è il valore di
     oggi. Confrontarne solo due sarebbe buttare via il resto. */
  const serie = P.numeriche.length > 2
    && P.unita.slice(0, P.numeriche.length).every(x => x === P.unita[0] && x !== '?')
    && P.numeriche.every(c => PERIODO.test(colonne[c]));
  if (serie) return grafSerie(blocco, P);

  const due = P.numeriche.length > 1;
  const perRiga = due && righe.every(r => {
    const a = leggi(r[P.numeriche[0]]), b = leggi(r[P.numeriche[1]]);
    return a && b && a.u === b.u;
  });
  const scalaComune = perRiga && P.unita[0] === P.unita[1] && P.unita[0] !== '?';
  /* Nel confronto una delle due colonne è il riferimento: teorico,
     atteso, previsto, capienza. Diventa una tacca sulla barra del
     valore, così si vede subito da che parte si sta sbagliando. */
  let iRif = P.numeriche.find(c => RIF.test(colonne[c]));
  const iVal = iRif === undefined ? undefined : P.numeriche.find(c => c !== iRif);
  /* Due colonne si appaiano solo se una delle due è dichiaratamente il
     riferimento. Peso e margine sono tutti e due percentuali, ma non si
     confrontano: appaiarli sarebbe un grafico che inventa un legame. */
  const paio = perRiga && iRif !== undefined && iVal !== undefined;
  const tracciate = paio ? [iRif, iVal] : [P.numeriche[0]];
  const u = P.unita[0] === '?' ? '' : P.unita[0];

  /* Una sola colonna con unità diverse riga per riga (chili, litri,
     pezzi) non sta su una scala sola: meglio la tabella che un grafico
     che mente. */
  if (!paio && P.unita[0] === '?') return tabellaSemplice(blocco);

  const valori = righe.map(r => tracciate.map(c => (leggi(r[c]) || {n: 0}).n));
  let maxGlob = Math.max(...valori.flat(), 0) || 1;
  /* Una quota percentuale si misura su cento, altrimenti il grafico
     gonfia: il 50 per cento non deve riempire tutta la riga. Gli
     scostamenti no: lì la scala è il dato stesso. */
  const quota = u === '%' && maxGlob <= 100 && Math.min(...valori.flat()) >= 0
    && !/scostamento|variazione|differenza|scarto/i.test(tracciate.map(c => colonne[c]).join(' '));
  if (quota) maxGlob = 100;

  const legenda = paio
    ? `<div class="legenda-g">
         <span><i class="a"></i>${colonne[iVal]}</span>
         <span><i class="tacca"></i>${colonne[iRif]}</span>
         ${scalaComune ? '' : '<span class="nota">ogni riga sulla propria scala</span>'}
       </div>`
    : P.colGiudizio > 0
      ? `<div class="legenda-g stati">
           <span class="buono"><i></i>in linea</span>
           <span class="attesa"><i></i>da guardare</span>
           <span class="fuori"><i></i>fuori</span>
         </div>`
      : '';

  const corpo = righe.map((r, i) => {
    const st = P.colGiudizio > 0 ? giudizio(r[P.colGiudizio]) : null;
    const base = scalaComune || !paio ? maxGlob : Math.max(...valori[i], 1);
    const extra = colonne.map((c, k) =>
      k === 0 || tracciate.includes(k) || k === P.colGiudizio ? null
        : `<span>${c.toLowerCase()} <b>${r[k]}</b></span>`).filter(Boolean).join('');

    /* Il colore dice se va bene o male, non se sale o scende. Lo sa il
       blocco, che dichiara da che parte sta il bene: `verso: 'alto'` se
       più è meglio, `'basso'` se meno è meglio. Senza questa indicazione
       la barra resta neutra, perché nessuno può dirlo al posto suo. */
    const soglia = Math.max(Math.abs(valori[i][0]), 1) * .015;
    const scarto = valori[i][1] - valori[i][0];
    const bene = blocco.verso === 'alto' ? scarto >= -soglia
               : blocco.verso === 'basso' ? scarto <= soglia : null;
    const verso = !paio || bene === null ? 'acc' : bene ? 'ok' : 'ko';
    const aste = paio
      ? `<span class="asta ${st || verso}" style="width:${(valori[i][1] / base * 100).toFixed(1)}%"></span>
         <span class="rif" style="left:${(valori[i][0] / base * 100).toFixed(1)}%"
               title="${colonne[iRif]}: ${r[iRif]}"></span>`
      : `<span class="asta ${st || blocco.tutto || 'acc'}" style="width:${(valori[i][0] / base * 100).toFixed(1)}%"></span>`;

    const coda = [
      extra,
      st ? `<span class="segno ${st}"><span class="ico">${
        st === 'buono' ? 'check_circle' : st === 'attesa' ? 'error' : 'cancel'}</span>${r[P.colGiudizio]}</span>` : '',
      paio ? `<span>${colonne[iRif].toLowerCase()} <b>${r[iRif]}</b></span>` : '',
    ].filter(Boolean).join('');

    return `<div class="riga-g ${P.sequenza ? 'seq' : ''}">
      <span class="etic">${r[0]}</span>
      <span class="canne">${aste}</span>
      <span class="val num">${paio ? r[iVal] : r[tracciate[0]]}</span>
      ${coda ? `<span class="coda">${coda}</span>` : ''}
    </div>`;
  }).join('');

  return `<div class="grafico">
    <h4>${titolo}</h4>
    ${blocco.nota ? `<p class="nota-g">${blocco.nota}</p>` : ''}
    ${legenda}
    <div class="righe-g">${corpo}</div>
    ${scalaComune || !paio
      ? `<div class="scala"><span>0${u ? ' ' + u : ''}</span><span class="num">${fmt(maxGlob)}${u ? ' ' + u : ''}</span></div>`
      : ''}
    ${dettaglioNumeri(blocco)}
  </div>`;
}

/* ─── andamento: una serie di colonnine per riga ───────────────── */
function grafSerie(blocco, P){
  const { titolo, colonne, righe, obiettivo, verso } = blocco;
  const u = P.unita[0];
  const cols = P.numeriche;
  const val = righe.map(r => cols.map(c => (leggi(r[c]) || {n: 0}).n));
  const quota = u === '%' && Math.max(...val.flat()) <= 100 && Math.min(...val.flat()) >= 0;
  const max = quota ? 100 : Math.max(...val.flat(), 0) || 1;

  const corpo = righe.map((r, i) => {
    const primo = val[i][0], ultimo = val[i][val[i].length - 1];
    const delta = ultimo - primo;
    const moto = Math.abs(delta) < max * .02 ? 'fermo' : delta > 0 ? 'su' : 'giu';
    /* L'ultima colonna è oggi: verde se l'obiettivo è rispettato, rossa
       se no. Senza obiettivo dichiarato resta il colore neutro. */
    const esito = obiettivo === undefined || !verso ? ''
      : (verso === 'alto' ? ultimo >= obiettivo : ultimo <= obiettivo) ? 'ok' : 'ko';
    return `<div class="riga-s">
      <span class="etic">${r[0]}</span>
      <span class="colonnine">${obiettivo === undefined ? ''
        : `<span class="mira" style="bottom:${(obiettivo / max * 100).toFixed(1)}%"
                 title="obiettivo ${fmt(obiettivo)}${u}"></span>`}${val[i].map((v, k) => `
        <span class="col ${k === val[i].length - 1 ? 'ultima ' + esito : ''}"
              style="height:${Math.max(3, v / max * 100).toFixed(1)}%"
              title="${colonne[cols[k]]}: ${r[cols[k]]}"></span>`).join('')}</span>
      <span class="val num">${r[cols[cols.length - 1]]}</span>
      <span class="coda">
        <span class="andamento ${moto}"><span class="ico">${
          moto === 'su' ? 'trending_up' : moto === 'giu' ? 'trending_down' : 'trending_flat'}</span>
          ${moto === 'fermo' ? 'stabile' : `<b>${(delta > 0 ? '+' : '') + fmt(delta) + (u === '%' ? ' punti' : ' ' + u)}</b>`}
          da ${colonne[cols[0]].toLowerCase()}</span>
      </span>
    </div>`;
  }).join('');

  return `<div class="grafico">
    <h4>${titolo}</h4>
    ${blocco.nota ? `<p class="nota-g">${blocco.nota}</p>` : ''}
    <div class="legenda-g"><span class="periodi">${cols.map(c => colonne[c]).join(' · ')}</span>
      ${obiettivo === undefined ? '' : `<span class="nota">linea tratteggiata: obiettivo ${fmt(obiettivo)}${u}</span>`}</div>
    <div class="righe-g serie">${corpo}</div>
    <div class="scala"><span>0${u ? ' ' + u : ''}</span><span class="num">${fmt(max)}${u ? ' ' + u : ''}</span></div>
    ${dettaglioNumeri(blocco)}
  </div>`;
}

/* I numeri restano leggibili: chi vuole la tabella la apre */
function dettaglioNumeri(blocco){
  return `<details class="numeri-tab">
    <summary><span class="ico">table_rows</span>I numeri</summary>
    ${tabellaSemplice(blocco, true)}
  </details>`;
}

export function tabellaSemplice(blocco, nuda = false){
  return `${nuda ? '' : `<h4>${blocco.titolo}</h4>`}<div class="tabella"><table>
    <thead><tr>${blocco.colonne.map((c, i) => `<th class="${i ? 'd' : ''}">${c}</th>`).join('')}</tr></thead>
    <tbody>${blocco.righe.map(r => `<tr>${r.map((c, i) =>
      `<td class="${i ? 'd num' : ''}">${i === 0 ? `<b>${c}</b>` : c}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`;
}
