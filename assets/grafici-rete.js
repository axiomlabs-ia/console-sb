/* Grafici della rete, disegnati in SVG senza librerie: barre per settimana e linee con
   una soglia. Una sola scala per grafico: i segni e le etichette la condividono.
   Colori dai token della console (tema scuro). */

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// «22-28 set» da due date ISO
export function settimana(dal, al) {
  const m = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const a = new Date(dal + 'T12:00:00'), b = new Date(al + 'T12:00:00');
  return a.getMonth() === b.getMonth() ? `${a.getDate()}-${b.getDate()} ${m[b.getMonth()]}` : `${a.getDate()} ${m[a.getMonth()]}-${b.getDate()} ${m[b.getMonth()]}`;
}

function passoTondo(max) {
  const grezzo = max / 4, p = Math.pow(10, Math.floor(Math.log10(grezzo || 1)));
  return [1, 2, 2.5, 5, 10].map(k => k * p).find(k => k >= grezzo) || p * 10;
}

/* barre({ punti:[{etichetta, valore, nota?}], formato, titolo, evidenzia:ultima|null, soglia:{valore, nome}? }) */
export function barre({ punti, formato = v => v, titolo = '', soglia = null, evidenzia = 'ultima', alto = 190, largo = 640, ogni = 1 }) {
  const W = largo, H = alto, sx = 46, dx = 12, su = 18, giu = 34;
  const vals = punti.map(p => p.valore ?? 0);
  // vuoto solo se non c'è nessun valore: una serie di zeri è un dato (es. nessuno scarto), non un buco
  if (!punti.some(p => Number.isFinite(p.valore))) return `<div class="g-vuoto">Ancora nessun dato per questo grafico.</div>`;
  const max = Math.max(...vals, soglia?.valore ?? 0, 1);
  const passo = passoTondo(max), top = Math.ceil(max / passo) * passo;
  const y = v => su + (H - su - giu) * (1 - v / top);
  const bw = (W - sx - dx) / punti.length;
  const tacche = []; for (let v = 0; v <= top + 1e-9; v += passo) tacche.push(v);
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titolo)}">
    ${tacche.map(v => `<line x1="${sx}" x2="${W - dx}" y1="${y(v)}" y2="${y(v)}" class="g-griglia"/><text x="${sx - 8}" y="${y(v) + 4}" class="g-asse" text-anchor="end">${esc(formato(v, true))}</text>`).join('')}
    ${punti.map((p, i) => {
      const v = p.valore, x = sx + i * bw + bw * .18, w = bw * .64, ult = evidenzia === 'ultima' && i === punti.length - 1;
      return `<g><title>${esc(p.etichetta)}: ${esc(v == null ? 'nessun dato' : formato(v))}</title>
        ${v == null ? '' : `<rect x="${x}" y="${y(v)}" width="${w}" height="${Math.max(0, y(0) - y(v))}" rx="3" class="${ult ? 'g-barra-su' : 'g-barra'}"/>`}
        ${ult && v != null ? `<text x="${x + w / 2}" y="${y(v) - 6}" class="g-valore" text-anchor="middle">${esc(formato(v))}</text>` : ''}
        ${(punti.length - 1 - i) % ogni === 0 ? `<text x="${x + w / 2}" y="${H - 12}" class="g-asse" text-anchor="middle">${esc(p.etichetta)}</text>` : ''}</g>`;
    }).join('')}
    ${soglia ? `<line x1="${sx}" x2="${W - dx}" y1="${y(soglia.valore)}" y2="${y(soglia.valore)}" class="g-soglia"/><text x="${W - dx}" y="${y(soglia.valore) - 5}" class="g-soglia-t" text-anchor="end">${esc(soglia.nome)}</text>` : ''}
  </svg>`;
}

/* linea({ punti:[{etichetta, valore}], formato, titolo, soglia:{valore, nome}?, seconda:[valori]? }) */
export function linea({ punti, formato = v => v, titolo = '', soglia = null, seconda = null, nomi = null, alto = 190, largo = 640, ogni = 1 }) {
  const W = largo, H = alto, sx = 46, dx = 16, su = 20, giu = 34;
  const tutti = [...punti.map(p => p.valore), ...(seconda || []), soglia?.valore].filter(v => v != null);
  if (!tutti.length) return `<div class="g-vuoto">Ancora nessun dato per questo grafico.</div>`;
  const maxv = Math.max(...tutti), minv = Math.min(0, ...tutti);
  const passo = passoTondo(maxv - minv), top = Math.ceil(maxv / passo) * passo + (maxv % passo === 0 ? 0 : 0);
  const y = v => su + (H - su - giu) * (1 - (v - minv) / ((top - minv) || 1));
  const x = i => punti.length === 1 ? (sx + W - dx) / 2 : sx + 26 + i * (W - sx - dx - 52) / (punti.length - 1);
  const tacche = []; for (let v = minv; v <= top + 1e-9; v += passo) tacche.push(v);
  const traccia = (vals, cls) => {
    const pts = vals.map((v, i) => v == null ? null : [x(i), y(v)]);
    let d = '', su2 = false;
    pts.forEach(p => { if (!p) { su2 = false; return; } d += (su2 ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); su2 = true; });
    return `<path d="${d}" class="${cls}"/>` + pts.map((p, i) => p ? `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 4.5 : 3}" class="${cls}-p"><title>${esc(punti[i].etichetta)}: ${esc(formato(vals[i]))}</title></circle>` : '').join('');
  };
  const ult = [...punti].reverse().find(p => p.valore != null), iu = punti.lastIndexOf(ult);
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titolo)}">
    ${tacche.map(v => `<line x1="${sx}" x2="${W - dx}" y1="${y(v)}" y2="${y(v)}" class="g-griglia"/><text x="${sx - 8}" y="${y(v) + 4}" class="g-asse" text-anchor="end">${esc(formato(v, true))}</text>`).join('')}
    ${soglia ? `<line x1="${sx}" x2="${W - dx}" y1="${y(soglia.valore)}" y2="${y(soglia.valore)}" class="g-soglia"/><text x="${W - dx}" y="${y(soglia.valore) - 5}" class="g-soglia-t" text-anchor="end">${esc(soglia.nome)}</text>` : ''}
    ${seconda ? traccia(seconda, 'g-linea2') : ''}
    ${traccia(punti.map(p => p.valore), 'g-linea')}
    ${ult ? `<text x="${x(iu)}" y="${y(ult.valore) - 10}" class="g-valore" text-anchor="middle">${esc(formato(ult.valore))}</text>` : ''}
    ${punti.map((p, i) => (punti.length - 1 - i) % ogni === 0 ? `<text x="${x(i)}" y="${H - 12}" class="g-asse" text-anchor="middle">${esc(p.etichetta)}</text>` : '').join('')}
    ${nomi ? `<text x="${sx}" y="12" class="g-leg"><tspan class="g-leg1">● ${esc(nomi[0])}</tspan>${nomi[1] ? `<tspan class="g-leg2" dx="14">● ${esc(nomi[1])}</tspan>` : ''}</text>` : ''}
  </svg>`;
}
