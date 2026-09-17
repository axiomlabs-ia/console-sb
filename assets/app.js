/* ═══════════════════════════════════════════════════════════════════
   Console SB · logica dell'interfaccia
   ═══════════════════════════════════════════════════════════════════ */
import { LOCALI, PARAMETRI, PLURALE, GIORNI } from './dati.js';
import { DIAGNOSI } from './diagnosi.js';
import { STRUMENTI, SORGENTE, DA_ICONA, ALIMENTA, misure, consumo } from './misure.js';
import { grafico as diagramma, tabellaSemplice } from './grafici.js';

const ICONA  = {buono:'check_circle', attesa:'error', fuori:'cancel'};
const PAROLA = {buono:'Entro i parametri', attesa:'Attenzione', fuori:'Fuori parametro'};

const $ = s => document.querySelector(s);

/* ─── calcoli di stato ─────────────────────────────────────────── */
const pars = l => PARAMETRI[l.tipo];

function stato(p, v){
  const scarto = p.verso === 'basso' ? v - p.atteso : p.atteso - v;
  return scarto <= 0 ? 'buono' : scarto <= p.toll ? 'attesa' : 'fuori';
}
function statoLocale(l){
  const s = pars(l).map(p => stato(p, l.valori[p.id]));
  return s.includes('fuori') ? 'fuori' : s.includes('attesa') ? 'attesa' : 'buono';
}
function num(v, u){
  const n = String(v).replace('.', ',');
  return u === '€' ? n + ' €' : u === '%' ? n + '%' : n;
}
const euro = v => v.toLocaleString('it-IT') + ' €';
const dec = (n, c = 1) => n.toFixed(c).replace('.', ',');

/* Andamento verosimile delle ultime dodici settimane: parte da un
   valore in linea e arriva a quello di oggi. */
function andamento(fine, p){
  const inizio = p.verso === 'basso' ? fine - (fine - p.atteso) * 1.7
                                     : fine + (p.atteso - fine) * 1.7;
  const out = [];
  for (let i = 0; i < 12; i++){
    const t = i / 11;
    const base = inizio + (fine - inizio) * Math.pow(t, 1.35);
    out.push(Math.round((base + Math.sin(i * 2.6) * p.toll * .13
                              + Math.cos(i * 1.4) * p.toll * .09) * 10) / 10);
  }
  out[11] = fine;
  return out;
}

/* ─── stato dell'interfaccia ───────────────────────────────────── */
let filtro = 'tutti', cerca = '', scelto = 0, linguetta = 'diagnosi', parSel = null, parDiag = null;

/* Il parametro che apre la diagnosi: il peggiore, se non ne è stato scelto un altro. */
function peggiore(l){
  const ordine = {fuori:0, attesa:1, buono:2};
  return [...pars(l)].sort((a, b) =>
    ordine[stato(a, l.valori[a.id])] - ordine[stato(b, l.valori[b.id])])[0].id;
}

/* ─── flotta ───────────────────────────────────────────────────── */
function disegnaPolso(){
  const stati = LOCALI.map(statoLocale);
  const fuori = stati.filter(s => s === 'fuori').length;
  const att = stati.filter(s => s === 'attesa').length;
  $('#polso').innerHTML = stati.map(s => `<i class="${s}"></i>`).join('');
  $('#polso-dida').innerHTML =
    `<b class="num">${LOCALI.length}</b> locali · <b class="num fuori">${fuori}</b> fuori parametro · <b class="num attesa">${att}</b> in attenzione`;
}

function disegnaLista(){
  const ordine = {fuori:0, attesa:1, buono:2};
  const visibili = LOCALI.map((l, i) => ({l, i, s: statoLocale(l)}))
    .filter(x => filtro === 'tutti' || x.s === filtro)
    .filter(x => !cerca || (x.l.nome + ' ' + x.l.zona + ' ' + x.l.titolare + ' ' + x.l.referente)
      .toLowerCase().includes(cerca))
    .sort((a, b) => ordine[a.s] - ordine[b.s]);

  $('#lista').innerHTML = visibili.map(({l, i, s}) => {
    const rotti = pars(l).filter(p => stato(p, l.valori[p.id]) !== 'buono').length;
    return `<button class="riga-locale" data-i="${i}" aria-current="${i === scelto}">
      <span class="ico spia ${s}" aria-hidden="true">${ICONA[s]}</span>
      <span><span class="n1">${l.nome}</span><span class="n2">${l.zona} · ${l.referente.split(' ')[0]}</span></span>
      ${rotti ? `<span class="quanti num" title="${rotti} ${rotti === 1 ? 'parametro fuori' : 'parametri fuori'}">${rotti}</span>` : '<span></span>'}
    </button>`;
  }).join('') || '<div class="vuoto">Nessun locale con questi criteri.</div>';
}

/* ─── testata del dossier ──────────────────────────────────────── */
function disegnaBanda(){
  const l = LOCALI[scelto], s = statoLocale(l);
  $('#banda').innerHTML = `
    <div class="materia" style="--g:${(scelto * 37) % 360}deg" aria-hidden="true">
      <span class="monogramma">${l.nome.split(' ').map(x => x[0]).join('').slice(0,3).toUpperCase()}</span>
    </div>
    <div class="angolo">
      <span class="targa ${s}"><span class="ico">${ICONA[s]}</span>${PAROLA[s]}</span>
      <span class="sigillo">
        <span>${l.bollino ? 'Bollino<br>attivo' : 'Bollino<br>sospeso'}</span>
        <span class="disco ${l.bollino ? '' : 'spento'}">SB</span>
      </span>
    </div>
    <div class="sopra">
      <h1>${l.nome}</h1>
      <div class="sotto">${l.tipo} · ${l.indirizzo}, ${l.zona} · <span class="num">${l.coperti}</span> coperti ·
        titolare <b>${l.titolare}</b> · referente <b>${l.referente}</b></div>
      <div class="cifre">${pars(l).slice(0, 3).map(p => {
        const v = l.valori[p.id], st = stato(p, v);
        return `<span class="cifra vetro">
          <b class="num ${st}">${num(v, p.unita)}</b>
          <i>${p.nome}<br>atteso ${num(p.atteso, p.unita)}</i>
        </span>`;
      }).join('')}</div>
    </div>`;

  const voci = [['diagnosi','Diagnosi','troubleshoot'],['parametri','Parametri','monitoring'],
                ['personale','Personale','groups'],['magazzino','Magazzino','inventory_2'],
                ['dotazione','Dotazione','settings_input_component'],['storia','Storia','history'],
                ['contratto','Contratto','description']];
  $('#linguette').innerHTML = voci.map(([k, t, ic]) =>
    `<button role="tab" data-l="${k}" aria-selected="${linguetta === k}"><span class="ico">${ic}</span>${t}</button>`).join('');
  document.querySelectorAll('#linguette button').forEach(b =>
    b.addEventListener('click', () => { linguetta = b.dataset.l; disegnaBanda(); disegnaArea(); }));
}

/* ─── grafico dell'andamento ───────────────────────────────────── */
function grafico(p, dati){
  const W = 760, H = 210, ml = 50, mr = 20, mt = 16, mb = 30, n = dati.length;
  const min = Math.min(...dati, p.atteso - p.toll) - p.toll * .7;
  const max = Math.max(...dati, p.atteso + p.toll) + p.toll * .7;
  const x = i => ml + (W - ml - mr) * (i / (n - 1));
  const y = v => mt + (H - mt - mb) * (1 - (v - min) / (max - min));
  const alto  = p.verso === 'basso' ? p.atteso + p.toll : max;
  const basso = p.verso === 'basso' ? min : p.atteso - p.toll;
  const linea = dati.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const col = `var(--${stato(p, dati[n - 1])})`;
  const tacche = [min, (min + max) / 2, max].map(v => `
    <line x1="${ml}" x2="${W - mr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--griglia)"/>
    <text x="${ml - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-size="10.5"
      font-family="Geist Mono, monospace" fill="var(--tenue)">${num(Math.round(v * 10) / 10, p.unita)}</text>`).join('');

  return `<svg viewBox="0 0 ${W} ${H}" role="img"
    aria-label="${p.nome}: dodici settimane. Atteso ${num(p.atteso, p.unita)}, oggi ${num(dati[n-1], p.unita)}">
    <rect x="${ml}" y="${y(alto).toFixed(1)}" width="${W - ml - mr}"
      height="${Math.abs(y(basso) - y(alto)).toFixed(1)}" fill="var(--buono-velo)"/>
    ${tacche}
    <line x1="${ml}" x2="${W - mr}" y1="${y(p.atteso).toFixed(1)}" y2="${y(p.atteso).toFixed(1)}"
      stroke="var(--buono)" stroke-width="1.5" stroke-dasharray="5 4"/>
    <path d="${linea}" fill="none" stroke="var(--ink)" stroke-width="2"
      stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(n-1).toFixed(1)}" cy="${y(dati[n-1]).toFixed(1)}" r="4.5" fill="${col}"
      stroke="var(--pannello)" stroke-width="2"/>
    <text x="${(x(n-1) - 8).toFixed(1)}" y="${(y(dati[n-1]) - 13).toFixed(1)}" text-anchor="end"
      font-size="13.5" font-weight="700" font-family="Geist Mono, monospace"
      fill="${col}">${num(dati[n-1], p.unita)}</text>
    <text x="${ml}" y="${H - 8}" font-size="10.5" fill="var(--tenue)">12 settimane fa</text>
    <text x="${W - mr}" y="${H - 8}" text-anchor="end" font-size="10.5" fill="var(--tenue)">questa settimana</text>
    ${dati.map((v, i) => `<circle class="pt" data-i="${i}" data-v="${num(v, p.unita)}"
      cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="11" fill="transparent"/>`).join('')}
  </svg>`;
}

function collegaPunti(){
  const b = $('#bolla');
  document.querySelectorAll('.pt').forEach(c => {
    c.addEventListener('mouseenter', () => {
      const q = 11 - (+c.dataset.i);
      b.innerHTML = `<span class="num">${c.dataset.v}</span> · ${q === 0 ? 'questa settimana' : q + ' settimane fa'}`;
      const r = c.getBoundingClientRect();
      b.style.left = (r.left + r.width / 2 - 62) + 'px';
      b.style.top = (r.top - 42) + 'px';
      b.style.opacity = '1';
    });
    c.addEventListener('mouseleave', () => { b.style.opacity = '0'; });
  });
}


/* ─── quadrante circolare ──────────────────────────────────────────
   Una corona da 270 gradi. La fascia verde è l'intervallo concordato,
   la tacca bianca il valore atteso, l'arco spesso il valore di oggi.  */
function quadrante(l, p, aperto){
  const v = l.valori[p.id], st = stato(p, v), R = 46, C = 60, GIRO = 270, DA = 135;
  const min = p.atteso - 3 * p.toll, max = p.atteso + 3 * p.toll;
  const q = x => Math.min(1, Math.max(0, (x - min) / (max - min)));
  const punto = (t, r = R) => {
    const a = (DA + GIRO * t) * Math.PI / 180;
    return [(C + r * Math.cos(a)).toFixed(2), (C + r * Math.sin(a)).toFixed(2)];
  };
  const arco = (da, a, r = R) => {
    const [x1, y1] = punto(da, r), [x2, y2] = punto(a, r);
    return `M${x1},${y1} A${r},${r} 0 ${GIRO * (a - da) > 180 ? 1 : 0} 1 ${x2},${y2}`;
  };
  const bandaDa = p.verso === 'basso' ? 0 : q(p.atteso - p.toll);
  const bandaA  = p.verso === 'basso' ? q(p.atteso + p.toll) : 1;
  const [tx1, ty1] = punto(q(p.atteso), R - 9), [tx2, ty2] = punto(q(p.atteso), R + 9);
  /* il limite della tolleranza: resta visibile anche quando l'arco del valore lo supera */
  const lim = p.verso === 'basso' ? bandaA : bandaDa;

  return `<button type="button" class="quadrante ${st} ${aperto ? 'aperto' : ''}" data-par="${p.id}"
      aria-pressed="${aperto}" aria-label="${p.nome}: ${num(v, p.unita)}, atteso ${num(p.atteso, p.unita)}. ${PAROLA[st]}">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="${arco(0, 1)}" class="pista"/>
      <path d="${arco(bandaDa, bandaA)}" class="fascia"/>
      <line x1="${tx1}" y1="${ty1}" x2="${tx2}" y2="${ty2}" class="tacca"/>
      <line x1="${punto(lim, R - 9)[0]}" y1="${punto(lim, R - 9)[1]}"
            x2="${punto(lim, R + 9)[0]}" y2="${punto(lim, R + 9)[1]}" class="limite"/>
      <path d="${arco(0, Math.max(.004, q(v)))}" class="valore"/>
      <circle cx="${punto(q(v))[0]}" cy="${punto(q(v))[1]}" r="5" class="punta"/>
    </svg>
    <span class="dentro"><b class="num">${num(v, p.unita)}</b></span>
    <span class="nome">${p.nome}</span>
    <span class="atteso">atteso <span class="num">${num(p.atteso, p.unita)}</span></span>
    <span class="verdetto"><span class="ico">${ICONA[st]}</span>${st === 'buono' ? 'in linea'
      : st === 'attesa' ? 'da guardare' : 'fuori parametro'}</span>
  </button>`;
}

/* ─── da dove arriva il numero ─────────────────────────────────── */
function sorgenti(p){
  return `<div class="sorgenti">
    <h4><span class="ico">sensors</span>Da dove arriva questo numero</h4>
    <div class="flussi">${(SORGENTE[p.id] || []).map(k => {
      const st = STRUMENTI[k];
      return `<div class="flusso">
        <span class="ico">${st.ico}</span>
        <div><b>${st.nome}</b><span class="fr">${st.freq}</span>
        <p>${st.raccoglie}</p></div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

function bloccoMisure(l, p, titolo){
  const m = misure(l, p);
  if (!m.length) return '';
  return `<details class="misure" ${titolo ? 'open' : ''}>
    <summary><span class="ico">table_rows</span>Le misure dietro il numero
      <span class="quante">${m.length} tabelle</span></summary>
    <div class="dentro-misure">${m.map(b =>
      `<div class="tavola">${tabella(b)}</div>`).join('')}</div>
  </details>`;
}

const tabella = diagramma;


/* ─── le sette linguette ───────────────────────────────────────── */
function disegnaArea(){
  const l = LOCALI[scelto], P = pars(l), area = $('#area');
  const fuori = P.filter(p => stato(p, l.valori[p.id]) === 'fuori');

  /* ── Diagnosi: i quadranti, e sotto il perché di quello scelto ── */
  if (linguetta === 'diagnosi'){
    if (!parDiag || !P.some(x => x.id === parDiag)) parDiag = peggiore(l);
    const p = P.find(x => x.id === parDiag);
    const st = stato(p, l.valori[p.id]);
    const d = (DIAGNOSI[l.nome] || {})[p.id];
    const scarto = Math.abs(l.valori[p.id] - p.atteso);

    /* il pannello sotto i quadranti cambia con lo stato del parametro */
    let pannello;
    if (d){
      pannello = `<div class="diagnosi">
        <div class="capo">
          <div class="conto">
            <span class="grande num fuori">${p.verso === 'basso' ? '+' : '-'}${String(d.scostamento).replace('.', ',')}${p.unita === '%' ? ' punti' : ''}</span>
            <span class="via">${p.nome}: <span class="num">${num(d.attuale, p.unita)}</span> contro
              <span class="num">${num(d.atteso, p.unita)}</span> attesi</span>
          </div>
          <h2>Da dove viene lo scostamento</h2>
          <p>${d.sintesi}</p>
        </div>
        <div class="cause">
          ${d.cause.map(c => `<div class="causa">
            <div class="peso"><b class="num">${p.unita === '%' ? '+' : ''}${String(c.punti).replace('.', ',')}</b>
              <span>${p.unita === '%' ? 'punti' : 'peso'}</span></div>
            <div>
              <h3>${c.titolo}</h3>
              <p class="dett">${c.dettaglio}</p>
              <div class="prova"><span class="ico">fact_check</span><span>${c.prova}</span></div>
              <div class="mossa"><b><span class="ico">bolt</span>Cosa facciamo</b>${c.mossa}</div>
            </div>
          </div>`).join('')}
        </div>
        <div class="area" style="padding-top:20px">
          <div class="prove">
            <div>${tabella(d.piatti)}</div>
            <div>${tabella(d.ingredienti)}</div>
          </div>
        </div>
      </div>`;
    } else if (st === 'fuori'){
      pannello = `<div class="diagnosi">
        <div class="capo">
          <h2>${p.nome}: fuori dall'intervallo, scomposizione in corso</h2>
          <p>Il numero è fuori di ${dec(scarto)}${p.unita === '%' ? ' punti' : ' ' + p.unita}. I dati grezzi ci sono
             tutti, la scomposizione nelle cause viene chiusa alla visita del ${l.prossima}.</p>
        </div>
      </div>`;
    } else if (st === 'attesa'){
      pannello = `<div class="diagnosi attenzione">
        <div class="capo">
          <h2>${p.nome}: dentro tolleranza, ma in movimento</h2>
          <p>Oggi ${num(l.valori[p.id], p.unita)} contro ${num(p.atteso, p.unita)} attesi: ${dec(scarto)}
             ${p.unita === '%' ? 'punti' : p.unita} di distanza, ancora dentro l'intervallo concordato.
             Non apriamo una diagnosi per un numero che non è un problema: qui sotto ci sono le misure
             che lo compongono, così si vede se sta scendendo o se è solo rumore.</p>
        </div>
      </div>`;
    } else {
      pannello = `<div class="diagnosi sereno">
        <div class="capo">
          <h2>${p.nome}: entro i parametri</h2>
          <p>Oggi ${num(l.valori[p.id], p.unita)} contro ${num(p.atteso, p.unita)} attesi. Qui sotto ci sono
             comunque tutte le misure che il locale sta producendo: servono a tenerlo lì.</p>
        </div>
      </div>`;
    }

    const rotti = P.filter(x => stato(x, l.valori[x.id]) !== 'buono').length;
    area.innerHTML = `<div class="area">
      <div class="capo-quadranti">
        <h2 class="tit">Come sta il locale</h2>
        <p class="nota-piccola">${rotti
          ? `${rotti} ${rotti === 1 ? 'parametro è' : 'parametri sono'} fuori dall'intervallo concordato. Clicca un quadrante per vedere da dove viene.`
          : 'Tutti i parametri sono dentro l\'intervallo concordato. Clicca un quadrante per vedere le misure che lo compongono.'}</p>
      </div>
      <div class="quadranti">${P.map(x => quadrante(l, x, x.id === parDiag)).join('')}</div>
      ${pannello}
      ${sorgenti(p)}
      ${bloccoMisure(l, p, !d)}
      <p class="nota-piccola">Lo scostamento è scomposto incrociando gli scontrini della cassa, il ricettario
        caricato all'ingresso, gli scarichi dai tag del magazzino e le timbrature dei badge. Ogni causa porta
        la sua prova e la sua mossa: è la differenza fra sapere che un numero è alto e sapere perché.</p>
    </div>`;

    document.querySelectorAll('.quadrante').forEach(b =>
      b.addEventListener('click', () => { parDiag = b.dataset.par; disegnaArea(); }));
  }

  /* ── Parametri ── */
  if (linguetta === 'parametri'){
    const p = P.find(x => x.id === parSel) || fuori[0] || P[0];
    parSel = p.id;
    const dati = andamento(l.valori[p.id], p);
    const simili = LOCALI.filter(z => z.tipo === l.tipo)
      .map(z => ({nome: z.nome, v: z.valori[p.id], io: z.nome === l.nome}))
      .sort((a, b) => p.verso === 'basso' ? a.v - b.v : b.v - a.v);
    const mx = Math.max(...simili.map(z => z.v));

    area.innerHTML = `<div class="area">
      ${grigliaNumeri(l, P, true)}
      <div class="tavola" style="margin-top:22px">
        <h3>${p.nome}</h3>
        <p>Dodici settimane. La fascia verde è l'intervallo concordato col locale all'ingresso.
           Il dato arriva da: ${p.fonte.toLowerCase()}.</p>
        ${grafico(p, dati)}
        <div class="legenda">
          <span><i></i>andamento del locale</span>
          <span class="fascia"><i></i>intervallo entro i parametri</span>
          <span class="att"><i></i>atteso per una ${l.tipo}</span>
        </div>
      </div>
      <h2 class="tit">${p.nome} rispetto alle altre ${PLURALE[l.tipo]} della rete</h2>
      <div class="barre">${simili.map(z => `
        <div class="barra ${z.io ? 'io' : ''}">
          <span>${z.nome.replace(/^(Pizzeria|Trattoria|Osteria|Bar) /, '')}</span>
          <span class="traccia"><span class="riempi" style="width:${(z.v / mx * 100).toFixed(1)}%"></span></span>
          <span class="num" style="text-align:right">${num(z.v, p.unita)}</span>
        </div>`).join('')}</div>
      <p class="nota-piccola">Il confronto vale solo fra locali della stessa tipologia seguiti con lo stesso
        metodo. È il dato che nessun consulente ha finché non ha una rete.</p>
    </div>`;
    collegaPunti();
    document.querySelectorAll('.numeri .cella.clic').forEach(c =>
      c.addEventListener('click', () => { parSel = c.dataset.par; disegnaArea(); }));
  }

  /* ── Personale ── */
  if (linguetta === 'personale'){
    const o = l.organico;
    const costo = Math.round(o.ore * o.costoOra);
    area.innerHTML = `<div class="area">
      <div class="numeri">
        <div class="cella"><small>Organico</small><b class="num">${o.persone}</b><span>persone coi badge</span></div>
        <div class="cella"><small>Ore settimanali</small><b class="num">${o.ore}</b><span>rilevate, non pianificate</span></div>
        <div class="cella"><small>Costo settimana</small><b class="num">${euro(costo)}</b><span><span class="num">${String(o.costoOra).replace('.', ',')} €</span> l'ora</span></div>
        <div class="cella"><small>Costo personale</small><b class="num ${stato(P.find(p=>p.id==='pers'), l.valori.pers)}">${num(l.valori.pers, '%')}</b><span>atteso <span class="num">${num(P.find(p=>p.id==='pers').atteso, '%')}</span></span></div>
      </div>
      <h2 class="tit staccato">Copertura di sala, sera per sera</h2>
      <div class="settimana">${o.sera.map((n, i) => `
        <div class="giorno ${n >= 4 && i < 4 ? 'troppo' : ''}">
          <div class="g">${GIORNI[i]}</div><div class="p num">${n}</div><div class="c">in sala</div>
        </div>`).join('')}</div>
      <p class="nota-piccola">I numeri vengono dalle timbrature, non dai turni scritti: è la differenza fra chi
        era previsto e chi c'era davvero.</p>
      <h2 class="tit staccato">Checklist della squadra</h2>
      ${diagramma({titolo:'Compilazione per tipo di checklist, ultime quattro settimane',
        colonne:['Checklist','Compilate','Giudizio'],
        righe:[
          ['Apertura',     num(Math.min(100, l.valori.chk + 4), '%'), l.valori.chk > 85 ? 'in linea' : 'sotto'],
          ['Pre servizio', num(Math.max(0, l.valori.chk - 14), '%'),  l.valori.chk > 95 ? 'in linea' : 'sotto'],
          ['Chiusura',     num(l.valori.chk, '%'),                    l.valori.chk > 75 ? 'in linea' : 'sotto'],
        ]})}
      <p class="nota-piccola">Responsabile in locale: <b>${l.titolare}</b>. L'app registra chi compila e a che
        ora: una checklist chiusa tutta insieme a fine servizio viene segnata come non attendibile.</p>
    </div>`;
  }

  /* ── Magazzino ── */
  if (linguetta === 'magazzino'){
    area.innerHTML = `<div class="area">
      ${diagramma({titolo:'Scarichi dai tag NFC contro il teorico da ricettario, ultima settimana',
        colonne:['Ingrediente','Teorico','Scaricato','Scostamento','Giudizio','Ultimo prelievo'],
        righe: consumo(l)})}
      <p class="nota-piccola">Chi preleva appoggia il telefono sul tag dello scaffale e conferma la quantità:
        cinque secondi, nessuna app da installare. Incrociando questi scarichi col venduto in cassa esce il
        food cost reale, che è sempre diverso da quello teorico.</p>
    </div>`;
  }

  /* ── Dotazione ── */
  if (linguetta === 'dotazione'){
    const targa = st => st === 'attivo' ? ['buono','check_circle','attivo']
      : st === 'da sistemare' ? ['attesa','error','da sistemare'] : ['spenta','remove','non previsto'];
    area.innerHTML = `<div class="area">
      <h2 class="tit">Cosa è installato in questo locale</h2>
      <div class="pezzi">${l.dotazione.map(([ic, t, d, st]) => {
        const [cl, icona, parola] = targa(st);
        const S = STRUMENTI[DA_ICONA[ic]];
        return `<div class="pezzo ${st === 'attivo' ? '' : 'spento'}">
          <span class="ico">${ic}</span>
          <span>
            <span class="t">${t}</span>
            <span class="d">${d}</span>
            ${S ? `<span class="produce">
              <span class="voce"><span class="ico">database</span><span>${S.raccoglie} <em>${S.freq}</em></span></span>
              <span class="voce"><span class="ico">arrow_forward</span><span>Alimenta: ${ALIMENTA[DA_ICONA[ic]]}</span></span>
            </span>` : ''}
          </span>
          <span class="targa ${cl}"><span class="ico">${icona}</span>${parola}</span>
        </div>`; }).join('')}</div>
      <p class="nota-piccola">Le telecamere con analisi si installano solo dopo l'accordo sindacale o
        l'autorizzazione dell'Ispettorato del Lavoro, e misurano flussi aggregati: mai la prestazione della
        singola persona, mai audio.</p>
    </div>`;
  }

  /* ── Storia ── */
  if (linguetta === 'storia'){
    area.innerHTML = `<div class="area">
      <h2 class="tit">Cosa è successo in questo locale</h2>
      <div class="storia">${l.storia.map(([q, t, chiave, d]) => `
        <div class="tappa ${chiave ? 'chiave' : ''}">
          <div class="q">${q}</div><div class="t">${t}</div><div class="d">${d}</div>
        </div>`).join('')}</div>
    </div>`;
  }

  /* ── Contratto ── */
  if (linguetta === 'contratto'){
    area.innerHTML = `<div class="area">
      <div class="numeri">
        <div class="cella"><small>Pacchetto</small><b>${l.pacchetto}</b><span>dal ${l.dal}</span></div>
        <div class="cella"><small>Canone mensile</small><b class="num">${euro(l.canone)}</b><span>fatturato il primo del mese</span></div>
        <div class="cella"><small>Referente</small><b style="font-size:15px">${l.referente}</b><span>visita mensile in presenza</span></div>
        <div class="cella"><small>Voto del titolare</small><b class="num">${String(l.votoTitolare).replace('.', ',')}</b><span>media degli ultimi tre mesi</span></div>
      </div>
      <h2 class="tit staccato">Anagrafica</h2>
      <div class="tabella"><table><tbody>
        <tr><td>Insegna</td><td class="d"><b>${l.nome}</b></td></tr>
        <tr><td>Tipologia</td><td class="d">${l.tipo}</td></tr>
        <tr><td>Indirizzo</td><td class="d">${l.indirizzo}, ${l.zona}</td></tr>
        <tr><td>Coperti</td><td class="d num">${l.coperti}</td></tr>
        <tr><td>Titolare</td><td class="d">${l.titolare}</td></tr>
        <tr><td>Telefono</td><td class="d num">${l.telefono}</td></tr>
        <tr><td>Cassa collegata</td><td class="d">${l.cassa}, dal ${l.cassaDal}</td></tr>
        <tr><td>In formazione sul locale</td><td class="d">${l.giovane}</td></tr>
        <tr><td>Ultima visita</td><td class="d">${l.visita}</td></tr>
        <tr><td>Prossima visita</td><td class="d"><b>${l.prossima}</b></td></tr>
        <tr><td>Bollino</td><td class="d">${l.bollino ? 'attivo' : 'sospeso, parametri fuori intervallo'}</td></tr>
      </tbody></table></div>
    </div>`;
  }
}

function grigliaNumeri(l, P, cliccabili = false){
  return `<div class="numeri">${P.map(p => {
    const s = stato(p, l.valori[p.id]);
    return `<div class="cella ${cliccabili ? 'clic' : ''}" ${cliccabili ? `data-par="${p.id}" aria-current="${p.id === parSel}"` : ''}>
      <small>${p.nome}</small>
      <b class="num ${s === 'buono' ? '' : s}">${num(l.valori[p.id], p.unita)}</b>
      <span>atteso <span class="num">${num(p.atteso, p.unita)}</span></span>
    </div>`;
  }).join('')}</div>`;
}

/* ─── eventi ───────────────────────────────────────────────────── */
$('#filtri').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  filtro = b.dataset.f;
  document.querySelectorAll('#filtri button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  disegnaLista();
});
$('#setaccio').addEventListener('input', e => { cerca = e.target.value.trim().toLowerCase(); disegnaLista(); });
$('#lista').addEventListener('click', e => {
  const b = e.target.closest('.riga-locale'); if (!b) return;
  scelto = +b.dataset.i;
  parDiag = null; parSel = null;   /* ogni locale riapre sul suo parametro peggiore */
  parSel = null;
  disegnaLista(); disegnaBanda(); disegnaArea();
  window.scrollTo({top: 0, behavior: 'smooth'});
});

disegnaPolso(); disegnaLista(); disegnaBanda(); disegnaArea();
